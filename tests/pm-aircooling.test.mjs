import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './db.mjs';
import {
  listAirCoolingUnits,
  getAirCoolingUnit,
  saveAirCoolingUnit,
  deleteAirCoolingUnit,
  reportAirCoolingIssue,
  resolveAirCoolingIssue,
  getAirCoolingReferences,
  addOneYear,
  generateAirCoolingId
} from '../src/pm-aircooling-service.js';

test('PM Air Cooling Service: CRUD lifecycle, date calculation, status tracking and validation', async () => {
  const db = database();
  const env = { DB: db, MAINTENANCE_MODE: 'false' };
  const adminActor = { id: 'admin-1', username: 'admin', role: 'admin' };
  const userActor = { id: 'user-1', username: 'engineer', role: 'user', permissions: { can_delete: false } };

  // 1. Helper date calculation test
  assert.equal(addOneYear('2026-06-14'), '2027-06-14');
  assert.equal(addOneYear(''), '');
  assert.match(generateAirCoolingId(), /^AC-[0-9A-F]{8}$/);

  // Clear any auto-bootstrapped data for deterministic unit test assertions
  await env.DB.prepare('DELETE FROM pm_aircooling_units').run();

  // 2. Initial listing when table is empty
  const initList = await env.DB.prepare('SELECT COUNT(*) as count FROM pm_aircooling_units').first();
  assert.equal(initList.count, 0);

  // 3. Validation on create
  await assert.rejects(
    async () => saveAirCoolingUnit(env, adminActor, { dept: 'CC' }),
    /กรุณาระบุ ID Tag/
  );
  await assert.rejects(
    async () => saveAirCoolingUnit(env, adminActor, { idTag: 'CC-01' }),
    /กรุณาเลือกแผนก/
  );

  // 4. Create first unit (CC-01) with automatic +1 year calculation
  const created1 = await saveAirCoolingUnit(env, adminActor, {
    dept: 'CC',
    idTag: 'CC-01',
    line: 'CC1',
    location: 'LNR120',
    brand: 'TEXA',
    power: 930,
    serial: '00160322',
    lastCleanDate: '2026-06-14',
    details: 'แอร์เป่าตู้คอนโทรล',
    note: 'เคยวัดกระแสได้ 3.9A'
  });

  assert.ok(created1.id.startsWith('AC-'));
  assert.equal(created1.idTag, 'CC-01');
  assert.equal(created1.dept, 'CC');
  assert.equal(created1.nextCleanDate, '2027-06-14'); // +1 year auto-calculated!

  // 5. Create second unit (PP-01) with explicit overdue next clean date
  const created2 = await saveAirCoolingUnit(env, adminActor, {
    dept: 'PP',
    idTag: 'PP-01',
    line: 'PP1',
    location: 'CAP-PRESS',
    brand: 'Rittal',
    power: 1200,
    lastCleanDate: '2024-01-01',
    nextCleanDate: '2025-01-01' // in the past -> overdue
  });
  assert.equal(created2.cleanStatus, 'overdue');

  // 6. List and filter units
  const allList = await listAirCoolingUnits(env);
  assert.equal(allList.units.length, 2);
  assert.equal(allList.stats.total, 2);
  assert.equal(allList.stats.overdue, 1);
  assert.equal(allList.stats.byDept.CC, 1);
  assert.equal(allList.stats.byDept.PP, 1);

  // Filter by dept
  const ccOnly = await listAirCoolingUnits(env, { dept: 'CC' });
  assert.equal(ccOnly.units.length, 1);
  assert.equal(ccOnly.units[0].idTag, 'CC-01');

  // Search by term
  const searchRes = await listAirCoolingUnits(env, { search: 'Rittal' });
  assert.equal(searchRes.units.length, 1);
  assert.equal(searchRes.units[0].idTag, 'PP-01');

  // 7. Update Unit & Quick Clean partial update
  const updated1 = await saveAirCoolingUnit(env, adminActor, {
    id: created1.id,
    dept: 'CC',
    idTag: 'CC-01',
    line: 'CC1',
    location: 'LNR120-MODIFIED',
    brand: 'TEXA',
    power: 950,
    note: 'อัปเดตกระแสไฟ 4.1A'
  });
  assert.equal(updated1.location, 'LNR120-MODIFIED');
  assert.equal(updated1.power, 950);
  assert.equal(updated1.note, 'อัปเดตกระแสไฟ 4.1A');
  // Untouched fields must be preserved!
  assert.equal(updated1.details, 'แอร์เป่าตู้คอนโทรล');
  assert.equal(updated1.serial, '00160322');
  assert.equal(updated1.lastCleanDate, '2026-06-14');
  assert.equal(updated1.nextCleanDate, '2027-06-14');

  // Quick Clean simulation (partial update with only lastCleanDate)
  const quickCleaned = await saveAirCoolingUnit(env, adminActor, {
    id: created1.id,
    lastCleanDate: '2026-10-18'
  });
  assert.equal(quickCleaned.lastCleanDate, '2026-10-18');
  assert.equal(quickCleaned.nextCleanDate, '2027-10-18'); // +1 year auto-calculated!
  assert.equal(quickCleaned.location, 'LNR120-MODIFIED'); // all other fields intact!
  assert.equal(quickCleaned.power, 950);
  assert.equal(quickCleaned.details, 'แอร์เป่าตู้คอนโทรล');

  // Leap year date calculation verification
  assert.equal(addOneYear('2024-02-29'), '2025-02-28');
  assert.equal(addOneYear('2025-02-28'), '2026-02-28');

  // 8. Report Issue
  const reported = await reportAirCoolingIssue(env, userActor, {
    id: created1.id,
    issue: 'พัดลมมีเสียงดัง',
    details: 'ตรวจพบเสียงแบริ่งดังผิดปกติ',
    reporter: 'สมชาย',
    phone: '1234'
  });
  assert.equal(reported.cleanStatus, 'reported');
  assert.equal(reported.reportStatus, 'pending');
  assert.equal(reported.reportInfo.issue, 'พัดลมมีเสียงดัง');
  assert.equal(reported.reportInfo.reporter, 'สมชาย');

  // 9. Resolve Issue
  const resolved = await resolveAirCoolingIssue(env, adminActor, created1.id);
  assert.equal(resolved.reportStatus, 'resolved');
  assert.notEqual(resolved.cleanStatus, 'reported');

  // 10. Get References
  const refs = await getAirCoolingReferences(env);
  assert.ok(refs.departments.includes('CC'));
  assert.ok(refs.departments.includes('PP'));
  assert.ok(refs.brands.includes('TEXA'));
  assert.ok(refs.spreadsheetUrl.includes('1qmKINhpuUOenTavwDezQHV2IP4CaweJQ0o6ZL05rKiE'));

  // 11. Delete Unit
  const delRes = await deleteAirCoolingUnit(env, adminActor, created2.id);
  assert.equal(delRes.success, true);

  const afterDel = await listAirCoolingUnits(env);
  assert.equal(afterDel.units.length, 1);
  assert.equal(afterDel.units[0].id, created1.id);
});
