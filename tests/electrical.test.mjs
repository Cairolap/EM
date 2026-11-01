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

  // 9. Single-Page Panel + Outgoing Circuits (Master-Detail creation in 1 step)
  const mdb2 = await saveElectricalNode(env, adminActor, {
    nodeCode: 'MDB-02',
    name: 'Main Distribution Board อาคาร 2',
    nodeType: 'MDB',
    currentRating: 3200,
    voltage: '400V 3P4W',
    location: 'ห้องไฟฟ้า อาคาร 2',
    children: [
      { nodeCode: 'Q1', name: 'DB-B2-01 อาคาร 2 ชั้น 1', nodeType: 'DB', currentRating: 400 },
      { nodeCode: 'Q2', name: 'DB-B2-02 อาคาร 2 ชั้น 2', nodeType: 'DB', currentRating: 250 },
      { nodeCode: 'Q3', name: 'SPARE MDB2', nodeType: 'DV', currentRating: 160 }
    ]
  });

  assert.equal(mdb2.nodeCode, 'MDB-02');
  assert.equal(mdb2.children.length, 3);
  assert.equal(mdb2.children[0].nodeCode, 'Q1');
  assert.equal(mdb2.children[0].currentRating, 400);
  assert.equal(mdb2.children[1].nodeCode, 'Q2');
  assert.equal(mdb2.children[2].nodeCode, 'Q3');

  // Verify child nodes are in electrical_nodes and have parentId set to mdb2.id
  const q1Detail = await getElectricalNode(env, mdb2.children[0].id);
  assert.equal(q1Detail.parentId, mdb2.id);
  assert.equal(q1Detail.parentCode, 'MDB-02');

  // Update MDB-02: modify Q1, remove Q3, add Q4
  const updatedMdb2 = await saveElectricalNode(env, adminActor, {
    id: mdb2.id,
    nodeCode: mdb2.nodeCode,
    name: mdb2.name,
    nodeType: mdb2.nodeType,
    currentRating: mdb2.currentRating,
    children: [
      { id: mdb2.children[0].id, nodeCode: 'Q1', name: 'DB-B2-01 อัปเดตโหลดใหม่', nodeType: 'DB', currentRating: 500 },
      { id: mdb2.children[1].id, nodeCode: 'Q2', name: 'DB-B2-02 อาคาร 2 ชั้น 2', nodeType: 'DB', currentRating: 250 },
      { nodeCode: 'Q4', name: 'เครื่องทำความเย็น Chiller 1', nodeType: 'MC', currentRating: 630 }
    ],
    removedChildIds: [mdb2.children[2].id]
  });

  assert.equal(updatedMdb2.children.length, 3);
  assert.equal(updatedMdb2.children[0].name, 'DB-B2-01 อัปเดตโหลดใหม่');
  assert.equal(updatedMdb2.children[0].currentRating, 500);
  assert.ok(updatedMdb2.children.some(c => c.nodeCode === 'Q4'));

  // Verify Q3 was detached (parent_id = NULL)
  const q3Detached = await getElectricalNode(env, mdb2.children[2].id);
  assert.equal(q3Detached.parentId, null);

  // 10. Verify Google Drive /file/d/<id>/view URLs are normalized to direct lh3 image URLs
  const mdbWithDriveView = await saveElectricalNode(env, adminActor, {
    nodeCode: 'MDB3-TEST',
    name: 'MDB3',
    nodeType: 'MDB',
    currentRating: 2000,
    imageUrl: 'https://drive.google.com/file/d/1UeWcz6LBaf4Rv2FL5CI5jMD8Gprna4Ee/view',
    driveFileId: '1UeWcz6LBaf4Rv2FL5CI5jMD8Gprna4Ee'
  });
  assert.equal(mdbWithDriveView.imageUrl, 'https://lh3.googleusercontent.com/d/1UeWcz6LBaf4Rv2FL5CI5jMD8Gprna4Ee');
  assert.equal(mdbWithDriveView.driveFileId, '1UeWcz6LBaf4Rv2FL5CI5jMD8Gprna4Ee');

  // 11. Verify child circuits allow duplicate Tag Codes across panels and within the same panel
  const mdbDupTest = await saveElectricalNode(env, adminActor, {
    id: mdbWithDriveView.id,
    nodeCode: 'MDB3-TEST',
    name: 'MDB3',
    nodeType: 'MDB',
    currentRating: 2000,
    children: [
      { nodeCode: 'Q1', name: 'MDB3 Q1 (same code as MDB-02 Q1)', nodeType: 'DB', currentRating: 250 },
      { nodeCode: 'SPARE', name: 'Spare 1', nodeType: 'DV', currentRating: 100 },
      { nodeCode: 'SPARE', name: 'Spare 2', nodeType: 'DV', currentRating: 100 }
    ]
  });
  assert.equal(mdbDupTest.children.length, 3);
  assert.equal(mdbDupTest.children.filter(c => c.nodeCode === 'SPARE').length, 2);
});
