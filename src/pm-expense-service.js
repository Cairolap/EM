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
      conditions.push('(LOWER(e.description) LIKE ? OR LOWER(e.machine_code) LIKE ? OR LOWER(e.pm_order_no) LIKE ? OR LOWER(e.material_no) LIKE ? OR LOWER(e.doc_no) LIKE ? OR LOWER(e.line_id) LIKE ?)');
      const pattern = `%${word}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
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
      doc_date: r.doc_date,
      departmentId: r.department_id,
      department_id: r.department_id,
      departmentName: r.department_name,
      department_name: r.department_name,
      lineId: r.line_id,
      line_id: r.line_id,
      lineName: r.line_name,
      line_name: r.line_name,
      machineCode: r.machine_code,
      machine_code: r.machine_code,
      machineId: r.machine_id,
      machine_id: r.machine_id,
      machineName: r.machine_name,
      machine_name: r.machine_name,
      pmOrderNo: r.pm_order_no,
      pm_order_no: r.pm_order_no,
      materialNo: r.material_no,
      material_no: r.material_no,
      description: r.description,
      quantity: r.quantity,
      uom: r.uom,
      unitPrice: r.unit_price,
      unit_price: r.unit_price,
      amount: r.amount,
      docNo: r.doc_no,
      doc_no: r.doc_no,
      costCenter: r.cost_center,
      cost_center: r.cost_center,
      functionalLoc: r.functional_loc,
      functional_loc: r.functional_loc,
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

  // Support both raw array and { records: [...] } or { items: [...] }
  const items = Array.isArray(rawItems)
    ? rawItems
    : (Array.isArray(rawItems?.records)
        ? rawItems.records
        : (Array.isArray(rawItems?.items) ? rawItems.items : []));

  if (!items.length) {
    fail('VALIDATION', 'ไม่พบรายการข้อมูลสำหรับนำเข้า');
  }

  // 1. Enforce 2-year retention: prune existing old data first
  await pruneOldExpenses(env);
  const cutoff = getTwoYearCutoffDate();

  // 2. Pre-load machines for fast in-memory auto-linking (active machines prioritized)
  const machinesRes = await env.DB.prepare(
    'SELECT id, code, normalized_code, name, department_id, line_id, is_active FROM machines'
  ).all();
  const machineList = machinesRes.results || [];
  machineList.sort((a, b) => (a.is_active || 0) - (b.is_active || 0));
  const machineMap = new Map();
  machineList.forEach(m => {
    if (m.code) machineMap.set(m.code.trim().toUpperCase(), m);
    if (m.normalized_code) machineMap.set(m.normalized_code.trim().toUpperCase(), m);
  });

  // Pre-load lines for fallback matching
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

  // SAP Number Parser (handles trailing minus e.g. "3435.46-", commas e.g. "1,234.50")
  const parseSapNumber = (val) => {
    if (val === null || val === undefined) return 0;
    let s = String(val).trim().replace(/,/g, '');
    if (s.endsWith('-')) {
      s = '-' + s.slice(0, -1);
    }
    return parseFloat(s) || 0;
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let docDate = String(item.docDate || item['Posting date'] || '').trim();

    // Normalize date format: e.g. '20261003' -> '2026-10-03' or '03/10/2026' -> '2026-10-03'
    if (/^\d{8}$/.test(docDate)) {
      docDate = `${docDate.slice(0, 4)}-${docDate.slice(4, 6)}-${docDate.slice(6, 8)}`;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(docDate)) {
      const parts = docDate.split('/');
      docDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // Skip items older than 2 years to preserve D1 storage
    if (docDate && docDate < cutoff) {
      skippedOldCount++;
      continue;
    }

    // Column mapping according to requirements:
    // เครื่องจักร = Equipment
    const machineCode = String(item.machineCode || item.Equipment || item.equipment || '').trim();

    // PM No. = Order (strip leading zeros)
    const rawOrder = String(item.pmOrderNo || item.Order || item.order || '').trim();
    const pmOrderNo = rawOrder.replace(/^0+/, '') || rawOrder;

    const docNo = String(item.docNo || item['Doc. no.'] || '').trim();
    const materialNo = String(item.materialNo || item['Material no.'] || item.material || '').trim();
    const rawDesc = String(item.description || item.Description || '').trim();

    // รายการ = Description (Material no. (ถ้ามี))
    let description = rawDesc;
    if (materialNo) {
      if (description) {
        if (!description.includes(materialNo)) {
          description = `${description} (${materialNo})`;
        }
      } else {
        description = materialNo;
      }
    }

    const costCenter = String(item.costCenter || item['Cost ctr.'] || '').trim();
    const functionalLoc = String(item.functionalLoc || item['Functional Loc.'] || '').trim();
    const uom = String(item.uom || item.UOM || 'EA').trim();
    const plant = String(item.plant || item.Plant || '1200').trim();
    const movementType = String(item.movementType || item['Mvt.'] || '261').trim();
    const orderType = String(item.orderType || item.type || '1PMO').trim();

    // จำนวน = Qty.
    const quantity = parseSapNumber(item.quantity !== undefined ? item.quantity : item['Qty.']);

    // รวม (฿) = Amount
    const amount = parseSapNumber(item.amount !== undefined ? item.amount : item.Amount);

    // ราคา/หน่วย = Amount / Qty.
    let unitPrice = 0;
    if (item.unitPrice !== undefined && Number(item.unitPrice) > 0) {
      unitPrice = Number(item.unitPrice);
    } else if (quantity !== 0) {
      unitPrice = Math.abs(amount / quantity);
    }

    // แผนก = Equipment ไปเทียบในรายการเครื่องจักร
    // ไลน์ = Equipment ไปเทียบในรายการเครื่องจักร
    let machineId = null;
    let departmentId = null;
    let lineId = null;

    if (machineCode) {
      const matchedMachine = machineMap.get(machineCode.toUpperCase());
      if (matchedMachine) {
        machineId = matchedMachine.id;
        departmentId = matchedMachine.department_id;
        lineId = matchedMachine.line_id;
        linkedMachineCount++;
      }
    }

    // Fallback: if machine not found in registry, attempt functional location parse
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
    if (!departmentId && item.departmentId) departmentId = item.departmentId;
    if (!lineId && item.lineId) lineId = item.lineId;

    const id = item.id || `EXP-${docNo || 'NO'}-${docDate || 'DATE'}-${materialNo || 'MAT'}-${i}-${Date.now().toString(36)}`;

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
    totalRecords: items.length,
    importedCount,
    skippedOldCount,
    linkedMachineCount,
    retentionCutoff: cutoff
  };
};

/**
 * Single Expense Update/Delete
 */
export async function deleteExpenseItem(env, actor, id) {
  authorizeDelete(actor, env, 'pm');
  if (!id) fail('VALIDATION', 'ไม่พบรหัสรายการ');
  await env.DB.prepare('DELETE FROM pm_expenses WHERE id = ?').bind(id).run();
  return { success: true, deletedId: id };
}

export async function clearAllExpenses(env, actor) {
  try {
    authorizeDelete(actor, env, 'pm');
  } catch (_) {
    authorizeDelete(actor, env, 'machines');
  }
  const res = await env.DB.prepare('DELETE FROM pm_expenses').run();
  return { success: true, deletedCount: res.meta?.changes || 0 };
}

export async function deleteExpensesByRange(env, actor, { startDate, endDate, deptId } = {}) {
  try {
    authorizeDelete(actor, env, 'pm');
  } catch (_) {
    authorizeDelete(actor, env, 'machines');
  }

  const conditions = [];
  const params = [];

  if (startDate) {
    conditions.push('doc_date >= ?');
    params.push(startDate.trim());
  }

  if (endDate) {
    conditions.push('doc_date <= ?');
    params.push(endDate.trim());
  }

  if (deptId && deptId.trim()) {
    conditions.push('department_id = ?');
    params.push(deptId.trim());
  }

  if (!conditions.length) {
    fail('VALIDATION', 'กรุณาระบุช่วงวันที่ที่ต้องการลบ');
  }

  const sql = `DELETE FROM pm_expenses WHERE ${conditions.join(' AND ')}`;
  const res = await env.DB.prepare(sql).bind(...params).run();

  return {
    success: true,
    deletedCount: res.meta?.changes || 0,
    startDate,
    endDate,
    deptId
  };
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
 * Dashboard & Analytics: Budget vs Actual per Line (from PM Expenses)
 */
export async function getDashboardData(env, { startDate, endDate, deptId, dept } = {}) {
  const cutoff = getTwoYearCutoffDate();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const end = endDate || `${new Date().getFullYear()}-12-31`;
  const targetDept = (deptId || dept || '').trim();
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
  if (targetDept) {
    linesSql += ' AND l.department_id = ?';
    lineParams.push(targetDept);
  }
  linesSql += ' ORDER BY d.name ASC, l.name ASC';
  const linesRes = await env.DB.prepare(linesSql).bind(...lineParams).all();
  const lines = linesRes.results || [];

  const lineMap = new Map();
  lines.forEach(l => {
    lineMap.set(l.line_id, {
      lineId: l.line_id,
      lineName: l.line_name,
      deptId: l.department_id,
      deptName: l.department_name
    });
  });

  // 2. Query Actual Expenses grouped by line_id directly from pm_expenses
  let expenseSql = `
    SELECT 
      COALESCE(e.line_id, '') as line_id,
      COALESCE(e.department_id, '') as department_id,
      SUM(e.amount) as actual_amount,
      COUNT(*) as expense_count
    FROM pm_expenses e
    WHERE e.doc_date >= ? AND e.doc_date <= ? AND e.doc_date >= ?
  `;
  const expParams = [start, end, cutoff];
  if (targetDept) {
    expenseSql += ' AND e.department_id = ?';
    expParams.push(targetDept);
  }
  expenseSql += ' GROUP BY e.line_id';
  const expenseRes = await env.DB.prepare(expenseSql).bind(...expParams).all();
  const expenseMap = new Map();
  (expenseRes.results || []).forEach(r => {
    expenseMap.set(r.line_id, {
      actualAmount: r.actual_amount || 0,
      count: r.expense_count || 0,
      deptId: r.department_id
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

  // 4. Combine all lines (from registered lines + any lines present in pm_expenses)
  const allLineIds = new Set([...lineMap.keys(), ...expenseMap.keys()]);
  let totalActual = 0;
  let totalBudget = 0;
  let totalExpenseCount = 0;

  const lineBreakdown = [];

  for (const lid of allLineIds) {
    if (!lid) continue;
    const regLine = lineMap.get(lid);
    const expInfo = expenseMap.get(lid) || { actualAmount: 0, count: 0, deptId: '' };
    const budget = budgetMap.get(lid) || 0;
    const actual = expInfo.actualAmount;
    const count = expInfo.count;

    const lineDept = regLine?.deptId || expInfo.deptId || '';
    if (targetDept && lineDept && lineDept !== targetDept) {
      continue;
    }

    const variance = budget - actual;
    const percent = budget > 0 ? (actual / budget) * 100 : (actual > 0 ? 100 : 0);

    totalActual += actual;
    totalBudget += budget;
    totalExpenseCount += count;

    let status = 'NORMAL';
    if (budget === 0 && actual === 0) {
      status = 'NO_DATA';
    } else if (actual > budget && budget > 0) {
      status = 'OVER_BUDGET';
    } else if (percent >= 80) {
      status = 'WARNING';
    }

    lineBreakdown.push({
      lineId: lid,
      lineName: regLine?.lineName || lid,
      deptId: lineDept,
      deptName: regLine?.deptName || lineDept,
      budget,
      actual,
      variance,
      percent: Math.round(percent * 100) / 100,
      usagePercent: Math.round(percent * 100) / 100,
      status,
      count
    });
  }

  // Sort by actual expenses descending
  lineBreakdown.sort((a, b) => (b.actual || 0) - (a.actual || 0));

  const totalVariance = totalBudget - totalActual;
  const budgetUsagePercent = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 10000) / 100 : 0;

  const totals = {
    actual: totalActual,
    budget: totalBudget,
    variance: totalVariance,
    usagePercent: budgetUsagePercent,
    linesCount: lineBreakdown.length,
    expenseCount: totalExpenseCount
  };

  return {
    year,
    startDate: start,
    endDate: end,
    deptId: targetDept,
    kpi: {
      totalActual,
      totalBudget,
      variance: totalVariance,
      budgetUsagePercent,
      activeLinesCount: lineBreakdown.length
    },
    totals,
    lineBreakdown,
    lineMetrics: lineBreakdown
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
