import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database, seed } from './db.mjs';
import { hashPassword } from '../src/auth.js';
import {
  getPRReferences,
  listPRItems,
  getPRItem,
  savePRItem,
  bulkSavePRItems,
  archivePRItems,
  bulkUpdateArea,
  deletePRItems
} from '../src/pr-service.js';

test('PR and Store Tracker: lifecycle, pipeline stages, metrics, bulk actions, and admin delete', async () => {
  const db = database();
  seed(db);

  // Seed test machines
  db.raw.exec(`
    INSERT INTO machines (
      id, code, normalized_code, name, department_id, line_id,
      criticality, status, created_at, created_by, updated_at, updated_by, is_active, version, request_id
    ) VALUES 
      ('M01', 'RB2', 'rb2', 'ROBOT PALLETIZER', 'D01', 'L01', 'สูง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r1'),
      ('M02', 'LNR301', 'lnr301', 'Lining Machine 301', 'D01', 'L01', 'สูง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r2');
  `);

  // The default admin user from migration 0003 has password 'admin1234'
  const env = { DB: db, MAINTENANCE_MODE: 'false', ENVIRONMENT: 'production' };
  const actor = { id: 'test-editor', username: 'electrician1', role: 'editor', permissions: { pm: 'write' } };

  // 1. Get references
  const refs = await getPRReferences(env);
  assert.ok(refs.departments.length > 0);
  assert.ok(refs.lines.length > 0);
  assert.ok(refs.machines.length >= 2);

  // 2. Validate empty description fails
  await assert.rejects(
    async () => savePRItem(env, actor, { description: '' }),
    /กรุณากรอกรายละเอียดสินค้าหรือบริการ/
  );

  // 3. Create items in different pipeline stages
  // Item 1: รอออก PR (ไม่มี doc_no)
  const item1Res = await savePRItem(env, actor, {
    createdDate: '2026-10-15',
    docType: 'PR',
    docNo: '',
    departmentId: 'D01',
    lineId: 'L01',
    machineId: 'M01',
    orderNo: '13110001',
    description: 'Proximity Sensor M12',
    qty: 2,
    unit: 'ตัว',
    price: 850,
    deliveryDate: '2026-10-30',
    notes: 'ใช้สำหรับไลน์ 1'
  });
  assert.ok(item1Res.id);

  // Item 2: รอออก PO (มี doc_no แต่ไม่มี po_no)
  const item2Res = await savePRItem(env, actor, {
    createdDate: '2026-10-16',
    docType: 'PR',
    docNo: 'PR-69001',
    departmentId: 'D01',
    lineId: 'L01',
    machineCode: 'LNR301',
    orderNo: '13110002',
    description: 'Contactor 9A Schneider',
    qty: 5,
    unit: 'ชิ้น',
    price: 620,
    poNo: '',
    deliveryDate: '2026-10-20'
  });
  assert.ok(item2Res.id);

  // Item 3: รอรับของ (มี doc_no และมี po_no)
  const item3Res = await savePRItem(env, actor, {
    createdDate: '2026-10-17',
    docType: 'STORE',
    docNo: 'ST-88001',
    departmentId: 'D01',
    lineId: 'L01',
    machineId: 'M01',
    orderNo: '13110001',
    description: 'Bearing 6205 SKF',
    qty: 10,
    unit: 'ตลับ',
    price: 250,
    poNo: 'PO-2026-99',
    deliveryDate: '2026-10-25'
  });
  assert.ok(item3Res.id);

  // 4. List items and check pipeline counts and metrics
  const listRes = await listPRItems(env, { folder: 'inbox' });
  assert.equal(listRes.items.length, 3);
  assert.equal(listRes.pipelineCounts.inbox, 3);
  assert.equal(listRes.pipelineCounts.pendingPr, 1);
  assert.equal(listRes.pipelineCounts.pendingPo, 1);
  assert.equal(listRes.pipelineCounts.pendingReceipt, 1);

  // Total quantity: 2 + 5 + 10 = 17
  assert.equal(listRes.metrics.totalQty, 17);
  // Total price: (2 * 850) + (5 * 620) + (10 * 250) = 1700 + 3100 + 2500 = 7300
  assert.equal(listRes.metrics.totalAmount, 7300);

  // 5. Test pipeline filtering
  const prPending = await listPRItems(env, { pipelineStep: 'PENDING_PR' });
  assert.equal(prPending.items.length, 1);
  assert.equal(prPending.items[0].id, item1Res.id);
  assert.equal(prPending.items[0].pipelineStatus, 'PENDING_PR');

  const poPending = await listPRItems(env, { pipelineStep: 'PENDING_PO' });
  assert.equal(poPending.items.length, 1);
  assert.equal(poPending.items[0].id, item2Res.id);
  assert.equal(poPending.items[0].pipelineStatus, 'PENDING_PO');

  const receiptPending = await listPRItems(env, { pipelineStep: 'PENDING_RECEIPT' });
  assert.equal(receiptPending.items.length, 1);
  assert.equal(receiptPending.items[0].id, item3Res.id);
  assert.equal(receiptPending.items[0].pipelineStatus, 'PENDING_RECEIPT');

  // 6. Test Global Search
  const searchRes = await listPRItems(env, { search: 'Schneider' });
  assert.equal(searchRes.items.length, 1);
  assert.equal(searchRes.items[0].id, item2Res.id);

  // 7. Test Bulk Update Area
  await bulkUpdateArea(env, actor, {
    ids: [item1Res.id, item2Res.id],
    lineId: 'L01',
    departmentId: 'D01',
    machineCode: 'RB2'
  });
  const updatedItem2 = await getPRItem(env, item2Res.id);
  assert.equal(updatedItem2.machine_code, 'RB2');

  // 8. Test Bulk Save (Inline Table Edit)
  await bulkSavePRItems(env, actor, [
    { id: item1Res.id, description: 'Proximity Sensor M12 Modified', qty: 4, price: 900, docNo: 'PR-69002' }
  ]);
  const editedItem1 = await getPRItem(env, item1Res.id);
  assert.equal(editedItem1.description, 'Proximity Sensor M12 Modified');
  assert.equal(editedItem1.qty, 4);
  assert.equal(editedItem1.price, 900);
  assert.equal(editedItem1.doc_no, 'PR-69002');

  // 9. Test Archive & Restore
  await archivePRItems(env, actor, { ids: [item3Res.id], archive: true });
  const archivedItem3 = await getPRItem(env, item3Res.id);
  assert.equal(archivedItem3.is_archived, 1);
  assert.ok(archivedItem3.archived_at);

  const archiveFolder = await listPRItems(env, { folder: 'archive' });
  assert.equal(archiveFolder.items.length, 1);
  assert.equal(archiveFolder.items[0].id, item3Res.id);

  // Restore
  await archivePRItems(env, actor, { ids: [item3Res.id], archive: false });
  const restoredItem3 = await getPRItem(env, item3Res.id);
  assert.equal(restoredItem3.is_archived, 0);

  // 10. Test Delete with Admin Password
  // Wrong password fails
  await assert.rejects(
    async () => deletePRItems(env, actor, { ids: [item1Res.id], adminPassword: 'wrong-password' }),
    /รหัสผ่านผู้ดูแลระบบ/
  );

  // Correct password succeeds
  const delRes = await deletePRItems(env, actor, { ids: [item1Res.id], adminPassword: 'admin1234' });
  assert.equal(delRes.deletedCount, 1);

  await assert.rejects(
    async () => getPRItem(env, item1Res.id),
    /ไม่พบรายการที่ระบุ/
  );

  // 11. Test 2-Year Retention Policy
  const past3Years = new Date();
  past3Years.setFullYear(past3Years.getFullYear() - 3);
  const oldDateStr = past3Years.toISOString().slice(0, 10);

  // Attempting to save item beyond 2-year window should fail
  await assert.rejects(
    async () => savePRItem(env, actor, {
      createdDate: oldDateStr,
      description: 'Ancient Spare Part',
      qty: 1
    }),
    /นโยบายจัดเก็บข้อมูลย้อนหลัง 2 ปี/
  );

  // Insert ancient item directly to simulate legacy data
  db.raw.exec(`
    INSERT INTO pr_tracker_items (
      id, created_date, doc_type, description, qty, unit, is_archived, created_at, created_by, updated_at, updated_by
    ) VALUES (
      'OLD-1', '${oldDateStr}', 'PR', 'Old Legacy Item', 1, 'ชิ้น', 0, '${oldDateStr}T00:00:00Z', 'sys', '${oldDateStr}T00:00:00Z', 'sys'
    );
  `);

  // listPRItems automatically prunes old items and provides retentionCutoff
  const listAfterRetention = await listPRItems(env, { folder: 'inbox' });
  assert.ok(listAfterRetention.retentionCutoff);
  assert.ok(!listAfterRetention.items.some(i => i.id === 'OLD-1'));

  // Verify OLD-1 is indeed deleted from the database table
  const checkOld = await env.DB.prepare('SELECT id FROM pr_tracker_items WHERE id = ?').bind('OLD-1').first();
  assert.equal(checkOld, null);
});
