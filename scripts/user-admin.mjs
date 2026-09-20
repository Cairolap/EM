import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {hashPassword} from '../src/auth.js';

const args = process.argv.slice(2);
const command = args[0];

function getEnvFlag() {
  const idx = args.findIndex(a => a.startsWith('--env'));
  if (idx !== -1) {
    const val = args[idx].includes('=') ? args[idx].split('=')[1] : args[idx + 1];
    return ['--env', val, '--remote'];
  }
  if (args.includes('--local')) return ['--local'];
  return ['--env', 'production', '--remote'];
}

function runD1(sql) {
  const envFlags = getEnvFlag();
  const cmd = `npx wrangler d1 execute DB ${envFlags.join(' ')} --command "${sql.replace(/"/g, '\\"')}" --json`;
  const res = spawnSync(cmd, {shell: true, encoding: 'utf8'});
  if (res.status !== 0) {
    console.error('D1 Command Failed:', res.stderr || res.stdout);
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(res.stdout);
    return parsed[0]?.results || [];
  } catch {
    return res.stdout;
  }
}

async function main() {
  if (!command || command === 'help') {
    console.log(`
=== Electrical Maintenance User Administration Tool ===

Usage:
  node scripts/user-admin.mjs list [--env production|staging|--local]
  node scripts/user-admin.mjs add <username> <password> <role> [displayName] [--env production|staging|--local]
  node scripts/user-admin.mjs passwd <username> <newPassword> [--env production|staging|--local]
  node scripts/user-admin.mjs deactivate <username> [--env production|staging|--local]
  node scripts/user-admin.mjs activate <username> [--env production|staging|--local]

Roles:
  admin  - สิทธิ์สูงสุด ดูและแก้ไขได้ทุกระบบ
  editor - แก้ไขข้อมูลเครื่องจักร อะไหล่ และ BOM ได้
  viewer - ดูข้อมูลได้อย่างเดียว
    `);
    return;
  }

  if (command === 'list') {
    const users = runD1('SELECT id, username, display_name, role, user_type, expires_at, is_active, created_at FROM app_users ORDER BY username');
    console.table(users);
    return;
  }

  if (command === 'add') {
    const username = args[1]?.toLowerCase().trim();
    const password = args[2];
    const role = args[3]?.toLowerCase();
    const displayName = args[4] && !args[4].startsWith('--') ? args[4] : username;

    if (!username || !password || !['admin', 'editor', 'viewer'].includes(role)) {
      console.error('Error: Invalid arguments. Usage: node scripts/user-admin.mjs add <username> <password> <admin|editor|viewer> [displayName]');
      process.exit(1);
    }

    const salt = randomBytes(16).toString('hex');
    const hash = await hashPassword(password, salt);
    const id = 'usr-' + randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const defaultPerms = role === 'admin'
      ? { machines: 'write', parts: 'write', bom: 'write', users: 'admin', can_delete: true }
      : role === 'editor'
      ? { machines: 'write', parts: 'write', bom: 'write', users: 'none', can_delete: false }
      : { machines: 'read', parts: 'read', bom: 'read', users: 'none', can_delete: false };
    const permsJson = JSON.stringify(defaultPerms).replace(/'/g, "''");

    const sql = `INSERT INTO app_users (id, username, password_hash, password_salt, display_name, role, user_type, permissions_json, is_active, force_password_change, created_at, updated_at) VALUES ('${id}', '${username}', '${hash}', '${salt}', '${displayName}', '${role}', 'permanent', '${permsJson}', 1, 0, '${now}', '${now}')`;
    runD1(sql);
    console.log(`✅ User '${username}' (${role}) added successfully.`);
    return;
  }

  if (command === 'reset1234') {
    const username = args[1]?.toLowerCase().trim();
    if (!username) {
      console.error('Usage: node scripts/user-admin.mjs reset1234 <username>');
      process.exit(1);
    }
    const salt = randomBytes(16).toString('hex');
    const hash = await hashPassword('1234', salt);
    const now = new Date().toISOString();
    const sql = `UPDATE app_users SET password_hash='${hash}', password_salt='${salt}', force_password_change=1, updated_at='${now}' WHERE username='${username}'; DELETE FROM app_sessions WHERE user_id IN (SELECT id FROM app_users WHERE username='${username}');`;
    runD1(sql);
    console.log(`✅ Password for '${username}' reset to 1234. User will be forced to change password on login.`);
    return;
  }

  if (command === 'passwd') {
    const username = args[1]?.toLowerCase().trim();
    const newPassword = args[2];

    if (!username || !newPassword) {
      console.error('Error: Usage: node scripts/user-admin.mjs passwd <username> <newPassword>');
      process.exit(1);
    }

    const salt = randomBytes(16).toString('hex');
    const hash = await hashPassword(newPassword, salt);
    const now = new Date().toISOString();

    const sql = `UPDATE app_users SET password_hash='${hash}', password_salt='${salt}', updated_at='${now}' WHERE username='${username}'; DELETE FROM app_sessions WHERE user_id IN (SELECT id FROM app_users WHERE username='${username}');`;
    runD1(sql);
    console.log(`✅ Password for '${username}' updated successfully. All existing sessions revoked.`);
    return;
  }

  if (command === 'deactivate') {
    const username = args[1]?.toLowerCase().trim();
    const sql = `UPDATE app_users SET is_active=0 WHERE username='${username}'; DELETE FROM app_sessions WHERE user_id IN (SELECT id FROM app_users WHERE username='${username}');`;
    runD1(sql);
    console.log(`✅ User '${username}' deactivated.`);
    return;
  }

  if (command === 'activate') {
    const username = args[1]?.toLowerCase().trim();
    const sql = `UPDATE app_users SET is_active=1 WHERE username='${username}';`;
    runD1(sql);
    console.log(`✅ User '${username}' activated.`);
    return;
  }

  console.error('Unknown command. Run with "help" for options.');
}

main().catch(console.error);
