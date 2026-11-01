import test from 'node:test';
import assert from 'node:assert/strict';
import { database } from './db.mjs';
import worker from '../src/worker.js';
import {
  listDepartmentPayPlan,
  saveDepartmentPayItem,
  moveDepartmentPayItem,
  deleteDepartmentPayItem,
  saveDepartmentPayBudget
} from '../src/department-pay-service.js';

test('Department Pay Service: 12-month planning, 8000 THB budget, public read & authenticated edit, and month shifting', async () => {
  const db = database();
  const env = { DB: db, ENVIRONMENT: 'test', MAINTENANCE_MODE: 'false' };
  const actor = { id: 'U1', username: 'admin', displayName: 'Admin', role: 'admin' };

  // 1. Default 12-month plan has 12 months with 8,000 THB budget each
  const initialPlan = await listDepartmentPayPlan(env, { startMonth: '2026-11', months: 12 });
  assert.equal(initialPlan.months.length, 12);
  assert.equal(initialPlan.defaultBudget, 8000);
  assert.equal(initialPlan.summary.totalBudget, 96000);
  assert.equal(initialPlan.months[0].yearMonth, '2026-11');
  assert.equal(initialPlan.months[11].yearMonth, '2027-10');

  // 2. Public GET endpoint works without login
  const pubReq = new Request('https://example.com/api/v1/department-pay/public?startMonth=2026-11&months=12', {
    method: 'GET'
  });
  const pubRes = await worker.fetch(pubReq, env);
  assert.equal(pubRes.status, 200);
  const pubBody = await pubRes.json();
  assert.equal(pubBody.ok, true);
  assert.equal(pubBody.data.months.length, 12);

  // 3. Unauthenticated write via RPC returns 401
  const unauthReq = new Request('https://example.com/api/v1/department-pay/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://example.com' },
    body: JSON.stringify({
      method: 'saveItem',
      args: [{ yearMonth: '2026-11', description: 'Digital Multimeter', price: 3500 }]
    })
  });
  const unauthRes = await worker.fetch(unauthReq, env);
  assert.equal(unauthRes.status, 401);

  // 4. Validation requires description
  await assert.rejects(
    async () => saveDepartmentPayItem(env, actor, { yearMonth: '2026-11', description: '   ', price: 1000 }),
    /กรุณาระบุรายละเอียดรายการ/
  );

  // 5. Create item with description, brand, price, leadTime, fileUrl
  const item1 = await saveDepartmentPayItem(env, actor, {
    yearMonth: '2026-12',
    description: 'แคลมป์มิเตอร์วัดกระแสไฟฟ้า',
    brand: 'Fluke',
    price: 4200,
    leadTime: '7 วัน',
    fileUrl: 'https://drive.google.com/file/d/example1'
  });
  assert.ok(item1.id.startsWith('DP-'));
  assert.equal(item1.yearMonth, '2026-12');
  assert.equal(item1.brand, 'Fluke');
  assert.equal(item1.price, 4200);
  assert.equal(item1.leadTime, '7 วัน');
  assert.equal(item1.fileUrl, 'https://drive.google.com/file/d/example1');

  // 6. Move item earlier by 1 month (from 2026-12 to 2026-11) and mark urgent
  const moved1 = await moveDepartmentPayItem(env, actor, {
    id: item1.id,
    offsetMonths: -1,
    isUrgent: true
  });
  assert.equal(moved1.yearMonth, '2026-11');
  assert.equal(moved1.isUrgent, true);

  // 7. Update default monthly budget and specific month budget
  await saveDepartmentPayBudget(env, actor, {
    defaultBudget: 8500,
    yearMonth: '2026-11',
    budgetAmount: 10000,
    note: 'งบเสริมซ่อมบำรุงปลายปี'
  });

  const updatedPlan = await listDepartmentPayPlan(env, { startMonth: '2026-11', months: 12 });
  assert.equal(updatedPlan.defaultBudget, 8500);
  const nov = updatedPlan.months.find(m => m.yearMonth === '2026-11');
  assert.equal(nov.budget, 10000);
  assert.equal(nov.spent, 4200);
  assert.equal(nov.remaining, 5800);
  assert.equal(nov.items.length, 1);

  // 8. Delete item
  const delRes = await deleteDepartmentPayItem(env, actor, item1.id);
  assert.equal(delRes.deletedId, item1.id);
});
