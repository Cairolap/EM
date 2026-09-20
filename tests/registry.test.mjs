import test from 'node:test';
import assert from 'node:assert/strict';
import {database,seed} from './db.mjs';
import worker from '../src/worker.js';
const machine={machineCode:'0001',machineName:'เครื่องทดสอบ',deptId:'D01',lineId:'L01',status:'ใช้งาน',criticality:'สูง',machineType:'Press',isActive:true};
function setup(){const DB=database();seed(DB);return {DB,ENVIRONMENT:'local',DEV_AUTH:'local-admin',MAINTENANCE_MODE:'false'};}
async function rpc(env,scope,method,args=[],key=crypto.randomUUID()){
 const r=await worker.fetch(new Request(`http://localhost/api/v1/${scope}/rpc`,{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://localhost','Idempotency-Key':key},body:JSON.stringify({method,args})}),env);
 return {status:r.status,...await r.json()};
}
test('machine create persists, ID is monotonic, retry is exact, stale update never audits',async()=>{
 const env=setup(),key=crypto.randomUUID(),payload={...machine,requestId:key};
 const one=await rpc(env,'machines','createMachine',[payload],key);assert.equal(one.status,200);assert.equal(one.data.machineId,'M000001');
 assert.deepEqual((await rpc(env,'machines','createMachine',[payload],key)).data,one.data);
 assert.equal((await rpc(env,'machines','createMachine',[{...payload,machineName:'changed'}],key)).status,409);
 const edit=await rpc(env,'machines','updateMachine',[one.data.machineId,{...machine,machineName:'ใหม่',version:1,requestId:crypto.randomUUID()}]);assert.equal(edit.data.version,2);
 assert.equal((await rpc(env,'machines','updateMachine',[one.data.machineId,{...machine,version:1,requestId:crypto.randomUUID()}])).status,409);
 assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM audit_events').get().n,2);
 const list=await rpc(env,'machines','getMachines',[{}]);assert.equal(list.data.items[0].machineName,'ใหม่');assert.equal(list.data.items[0].machineCode,'0001');
});
test('references, unique normalized machine codes, inactive history and lifecycle',async()=>{
 const env=setup();let r=await rpc(env,'machines','createMachine',[{...machine,lineId:'bad',requestId:crypto.randomUUID()}]);assert.equal(r.status,422);
 r=await rpc(env,'machines','createMachine',[{...machine,requestId:crypto.randomUUID()}]);const id=r.data.machineId;
 assert.equal((await rpc(env,'machines','createMachine',[{...machine,machineCode:'０００１',requestId:crypto.randomUUID()}])).status,409);
 const archive=await rpc(env,'machines','archiveMachine',[id,1]);assert.equal(archive.data.version,2);
 assert.equal((await rpc(env,'machines','getMachines',[{}])).data.total,0);
 assert.equal((await rpc(env,'machines','getMachines',[{visibility:'hidden'}])).data.total,1);
 assert.equal((await rpc(env,'machines','deleteMachine',[id,2])).status,409);
});
test('part zero/null price, duplicate part numbers, brand lifecycle and image version',async()=>{
 const env=setup(),part={partNumber:'0007',description:'อะไหล่',brandId:'B01',price:0,lifespan:0.5,requestId:crypto.randomUUID()};
 const r=await rpc(env,'parts','createPart',[part]);assert.equal(r.status,200);
 const second=await rpc(env,'parts','createPart',[{...part,price:null,requestId:crypto.randomUUID()}]);assert.equal(second.status,200);
 const boot=await rpc(env,'parts','bootstrap');assert.equal(boot.data.parts[0].price,0);assert.equal(boot.data.parts[1].price,null);
 await rpc(env,'parts','deleteBrand',['B01']);
 assert.equal((await rpc(env,'parts','createPart',[{...part,requestId:crypto.randomUUID()}])).status,422);
 assert.equal((await rpc(env,'parts','updatePart',[r.data.id,{...part,version:1,requestId:crypto.randomUUID()}])).status,200);
 assert.equal((await rpc(env,'parts','updatePartImage',[r.data.id,{removeImage:true,requestId:crypto.randomUUID()}])).status,409);
});
test('auth fails closed on remote hosts and missing session; maintenance blocks writes only',async()=>{
 const env=setup();let r=await worker.fetch(new Request('https://example.com/api/v1/health'),env);assert.equal(r.status,401);
 r=await worker.fetch(new Request('http://localhost/api/v1/health'),{...env,ENVIRONMENT:'production'});assert.equal(r.status,401);
 env.MAINTENANCE_MODE='true';assert.equal((await rpc(env,'machines','bootstrap')).status,200);assert.equal((await rpc(env,'machines','createMachine',[{...machine,requestId:crypto.randomUUID()}])).status,503);
 const cross=await worker.fetch(new Request('http://localhost/api/v1/machines/rpc',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),setup());assert.equal(cross.status,403);
});
test('D1 batch guard rolls back a lost race including request and audit',async()=>{
 const db=database();
 await assert.rejects(db.batch([
  db.prepare("INSERT INTO requests VALUES('x','a','test','hash','DONE','{}','now')"),
  db.prepare("UPDATE brands SET version=2 WHERE id='missing'"),
  db.prepare("INSERT INTO mutation_guards VALUES('x',changes())")
 ]));assert.equal(db.raw.prepare('SELECT count(*) n FROM requests').get().n,0);
});
test('BOM integration endpoints return expected shapes and enforce read-only role',async()=>{
 const DB=database();seed(DB);
 const adminEnv={DB,ENVIRONMENT:'local',DEV_AUTH:'local-admin',MAINTENANCE_MODE:'false'};
 const env={DB,ENVIRONMENT:'local',DEV_AUTH:null,ACCESS_TEAM_DOMAIN:'org.cloudflareaccess.com',ACCESS_AUD:'test-aud',BOM_SERVICE_TOKEN:'secret-token-12345678901234567890',MAINTENANCE_MODE:'false'};
 // Create sample machine and part first using admin
 await rpc(adminEnv,'machines','createMachine',[{...machine,requestId:crypto.randomUUID()}]);
 await rpc(adminEnv,'parts','createPart',[{partNumber:'P-01',description:'Sensor',brandId:'B01',price:100,lifespan:2,requestId:crypto.randomUUID()}]);

 // References endpoint requires valid token
 let refRes=await worker.fetch(new Request('http://localhost/api/v1/integrations/bom/references',{headers:{Authorization:'Bearer wrong'}}),env);
 assert.equal(refRes.status,401);

 refRes=await worker.fetch(new Request('http://localhost/api/v1/integrations/bom/references',{headers:{Authorization:'Bearer secret-token-12345678901234567890'}}),env);
 assert.equal(refRes.status,200);
 const refJson=await refRes.json();
 assert.equal(refJson.ok,true);
 assert.ok(Array.isArray(refJson.data.departments));
 assert.ok(Array.isArray(refJson.data.lines));
 assert.ok(Array.isArray(refJson.data.machines));
 assert.equal(refJson.data.departments[0].DeptID,'D01');
 assert.equal(refJson.data.machines[0].MachineCode,'0001');

 // Parts endpoint
 const partsRes=await worker.fetch(new Request('http://localhost/api/v1/integrations/bom/parts',{headers:{Authorization:'Bearer secret-token-12345678901234567890'}}),env);
 assert.equal(partsRes.status,200);
 const partsJson=await partsRes.json();
 assert.equal(partsJson.ok,true);
 assert.ok(Array.isArray(partsJson.data));
 assert.equal(partsJson.data[0]['Part number'],'P-01');
 assert.equal(partsJson.data[0].Price,100);

 // Integration token cannot write to registry
 const writeRes=await worker.fetch(new Request('http://localhost/api/v1/machines/rpc',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json',Authorization:'Bearer secret-token-12345678901234567890'},body:JSON.stringify({method:'createMachine',args:[machine]})}),env);
 assert.ok([401,403].includes(writeRes.status));
});
test('BOM reads and mutations (add, edit, split, replace, remove, history, stats)',async()=>{
 const env=setup();
 const mRes=await rpc(env,'machines','createMachine',[{...machine,requestId:crypto.randomUUID()}]);
 const machineId=mRes.data.machineId;
 const p1Res=await rpc(env,'parts','createPart',[{partNumber:'P-100',description:'Sensor Prox',brandId:'B01',price:500,lifespan:2,requestId:crypto.randomUUID()}]);
 const p2Res=await rpc(env,'parts','createPart',[{partNumber:'P-200',description:'Contactor',brandId:'B01',price:1200,lifespan:5,requestId:crypto.randomUUID()}]);
 const partId1=p1Res.data.id, partId2=p2Res.data.id;

 // 1. BOM references & searchParts
 const ref=await rpc(env,'bom','references');
 assert.ok(ref.data.machines.some(m=>m.MachineID===machineId));
 const search=await rpc(env,'bom','searchParts',[{query:'Sensor'}]);
 assert.equal(search.data.total,1);
 assert.equal(search.data.items[0].ID,partId1);

 // 2. Add equipment
 const opAdd=crypto.randomUUID();
 const addPayload={
  machineId,
  operationId:opAdd,
  labels:[
   {PartID:partId1,Label:'SN-IN',Quantity:2,InstalledAt:'2024-01-10',DueMode:'PART_LIFE',Notes:'เซนเซอร์นำเข้า'},
   {PartID:partId2,Label:'KM-01',Quantity:1,InstalledAt:'2023-05-01',DueMode:'PART_LIFE',Notes:'เมนคอนแทกเตอร์'}
  ]
 };
 const addRes=await rpc(env,'bom','add',[addPayload],opAdd);
 assert.equal(addRes.status,200);
 assert.equal(addRes.data.operationId,opAdd);
 assert.equal(addRes.data.count,2);

 // Test idempotency: re-sending with same opAdd returns identical result
 const replayAdd=await rpc(env,'bom','add',[addPayload],opAdd);
 assert.equal(replayAdd.data.operationId,opAdd);
 assert.equal(replayAdd.data.count,2);

 // 3. List & lineMachineStats
 const list=await rpc(env,'bom','list',[{machineId}]);
 assert.equal(list.data.totals.parts,2);
 assert.equal(list.data.totals.labels,2);
 assert.equal(list.data.totals.quantity,3);

 const stats=await rpc(env,'bom','lineMachineStats',[{deptId:'D01',lineId:'L01'}]);
 assert.equal(stats.data.machines[machineId].partTypes,2);
 assert.equal(stats.data.machines[machineId].totalPieces,3);

 // Find the active record for split test
 const sensorGroup=list.data.items.find(g=>g.PartID===partId1);
 const sensorRec=sensorGroup.labels[0];

 // 4. Split: split quantity 2 into 2 independent labels
 const opSplit=crypto.randomUUID();
 const splitRes=await rpc(env,'bom','split',[{
  machineId,
  operationId:opSplit,
  recordId:sensorRec.RecordID,
  expectedVersion:sensorRec.Version,
  reason:'แยกเป็น 2 ตำแหน่ง',
  labels:['SN-IN-LEFT','SN-IN-RIGHT']
 }],opSplit);
 assert.equal(splitRes.status,200);

 const listAfterSplit=await rpc(env,'bom','list',[{machineId}]);
 assert.equal(listAfterSplit.data.totals.labels,3); // now 3 labels
 assert.equal(listAfterSplit.data.totals.quantity,3); // same total pieces

 // 5. Replace one sensor
 const splitSensors=listAfterSplit.data.items.find(g=>g.PartID===partId1).labels;
 const targetToReplace=splitSensors[0];
 const opReplace=crypto.randomUUID();
 const repRes=await rpc(env,'bom','replace',[{
  machineId,
  operationId:opReplace,
  installedAt:'2026-03-01',
  dueMode:'PART_LIFE',
  targets:[{recordId:targetToReplace.RecordID,expectedVersion:targetToReplace.Version,partId:partId1}]
 }],opReplace);
 assert.equal(repRes.status,200);

 // 6. History
 const hist=await rpc(env,'bom','history',[{machineId,equipmentId:targetToReplace.EquipmentID}]);
 assert.ok(hist.data.records.items.length>=2); // original + replaced

 // 7. Remove
 const kmGroup=listAfterSplit.data.items.find(g=>g.PartID===partId2);
 const kmRec=kmGroup.labels[0];
 const opRemove=crypto.randomUUID();
 const remRes=await rpc(env,'bom','remove',[{
  machineId,
  operationId:opRemove,
  endedAt:'2026-09-01',
  reason:'ถอดออกเพื่อซ่อมแซม',
  targets:[{recordId:kmRec.RecordID,expectedVersion:kmRec.Version,quantity:1}]
 }],opRemove);
 assert.equal(remRes.status,200);

 const finalList=await rpc(env,'bom','list',[{machineId}]);
 assert.equal(finalList.data.totals.labels,2); // KM removed from active
});
test('auth endpoints login, me, and logout work with session cookies',async()=>{
 const DB=database();seed(DB);
 const env={DB,ENVIRONMENT:'production',DEV_AUTH:null,MAINTENANCE_MODE:'false'};

 // 1. Failed login
 const failRes=await worker.fetch(new Request('http://localhost/api/v1/auth/login',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost'},
  body:JSON.stringify({username:'admin',password:'wrongpass'})
 }),env);
 assert.equal(failRes.status,401);

 // 2. Successful login
 const loginRes=await worker.fetch(new Request('http://localhost/api/v1/auth/login',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost'},
  body:JSON.stringify({username:'admin',password:'admin1234'})
 }),env);
 assert.equal(loginRes.status,200);
 const setCookie=loginRes.headers.get('Set-Cookie');
 assert.ok(setCookie.includes('em_session='));
 const token=setCookie.match(/em_session=([^;]+)/)[1];

 // 3. GET /api/v1/auth/me with cookie
 const meRes=await worker.fetch(new Request('http://localhost/api/v1/auth/me',{
  headers:{Cookie:`em_session=${token}`}
 }),env);
 assert.equal(meRes.status,200);
 const meData=(await meRes.json()).data;
 assert.equal(meData.username,'admin');
 assert.equal(meData.role,'admin');

 // 4. POST /api/v1/auth/logout
 const logoutRes=await worker.fetch(new Request('http://localhost/api/v1/auth/logout',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost',Cookie:`em_session=${token}`}
 }),env);
 assert.equal(logoutRes.status,200);

 // 5. GET /api/v1/auth/me after logout fails
 const meAfter=await worker.fetch(new Request('http://localhost/api/v1/auth/me',{
  headers:{Cookie:`em_session=${token}`}
 }),env);
 assert.equal(meAfter.status,401);
});

test('user management: granular permissions, temporary expiry, reset to 1234 and force password change',async()=>{
 const DB=database();seed(DB);
 const env={DB,ENVIRONMENT:'production',DEV_AUTH:null,MAINTENANCE_MODE:'false'};

 // 1. Admin logs in
 const adminLogin=await worker.fetch(new Request('http://localhost/api/v1/auth/login',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost'},
  body:JSON.stringify({username:'admin',password:'admin1234'})
 }),env);
 const adminCookie=adminLogin.headers.get('Set-Cookie').split(';')[0];

 // 2. Admin creates a temporary user with limited permissions (no machines, can_delete: false)
 const createRes=await worker.fetch(new Request('http://localhost/api/v1/users/rpc',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost',Cookie:adminCookie},
  body:JSON.stringify({
   method:'createUser',
   args:[{
    username:'tempuser',
    password:'password123',
    displayName:'Temporary Worker',
    role:'viewer',
    userType:'temporary',
    expiresAt:new Date(Date.now() + 60000).toISOString(), // expires in 1 min
    permissions:{machines:'none',parts:'read',bom:'read',users:'none',can_delete:false}
   }]
  })
 }),env);
 assert.equal(createRes.status,200);

 // 3. Temporary user logs in
 const tempLogin=await worker.fetch(new Request('http://localhost/api/v1/auth/login',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost'},
  body:JSON.stringify({username:'tempuser',password:'password123'})
 }),env);
 assert.equal(tempLogin.status,200);
 const tempCookie=tempLogin.headers.get('Set-Cookie').split(';')[0];

 // 4. Temporary user tries to access /machines/rpc -> should get 403 FORBIDDEN
 const machinesRes=await worker.fetch(new Request('http://localhost/api/v1/machines/rpc',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost',Cookie:tempCookie},
  body:JSON.stringify({method:'getMachines',args:[{}]})
 }),env);
 assert.equal(machinesRes.status,403);

 // 5. Temporary user tries to access /users/rpc -> should get 403 FORBIDDEN
 const usersRes=await worker.fetch(new Request('http://localhost/api/v1/users/rpc',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost',Cookie:tempCookie},
  body:JSON.stringify({method:'listUsers',args:[]})
 }),env);
 assert.equal(usersRes.status,403);

 // 6. Admin resets tempuser password to 1234
 const userRow=await DB.prepare("SELECT id FROM app_users WHERE username='tempuser'").first();
 const resetRes=await worker.fetch(new Request('http://localhost/api/v1/users/rpc',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost',Cookie:adminCookie},
  body:JSON.stringify({method:'resetPassword',args:[userRow.id]})
 }),env);
 assert.equal(resetRes.status,200);

 // 7. Logging in with 1234 sets mustChangePassword: true
 const resetLogin=await worker.fetch(new Request('http://localhost/api/v1/auth/login',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost'},
  body:JSON.stringify({username:'tempuser',password:'1234'})
 }),env);
 assert.equal(resetLogin.status,200);
 const resetData=await resetLogin.json();
 assert.equal(resetData.data.mustChangePassword,true);
 const resetCookie=resetLogin.headers.get('Set-Cookie').split(';')[0];

 // 8. Changing password to < 5 characters fails with 422
 const changeShort=await worker.fetch(new Request('http://localhost/api/v1/auth/change-password',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost',Cookie:resetCookie},
  body:JSON.stringify({newPassword:'123'})
 }),env);
 assert.equal(changeShort.status,422);

 // 9. Changing password to >= 5 characters succeeds
 const changeOk=await worker.fetch(new Request('http://localhost/api/v1/auth/change-password',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost',Cookie:resetCookie},
  body:JSON.stringify({newPassword:'newsecret5678'})
 }),env);
 assert.equal(changeOk.status,200);

 // 10. Check /me now shows mustChangePassword: false
 const meCheck=await worker.fetch(new Request('http://localhost/api/v1/auth/me',{
  headers:{Cookie:resetCookie}
 }),env);
 assert.equal((await meCheck.json()).data.mustChangePassword,false);

 // 11. Test expired temporary user
 await DB.prepare("UPDATE app_users SET expires_at='2020-01-01T00:00:00.000Z' WHERE username='tempuser'").run();
 const expiredLogin=await worker.fetch(new Request('http://localhost/api/v1/auth/login',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':'http://localhost'},
  body:JSON.stringify({username:'tempuser',password:'newsecret5678'})
 }),env);
 assert.equal(expiredLogin.status,401);
});

