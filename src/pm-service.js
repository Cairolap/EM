import {fail} from './errors.js';
import {authorizeWrite} from './auth.js';

export async function getPMReferences(env) {
  const departmentsResult = await env.DB.prepare(
    'SELECT id, name, is_active FROM departments WHERE is_active = 1 ORDER BY name ASC'
  ).all();
  const linesResult = await env.DB.prepare(
    'SELECT l.id, l.name, l.department_id, d.name as department_name, l.remark FROM lines l JOIN departments d ON d.id = l.department_id WHERE l.is_active = 1 ORDER BY d.name ASC, l.name ASC'
  ).all();

  return {
    departments: (departmentsResult.results || []).map(d => ({
      deptId: d.id,
      deptName: d.name
    })),
    lines: (linesResult.results || []).map(l => ({
      lineId: l.id,
      lineName: l.name,
      deptId: l.department_id,
      deptName: l.department_name,
      remark: l.remark
    }))
  };
}

export async function getPMCycleData(env, { lineId, year, roundNo }) {
  if (!lineId) fail('VALIDATION', 'กรุณาระบุสายการผลิต (Line ID)');
  const y = Number(year) || new Date().getFullYear();
  const r = Number(roundNo) || 1;
  if (r < 1 || r > 5) fail('VALIDATION', 'รอบ PM ต้องอยู่ระหว่าง 1 ถึง 5 ครั้งต่อปี');

  const line = await env.DB.prepare(
    'SELECT l.id, l.name, l.department_id, d.name as department_name FROM lines l JOIN departments d ON d.id = l.department_id WHERE l.id = ?'
  ).bind(lineId).first();

  if (!line) fail('NOT_FOUND', 'ไม่พบสายการผลิตที่ระบุ', 404);

  // Retrieve existing PM cycle for this line/year/round
  const cycle = await env.DB.prepare(
    'SELECT * FROM pm_cycles WHERE line_id = ? AND year = ? AND round_no = ?'
  ).bind(lineId, y, r).first();

  const cycleId = cycle ? cycle.id : null;

  // Retrieve all active machines for this line
  let machines = [];
  const targetMonth = cycle ? cycle.target_month : '';
  if (cycleId) {
    const res = await env.DB.prepare(`
      SELECT 
        m.id as machine_id,
        m.code as machine_code,
        m.name as machine_name,
        m.line_order,
        m.status,
        m.criticality,
        pmo.id as order_id,
        COALESCE(pmo.order_no, '') as order_no,
        COALESCE(pmo.budget_amount, 0) as budget_amount,
        COALESCE(pmo.pr_no, '') as pr_no,
        COALESCE(pmo.pr_status, 'PENDING') as pr_status,
        COALESCE(pmo.notes, '') as notes,
        pmo.updated_at,
        COALESCE((
          SELECT SUM(e.amount)
          FROM pm_expenses e
          WHERE (
            (pmo.order_no IS NOT NULL AND TRIM(pmo.order_no) != '' AND (
              TRIM(e.pm_order_no) = TRIM(pmo.order_no)
              OR (e.machine_id = m.id AND TRIM(e.pm_order_no) = TRIM(pmo.order_no))
            ))
            OR (
              (pmo.order_no IS NULL OR TRIM(pmo.order_no) = '')
              AND (e.machine_id = m.id OR LOWER(e.machine_code) = LOWER(m.code))
              AND (? != '' AND STRFTIME('%Y-%m', e.doc_date) = ?)
            )
          )
        ), 0) as used_amount
      FROM machines m
      LEFT JOIN pm_machine_orders pmo 
        ON pmo.machine_id = m.id AND pmo.cycle_id = ?
      WHERE m.line_id = ? AND m.is_active = 1
      ORDER BY CASE WHEN m.line_order IS NULL THEN 1 ELSE 0 END, m.line_order, m.code COLLATE NOCASE, m.id
    `).bind(targetMonth, targetMonth, cycleId, lineId).all();
    machines = res.results || [];
  } else {
    const res = await env.DB.prepare(`
      SELECT 
        m.id as machine_id,
        m.code as machine_code,
        m.name as machine_name,
        m.line_order,
        m.status,
        m.criticality,
        NULL as order_id,
        '' as order_no,
        0 as budget_amount,
        '' as pr_no,
        'PENDING' as pr_status,
        '' as notes,
        NULL as updated_at,
        0 as used_amount
      FROM machines m
      WHERE m.line_id = ? AND m.is_active = 1
      ORDER BY CASE WHEN m.line_order IS NULL THEN 1 ELSE 0 END, m.line_order, m.code COLLATE NOCASE, m.id
    `).bind(lineId).all();
    machines = res.results || [];
  }

  // Retrieve summary of all 5 possible rounds for this line in this year
  const roundsRes = await env.DB.prepare(`
    SELECT 
      c.id,
      c.round_no,
      c.target_month,
      c.plan_date,
      c.status,
      c.updated_at,
      (SELECT COUNT(*) FROM pm_machine_orders mo WHERE mo.cycle_id = c.id AND TRIM(mo.order_no) != '') as filled_count
    FROM pm_cycles c
    WHERE c.line_id = ? AND c.year = ?
    ORDER BY c.round_no ASC
  `).bind(lineId, y).all();

  const existingRounds = roundsRes.results || [];
  const yearRounds = [1, 2, 3, 4, 5].map(roundNum => {
    const match = existingRounds.find(item => item.round_no === roundNum);
    return {
      roundNo: roundNum,
      exists: Boolean(match),
      cycleId: match ? match.id : null,
      targetMonth: match ? match.target_month : '',
      planDate: match ? match.plan_date : '',
      status: match ? match.status : 'PENDING',
      filledCount: match ? match.filled_count : 0,
      totalMachines: machines.length
    };
  });

  return {
    lineId: line.id,
    lineName: line.name,
    departmentId: line.department_id,
    departmentName: line.department_name,
    year: y,
    roundNo: r,
    cycle: cycle ? {
      id: cycle.id,
      targetMonth: cycle.target_month,
      planDate: cycle.plan_date,
      status: cycle.status,
      notes: cycle.notes,
      updatedAt: cycle.updated_at,
      updatedBy: cycle.updated_by
    } : null,
    targetMonth: cycle ? cycle.target_month : '',
    planDate: cycle ? cycle.plan_date : '',
    notes: cycle ? cycle.notes : '',
    machines: machines.map(m => ({
      machineId: m.machine_id,
      machineCode: m.machine_code,
      machineName: m.machine_name,
      orderNo: m.order_no,
      budgetAmount: Number(m.budget_amount) || 0,
      usedAmount: Number(m.used_amount) || 0,
      prNo: m.pr_no,
      prStatus: m.pr_status,
      notes: m.notes,
      isFilled: Boolean(m.order_no && m.order_no.trim().length > 0)
    })),
    yearRounds
  };
}

