import {fail} from './errors.js';
import {authorizeWrite, hashPassword} from './auth.js';

/**
 * Get references for PR & Store Tracker:
 * Departments, Lines, Machines, and distinct PM Orders
 */
export async function getPRReferences(env) {
  const departmentsResult = await env.DB.prepare(
    'SELECT id, name, is_active FROM departments WHERE is_active = 1 ORDER BY name ASC'
  ).all();

  const linesResult = await env.DB.prepare(
    'SELECT l.id, l.name, l.department_id, d.name as department_name, l.remark FROM lines l JOIN departments d ON d.id = l.department_id WHERE l.is_active = 1 ORDER BY d.name ASC, l.name ASC'
  ).all();

  const machinesResult = await env.DB.prepare(
    'SELECT id, code, normalized_code, name, department_id, line_id FROM machines WHERE is_active = 1 ORDER BY code ASC'
  ).all();

  // Retrieve distinct active PM order numbers from pm_machine_orders & pm_expenses
  const ordersResult = await env.DB.prepare(`
    SELECT DISTINCT TRIM(order_no) as order_no, machine_id
    FROM pm_machine_orders
    WHERE TRIM(order_no) != ''
    UNION
    SELECT DISTINCT TRIM(pm_order_no) as order_no, machine_id
    FROM pm_expenses
    WHERE TRIM(pm_order_no) != ''
    ORDER BY order_no DESC
    LIMIT 100
  `).all().catch(() => ({ results: [] }));

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
    })),
    machines: (machinesResult.results || []).map(m => ({
      id: m.id,
      code: m.code,
      normalizedCode: m.normalized_code,
      name: m.name,
      deptId: m.department_id,
      lineId: m.line_id
    })),
    pmOrders: (ordersResult.results || []).map(o => ({
      orderNo: o.order_no,
      machineId: o.machine_id
    }))
  };
}

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
 * Auto-clean PR & Store tracker items older than 2 years from D1 database
 */
export async function pruneOldPRItems(env) {
  const cutoff = getTwoYearCutoffDate();
  const res = await env.DB.prepare('DELETE FROM pr_tracker_items WHERE created_date < ?').bind(cutoff).run();
  return res.meta?.changes || 0;
}

/**
 * List PR & Store tracker items with filters, live metrics, and pipeline counts
 */
