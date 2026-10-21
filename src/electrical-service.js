import { fail } from './errors.js';
import { uploadPicture } from './drive.js';

const VALID_TYPES = new Set(['MDB', 'DB', 'LP', 'MC', 'DV']);

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

export function generateElectricalId(seq) {
  return 'EL-' + String(seq).padStart(6, '0');
}

/**
 * Checks for circular dependency in electrical feeder hierarchy
 */
export async function checkCircularDependency(db, nodeId, targetParentId) {
  if (!nodeId || !targetParentId) return;
  if (nodeId === targetParentId) {
    fail('CONFLICT', 'ไม่สามารถเชื่อมโยงตู้เป็นต้นทางของตนเองได้', 409);
  }

  let curr = targetParentId;
  const visited = new Set([nodeId]);

  while (curr) {
    if (visited.has(curr)) {
      fail('CONFLICT', 'พบการเชื่อมโยงสายจ่ายไฟวนลูป (Circular Dependency) กรุณาเลือกต้นทางใหม่', 409);
    }
    visited.add(curr);

    const row = await db.prepare('SELECT parent_id FROM electrical_nodes WHERE id = ?').bind(curr).first();
    curr = row?.parent_id || null;
  }
}

/**
 * List all electrical nodes with filtering
 */
export async function listElectricalNodes(env, filters = {}) {
  const db = env.DB;
  let sql = `
    SELECT 
      n.id,
      n.node_code as nodeCode,
      n.name,
      n.node_type as nodeType,
      n.parent_id as parentId,
      p.node_code as parentCode,
      p.name as parentName,
      n.current_rating as currentRating,
      n.voltage,
      n.location,
      n.remark,
      n.image_url as imageUrl,
      n.drive_file_id as driveFileId,
      n.sort_order as sortOrder,
      n.is_active as isActive,
      n.created_at as createdAt,
      n.updated_at as updatedAt,
      (SELECT COUNT(*) FROM electrical_nodes c WHERE c.parent_id = n.id AND c.is_active = 1) as childCount
    FROM electrical_nodes n
    LEFT JOIN electrical_nodes p ON n.parent_id = p.id
    WHERE n.is_active = 1
  `;
  const binds = [];

  if (filters.nodeType && filters.nodeType !== 'ALL') {
    sql += ' AND n.node_type = ?';
    binds.push(filters.nodeType);
  }

  if (filters.location) {
    sql += ' AND n.location LIKE ?';
    binds.push(`%${filters.location}%`);
  }

  if (filters.search) {
    sql += ' AND (n.node_code LIKE ? OR n.name LIKE ? OR n.location LIKE ? OR n.remark LIKE ?)';
    const s = `%${filters.search}%`;
    binds.push(s, s, s, s);
  }

  sql += " ORDER BY (CASE WHEN n.node_type = 'MDB' THEN 1 ELSE 2 END) ASC, n.sort_order ASC, n.node_code ASC";

  const rows = (await db.prepare(sql).bind(...binds).all()).results || [];
  return rows;
}

/**
 * Get single node by ID with direct children list
 */
export async function getElectricalNode(env, id) {
  const db = env.DB;
  const node = await db.prepare(`
    SELECT 
      n.id,
      n.node_code as nodeCode,
      n.name,
      n.node_type as nodeType,
      n.parent_id as parentId,
      p.node_code as parentCode,
      p.name as parentName,
      n.current_rating as currentRating,
      n.voltage,
      n.location,
      n.remark,
      n.image_url as imageUrl,
      n.drive_file_id as driveFileId,
      n.sort_order as sortOrder,
      n.is_active as isActive,
      n.created_at as createdAt,
      n.updated_at as updatedAt
    FROM electrical_nodes n
    LEFT JOIN electrical_nodes p ON n.parent_id = p.id
    WHERE n.id = ? AND n.is_active = 1
  `).bind(id).first();

  if (!node) fail('NOT_FOUND', 'ไม่พบข้อมูลตู้หรืออุปกรณ์ไฟฟ้านี้', 404);

  const children = (await db.prepare(`
    SELECT id, node_code as nodeCode, name, node_type as nodeType, current_rating as currentRating, location
    FROM electrical_nodes
    WHERE parent_id = ? AND is_active = 1
    ORDER BY sort_order ASC, node_code ASC
  `).bind(id).all()).results || [];

  return { ...node, children };
}

