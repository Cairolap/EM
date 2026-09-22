import {fail,conflict,hash,stable} from './errors.js';
import {machineRecord,partRecord,MACHINE_SELECT,PART_SELECT} from './model.js';
export class Repository {
 constructor(db){this.db=db;}
 async all(sql,...args){return (await this.db.prepare(sql).bind(...args).all()).results;}
 async references(){return {departments:(await this.all('SELECT * FROM departments')).map(d=>({deptId:d.id,deptName:d.name,isActive:!!d.is_active})),lines:(await this.all('SELECT * FROM lines')).map(l=>({lineId:l.id,deptId:l.department_id,lineName:l.name,isActive:!!l.is_active,remark:l.remark}))};}
 async brands(){return (await this.all('SELECT * FROM brands')).map(b=>({id:b.id,name:b.name,active:!!b.is_active,version:b.version}));}
 async machine(id){return machineRecord(await this.db.prepare(MACHINE_SELECT+' WHERE m.id=?').bind(id).first());}
 async part(id){return partRecord(await this.db.prepare(PART_SELECT+' WHERE p.id=?').bind(id).first());}
 async partsByIds(ids){
   const unique=[...new Set([...ids].map(id=>String(id||'').trim()).filter(Boolean))];
   if(!unique.length)return [];
   const placeholders=unique.map(()=>'?').join(',');
   return (await this.all(PART_SELECT+' WHERE p.id IN ('+placeholders+')',...unique)).map(partRecord);
 }
 async catalog(kind){
   // Retains existing Thai natural collation and bulk-image workflow. Fail explicitly rather than truncate.
   const rows=await this.all((kind==='machines'?MACHINE_SELECT:PART_SELECT)+' ORDER BY '+(kind==='machines'?'m':'p')+'.id LIMIT 10001');
   if(rows.length>10000)fail('CAPACITY','ทะเบียนเกินขอบเขต 10,000 รายการ กรุณาติดต่อผู้ดูแลเพื่อเปิดการค้นหาแบบฐานข้อมูล',503);
   return rows.map(kind==='machines'?machineRecord:partRecord);
 }
 async nextId(kind){const r=await this.db.prepare('UPDATE id_counters SET value=value+1 WHERE kind=? RETURNING value').bind(kind).first();if(!r)fail('SCHEMA','ยังไม่ได้เตรียมฐานข้อมูล',503);return (kind==='machines'?'M':'PART-')+String(r.value).padStart(6,'0');}
 async request(actor,operation,payload,requestId){
  if(!/^[\w-]{16,80}$/.test(requestId||''))fail('VALIDATION','รหัสคำขอไม่ถูกต้อง');
  const key=await hash(actor.id+':'+requestId),payloadHash=await hash(stable({operation,payload}));
  const old=await this.db.prepare('SELECT * FROM requests WHERE key=?').bind(key).first();
  if(old){if(old.payload_hash!==payloadHash)fail('CONFLICT','รหัสคำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาเปิดฟอร์มใหม่',409);if(old.status==='DONE')return {key,replay:JSON.parse(old.response_json)};fail('BUSY','คำขอนี้อยู่ระหว่างดำเนินการ กรุณาลองคำขอเดิมอีกครั้ง',409);}
  return {key,payloadHash,actor:actor.id,operation,now:new Date().toISOString()};
 }
 async commit(req,table,id,before,after,response){
  const statements=[this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key,req.actor,req.operation,req.payloadHash,JSON.stringify(response),req.now)];
  if(before){
   const fields=Object.keys(after).filter(k=>k!=='id');
   statements.push(this.db.prepare(`UPDATE ${table} SET ${fields.map(k=>k+'=?').join(',')} WHERE id=? AND version=?`).bind(...fields.map(k=>after[k]),id,before.version));
   statements.push(this.db.prepare('INSERT INTO mutation_guards VALUES(?,changes())').bind(req.key));
   statements.push(this.db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(req.key));
  }else statements.push(this.db.prepare(`INSERT INTO ${table} (${Object.keys(after).join(',')}) VALUES(${Object.keys(after).map(()=>'?').join(',')})`).bind(...Object.values(after)));
  statements.push(this.db.prepare('INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(req.key,req.actor,req.operation,id,before?JSON.stringify(before):null,JSON.stringify(after),req.now));
  statements.push(this.db.prepare("UPDATE image_operations SET status='ATTACHED' WHERE request_key=? AND status='UPLOADED'").bind(req.key));
  try{await this.db.batch(statements);}catch(error){
   const replay=await this.db.prepare('SELECT * FROM requests WHERE key=?').bind(req.key).first();
   if(replay?.status==='DONE'&&replay.payload_hash===req.payloadHash)return JSON.parse(replay.response_json);
   if(/mutation_guards|changed=1/.test(error.message))conflict();
   if(/UNIQUE|PRIMARY KEY/.test(error.message))fail('DUPLICATE','รหัสหรือชื่อซ้ำกับรายการที่มีอยู่แล้ว',409);
   throw error;
  }
  return response;
 }
 async bomRecords(machineId){
  const rows=await this.all('SELECT * FROM equipment_records WHERE machine_id=? ORDER BY created_at ASC',machineId);
  return rows.map(bomRecord);
 }
 async bomLineRecords(deptId,lineId){
  const rows=await this.all("SELECT r.* FROM equipment_records r JOIN machines m ON r.machine_id=m.id WHERE m.department_id=? AND m.line_id=? AND r.record_status='ACTIVE' ORDER BY r.created_at ASC",deptId,lineId);
  return rows.map(bomRecord);
 }
 async bomOperation(opId){
  const r=await this.db.prepare('SELECT * FROM equipment_operations WHERE id=?').bind(opId).first();
  if(!r)return null;
  return {OperationID:r.id,Fingerprint:r.fingerprint,MachineID:r.machine_id,Status:r.status,Plan:r.plan_json,Result:r.result_json,CreatedAt:r.created_at,SessionRef:r.session_ref};
 }
 async bomEvents(machineId,equipmentId){
  const rows=await this.all("SELECT * FROM equipment_operations WHERE machine_id=? AND status='COMMITTED' ORDER BY created_at DESC",machineId);
  return rows.map(o=>{
   let p;try{p=JSON.parse(o.plan_json);}catch(_){p={};}
   const eqIds=(p.changes||[]).map(c=>c.before.EquipmentID).concat((p.additions||[]).map(r=>r.EquipmentID));
   return {operationId:o.id,kind:p.kind,reason:p.reason,at:o.created_at,sessionRef:o.session_ref,equipmentIds:eqIds};
  }).filter(o=>o.equipmentIds.includes(equipmentId));
 }
 async bomCommit(req,op,changes,additions,actorId){
  const now=new Date().toISOString();
  const response=JSON.parse(op.Result);
  const statements=[
   this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key,req.actor,req.operation,req.payloadHash,JSON.stringify(response),req.now),
   this.db.prepare("INSERT INTO equipment_operations (id,fingerprint,machine_id,status,plan_json,result_json,created_at,session_ref) VALUES (?,?,?, 'COMMITTED', ?,?,?,?)")
    .bind(op.OperationID,op.Fingerprint,op.MachineID,op.Plan,op.Result,op.CreatedAt||now,op.SessionRef||'')
  ];
  for(const c of changes){
   statements.push(
    this.db.prepare("UPDATE equipment_records SET record_status=?,ended_at=?,updated_at=?,version=?,operation_id=?,label=?,quantity=?,installed_at=?,due_mode=?,manual_expiry_date=?,notes=?,part_id=? WHERE id=? AND version=?")
     .bind(
      c.after.RecordStatus,c.after.EndedAt||'',c.after.UpdatedAt||now,c.after.Version,op.OperationID,
      c.after.Label,c.after.Quantity,c.after.InstalledAt,c.after.DueMode,c.after.ManualExpiryDate||'',
      c.after.Notes||'',c.after.PartID,c.before.RecordID,c.before.Version
     )
   );
   statements.push(this.db.prepare('INSERT INTO mutation_guards VALUES(?,changes())').bind(req.key+':'+c.before.RecordID));
   statements.push(this.db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(req.key+':'+c.before.RecordID));
  }
  for(const a of additions){
   statements.push(
    this.db.prepare("INSERT INTO equipment_records (id,equipment_id,machine_id,part_id,label,quantity,installed_at,due_mode,manual_expiry_date,notes,record_status,ended_at,previous_record_id,created_at,created_by,updated_at,updated_by,version,operation_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
     .bind(
      a.RecordID,a.EquipmentID,a.MachineID,a.PartID,a.Label,a.Quantity,
      a.InstalledAt,a.DueMode,a.ManualExpiryDate||'',a.Notes||'',
      a.RecordStatus||'ACTIVE',a.EndedAt||'',a.PreviousRecordID||'',
      a.CreatedAt||now,actorId||'system',a.UpdatedAt||now,actorId||'system',
      a.Version||1,op.OperationID
     )
   );
  }
  statements.push(
   this.db.prepare('INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind(req.key,actorId,req.operation,op.MachineID,JSON.stringify(changes.map(c=>c.before)),JSON.stringify({changes:changes.map(c=>c.after),additions}),now)
  );
  try{
   await this.db.batch(statements);
  }catch(error){
   if(/mutation_guards|changed=1/.test(error.message))conflict();
   throw error;
  }
  return JSON.parse(op.Result);
 }
}
export function bomRecord(r){
 if(!r)return null;
 return {
  RecordID:r.id,EquipmentID:r.equipment_id,MachineID:r.machine_id,PartID:r.part_id,Label:r.label,
  Quantity:Number(r.quantity),InstalledAt:r.installed_at,DueMode:r.due_mode,ManualExpiryDate:r.manual_expiry_date,
  Notes:r.notes,RecordStatus:r.record_status,EndedAt:r.ended_at,PreviousRecordID:r.previous_record_id,
  CreatedAt:r.created_at,CreatedBy:r.created_by,UpdatedAt:r.updated_at,UpdatedBy:r.updated_by,Version:Number(r.version),OperationID:r.operation_id
 };
}
