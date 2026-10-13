import {fail} from './errors.js';
import {authorizeWrite, authorizeDelete} from './auth.js';

/**
 * 2-Year Retention Helper:
 * Calculate the cutoff ISO date string (2 years prior to today)
 */
export function getTwoYearCutoffDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

/**
 * Auto-clean expenses older than 2 years from D1 database
 */
export async function pruneOldExpenses(env) {
  const cutoff = getTwoYearCutoffDate();
  const res = await env.DB.prepare('DELETE FROM pm_expenses WHERE doc_date < ?').bind(cutoff).run();
  return res.meta?.changes || 0;
}

/**
 * List expenses with pagination, search, filters, and total sum
 */
export async function listExpenses(env, query = {}) {
  const {
    search = '',
    deptId = '',
    lineId = '',
    machineCode = '',
    startDate = '',
    endDate = '',
    limit = 50,
    offset = 0
  } = query;

  const conditions = [];
  const params = [];

  // Enforce 2-year retention window
  const cutoff = getTwoYearCutoffDate();
  conditions.push('e.doc_date >= ?');
  params.push(cutoff);

  if (deptId) {
    conditions.push('e.department_id = ?');
    params.push(deptId);
  }

  if (lineId) {
    conditions.push('e.line_id = ?');
    params.push(lineId);
  }

  if (machineCode) {
    conditions.push('LOWER(e.machine_code) = LOWER(?)');
    params.push(machineCode.trim());
  }

  if (startDate) {
    conditions.push('e.doc_date >= ?');
    params.push(startDate);
  }

  if (endDate) {
    conditions.push('e.doc_date <= ?');
    params.push(endDate);
  }

  if (search && search.trim()) {
    // Split space-separated search words
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    words.forEach(word => {
      conditions.push('(LOWER(e.description) LIKE ? OR LOWER(e.machine_code) LIKE ? OR LOWER(e.pm_order_no) LIKE ? OR LOWER(e.material_no) LIKE ? OR LOWER(e.doc_no) LIKE ?)');
      const pattern = `%${word}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    });
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  // 1. Get total count and total amount
  const countSql = `
    SELECT 
      COUNT(*) as total_count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM pm_expenses e
    ${whereClause}
  `;
  const countRow = await env.DB.prepare(countSql).bind(...params).first();
  const totalCount = countRow?.total_count || 0;
  const totalAmount = countRow?.total_amount || 0;

  // 2. Query paginated records with machine & line names
  const pageLimit = Math.min(500, Math.max(1, Number(limit) || 50));
  const pageOffset = Math.max(0, Number(offset) || 0);

  const dataSql = `
    SELECT 
      e.*,
      m.name as machine_name,
      l.name as line_name,
      d.name as department_name
    FROM pm_expenses e
    LEFT JOIN machines m ON m.id = e.machine_id
    LEFT JOIN lines l ON l.id = e.line_id
    LEFT JOIN departments d ON d.id = e.department_id
    ${whereClause}
    ORDER BY e.doc_date DESC, e.doc_no DESC, e.id DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await env.DB.prepare(dataSql).bind(...params, pageLimit, pageOffset).all();

  return {
    items: (rows.results || []).map(r => ({
      id: r.id,
      docDate: r.doc_date,
      departmentId: r.department_id,
      departmentName: r.department_name,
      lineId: r.line_id,
      lineName: r.line_name,
      machineCode: r.machine_code,
      machineId: r.machine_id,
      machineName: r.machine_name,
      pmOrderNo: r.pm_order_no,
      materialNo: r.material_no,
      description: r.description,
      quantity: r.quantity,
      uom: r.uom,
      unitPrice: r.unit_price,
      amount: r.amount,
      docNo: r.doc_no,
      costCenter: r.cost_center,
      functionalLoc: r.functional_loc,
      notes: r.notes
    })),
    totalCount,
    totalAmount,
    limit: pageLimit,
    offset: pageOffset
  };
}

/**
 * Import parsed SAP expense records with auto-linking to machines
 */
export async function importExpenseRecords(env, actor, rawItems = []) {
  try {
    authorizeWrite(actor, env, 'pm');
  } catch (_) {
    authorizeWrite(actor, env, 'machines');
  }

  if (!Array.isArray(rawItems) || !rawItems.length) {
    fail('VALIDATION', 'ไม่พบรายการข้อมูลสำหรับนำเข้า');
  }

  // 1. Enforce 2-year retention: prune existing old data first
  await pruneOldExpenses(env);
  const cutoff = getTwoYearCutoffDate();

  // 2. Pre-load active machines for fast in-memory auto-linking
  const machinesRes = await env.DB.prepare(
    'SELECT id, code, normalized_code, name, department_id, line_id FROM machines WHERE is_active = 1'
  ).all();
  const machineList = machinesRes.results || [];
  const machineMap = new Map();
  machineList.forEach(m => {
    machineMap.set(m.code.toUpperCase(), m);
    machineMap.set(m.normalized_code.toUpperCase(), m);
  });

  // Pre-load lines for functional location matching
  const linesRes = await env.DB.prepare(
    'SELECT id, department_id, name FROM lines WHERE is_active = 1'
  ).all();
  const lineList = linesRes.results || [];
  const lineMap = new Map();
  lineList.forEach(l => lineMap.set(l.id.toUpperCase(), l));

  const now = new Date().toISOString();
  const user = actor.username || actor.id || 'system';

  let importedCount = 0;
  let skippedOldCount = 0;
  let linkedMachineCount = 0;

  const statements = [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    let docDate = String(item.docDate || item['Posting date'] || '').trim();

    // Normalize date format: e.g. '20261003' -> '2026-10-03' or '03/10/2026' -> '2026-10-03'
    if (/^\d{8}$/.test(docDate)) {
      docDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(docDate)) {
      const parts = docDate.split('/');
      docDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // Skip items older than 2 years to preserve D1 storage
    if (docDate < cutoff) {
      skippedOldCount++;
      continue;
    }

    const machineCode = String(item.machineCode || item.Equipment || '').trim();
    const pmOrderNo = String(item.pmOrderNo || item.Order || '').replace(/^0+/, '').trim();
    const docNo = String(item.docNo || item['Doc. no.'] || '').trim();
    const materialNo = String(item.materialNo || item['Material no.'] || '').trim();
    const description = String(item.description || item.Description || '').trim();
    const costCenter = String(item.costCenter || item['Cost ctr.'] || '').trim();
    const functionalLoc = String(item.functionalLoc || item['Functional Loc.'] || '').trim();
    const uom = String(item.uom || item.UOM || 'EA').trim();
    const plant = String(item.plant || item.Plant || '1200').trim();
    const movementType = String(item.movementType || item['Mvt.'] || '261').trim();
    const orderType = String(item.orderType || item.type || '1PMO').trim();

    const quantity = parseFloat(String(item.quantity || item['Qty.'] || '0').replace(/,/g, '')) || 0;
    const amount = parseFloat(String(item.amount || item.Amount || '0').replace(/,/g, '')) || 0;
    const unitPrice = quantity > 0 ? (amount / quantity) : 0;

    // Auto-link machine
    let machineId = null;
    let departmentId = item.departmentId || null;
    let lineId = item.lineId || null;

    if (machineCode) {
      const matchedMachine = machineMap.get(machineCode.toUpperCase());
      if (matchedMachine) {
        machineId = matchedMachine.id;
        departmentId = matchedMachine.department_id;
        lineId = matchedMachine.line_id;
        linkedMachineCount++;
      }
    }

    // Fallback: parse Department and Line from Functional Location (e.g. '1RS-MX1-L01', '3RS-PR1-L03')
    if (!lineId && functionalLoc) {
      const match = functionalLoc.match(/-([A-Z0-9]+)-(L[A-Z0-9_-]+)/i);
      if (match) {
        const potentialDept = match[1].toUpperCase();
        const potentialLine = match[2].toUpperCase();
        const matchedLine = lineMap.get(potentialLine);
        if (matchedLine) {
          lineId = matchedLine.id;
          departmentId = matchedLine.department_id;
        } else {
          departmentId = potentialDept;
          lineId = potentialLine;
        }
      }
    }

    const id = `EXP-${docNo || 'NO'}-${docDate}-${materialNo || 'MAT'}-${i}`;

    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_expenses (
          id, plant, gl_account, cost_center, machine_code, machine_id,
          department_id, line_id, pm_order_no, doc_date, doc_no, movement_type,
          material_no, description, quantity, uom, unit_price, amount,
          order_type, po_no, functional_loc, work_center, notes,
          imported_at, imported_by, created_at, created_by, updated_at, updated_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, '',
          ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          machine_id = excluded.machine_id,
          department_id = excluded.department_id,
          line_id = excluded.line_id,
          quantity = excluded.quantity,
          amount = excluded.amount,
          unit_price = excluded.unit_price,
          description = excluded.description,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).bind(
        id, plant, item.glAccount || '0000071111', costCenter, machineCode, machineId,
        departmentId, lineId, pmOrderNo, docDate, docNo, movementType,
        materialNo, description, quantity, uom, unitPrice, amount,
        orderType, item.poNo || '', functionalLoc, item.workCenter || 'EC-420',
        now, user, now, user, now, user
      )
    );

    importedCount++;
  }

  // Execute in batches of 50 to comply with Cloudflare D1 batch limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    await env.DB.batch(chunk);
  }

  return {
    success: true,
    importedCount,
    skippedOldCount,
    linkedMachineCount,
    retentionCutoff: cutoff
  };
}

/**
 * Single Expense Update/Delete
 */
export async function deleteExpenseItem(env, actor, id) {
  authorizeDelete(actor, env, 'pm');
  if (!id) fail('VALIDATION', 'ไม่พบรหัสรายการ');
  await env.DB.prepare('DELETE FROM pm_expenses WHERE id = ?').bind(id).run();
  return { success: true, deletedId: id };
}

export async function saveExpenseItem(env, actor, payload) {
  authorizeWrite(actor, env, 'pm');
  if (!payload || !payload.id) fail('VALIDATION', 'ไม่พบข้อมูล');

  const now = new Date().toISOString();
  const user = actor.username || actor.id || 'system';

  await env.DB.prepare(`
    UPDATE pm_expenses
    SET 
      doc_date = ?,
      department_id = ?,
      line_id = ?,
      machine_code = ?,
      pm_order_no = ?,
      description = ?,
      quantity = ?,
      unit_price = ?,
      amount = ?,
      notes = ?,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
  `).bind(
    payload.docDate,
    payload.departmentId || null,
    payload.lineId || null,
    payload.machineCode || '',
    payload.pmOrderNo || '',
    payload.description || '',
    Number(payload.quantity) || 0,
    Number(payload.unitPrice) || 0,
    Number(payload.amount) || 0,
    payload.notes || '',
    now,
    user,
    payload.id
  ).run();

  return { success: true, id: payload.id };
}

/**
 * Dashboard & Analytics: Budget vs Actual per Line
 */
export async function getDashboardData(env, { startDate, endDate, deptId } = {}) {
  const cutoff = getTwoYearCutoffDate();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const end = endDate || `${new Date().getFullYear()}-12-31`;
  const year = parseInt(start.slice(0, 4), 10) || new Date().getFullYear();

  // 1. Get all active lines
  let linesSql = `
    SELECT 
      l.id as line_id,
      l.name as line_name,
      l.department_id,
      d.name as department_name
    FROM lines l
    JOIN departments d ON d.id = l.department_id
    WHERE l.is_active = 1
  `;
  const lineParams = [];
  if (deptId) {
    linesSql += ' AND l.department_id = ?';
    lineParams.push(deptId);
  }
  linesSql += ' ORDER BY d.name ASC, l.name ASC';
  const linesRes = await env.DB.prepare(linesSql).bind(...lineParams).all();
  const lines = linesRes.results || [];

  // 2. Query Actual Expenses grouped by line_id in the selected date range
  let expenseSql = `
    SELECT 
      COALESCE(e.line_id, 'UNKNOWN') as line_id,
      SUM(e.amount) as actual_amount,
      COUNT(*) as expense_count
    FROM pm_expenses e
    WHERE e.doc_date >= ? AND e.doc_date <= ? AND e.doc_date >= ?
  `;
  const expParams = [start, end, cutoff];
  if (deptId) {
    expenseSql += ' AND e.department_id = ?';
    expParams.push(deptId);
  }
  expenseSql += ' GROUP BY e.line_id';
  const expenseRes = await env.DB.prepare(expenseSql).bind(...expParams).all();
  const expenseMap = new Map();
  (expenseRes.results || []).forEach(r => {
    expenseMap.set(r.line_id, {
      actualAmount: r.actual_amount || 0,
      count: r.expense_count || 0
    });
  });

  // 3. Query Line Budgets for the target year
  let budgetSql = 'SELECT * FROM pm_line_budgets WHERE year = ?';
  const budgetParams = [year];
  const budgetRes = await env.DB.prepare(budgetSql).bind(...budgetParams).all();
  const budgetMap = new Map();
  (budgetRes.results || []).forEach(b => {
    budgetMap.set(b.line_id, b.budget_amount || 0);
  });

  // 4. Calculate KPI totals and Line Breakdown
  let totalActual = 0;
  let totalBudget = 0;

  const lineBreakdown = lines.map(line => {
    const expInfo = expenseMap.get(line.line_id) || { actualAmount: 0, count: 0 };
    const actual = expInfo.actualAmount;
    const budget = budgetMap.get(line.line_id) || 0;
    const variance = budget - actual;
    const percent = budget > 0 ? (actual / budget) * 100 : (actual > 0 ? 100 : 0);

    totalActual += actual;
    totalBudget += budget;

    let status = 'NORMAL'; // ปกติ
    if (budget === 0 && actual === 0) {
      status = 'NO_DATA'; // ไม่มีรายการ
    } else if (actual > budget && budget > 0) {
      status = 'OVER_BUDGET'; // เกินงบ
    } else if (percent >= 80) {
      status = 'WARNING'; // เฝ้าระวัง
    }

    return {
      lineId: line.line_id,
      lineName: line.line_name,
      deptId: line.department_id,
      deptName: line.department_name,
      budget,
      actual,
      variance,
      percent: Math.round(percent * 100) / 100,
      status,
      count: expInfo.count
    };
  });

  const variance = totalBudget - totalActual;
  const budgetUsagePercent = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 10000) / 100 : 0;

  return {
    year,
    startDate: start,
    endDate: end,
    deptId,
    kpi: {
      totalActual,
      totalBudget,
      variance,
      budgetUsagePercent,
      activeLinesCount: lines.length
    },
    lineBreakdown
  };
}

/**
 * Set Line Budgets
 */
export async function saveLineBudgets(env, actor, { year, budgets = [] }) {
  authorizeWrite(actor, env, 'pm');
  const y = Number(year) || new Date().getFullYear();
  const now = new Date().toISOString();
  const user = actor.username || actor.id || 'system';

  const statements = [];
  for (const b of budgets) {
    if (!b.lineId) continue;
    const id = `BUDGET-${b.lineId}-${y}`;
    const amount = Number(b.budgetAmount) || 0;
    const deptId = b.deptId || '';

    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_line_budgets (id, line_id, department_id, year, budget_amount, notes, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(line_id, year) DO UPDATE SET
          budget_amount = excluded.budget_amount,
          department_id = CASE WHEN excluded.department_id != '' THEN excluded.department_id ELSE pm_line_budgets.department_id END,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).bind(id, b.lineId, deptId, y, amount, b.notes || '', now, user)
    );
  }

  if (statements.length) {
    await env.DB.batch(statements);
  }

  return { success: true, count: statements.length, year: y };
}