/**
 * Save (create or update) electrical node
 */
export async function saveElectricalNode(env, actor, data) {
  const db = env.DB;
  const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  const nodeCode = normalizeCode(data.nodeCode || data.node_code);
  if (!nodeCode) fail('VALIDATION', 'กรุณาระบุรหัสตู้/อุปกรณ์ (Node Code)', 422);

  const name = String(data.name || '').trim();
  if (!name) fail('VALIDATION', 'กรุณาระบุชื่อตู้หรืออุปกรณ์', 422);

  const nodeType = String(data.nodeType || data.node_type || 'DB').toUpperCase();
  if (!VALID_TYPES.has(nodeType)) {
    fail('VALIDATION', 'ประเภทไม่ถูกต้อง (ต้องเป็น MDB, DB, LP, MC หรือ DV)', 422);
  }

  const currentRating = Math.max(0, parseFloat(data.currentRating ?? data.current_rating ?? 0) || 0);
  const voltage = String(data.voltage || '400V 3P4W').trim();
  const location = String(data.location || '').trim();
  const remark = String(data.remark || '').trim();
  const parentId = data.parentId ? String(data.parentId).trim() : null;
  const sortOrder = parseInt(data.sortOrder ?? data.sort_order ?? 0, 10) || 0;

  const isEdit = Boolean(data.id);
  let id = data.id ? String(data.id).trim() : '';

  // Check code uniqueness
  const dupCheck = await db.prepare(
    `SELECT id FROM electrical_nodes WHERE node_code = ? ${isEdit ? 'AND id != ?' : ''}`
  ).bind(...(isEdit ? [nodeCode, id] : [nodeCode])).first();

  if (dupCheck) {
    fail('DUPLICATE', `รหัสตู้/อุปกรณ์ "${nodeCode}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`, 409);
  }

  // Circular dependency check
  if (parentId) {
    await checkCircularDependency(db, id, parentId);
  }

  // Handle Drive image upload if payload contains base64 image
  let imageUrl = String(data.imageUrl || data.image_url || '').trim();
  let driveFileId = String(data.driveFileId || data.drive_file_id || '').trim();

  if (data.image && typeof data.image === 'object' && (data.image.base64 || data.image.bytes)) {
    try {
      const reqMock = {
        key: crypto.randomUUID(),
        payloadHash: crypto.randomUUID().slice(0, 16),
        now,
        actor: actor?.username || 'admin'
      };
      const uploadRes = await uploadPicture(env, 'electrical', reqMock, 'photo', data.image, nodeCode || 'EL');
      if (uploadRes?.url) {
        imageUrl = uploadRes.url;
        driveFileId = uploadRes.id || '';
      }
    } catch (err) {
      console.error('Image upload to drive failed:', err);
    }
  }

  if (isEdit) {
    const existing = await db.prepare('SELECT id, image_url, drive_file_id FROM electrical_nodes WHERE id = ?').bind(id).first();
    if (!existing) fail('NOT_FOUND', 'ไม่พบข้อมูลตู้เดิมที่ต้องการแก้ไข', 404);

    if (!imageUrl && !data.removeImage) imageUrl = existing.image_url;
    if (!driveFileId && !data.removeImage) driveFileId = existing.drive_file_id;
    if (data.removeImage) {
      imageUrl = '';
      driveFileId = '';
    }

    await db.prepare(`
      UPDATE electrical_nodes SET
        node_code = ?,
        name = ?,
        node_type = ?,
        parent_id = ?,
        current_rating = ?,
        voltage = ?,
        location = ?,
        remark = ?,
        image_url = ?,
        drive_file_id = ?,
        sort_order = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      nodeCode, name, nodeType, parentId, currentRating,
      voltage, location, remark, imageUrl, driveFileId, sortOrder, now, id
    ).run();

  } else {
    // Generate next monotonic ID
    const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM electrical_nodes').first();
    const nextSeq = (countRow?.cnt || 0) + 1;
    id = generateElectricalId(nextSeq);

    // Verify ID doesn't collide
    const idCheck = await db.prepare('SELECT id FROM electrical_nodes WHERE id = ?').bind(id).first();
    if (idCheck) {
      id = 'EL-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    }

    await db.prepare(`
      INSERT INTO electrical_nodes (
        id, node_code, name, node_type, parent_id,
        current_rating, voltage, location, remark,
        image_url, drive_file_id, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      id, nodeCode, name, nodeType, parentId,
      currentRating, voltage, location, remark,
      imageUrl, driveFileId, sortOrder, now, now
    ).run();
  }

  return getElectricalNode(env, id);
}

/**
 * Bulk update wiring feeder links: array of { id, parentId }
 */
export async function bulkUpdateWiring(env, actor, links) {
  if (!Array.isArray(links)) fail('VALIDATION', 'รูปแบบข้อมูลการเชื่อมโยงไม่ถูกต้อง', 422);
  const db = env.DB;
  const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  // Validate all links for circular dependencies
  for (const link of links) {
    if (!link.id) continue;
    const parentId = link.parentId ? String(link.parentId).trim() : null;
    if (parentId) {
      await checkCircularDependency(db, link.id, parentId);
    }
  }

  // Execute batch updates
  const stmts = links.map(link => {
    const parentId = link.parentId ? String(link.parentId).trim() : null;
    return db.prepare('UPDATE electrical_nodes SET parent_id = ?, updated_at = ? WHERE id = ?').bind(parentId, now, link.id);
  });

  if (stmts.length > 0) {
    await db.batch(stmts);
  }

  return { success: true, updatedCount: links.length };
}

/**
 * Delete electrical node (detaches children to prevent broken trees)
 */
export async function deleteElectricalNode(env, actor, id) {
  const db = env.DB;
  const existing = await db.prepare('SELECT id, node_code, name FROM electrical_nodes WHERE id = ?').bind(id).first();
  if (!existing) fail('NOT_FOUND', 'ไม่พบข้อมูลตู้หรืออุปกรณ์ที่ต้องการลบ', 404);

  const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  // Detach children by setting parent_id = NULL
  await db.prepare('UPDATE electrical_nodes SET parent_id = NULL, updated_at = ? WHERE parent_id = ?').bind(now, id).run();

  // Remove the node
  await db.prepare('DELETE FROM electrical_nodes WHERE id = ?').bind(id).run();

  return { success: true, id, nodeCode: existing.node_code };
}

/**
 * Get references for form selectors: available parents, machines, types
 */
export async function getElectricalReferences(env) {
  const db = env.DB;

  const nodes = (await db.prepare(`
    SELECT id, node_code as nodeCode, name, node_type as nodeType, parent_id as parentId, location, current_rating as currentRating
    FROM electrical_nodes
    WHERE is_active = 1
    ORDER BY (CASE WHEN node_type = 'MDB' THEN 1 ELSE 2 END) ASC, node_code ASC
  `).all()).results || [];

  let machines = [];
  try {
    machines = (await db.prepare(`
      SELECT machine_id as machineId, machine_code as machineCode, machine_name as machineName, dept_id as deptId, line_id as lineId
      FROM machines
      WHERE is_active = 1
      ORDER BY machine_code ASC
    `).all()).results || [];
  } catch (_) {}

  return {
    nodes,
    machines,
    types: [
      { code: 'MDB', label: 'Main Distribution Board (MDB)', badge: 'MDB', color: '#b91c1c', bg: '#fef2f2' },
      { code: 'DB', label: 'Distribution Board (DB)', badge: 'DB', color: '#d97706', bg: '#fffbeb' },
      { code: 'LP', label: 'Load Panel (LP)', badge: 'LP', color: '#0284c7', bg: '#f0f9ff' },
      { code: 'MC', label: 'Machine (เครื่องจักร)', badge: 'MC', color: '#16a34a', bg: '#f0fdf4' },
      { code: 'DV', label: 'Device (อุปกรณ์ไฟฟ้า)', badge: 'DV', color: '#6366f1', bg: '#f5f3ff' }
    ]
  };
}
