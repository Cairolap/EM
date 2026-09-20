import {fail,hash} from './errors.js';

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: enc.encode(saltHex),
    iterations: 100000,
    hash: 'SHA-256'
  }, keyMaterial, 256);
  const arr = new Uint8Array(derived);
  let hex = '';
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, '0');
  return hex;
}

export async function authenticateUser(db, username, password) {
  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    fail('VALIDATION', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 422);
  }
  const user = await db.prepare('SELECT * FROM app_users WHERE username=? AND is_active=1')
    .bind(username.trim().toLowerCase()).first();
  if (!user) fail('AUTH', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);

  if (user.user_type === 'temporary' && user.expires_at) {
    if (Date.now() > new Date(user.expires_at).getTime()) {
      fail('AUTH', 'บัญชีชั่วคราวนี้หมดอายุการใช้งานแล้ว กรุณาติดต่อผู้ดูแล', 401);
    }
  }

  const calculatedHash = await hashPassword(password, user.password_salt);
  if (calculatedHash !== user.password_hash) fail('AUTH', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);

  const mustChangePassword = password.length < 5 || Boolean(user.force_password_change);
  let permissions = {};
  try { permissions = JSON.parse(user.permissions_json || '{}'); } catch (_) {}
  const defaultPerms = user.role === 'admin'
    ? { machines: 'write', parts: 'write', bom: 'write', users: 'admin', can_delete: true }
    : user.role === 'editor'
    ? { machines: 'write', parts: 'write', bom: 'write', users: 'none', can_delete: false }
    : { machines: 'read', parts: 'read', bom: 'read', users: 'none', can_delete: false };

  return {
    ...user,
    permissions: { ...defaultPerms, ...permissions },
    mustChangePassword
  };
}

export async function changePassword(db, userId, newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 5) {
    fail('VALIDATION', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 5 ตัวอักษร', 422);
  }
  const salt = crypto.randomUUID().replace(/-/g, '');
  const newHash = await hashPassword(newPassword, salt);
  const now = new Date().toISOString();
  await db.prepare('UPDATE app_users SET password_hash=?, password_salt=?, force_password_change=0, updated_at=? WHERE id=?')
    .bind(newHash, salt, now, userId).run();
}

export async function createSession(db, userId) {
  const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const tokenHash = await hash(rawToken);
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO app_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt, now).run();
  return { rawToken, expiresAt };
}

export async function destroySession(db, rawToken) {
  if (!rawToken) return;
  const tokenHash = await hash(rawToken);
  await db.prepare('DELETE FROM app_sessions WHERE token_hash=?').bind(tokenHash).run();
}

export async function authenticate(request, env) {
  const url = new URL(request.url);

  // 1. Local development admin bypass
  if (env.ENVIRONMENT === 'local' && env.DEV_AUTH === 'local-admin' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    return {
      id: 'local-admin', username: 'admin', role: 'admin', displayName: 'Local Admin',
      permissions: { machines: 'write', parts: 'write', bom: 'write', users: 'admin', can_delete: true },
      mustChangePassword: false
    };
  }

  // 2. Machine-to-machine BOM token
  if (url.pathname.startsWith('/api/v1/integrations/bom/') && request.method === 'GET' && env.BOM_SERVICE_TOKEN) {
    const token = request.headers.get('Authorization') || '';
    if (await hash(token) === await hash('Bearer ' + env.BOM_SERVICE_TOKEN)) {
      return {
        id: 'bom-service', username: 'bom-service', role: 'integration', displayName: 'BOM Service',
        permissions: { machines: 'read', parts: 'read', bom: 'read', users: 'none', can_delete: false },
        mustChangePassword: false
      };
    }
  }

  // 3. Built-in Session Cookie / Bearer Token
  const cookie = request.headers.get('Cookie') || '';
  const sessionToken = cookie.match(/(?:^|;\s*)em_session=([^;]+)/)?.[1] || request.headers.get('Authorization')?.replace(/^Bearer\s+/, '');
  if (sessionToken) {
    const tokenHash = await hash(sessionToken);
    const session = await env.DB.prepare(
      'SELECT u.id, u.username, u.display_name, u.role, u.user_type, u.expires_at, u.permissions_json, u.force_password_change FROM app_sessions s JOIN app_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at > ? AND u.is_active=1'
    ).bind(tokenHash, Date.now()).first();

    if (session) {
      if (session.user_type === 'temporary' && session.expires_at) {
        if (Date.now() > new Date(session.expires_at).getTime()) {
          fail('AUTH', 'บัญชีชั่วคราวนี้หมดอายุการใช้งานแล้ว กรุณาติดต่อผู้ดูแล', 401);
        }
      }

      let permissions = {};
      try { permissions = JSON.parse(session.permissions_json || '{}'); } catch (_) {}
      const defaultPerms = session.role === 'admin'
        ? { machines: 'write', parts: 'write', bom: 'write', users: 'admin', can_delete: true }
        : session.role === 'editor'
        ? { machines: 'write', parts: 'write', bom: 'write', users: 'none', can_delete: false }
        : { machines: 'read', parts: 'read', bom: 'read', users: 'none', can_delete: false };

      return {
        id: session.id,
        username: session.username,
        role: session.role,
        displayName: session.display_name,
        permissions: { ...defaultPerms, ...permissions },
        mustChangePassword: Boolean(session.force_password_change)
      };
    }
  }

  // 4. Fallback if user configured Cloudflare Access in the future
  const domain = env.ACCESS_TEAM_DOMAIN;
  if (domain && env.ACCESS_AUD) {
    const cfToken = request.headers.get('Cf-Access-Jwt-Assertion') || cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
    if (cfToken) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cfToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(cfToken.split('.')[1].length/4)*4,'=')), c=>c.charCodeAt(0))));
        if (payload && payload.email) {
          const email = payload.email.toLowerCase();
          const record = await env.DB.prepare('SELECT role FROM user_roles WHERE email=?').bind(email).first();
          const role = record?.role || (email === String(env.OWNER_EMAIL || '').toLowerCase() ? 'admin' : null);
          if (role) {
            const defaultPerms = role === 'admin'
              ? { machines: 'write', parts: 'write', bom: 'write', users: 'admin', can_delete: true }
              : { machines: 'write', parts: 'write', bom: 'write', users: 'none', can_delete: false };
            return { id: email, username: email, role, displayName: email, permissions: defaultPerms, mustChangePassword: false };
          }
        }
      } catch (_) {}
    }
  }

  fail('AUTH', 'กรุณาเข้าสู่ระบบก่อนใช้งาน', 401);
}

export function authorizeWrite(actor, env, scope = 'machines') {
  if (actor.permissions) {
    if (actor.permissions[scope] !== 'write') fail('FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลในส่วนนี้', 403);
  } else if (!['editor', 'admin'].includes(actor.role)) {
    fail('FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูล', 403);
  }
  if (env.MAINTENANCE_MODE !== 'false') fail('MAINTENANCE', 'ระบบอยู่ระหว่างเตรียมข้อมูล กรุณาลองใหม่ภายหลัง', 503);
}

export function authorizeDelete(actor, env, scope = 'machines') {
  authorizeWrite(actor, env, scope);
  if (actor.permissions && !actor.permissions.can_delete) {
    fail('FORBIDDEN', 'บัญชีนี้ไม่ได้รับสิทธิ์ในการลบข้อมูล', 403);
  }
}