export async function savePMCycleOrders(env, actor, payload) {
  // Authorize write permission (pm or machines fallback)
  try {
    authorizeWrite(actor, env, 'pm');
  } catch (err) {
    authorizeWrite(actor, env, 'machines');
  }

  if (!payload) fail('VALIDATION', 'ไม่พบข้อมูลสำหรับบันทึก');
  const { lineId, departmentId, year, roundNo, targetMonth = '', planDate = '', notes = '', orders = [] } = payload;

  if (!lineId) fail('VALIDATION', 'กรุณาระบุสายการผลิต (Line ID)');
  const y = Number(year) || new Date().getFullYear();
  const r = Number(roundNo);
  if (!r || r < 1 || r > 5) fail('VALIDATION', 'รอบ PM ต้องอยู่ระหว่าง 1 ถึง 5 ครั้งต่อปี');

  const now = new Date().toISOString();
  const user = actor.username || actor.id || 'system';

  // Check if line exists and get department if not passed
  let deptId = departmentId;
  if (!deptId) {
    const lineRow = await env.DB.prepare('SELECT department_id FROM lines WHERE id = ?').bind(lineId).first();
    if (!lineRow) fail('NOT_FOUND', 'ไม่พบสายการผลิตที่ระบุ', 404);
    deptId = lineRow.department_id;
  }

  const cycleId = `PMC-${lineId}-${y}-R${r}`;
  const existingCycle = await env.DB.prepare('SELECT id FROM pm_cycles WHERE id = ?').bind(cycleId).first();

  const statements = [];

  if (existingCycle) {
    statements.push(
      env.DB.prepare(`
        UPDATE pm_cycles 
        SET target_month = ?, plan_date = ?, notes = ?, updated_at = ?, updated_by = ?
        WHERE id = ?
      `).bind(targetMonth, planDate, notes, now, user, cycleId)
    );
  } else {
    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_cycles (
          id, department_id, line_id, year, round_no, 
          target_month, plan_date, status, notes, 
          created_at, created_by, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
      `).bind(cycleId, deptId, lineId, y, r, targetMonth, planDate, notes, now, user, now, user)
    );
  }

  // Upsert machine orders
  for (const item of orders) {
    if (!item.machineId) continue;
    const orderNo = String(item.orderNo || '').trim();
    const budgetAmount = Math.max(0, parseFloat(String(item.budgetAmount || '0').replace(/,/g, '')) || 0);
    const prNo = String(item.prNo || '').trim();
    const itemNotes = String(item.notes || '').trim();
    const orderId = `PMO-${cycleId}-${item.machineId}`;
    const prStatus = orderNo ? (prNo ? 'PR_OPENED' : 'ORDER_ASSIGNED') : 'PENDING';

    statements.push(
      env.DB.prepare(`
        INSERT INTO pm_machine_orders (
          id, cycle_id, machine_id, order_no, budget_amount, pr_no, pr_status, notes,
          created_at, created_by, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cycle_id, machine_id) DO UPDATE SET
          order_no = excluded.order_no,
          budget_amount = excluded.budget_amount,
          pr_no = excluded.pr_no,
          pr_status = excluded.pr_status,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).bind(orderId, cycleId, item.machineId, orderNo, budgetAmount, prNo, prStatus, itemNotes, now, user, now, user)
    );
  }

  await env.DB.batch(statements);

  return {
    success: true,
    cycleId,
    lineId,
    year: y,
    roundNo: r,
    savedCount: orders.length,
    updatedAt: now
  };
}

