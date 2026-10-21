import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './db.mjs';
import {
  listElectricalNodes,
  getElectricalNode,
  saveElectricalNode,
  deleteElectricalNode,
  bulkUpdateWiring,
  getElectricalReferences
} from '../src/electrical-service.js';

test('Electrical Distribution Service: CRUD lifecycle, 2-step panel creation, wiring, and loop prevention', async () => {
  const db = database();
  const env = { DB: db, MAINTENANCE_MODE: 'false' };
  const adminActor = { id: 'admin-1', username: 'admin', role: 'admin' };
  const userActor = { id: 'user-1', username: 'tech', role: 'user', permissions: { can_delete: false } };

  // 1. Initial listing when empty
  const initList = await listElectricalNodes(env);
  assert.equal(initList.length, 0);

  // 2. Validation tests on creation
  await assert.rejects(
    async () => saveElectricalNode(env, adminActor, { name: 'MDB Main' }),
    /กรุณาระบุรหัสตู้/
  );
  await assert.rejects(
    async () => saveElectricalNode(env, adminActor, { nodeCode: 'MDB-01' }),
    /กรุณาระบุชื่อตู้/
  );
  await assert.rejects(
    async () => saveElectricalNode(env, adminActor, { nodeCode: 'MDB-01', name: 'Main', nodeType: 'INVALID' }),
    /ประเภทไม่ถูกต้อง/
  );

  // 3. Step 1: Create standalone panels without parent connections (User request: สร้างรายชื่อแต่ละตู้ก่อน)
  const mdb = await saveElectricalNode(env, adminActor, {
    nodeCode: 'MDB-01',
    name: 'Main Switchboard อาคาร 1',
    nodeType: 'MDB',
    currentRating: 2500,
    voltage: '400V 3P4W',
    location: 'ห้อง MDB ชั้น 1',
    remark: 'หม้อแปลง 2000kVA TR-1'
  });

  assert.ok(mdb.id.startsWith('EL-'));
  assert.equal(mdb.nodeCode, 'MDB-01');
  assert.equal(mdb.currentRating, 2500);
  assert.equal(mdb.parentId, null);

  const db1 = await saveElectricalNode(env, adminActor, {
    nodeCode: 'DB-CC1',
    name: 'ตู้จ่ายไฟฝาจีบ 1',
    nodeType: 'DB',
    currentRating: 630,
    voltage: '400V 3P4W',
    location: 'เสาเบอร์ 12 แผนกฝาจีบ'
  });

  const lp1 = await saveElectricalNode(env, adminActor, {
    nodeCode: 'LP-01',
    name: 'Load Panel ควบคุมไฟแสงสว่างและปลั๊ก',
    nodeType: 'LP',
    currentRating: 100,
    voltage: '230V 1P',
    location: 'ผนังข้างไลน์ 1'
  });

  const mc1 = await saveElectricalNode(env, adminActor, {
    nodeCode: 'MC-28STD1',
    name: 'เครื่องจักร 28STD1',
    nodeType: 'MC',
    currentRating: 75,
    location: 'ฝาจีบ Line 1'
  });

  // Verify all 4 panels exist as standalone nodes
  const allList = await listElectricalNodes(env);
  assert.equal(allList.length, 4);

  // 4. Duplicate Code rejection
  await assert.rejects(
    async () => saveElectricalNode(env, adminActor, {
      nodeCode: 'MDB-01',
      name: 'Duplicate MDB',
      nodeType: 'MDB'
    }),
    /มีอยู่ในระบบแล้ว/
  );

  // 5. Step 2: Establish wiring hierarchy (MDB-01 -> DB-CC1 -> LP-01 -> MC-28STD1)
  const wiredDb1 = await saveElectricalNode(env, adminActor, {
    id: db1.id,
    nodeCode: db1.nodeCode,
    name: db1.name,
    nodeType: db1.nodeType,
    parentId: mdb.id,
    currentRating: db1.currentRating,
    location: db1.location
  });
  assert.equal(wiredDb1.parentId, mdb.id);

  // Bulk update wiring: connect LP-01 to DB-CC1, and MC-28STD1 to LP-01
  const bulkRes = await bulkUpdateWiring(env, adminActor, [
    { id: lp1.id, parentId: db1.id },
    { id: mc1.id, parentId: lp1.id }
  ]);
  assert.equal(bulkRes.updatedCount, 2);

  // Verify updated hierarchy on MDB-01
  const mdbDetail = await getElectricalNode(env, mdb.id);
  assert.equal(mdbDetail.children.length, 1);
  assert.equal(mdbDetail.children[0].nodeCode, 'DB-CC1');

  // Verify updated hierarchy on DB-CC1
  const dbDetail = await getElectricalNode(env, db1.id);
  assert.equal(dbDetail.children.length, 1);
  assert.equal(dbDetail.children[0].nodeCode, 'LP-01');

  // 6. Circular dependency prevention
  // Attempt 1: Node as its own parent (MDB-01 -> MDB-01)
  await assert.rejects(
    async () => saveElectricalNode(env, adminActor, {
      id: mdb.id,
      nodeCode: mdb.nodeCode,
      name: mdb.name,
      nodeType: mdb.nodeType,
      parentId: mdb.id
    }),
    /ไม่สามารถเชื่อมโยงตู้เป็นต้นทางของตนเองได้/
  );

  // Attempt 2: Circular loop (MDB-01 parent set to MC-28STD1, which is a downstream child)
  await assert.rejects(
    async () => saveElectricalNode(env, adminActor, {
      id: mdb.id,
      nodeCode: mdb.nodeCode,
      name: mdb.name,
      nodeType: mdb.nodeType,
      parentId: mc1.id
    }),
    /พบการเชื่อมโยงสายจ่ายไฟวนลูป/
  );

  // 7. Test references
  const refs = await getElectricalReferences(env);
  assert.ok(refs.nodes.length >= 4);
  assert.ok(refs.types.length === 5);
  assert.ok(refs.types.some(t => t.code === 'MDB'));
  assert.ok(refs.types.some(t => t.code === 'MC'));

  // 8. Test deletion: Deleting DB-CC1 should detach LP-01 (setting parent_id = NULL) without failing
  await deleteElectricalNode(env, adminActor, db1.id);
  const detachedLp1 = await getElectricalNode(env, lp1.id);
  assert.equal(detachedLp1.parentId, null, 'LP-01 parent should be null after parent DB was deleted');

  const afterDeleteList = await listElectricalNodes(env);
  assert.equal(afterDeleteList.length, 3);
});
