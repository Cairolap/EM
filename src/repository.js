import {fail,conflict,hash,stable} from './errors.js';
import {machineRecord,partRecord,MACHINE_SELECT,PART_SELECT} from './model.js';
export class Repository {
 constructor(db){this.db=db;}
 async all(sql,...args){return (await this.db.prepare(sql).bind(...args).all()).results;}
 async references(){return {departments:(await this.all('SELECT * FROM departments')).map(d=>({deptId:d.id,deptName:d.name,isActive:!!d.is_active})),lines:(await this.all('SELECT * FROM lines')).map(l=>({lineId:l.id,deptId:l.department_id,lineName:l.name,isActive:!!l.is_active,remark:l.remark}))};}
 async brands(){return (await this.all('SELECT * FROM brands')).map(b=>({id:b.id,name:b.name,active:!!b.is_active,version:b.version}));}
 async machineTypes(){return (await this.all('SELECT * FROM machine_types')).map(t=>({id:t.id,name:t.name,active:!!t.is_active,version:t.version}));}
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
 async reorderMachine(req,machineId,targetPosition){
  const machine=await this.machine(machineId);if(!machine)fail('NOT_FOUND','ไม่พบเครื่องจักรนี้',404);
  const rows=await this.all(`${MACHINE_SELECT} WHERE m.department_id=? AND m.line_id=? ORDER BY CASE WHEN m.line_order IS NULL THEN 1 ELSE 0 END, m.line_order, m.code COLLATE NOCASE, m.id`,machine.deptId,machine.lineId);
  const ordered=rows.map(machineRecord).filter(m=>m.machineId!==machineId);
  const position=Math.max(1,Math.min(Number(targetPosition)||1,ordered.length+1));
  ordered.splice(position-1,0,machine);
  const statements=[this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key,req.actor,req.operation,req.payloadHash,JSON.stringify({machineId,position}),req.now)];
  ordered.forEach((m,index)=>statements.push(this.db.prepare('UPDATE machines SET line_order=? WHERE id=?').bind(index+1,m.machineId)));
  statements.push(this.db.prepare('INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(req.key,req.actor,req.operation,machineId,JSON.stringify({lineOrder:machine.lineOrder||null}),JSON.stringify({lineOrder:position,departmentId:machine.deptId,lineId:machine.lineId}),req.now));
  await this.db.batch(statements);
  return {machineId,position};
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
 async bomPartsForMachine(machineId){
  const rows=await this.all(`${PART_SELECT} WHERE p.id IN (SELECT DISTINCT part_id FROM equipment_records WHERE machine_id=?)`,machineId);
  return rows.map(partRecord);
 }
 async bomPartsForLine(deptId,lineId){
  const rows=await this.all(`${PART_SELECT} WHERE p.id IN (SELECT DISTINCT r.part_id FROM equipment_records r JOIN machines m ON r.machine_id=m.id WHERE m.department_id=? AND m.line_id=?)`,deptId,lineId);
  return rows.map(partRecord);
 }
 async bomOperation(opId){
  const r=await this.db.prepare('SELECT * FROM equipment_operations WHERE id=?').bind(opId).first();
  if(!r)return null;
  return {OperationID:r.id,Fingerprint:r.fingerprint,MachineID:r.machine_id,Status:r.status,Plan:r.plan_json,Result:r.result_json,CreatedAt:r.created_at,SessionRef:r.session_ref};
 }
  async partWhereUsed(partId){
    const cleanId = String(partId || '').trim();
    if(!cleanId) return { partId: '', totalMachines: 0, totalQuantity: 0, machines: [] };
    const sql = `
      SELECT 
        er.machine_id AS machineId,
        m.code AS machineCode,
        m.name AS machineName,
        m.status AS machineStatus,
        m.line_order AS lineOrder,
        d.id AS deptId,
        d.name AS deptName,
        l.id AS lineId,
        l.name AS lineName,
        COUNT(er.id) AS labelCount,
        SUM(er.quantity) AS totalQuantity,
        GROUP_CONCAT(NULLIF(er.label, ''), ', ') AS labels
      FROM equipment_records er
      JOIN machines m ON er.machine_id = m.id
      LEFT JOIN departments d ON m.department_id = d.id
      LEFT JOIN lines l ON m.line_id = l.id
      WHERE (er.part_id = ? OR er.part_id IN (SELECT id FROM parts WHERE part_number = ?)) AND er.record_status = 'ACTIVE'
      GROUP BY er.machine_id, m.code, m.name, m.status, m.line_order, d.id, d.name, l.id, l.name
      ORDER BY d.id ASC, l.id ASC, m.line_order ASC, m.code ASC
    `;
    const rows = await this.all(sql, cleanId, cleanId);
    const totalQuantity = rows.reduce((acc, r) => acc + (Number(r.totalQuantity) || 0), 0);
    return {
      partId: cleanId,
      totalMachines: rows.length,
      totalQuantity,
      machines: rows.map(r => ({
        ...r,
        labelCount: Number(r.labelCount) || 0,
        totalQuantity: Number(r.totalQuantity) || 0,
        labels: r.labels || ''
      }))
    };
  }
  async searchPartWhereUsed(keyword, limit = 40){
    const clean = String(keyword || '').trim();
    if(!clean) return { items: [] };
    const pattern = '%' + clean + '%';
    const sql = `
      SELECT 
        p.id AS partId,
        p.part_number AS partNumber,
        p.description,
        COALESCE(b.name, p.legacy_brand_name, '') AS brand,
        p.thumbnail_source AS thumbnail,
        p.picture_source AS picture,
        p.lifespan_years AS lifespan,
        COUNT(DISTINCT er.machine_id) AS totalMachines,
        SUM(er.quantity) AS totalQuantity
      FROM parts p
      LEFT JOIN brands b ON b.id = p.brand_id
      JOIN equipment_records er ON er.part_id = p.id AND er.record_status = 'ACTIVE'
      WHERE (
          p.id LIKE ? OR p.part_number LIKE ? OR p.description LIKE ? OR COALESCE(b.name, p.legacy_brand_name, '') LIKE ?
        )
      GROUP BY p.id, p.part_number, p.description, b.name, p.legacy_brand_name, p.thumbnail_source, p.picture_source, p.lifespan_years
      ORDER BY totalQuantity DESC, p.part_number ASC
      LIMIT ?
    `;
    const parts = await this.all(sql, pattern, pattern, pattern, pattern, limit);
    if(!parts.length) return { items: [] };

    const partIds = parts.map(p => p.partId);
    const placeholders = partIds.map(() => '?').join(',');
    const detailSql = `
      SELECT 
        er.part_id AS partId,
        er.machine_id AS machineId,
        m.code AS machineCode,
        m.name AS machineName,
        m.status AS machineStatus,
        d.id AS deptId,
        d.name AS deptName,
        l.id AS lineId,
        l.name AS lineName,
        COUNT(er.id) AS labelCount,
        SUM(er.quantity) AS totalQuantity,
        GROUP_CONCAT(NULLIF(er.label, ''), ', ') AS labels
      FROM equipment_records er
      JOIN machines m ON er.machine_id = m.id
      LEFT JOIN departments d ON m.department_id = d.id
      LEFT JOIN lines l ON m.line_id = l.id
      WHERE er.part_id IN (${placeholders}) AND er.record_status = 'ACTIVE'
      GROUP BY er.part_id, er.machine_id, m.code, m.name, m.status, d.id, d.name, l.id, l.name
      ORDER BY d.id ASC, l.id ASC, m.line_order ASC, m.code ASC
    `;
    const details = await this.all(detailSql, ...partIds);
    const machineMap = new Map();
    details.forEach(d => {
      if(!machineMap.has(d.partId)) machineMap.set(d.partId, []);
      machineMap.get(d.partId).push({
        ...d,
        labelCount: Number(d.labelCount) || 0,
        totalQuantity: Number(d.totalQuantity) || 0,
        labels: d.labels || ''
      });
    });

    const items = parts.map(p => ({
      ...p,
      totalMachines: Number(p.totalMachines) || 0,
      totalQuantity: Number(p.totalQuantity) || 0,
      machines: machineMap.get(p.partId) || []
    }));

    return { items };
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