export async function listPRItems(env, filters = {}) {
  const {
    folder = 'inbox', // 'inbox' | 'archive' | 'all'
    pipelineStep = '', // 'PENDING_PR' | 'PENDING_PO' | 'PENDING_RECEIPT' | 'OVERDUE' | 'NEAR_DELIVERY'
    docType = '', // 'PR' | 'STORE'
    deptId = '',
    lineId = '',
    search = '',
    startDate = '',
    endDate = '',
    limit = 500,
    offset = 0
  } = filters;

  const today = new Date().toISOString().slice(0, 10);
  const next7DaysDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const cutoff = getTwoYearCutoffDate();

  // Enforce retention cleanup
  await pruneOldPRItems(env).catch(() => {});

  // 1. Fetch Global Pipeline Counts (within 2-year retention window)
  const countRes = await env.DB.prepare(`
    SELECT
      COUNT(CASE WHEN is_archived = 0 THEN 1 END) as total_inbox,
      COUNT(CASE WHEN is_archived = 1 THEN 1 END) as total_archive,
      COUNT(*) as total_all,
      COUNT(CASE WHEN is_archived = 0 AND (doc_no IS NULL OR TRIM(doc_no) = '') THEN 1 END) as pending_pr,
      COUNT(CASE WHEN is_archived = 0 AND (doc_no IS NOT NULL AND TRIM(doc_no) != '') AND (po_no IS NULL OR TRIM(po_no) = '') THEN 1 END) as pending_po,
      COUNT(CASE WHEN is_archived = 0 AND (po_no IS NOT NULL AND TRIM(po_no) != '') THEN 1 END) as pending_receipt,
      COUNT(CASE WHEN is_archived = 0 AND delivery_date != '' AND delivery_date < ? THEN 1 END) as overdue,
      COUNT(CASE WHEN is_archived = 0 AND delivery_date != '' AND delivery_date >= ? AND delivery_date <= ? THEN 1 END) as near_delivery
    FROM pr_tracker_items
    WHERE created_date >= ?
  `).bind(today, today, next7DaysDate, cutoff).first();

  const pipelineCounts = {
    inbox: Number(countRes?.total_inbox) || 0,
    archive: Number(countRes?.total_archive) || 0,
    all: Number(countRes?.total_all) || 0,
    pendingPr: Number(countRes?.pending_pr) || 0,
    pendingPo: Number(countRes?.pending_po) || 0,
    pendingReceipt: Number(countRes?.pending_receipt) || 0,
    overdue: Number(countRes?.overdue) || 0,
    nearDelivery: Number(countRes?.near_delivery) || 0
  };

  // 2. Build Query with Dynamic Where Clauses
  const whereClauses = [];
  const params = [];

  // Enforce 2-year retention window
  whereClauses.push('p.created_date >= ?');
  params.push(cutoff);

  // Folder filtering
  if (folder === 'inbox') {
    whereClauses.push('p.is_archived = 0');
  } else if (folder === 'archive') {
    whereClauses.push('p.is_archived = 1');
  }

  // Pipeline step filter
  if (pipelineStep === 'PENDING_PR') {
    whereClauses.push("p.is_archived = 0 AND (p.doc_no IS NULL OR TRIM(p.doc_no) = '')");
  } else if (pipelineStep === 'PENDING_PO') {
    whereClauses.push("p.is_archived = 0 AND (p.doc_no IS NOT NULL AND TRIM(p.doc_no) != '') AND (p.po_no IS NULL OR TRIM(p.po_no) = '')");
  } else if (pipelineStep === 'PENDING_RECEIPT') {
    whereClauses.push("p.is_archived = 0 AND (p.po_no IS NOT NULL AND TRIM(p.po_no) != '')");
  } else if (pipelineStep === 'OVERDUE') {
    whereClauses.push("p.is_archived = 0 AND p.delivery_date != '' AND p.delivery_date < ?");
    params.push(today);
  } else if (pipelineStep === 'NEAR_DELIVERY') {
    whereClauses.push("p.is_archived = 0 AND p.delivery_date != '' AND p.delivery_date >= ? AND p.delivery_date <= ?");
    params.push(today, next7DaysDate);
  }

  // Document Type Filter
  if (docType && ['PR', 'STORE'].includes(docType.toUpperCase())) {
    whereClauses.push('p.doc_type = ?');
    params.push(docType.toUpperCase());
  }

  // Department and Line filter
  if (deptId) {
    whereClauses.push('p.department_id = ?');
    params.push(deptId);
  }
  if (lineId) {
    whereClauses.push('p.line_id = ?');
    params.push(lineId);
  }

  // Date range filter (created_date)
  if (startDate) {
    whereClauses.push('p.created_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('p.created_date <= ?');
    params.push(endDate);
  }

  // Global search (supports multiple space-separated keywords)
  if (search && search.trim()) {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      whereClauses.push(`(
        p.order_no LIKE ? OR
        p.description LIKE ? OR
        p.doc_no LIKE ? OR
        p.po_no LIKE ? OR
        p.machine_code LIKE ? OR
        p.notes LIKE ? OR
        m.name LIKE ? OR
        l.name LIKE ? OR
        d.name LIKE ?
      )`);
      const like = `%${token}%`;
      params.push(like, like, like, like, like, like, like, like, like);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 3. Compute Live Metrics (sum of qty, total sum of price/amount) for current filter
  const metricsSql = `
    SELECT
      COUNT(*) as filtered_count,
      COALESCE(SUM(p.qty), 0) as total_qty,
      COALESCE(SUM(CASE WHEN p.price IS NOT NULL THEN (p.qty * p.price) ELSE 0 END), 0) as total_amount
    FROM pr_tracker_items p
    LEFT JOIN machines m ON m.id = p.machine_id
    LEFT JOIN lines l ON l.id = p.line_id
    LEFT JOIN departments d ON d.id = p.department_id
    ${whereSql}
  `;
  const metricsRes = await env.DB.prepare(metricsSql).bind(...params).first();

  const metrics = {
    totalCount: Number(metricsRes?.filtered_count) || 0,
    totalQty: Number(metricsRes?.total_qty) || 0,
    totalAmount: Number(metricsRes?.total_amount) || 0
  };

  // 4. Fetch Paginated Records
  const listSql = `
    SELECT
      p.*,
      COALESCE(d.name, p.department_id) as department_name,
      COALESCE(l.name, p.line_id) as line_name,
      COALESCE(m.name, '') as machine_name
    FROM pr_tracker_items p
    LEFT JOIN machines m ON m.id = p.machine_id
    LEFT JOIN lines l ON l.id = p.line_id
    LEFT JOIN departments d ON d.id = p.department_id
    ${whereSql}
    ORDER BY p.created_date DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const itemsRes = await env.DB.prepare(listSql).bind(...params, Math.min(Number(limit) || 100, 1000), Number(offset) || 0).all();
  const rawItems = itemsRes.results || [];

  const items = rawItems.map(item => {
    const isArchived = Boolean(item.is_archived);
    const hasDocNo = Boolean(item.doc_no && item.doc_no.trim().length > 0);
    const hasPoNo = Boolean(item.po_no && item.po_no.trim().length > 0);
    const delivDate = item.delivery_date ? String(item.delivery_date).trim() : '';

    let pipelineStatus = 'PENDING_PR';
    if (isArchived) {
      pipelineStatus = 'ARCHIVED';
    } else if (!hasDocNo) {
      pipelineStatus = 'PENDING_PR';
    } else if (!hasPoNo) {
      pipelineStatus = 'PENDING_PO';
    } else {
      pipelineStatus = 'PENDING_RECEIPT';
    }

    const isOverdue = !isArchived && Boolean(delivDate && delivDate < today);
    const isNearDelivery = !isArchived && Boolean(delivDate && delivDate >= today && delivDate <= next7DaysDate);

    return {
      id: item.id,
      createdDate: item.created_date,
      docType: item.doc_type || 'PR',
      docNo: item.doc_no || '',
      departmentId: item.department_id || '',
      departmentName: item.department_name || item.department_id || '',
      lineId: item.line_id || '',
      lineName: item.line_name || item.line_id || '',
      machineId: item.machine_id || '',
      machineCode: item.machine_code || '',
      machineName: item.machine_name || '',
      orderNo: item.order_no || '',
      description: item.description || '',
      qty: Number(item.qty) || 1,
      unit: item.unit || 'ชิ้น',
      price: item.price !== null ? Number(item.price) : null,
      totalPrice: item.price !== null ? (Number(item.qty) || 1) * Number(item.price) : null,
      poNo: item.po_no || '',
      deliveryDate: item.delivery_date || '',
      isArchived,
      archivedAt: item.archived_at || null,
      archivedBy: item.archived_by || '',
      notes: item.notes || '',
      createdAt: item.created_at,
      createdBy: item.created_by,
      updatedAt: item.updated_at,
      updatedBy: item.updated_by,
      pipelineStatus,
      isOverdue,
      isNearDelivery
    };
  });

  return {
    items,
    pipelineCounts,
    metrics,
    retentionCutoff: cutoff,
    pagination: {
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
      total: metrics.totalCount
    }
  };
}

/**
 * Get single item by ID
 */
export async function getPRItem(env, id) {
  if (!id) fail('VALIDATION', 'กรุณาระบุรหัสรายการ');
  const item = await env.DB.prepare(`
    SELECT p.*, d.name as department_name, l.name as line_name, m.name as machine_name
    FROM pr_tracker_items p
    LEFT JOIN machines m ON m.id = p.machine_id
    LEFT JOIN lines l ON l.id = p.line_id
    LEFT JOIN departments d ON d.id = p.department_id
    WHERE p.id = ?
  `).bind(id).first();

  if (!item) fail('NOT_FOUND', 'ไม่พบรายการที่ระบุ', 404);
  return item;
}

/**
 * Save single PR tracker item (Create or Update)
 */
export async function savePRItem(env, actor, payload) {
  try {
    authorizeWrite(actor, env, 'pm');
  } catch (err) {
    authorizeWrite(actor, env, 'machines');
  }

  if (!payload) fail('VALIDATION', 'ไม่พบข้อมูลสำหรับบันทึก');

  const description = String(payload.description || '').trim();
  if (!description) fail('VALIDATION', 'กรุณากรอกรายละเอียดสินค้าหรือบริการ');

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const user = actor.username || actor.displayName || actor.id || 'system';

  const createdDate = payload.createdDate ? String(payload.createdDate).slice(0, 10) : today;
  const cutoff = getTwoYearCutoffDate();
  if (createdDate < cutoff) {
    fail('VALIDATION', `วันที่สร้าง (${createdDate}) เกินกำหนดนโยบายจัดเก็บข้อมูลย้อนหลัง 2 ปี (ระบบจัดเก็บข้อมูลไม่เก่ากว่า ${cutoff})`);
  }
  // Auto-prune old data during saves to keep database lean
  await pruneOldPRItems(env).catch(() => {});
  const docType = payload.docType === 'STORE' ? 'STORE' : 'PR';
  const docNo = String(payload.docNo || '').trim();
  const orderNo = String(payload.orderNo || '').trim();
  const qty = Math.max(0.01, parseFloat(String(payload.qty || '1').replace(/,/g, '')) || 1);
  const unit = String(payload.unit || 'ชิ้น').trim() || 'ชิ้น';
  const price = payload.price !== undefined && payload.price !== null && String(payload.price).trim() !== ''
    ? Math.max(0, parseFloat(String(payload.price).replace(/,/g, '')) || 0)
    : null;
  const poNo = String(payload.poNo || '').trim();
  const deliveryDate = payload.deliveryDate ? String(payload.deliveryDate).slice(0, 10) : '';
  const notes = String(payload.notes || '').trim();

  let deptId = String(payload.departmentId || '').trim();
  let lineId = String(payload.lineId || '').trim();
  let machineId = String(payload.machineId || '').trim();
  let machineCode = String(payload.machineCode || '').trim();

  // If machineId or machineCode is provided, resolve and auto-fill line and dept
  if (machineId || machineCode) {
    let machineRow;
    if (machineId) {
      machineRow = await env.DB.prepare('SELECT id, code, department_id, line_id FROM machines WHERE id = ?').bind(machineId).first();
    } else {
      machineRow = await env.DB.prepare('SELECT id, code, department_id, line_id FROM machines WHERE LOWER(code) = LOWER(?)').bind(machineCode).first();
    }
    if (machineRow) {
      machineId = machineRow.id;
      machineCode = machineRow.code;
      if (!lineId && machineRow.line_id) lineId = machineRow.line_id;
      if (!deptId && machineRow.department_id) deptId = machineRow.department_id;
    }
  }

  // If lineId is provided but deptId is not, look up deptId from lines
  if (lineId && !deptId) {
    const lineRow = await env.DB.prepare('SELECT department_id FROM lines WHERE id = ?').bind(lineId).first();
    if (lineRow) deptId = lineRow.department_id;
  }

  const isExisting = Boolean(payload.id);
  const id = isExisting ? payload.id : `PRT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  if (isExisting) {
    const existing = await env.DB.prepare('SELECT id, is_archived, archived_at, archived_by FROM pr_tracker_items WHERE id = ?').bind(id).first();
    if (!existing) fail('NOT_FOUND', 'ไม่พบรายการที่ต้องการแก้ไข', 404);

    await env.DB.prepare(`
      UPDATE pr_tracker_items
      SET
        created_date = ?,
        doc_type = ?,
        doc_no = ?,
        department_id = ?,
        line_id = ?,
        machine_id = ?,
        machine_code = ?,
        order_no = ?,
        description = ?,
        qty = ?,
        unit = ?,
        price = ?,
        po_no = ?,
        delivery_date = ?,
        notes = ?,
        updated_at = ?,
        updated_by = ?
      WHERE id = ?
    `).bind(
      createdDate, docType, docNo, deptId, lineId, machineId, machineCode, orderNo,
      description, qty, unit, price, poNo, deliveryDate, notes, now, user, id
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO pr_tracker_items (
        id, created_date, doc_type, doc_no, department_id, line_id, machine_id, machine_code,
        order_no, description, qty, unit, price, po_no, delivery_date,
        is_archived, archived_at, archived_by, notes,
        created_at, created_by, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, '', ?, ?, ?, ?, ?)
    `).bind(
      id, createdDate, docType, docNo, deptId, lineId, machineId, machineCode,
      orderNo, description, qty, unit, price, poNo, deliveryDate,
      notes, now, user, now, user
    ).run();
  }

  return {
    success: true,
    id,
    updatedAt: now
  };
}

/**
 * Bulk save items (for inline table edit mode)
 */
export async function bulkSavePRItems(env, actor, items = []) {
  try {
    authorizeWrite(actor, env, 'pm');
  } catch (err) {
    authorizeWrite(actor, env, 'machines');
  }

  if (!Array.isArray(items) || items.length === 0) {
    fail('VALIDATION', 'ไม่พบรายการที่ต้องการแก้ไข');
  }

  // Auto-prune old data during bulk saves to keep database lean
  await pruneOldPRItems(env).catch(() => {});

  const now = new Date().toISOString();
  const user = actor.username || actor.displayName || actor.id || 'system';
  const statements = [];

  for (const item of items) {
    if (!item.id) continue;
    const description = String(item.description || '').trim();
    if (!description) continue;

    const docType = item.docType === 'STORE' ? 'STORE' : 'PR';
    const docNo = String(item.docNo || '').trim();
    const orderNo = String(item.orderNo || '').trim();
    const qty = Math.max(0.01, parseFloat(String(item.qty || '1').replace(/,/g, '')) || 1);
    const unit = String(item.unit || 'ชิ้น').trim() || 'ชิ้น';
    const price = item.price !== undefined && item.price !== null && String(item.price).trim() !== ''
      ? Math.max(0, parseFloat(String(item.price).replace(/,/g, '')) || 0)
      : null;
    const poNo = String(item.poNo || '').trim();
    const deliveryDate = item.deliveryDate ? String(item.deliveryDate).slice(0, 10) : '';
    const notes = String(item.notes || '').trim();

    statements.push(
      env.DB.prepare(`
        UPDATE pr_tracker_items
        SET
          doc_type = ?,
          doc_no = ?,
          order_no = ?,
          description = ?,
          qty = ?,
          unit = ?,
          price = ?,
          po_no = ?,
          delivery_date = ?,
          notes = ?,
          updated_at = ?,
          updated_by = ?
        WHERE id = ?
      `).bind(docType, docNo, orderNo, description, qty, unit, price, poNo, deliveryDate, notes, now, user, item.id)
    );
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  return {
    success: true,
    count: statements.length,
    updatedAt: now
  };
}

/**
 * Archive or restore PR tracker items
 */
export async function archivePRItems(env, actor, { ids = [], archive = true }) {
  try {
    authorizeWrite(actor, env, 'pm');
  } catch (err) {
    authorizeWrite(actor, env, 'machines');
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    fail('VALIDATION', 'กรุณาเลือกรายการอย่างน้อย 1 รายการ');
  }

  const now = new Date().toISOString();
  const user = actor.username || actor.displayName || actor.id || 'system';
  const statements = [];

  for (const id of ids) {
    if (!id) continue;
    if (archive) {
      statements.push(
        env.DB.prepare(`
          UPDATE pr_tracker_items
          SET is_archived = 1, archived_at = ?, archived_by = ?, updated_at = ?, updated_by = ?
          WHERE id = ?
        `).bind(now, user, now, user, id)
      );
    } else {
      statements.push(
        env.DB.prepare(`
          UPDATE pr_tracker_items
          SET is_archived = 0, archived_at = NULL, archived_by = '', updated_at = ?, updated_by = ?
          WHERE id = ?
        `).bind(now, user, id)
      );
    }
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  return {
    success: true,
    count: statements.length,
    archived: Boolean(archive),
    updatedAt: now
  };
}

/**
 * Bulk update Area (Department / Line / Machine)
 */
export async function bulkUpdateArea(env, actor, payload) {
  try {
    authorizeWrite(actor, env, 'pm');
  } catch (err) {
    authorizeWrite(actor, env, 'machines');
  }

  const { ids = [], departmentId = '', lineId = '', machineId = '', machineCode = '' } = payload || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    fail('VALIDATION', 'กรุณาเลือกรายการอย่างน้อย 1 รายการ');
  }

  let finalDeptId = departmentId;
  let finalLineId = lineId;
  let finalMachineId = machineId;
  let finalMachineCode = machineCode;

  if (finalMachineId || finalMachineCode) {
    let machineRow;
    if (finalMachineId) {
      machineRow = await env.DB.prepare('SELECT id, code, department_id, line_id FROM machines WHERE id = ?').bind(finalMachineId).first();
    } else {
      machineRow = await env.DB.prepare('SELECT id, code, department_id, line_id FROM machines WHERE LOWER(code) = LOWER(?)').bind(finalMachineCode).first();
    }
    if (machineRow) {
      finalMachineId = machineRow.id;
      finalMachineCode = machineRow.code;
      if (!finalLineId && machineRow.line_id) finalLineId = machineRow.line_id;
      if (!finalDeptId && machineRow.department_id) finalDeptId = machineRow.department_id;
    }
  }

  if (finalLineId && !finalDeptId) {
    const lineRow = await env.DB.prepare('SELECT department_id FROM lines WHERE id = ?').bind(finalLineId).first();
    if (lineRow) finalDeptId = lineRow.department_id;
  }

  const now = new Date().toISOString();
  const user = actor.username || actor.displayName || actor.id || 'system';
  const statements = [];

  for (const id of ids) {
    statements.push(
      env.DB.prepare(`
        UPDATE pr_tracker_items
        SET department_id = ?, line_id = ?, machine_id = ?, machine_code = ?, updated_at = ?, updated_by = ?
        WHERE id = ?
      `).bind(finalDeptId, finalLineId, finalMachineId, finalMachineCode, now, user, id)
    );
  }

  await env.DB.batch(statements);

  return {
    success: true,
    count: statements.length,
    updatedAt: now
  };
}

/**
 * Hard delete PR tracker items requiring Admin Password verification
 */
export async function deletePRItems(env, actor, { ids = [], adminPassword = '' }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    fail('VALIDATION', 'กรุณาเลือกรายการที่ต้องการลบ');
  }

  if (!adminPassword || typeof adminPassword !== 'string' || !adminPassword.trim()) {
    fail('VALIDATION', 'กรุณากรอกรหัสผ่านผู้ดูแลระบบ (Admin) เพื่อยืนยันการลบถาวร', 422);
  }

  // 1. Verify Admin Password
  let isAuthorizedAdmin = false;

  // Local Dev Admin check
  if (env.ENVIRONMENT === 'local' && env.DEV_AUTH === 'local-admin' && (adminPassword === '1234' || adminPassword === 'admin')) {
    isAuthorizedAdmin = true;
  } else {
    // Check against active users with admin role in app_users
    const adminUsersRes = await env.DB.prepare(
      "SELECT id, username, password_hash, password_salt FROM app_users WHERE role = 'admin' AND is_active = 1"
    ).all().catch(() => ({ results: [] }));

    const adminUsers = adminUsersRes.results || [];
    for (const admin of adminUsers) {
      const calcHash = await hashPassword(adminPassword.trim(), admin.password_salt);
      if (calcHash === admin.password_hash) {
        isAuthorizedAdmin = true;
        break;
      }
    }
  }

  if (!isAuthorizedAdmin) {
    fail('FORBIDDEN', 'รหัสผ่านผู้ดูแลระบบ (Admin) ไม่ถูกต้อง ไม่สามารถลบข้อมูลได้', 403);
  }

  // 2. Perform Hard Delete
  const statements = ids.map(id =>
    env.DB.prepare('DELETE FROM pr_tracker_items WHERE id = ?').bind(id)
  );

  await env.DB.batch(statements);

  return {
    success: true,
    deletedCount: statements.length
  };
}
