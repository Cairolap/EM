import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database, seed } from './db.mjs';
import { getPMReferences, getPMCycleData, savePMCycleOrders, listPMOverview } from '../src/pm-service.js';

test('PM Orders service: lifecycle, validation, and machine orders', async () => {
  const db = database();
  seed(db);

  // Seed machine in L01
  db.raw.exec(`
    INSERT INTO machines (
      id, code, normalized_code, name, department_id, line_id,
      criticality, status, created_at, created_by, updated_at, updated_by, is_active, version, request_id
    ) VALUES 
      ('M01', 'RB2', 'rb2', 'ROBOT PALLETZER', 'D01', 'L01', 'สูง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r1'),
      ('M02', 'AP301', 'ap301', 'Auto Packing 301', 'D01', 'L01', 'กลาง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r2'),
      ('M03', 'AP302', 'ap302', 'Auto Packing 302', 'D01', 'L01', 'กลาง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r3'),
      ('M04', 'MX1000', 'mx1000', 'MAXI : Center', 'D01', 'L01', 'สูง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r4');
  `);

  const env = { DB: db, MAINTENANCE_MODE: 'false' };
  const actor = { id: 'test-admin', username: 'admin', role: 'admin' };

  // 1. Get references
  const refs = await getPMReferences(env);
  assert.ok(refs.departments.length > 0);
  assert.ok(refs.lines.length > 0);

  // 2. Fetch cycle data when no cycle has been saved yet
  const initData = await getPMCycleData(env, { lineId: 'L01', year: 2026, roundNo: 1 });
  assert.equal(initData.lineId, 'L01');
  assert.equal(initData.year, 2026);
  assert.equal(initData.roundNo, 1);
  assert.equal(initData.machines.length, 4);
  const codes = initData.machines.map(m => m.machineCode);
  assert.ok(codes.includes('RB2'));
  assert.ok(codes.includes('AP301'));
  assert.equal(initData.yearRounds.length, 5); // 5 rounds maximum per year

  // 3. Validation: round number must be 1 to 5
  await assert.rejects(
    async () => getPMCycleData(env, { lineId: 'L01', year: 2026, roundNo: 6 }),
    /รอบ PM ต้องอยู่ระหว่าง 1 ถึง 5/
  );

  // 4. Save orders for Round 1
  const saveRes = await savePMCycleOrders(env, actor, {
    lineId: 'L01',
    year: 2026,
    roundNo: 1,
    targetMonth: '2026-10',
    orders: [
      { machineId: 'M01', orderNo: '13110001' },
      { machineId: 'M02', orderNo: '13110002' },
      { machineId: 'M03', orderNo: '13110003' },
      { machineId: 'M04', orderNo: '13110004' }
    ]
  });
  assert.equal(saveRes.success, true);
  assert.equal(saveRes.savedCount, 4);

  // 5. Fetch after save
  const savedData = await getPMCycleData(env, { lineId: 'L01', year: 2026, roundNo: 1 });
  assert.equal(savedData.targetMonth, '2026-10');
  const m1 = savedData.machines.find(m => m.machineCode === 'RB2');
  assert.equal(m1.orderNo, '13110001');
  assert.equal(m1.isFilled, true);

  // Round 1 is now marked as existing
  const r1Summary = savedData.yearRounds.find(r => r.roundNo === 1);
  assert.equal(r1Summary.exists, true);
  assert.equal(r1Summary.filledCount, 4);

  // 6. Test overview matrix
  const overview = await listPMOverview(env, { year: 2026 });
  assert.equal(overview.year, 2026);
  assert.ok(overview.overview.length > 0);
  const l01Overview = overview.overview.find(o => o.lineId === 'L01');
  assert.ok(l01Overview);
  assert.equal(l01Overview.rounds[0].filledCount, 4);
  assert.equal(l01Overview.rounds[0].isComplete, true);
});
