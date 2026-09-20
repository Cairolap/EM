import {fail} from './errors.js';
import {hashPassword} from './auth.js';

function ensureAdmin(actor) {
  if (actor.permissions?.users !== 'admin' && actor.role !== 'admin') {
    fail('FORBIDDEN', 'ไม่มีสิทธิ์ในการจัดการผู้ใช้งาน', 403);
  }
}

export async function listUsers(env, actor) {
  ensureAdmin(actor);
  const rows = await env.DB.prepare(
    'SELECT id, username, display_name, role, user_type, expires_at, permissions_json, is_active, created_at, updated_at FROM app_users ORDER BY username'
  ).all();
  return (rows.results || []).map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    role: u.role,
    userType: u.user_type || 'permanent',
    expiresAt: u.expires_at || null,
    permissions: JSON.parse(u.permissions_json || '{}'),
    isActive: Boolean(u.is_active),
    createdAt: u.created_at,
    updatedAt: u.updated_at
  }));
}

export async function createUser(env, actor, payload) {
  ensureAdmin(actor);
  const username = payload.username?.trim().toLowerCase();
  const password = payload.password;
  const displayName = payload.displayName?.trim() || username;
  const role = payload.role || 'viewer';
  const userType = payload.userType === 'temporary' ? 'temporary' : 'permanent';
  const expiresAt = userType === 'temporary' ? (payload.expiresAt || null) : null;
  const permissions = payload.permissions || {};

  if (!username || !/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    fail('VALIDATION', 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข 3-30 ตัวอักษร', 422);
  }
  if (!password || password.length < 5) {
    fail('VALIDATION', 'รหัสผ่านเริ่มต้นต้องมีความยาวอย่างน้อย 5 ตัวอักษร', 422);
  }
  if (userType === 'temporary' && !expiresAt) {
    fail('VALIDATION', 'ผู้ใช้ชั่วคราวต้องกำหนดวันหมดอายุ', 422);
  }

  const existing = await env.DB.prepare('SELECT id FROM app_users WHERE username=?').bind(username).first();
  if (existing) fail('CONFLICT', 'ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น', 409);

  const salt = crypto.randomUUID().replace(/-/g, '');
  const hash = await hashPassword(password, salt);
  const id = 'usr-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date().toISOString();
  const permsJson = JSON.stringify(permissions);

  await env.DB.prepare(
    'INSERT INTO app_users (id, username, password_hash, password_salt, display_name, role, user_type, expires_at, permissions_json, is_active, force_password_change, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)'
  ).bind(id, username, hash, salt, displayName, role, userType, expiresAt, permsJson, now, now).run();

  return { id, username, displayName, role, userType, expiresAt, permissions, isActive: true };
}

export async function updateUser(env, actor, id, payload) {
  ensureAdmin(actor);
  const user = await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(id).first();
  if (!user) fail('NOT_FOUND', 'ไม่พบผู้ใช้นี้ในระบบ', 404);

  const displayName = payload.displayName?.trim() || user.display_name;
  const role = payload.role || user.role;
  const userType = payload.userType === 'temporary' ? 'temporary' : 'permanent';
  const expiresAt = userType === 'temporary' ? (payload.expiresAt || user.expires_at) : null;
  const permissions = payload.permissions || JSON.parse(user.permissions_json || '{}');
  const isActive = typeof payload.isActive === 'boolean' ? (payload.isActive ? 1 : 0) : user.is_active;

  if (userType === 'temporary' && !expiresAt) {
    fail('VALIDATION', 'ผู้ใช้ชั่วคราวต้องกำหนดวันหมดอายุ', 422);
  }

  // Prevent admin from deactivating themselves
  if (user.username === actor.username && isActive === 0) {
    fail('VALIDATION', 'ไม่สามารถระงับการใช้งานบัญชีของตนเองได้', 422);
  }

  const now = new Date().toISOString();
  const permsJson = JSON.stringify(permissions);

  await env.DB.prepare(
    'UPDATE app_users SET display_name=?, role=?, user_type=?, expires_at=?, permissions_json=?, is_active=?, updated_at=? WHERE id=?'
  ).bind(displayName, role, userType, expiresAt, permsJson, isActive, now, id).run();

  if (isActive === 0) {
    // Purge sessions when deactivated
    await env.DB.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(id).run();
  }

  return { id, username: user.username, displayName, role, userType, expiresAt, permissions, isActive: Boolean(isActive) };
}

export async function resetPassword(env, actor, id) {
  ensureAdmin(actor);
  const user = await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(id).first();
  if (!user) fail('NOT_FOUND', 'ไม่พบผู้ใช้นี้ในระบบ', 404);

  // Set password to 1234 and force_password_change to 1
  const salt = crypto.randomUUID().replace(/-/g, '');
  const hash = await hashPassword('1234', salt);
  const now = new Date().toISOString();

  await env.DB.prepare(
    'UPDATE app_users SET password_hash=?, password_salt=?, force_password_change=1, updated_at=? WHERE id=?'
  ).bind(hash, salt, now, id).run();

  // Revoke all existing sessions for this user
  await env.DB.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(id).run();

  return { ok: true, message: 'รีเซ็ตรหัสผ่านเป็น 1234 เรียบร้อย ผู้ใช้จะต้องเปลี่ยนรหัสผ่านทันทีที่เข้าสู่ระบบ' };
}

export async function deleteUser(env, actor, id) {
  ensureAdmin(actor);
  const user = await env.DB.prepare('SELECT * FROM app_users WHERE id=?').bind(id).first();
  if (!user) fail('NOT_FOUND', 'ไม่พบผู้ใช้นี้ในระบบ', 404);

  if (user.username === actor.username || user.username === 'admin') {
    fail('FORBIDDEN', 'ไม่สามารถลบบัญชีของตนเองหรือบัญชีหลักของระบบได้', 403);
  }

  await env.DB.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(id).run();
  await env.DB.prepare('DELETE FROM app_users WHERE id=?').bind(id).run();

  return { ok: true };
}