export async function listPMOverview(env, { year, deptId }) {
  const y = Number(year) || new Date().getFullYear();

  let sql = `
    SELECT 
      l.id as line_id,
      l.name as line_name,
      l.department_id,
      d.name as department_name,
      (SELECT COUNT(*) FROM machines m WHERE m.line_id = l.id AND m.is_active = 1) as total_machines
    FROM lines l
    JOIN departments d ON d.id = l.department_id
    WHERE l.is_active = 1
  `;
  const params = [];
  if (deptId) {
    sql += ' AND l.department_id = ?';
    params.push(deptId);
  }
  sql += ' ORDER BY d.name ASC, l.name ASC';

  const linesRes = await env.DB.prepare(sql).bind(...params).all();
  const lines = linesRes.results || [];

  const cyclesRes = await env.DB.prepare(`
    SELECT 
      c.id,
      c.line_id,
      c.round_no,
      c.target_month,
      c.status,
      c.updated_at,
      (SELECT COUNT(*) FROM pm_machine_orders mo WHERE mo.cycle_id = c.id AND TRIM(mo.order_no) != '') as filled_count
    FROM pm_cycles c
    WHERE c.year = ?
  `).bind(y).all();
  const cycles = cyclesRes.results || [];

  const overview = lines.map(line => {
    const lineCycles = cycles.filter(c => c.line_id === line.line_id);
    const rounds = [1, 2, 3, 4, 5].map(roundNum => {
      const c = lineCycles.find(item => item.round_no === roundNum);
      return {
        roundNo: roundNum,
        cycleId: c ? c.id : null,
        targetMonth: c ? c.target_month : '',
        status: c ? c.status : 'PENDING',
        filledCount: c ? c.filled_count : 0,
        totalMachines: line.total_machines,
        isComplete: Boolean(c && line.total_machines > 0 && c.filled_count >= line.total_machines)
      };
    });

    return {
      lineId: line.line_id,
      lineName: line.line_name,
      deptId: line.department_id,
      deptName: line.department_name,
      totalMachines: line.total_machines,
      rounds
    };
  });

  return {
    year: y,
    overview
  };
}
