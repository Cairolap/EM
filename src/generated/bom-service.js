import {BomCore} from './bom-core.js';
/* Repository port: references, parts, location, records, operations, commit, replay.
 * All mutations run under the adapter's single-writer lock.
 */
var BomService = (() => {
  'use strict';
  const C=typeof BomCore!=='undefined'?BomCore:BomCore;
  class Service {
    constructor(repo, clock, uuid) { this.repo=repo; this.clock=clock; this.uuid=uuid; }
    context(machineId,write=false) {
      const ref=this.repo.references();
      const machine=ref.machines.find(m=>m.MachineID===machineId);
      if(!machine) C.fail('ไม่พบเครื่องจักรในทะเบียนกลาง','NOT_FOUND');
      const line=ref.lines.find(l=>l.LineID===machine.LineID&&l.DeptID===machine.DeptID);
      const dept=ref.departments.find(d=>d.DeptID===machine.DeptID);
      if(!line||!dept) C.fail('ความสัมพันธ์แผนกและไลน์ไม่ถูกต้อง กรุณาตรวจทะเบียนกลาง','SCHEMA');
      const editable=machine.IsActive&&line.IsActive&&dept.IsActive&&machine.Status!=='ปลดระวาง';
      if(write&&!editable) C.fail('เครื่องจักรนี้ดูประวัติได้ แต่เพิ่มหรือแก้ไขอุปกรณ์ไม่ได้','FORBIDDEN');
      return {machine,line,dept,editable,location:this.repo.location(machine,write)};
    }
    references(query) { return this.repo.references(Boolean(query && (query.refresh || query.refreshParts || query.refreshReferences))); }
    searchParts(query) {
      const parts=this.repo.parts(Boolean(query&&query.refreshParts));
      if(query&&query.all) return {items:parts,total:parts.length};
      const words=C.normalized(query.query).split(/\s+/).filter(Boolean);
      return C.page(parts.filter(p=>words.every(w=>C.normalized([p.ID,p['Part number'],p.Description,p.Brand].join(' ')).includes(w))),query);
    }
    lineMachineStats(query) {
      const ref=this.repo.references();
      const dept=ref.departments.find(d=>d.DeptID===C.text(query&&query.deptId));
      const line=ref.lines.find(l=>l.LineID===C.text(query&&query.lineId)&&dept&&l.DeptID===dept.DeptID);
      if(!dept||!line) C.fail('ความสัมพันธ์แผนกและไลน์ไม่ถูกต้อง กรุณาตรวจทะเบียนกลาง','SCHEMA');
      const machines=ref.machines.filter(m=>m.DeptID===dept.DeptID&&m.LineID===line.LineID);
      const location=this.repo.lineLocation(dept,line),asOfDate=C.today(this.clock());
      this.repo.assertReady(location);
      const load=()=>{
        const parts=new Map(this.repo.parts().map(p=>[p.ID,p]));
        const stats={};
        machines.forEach(machine=>{stats[machine.MachineID]={partTypes:0,totalPieces:0,attentionLabels:0};});
        const partIds=new Map(machines.map(machine=>[machine.MachineID,new Set()]));
        this.repo.records(location).filter(row=>row.RecordStatus==='ACTIVE'&&stats[row.MachineID]).forEach(row=>{
          if(C.text(row.PartID))partIds.get(row.MachineID).add(row.PartID);
          stats[row.MachineID].totalPieces+=Number(row.Quantity)||0;
          const age=C.age(row,parts.get(row.PartID),asOfDate);
          if(['overdue','today','soon'].includes(age.status))stats[row.MachineID].attentionLabels++;
        });
        partIds.forEach((ids,machineId)=>{stats[machineId].partTypes=ids.size;});
        return {deptId:dept.DeptID,lineId:line.LineID,asOfDate,machines:stats};
      };
      return this.repo.lineStats?this.repo.lineStats(location,asOfDate,load):load();
    }
    list(query) {
      const ctx=this.context(query.machineId); this.repo.assertReady(ctx.location);
      const parts=new Map(this.repo.parts(Boolean(query&&query.refreshParts)).map(p=>[p.ID,p]));
      const records=this.repo.records(ctx.location).filter(r=>r.MachineID===query.machineId);
      const allRows=records.map(row=>({...row,part:parts.get(row.PartID)||null,age:C.age(row,parts.get(row.PartID),C.today(this.clock()))}));
      const rows=allRows.filter(r=>query.history||r.RecordStatus==='ACTIVE');
      const current=allRows.filter(r=>r.RecordStatus==='ACTIVE');
      const totals={parts:new Set(current.map(r=>r.PartID)).size,labels:current.length,quantity:current.reduce((s,r)=>s+Number(r.Quantity),0),attention:current.filter(r=>['overdue','today','soon'].includes(r.age.status)).length};
      const words=C.normalized(query.query).split(/\s+/).filter(Boolean);
      const filtered=rows.filter(r=>(!query.status||r.age.status===query.status)&&words.every(w=>C.normalized([r.Label,r.PartID,r.part&&r.part['Part number'],r.part&&r.part.Description,r.part&&r.part.Brand,r.Notes].join(' ')).includes(w)));
      const groups=new Map();
      filtered.forEach(r=>{ if(!groups.has(r.PartID)) groups.set(r.PartID,{PartID:r.PartID,part:r.part,quantity:0,labels:[]}); const g=groups.get(r.PartID);g.quantity+=r.Quantity;g.labels.push(r); });
      const ordered=[...groups.values()].sort((a,b)=>a.PartID.localeCompare(b.PartID,'th',{numeric:true}));
      ordered.forEach(g=>g.labels.sort((a,b)=>a.Label.localeCompare(b.Label,'th',{numeric:true})));
      return {...C.page(ordered,query),totals,machine:ctx.machine,line:ctx.line,department:ctx.dept,editable:ctx.editable,asOf:C.today(this.clock()),filtered:!!(query.query||query.status),rawRows:allRows};
    }
    history(query) {
      const ctx=this.context(query.machineId); this.repo.assertReady(ctx.location);
      const rows=this.repo.records(ctx.location).filter(r=>r.MachineID===query.machineId&&r.EquipmentID===query.equipmentId);
      const parts=new Map(this.repo.parts().map(p=>[p.ID,p]));
      return {records:C.page(rows.sort((a,b)=>b.CreatedAt.localeCompare(a.CreatedAt)).map(r=>({...r,part:parts.get(r.PartID)||null,age:C.age(r,parts.get(r.PartID),C.today(this.clock()))})),query),events:C.page(this.repo.events(ctx.location,query.machineId,query.equipmentId),query)};
    }
    mutate(kind,payload,sessionRef) {
      if(!/^[A-Za-z0-9-]{16,80}$/.test(C.text(payload.operationId))) C.fail('คำสั่งบันทึกไม่มีรหัสอ้างอิงที่ถูกต้อง');
      const ctx=this.context(payload.machineId,true);
      const fingerprint=C.stable({kind,payload});
      const prior=this.repo.operation(ctx.location,payload.operationId);
      if(prior) {
        if(prior.Fingerprint!==fingerprint) C.fail('รหัสคำสั่งนี้ใช้กับข้อมูลอื่นแล้ว กรุณาตรวจผลเดิมก่อน','CONFLICT');
        return this.repo.replay(ctx.location,prior);
      }
      this.repo.assertReady(ctx.location,true);
      const records=this.repo.records(ctx.location);
      const active=records.filter(r=>r.MachineID===payload.machineId&&r.RecordStatus==='ACTIVE');
      const parts=new Map(this.repo.parts().map(p=>[p.ID,p]));
      const now=this.clock().toISOString(),on=C.today(this.clock());
      const changes=[], additions=[];
      const validate=(value,existingPart)=> {
        const valid=C.validate(value,on);
        if(!parts.has(valid.PartID)&&valid.PartID!==existingPart) C.fail('ไม่พบ Part ที่เลือก กรุณาเลือกใหม่','VALIDATION',{PartID:'ไม่พบ Part'});
        return valid;
      };
      const newRecord=(values,equipmentId,previous='')=>({...values,RecordID:this.uuid(),EquipmentID:equipmentId||this.uuid(),MachineID:payload.machineId,RecordStatus:'ACTIVE',EndedAt:'',PreviousRecordID:previous,CreatedAt:now,UpdatedAt:now,Version:1,OperationID:payload.operationId});
      const target=(item)=> {
        const row=active.find(r=>r.RecordID===item.recordId);
        if(!row||row.Version!==item.expectedVersion) C.fail('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดล่าสุดก่อนบันทึก','CONFLICT');
        return row;
      };
      if(kind==='add') {
        if(!Array.isArray(payload.labels)||!payload.labels.length||payload.labels.length>50) C.fail('เพิ่มได้ครั้งละ 1–50 รายการ');
        payload.labels.forEach(v=>additions.push(newRecord(validate(v))));
      } else if(kind==='edit') {
        const editItems = Array.isArray(payload.items) ? payload.items : [{recordId:payload.recordId, expectedVersion:payload.expectedVersion, values:payload.values}];
        if(!editItems.length || editItems.length>50) C.fail('แก้ไขได้ครั้งละ 1–50 รายการ');
        if(new Set(editItems.map(t=>t.recordId)).size!==editItems.length) C.fail('รายการที่เลือกแก้ไขซ้ำ');
        editItems.forEach(item => {
          const row=target(item);
          const values=validate({...item.values,PartID:item.values?.PartID||row.PartID},row.PartID);
          changes.push({before:row,after:{...row,...values,Version:row.Version+1,UpdatedAt:now,OperationID:payload.operationId}});
        });
      } else if(kind==='split') {
        if(!C.text(payload.reason).trim()) C.fail('กรอกเหตุผลการแยกจำนวน','VALIDATION',{reason:'ระบุเหตุผลที่แยกรายการ'});
        const row=target(payload);
        if(!Number.isSafeInteger(row.Quantity)||row.Quantity<2||row.Quantity>50) C.fail('แยกได้เฉพาะรายการที่มีจำนวน 2–50 ชิ้น','VALIDATION');
        if(!Array.isArray(payload.labels)||payload.labels.length!==row.Quantity) C.fail('กรอก Label ให้ครบ '+row.Quantity+' รายการ','VALIDATION',{SplitLabel:'กรอก Label ให้ครบตามจำนวนเดิม'});
        const values=payload.values||{};
        const splitRows=payload.labels.map((label,index)=>{
          const clean=C.text(label).trim();
          if(!clean) C.fail('กรอก Label รายการที่ '+(index+1),'VALIDATION',{['SplitLabel-'+index]:'กรอก Label'});
          return validate({...row,...values,PartID:row.PartID,Label:clean,Quantity:1},row.PartID);
        });
        const first=splitRows.shift();
        changes.push({before:row,after:{...row,...first,Version:row.Version+1,UpdatedAt:now,OperationID:payload.operationId}});
        splitRows.forEach(value=>additions.push(newRecord(value)));
      } else if(kind==='replace') {
        if(!Array.isArray(payload.targets)||!payload.targets.length||payload.targets.length>50) C.fail('เลือก 1–50 รายการต่อครั้ง');
        if(new Set(payload.targets.map(t=>t.recordId)).size!==payload.targets.length) C.fail('รายการที่เลือกซ้ำ');
        if(!C.date(payload.installedAt)) C.fail('ระบุวันที่เปลี่ยนอุปกรณ์','VALIDATION',{InstalledAt:'ระบุวันที่เปลี่ยน'});
        payload.targets.forEach(t=> {
          const row=target(t);
          if(row.InstalledAt&&payload.installedAt<row.InstalledAt) C.fail('วันที่เปลี่ยนต้องไม่ก่อนวันติดตั้งเดิม','VALIDATION',{InstalledAt:'วันที่เปลี่ยนก่อนรอบเดิม'});
          const values=validate({...row,PartID:t.partId||row.PartID,InstalledAt:payload.installedAt,DueMode:payload.dueMode,ManualExpiryDate:payload.manualExpiryDate||'',Notes:payload.notes===undefined?row.Notes:payload.notes});
          changes.push({before:row,after:{...row,RecordStatus:'REPLACED',EndedAt:payload.installedAt,UpdatedAt:now,Version:row.Version+1,OperationID:payload.operationId}});
          additions.push(newRecord(values,row.EquipmentID,row.RecordID));
        });
      } else if(kind==='remove') {
        if(!C.date(payload.endedAt)||payload.endedAt>on) C.fail('วันที่ถอดต้องอยู่ระหว่างวันติดตั้งและวันนี้','VALIDATION',{endedAt:'ตรวจวันที่ถอดอุปกรณ์'});
        if(!C.text(payload.reason).trim()) C.fail('กรอกเหตุผลการถอด','VALIDATION',{reason:'ระบุเหตุผลการถอด'});
        const targets = Array.isArray(payload.targets) ? payload.targets : [{recordId:payload.recordId, expectedVersion:payload.expectedVersion, quantity:payload.quantity}];
        if(!targets.length || targets.length>50) C.fail('เลือก 1–50 รายการต่อครั้ง');
        if(new Set(targets.map(t=>t.recordId)).size!==targets.length) C.fail('รายการที่เลือกซ้ำ');
        targets.forEach(t => {
          const row=target(t);
          if(row.InstalledAt&&payload.endedAt<row.InstalledAt) C.fail('วันที่ถอดต้องไม่ก่อนวันติดตั้งเดิม ('+(row.Label||'ไม่ระบุ')+')','VALIDATION',{endedAt:'วันที่ถอดก่อนวันติดตั้ง'});
          const removeQty = Number(t.quantity);
          if(Number.isSafeInteger(removeQty) && removeQty>0 && removeQty<row.Quantity) {
            changes.push({before:row,after:{...row,Quantity:row.Quantity-removeQty,Version:row.Version+1,UpdatedAt:now,OperationID:payload.operationId}});
            additions.push({...row,RecordID:this.uuid(),EquipmentID:row.EquipmentID,Quantity:removeQty,RecordStatus:'REMOVED',EndedAt:payload.endedAt,PreviousRecordID:row.RecordID,CreatedAt:now,UpdatedAt:now,Version:1,OperationID:payload.operationId});
          } else {
            changes.push({before:row,after:{...row,RecordStatus:'REMOVED',EndedAt:payload.endedAt,UpdatedAt:now,Version:row.Version+1,OperationID:payload.operationId}});
          }
        });
      } else C.fail('ไม่รองรับคำสั่งนี้');
      const changed=new Map(changes.map(c=>[c.before.RecordID,c.after]));
      C.uniqueLabels(active.map(r=>changed.get(r.RecordID)||r).filter(r=>r.RecordStatus==='ACTIVE').concat(additions));
      if(C.text(payload.reason).length>2000) C.fail('เหตุผลต้องไม่เกิน 2,000 ตัวอักษร');
      const result={operationId:payload.operationId,count:kind==='add'?additions.length:kind==='split'?1+additions.length:changes.length};
      const operation={OperationID:payload.operationId,Fingerprint:fingerprint,MachineID:payload.machineId,Status:'PREPARED',Plan:JSON.stringify({kind,changes,additions,reason:payload.reason||''}),Result:JSON.stringify(result),CreatedAt:now,SessionRef:sessionRef};
      if(operation.Plan.length>45000||fingerprint.length>45000) C.fail('ข้อมูลชุดนี้ยาวเกินไป กรุณาแบ่งบันทึกเป็นชุดเล็กลง');
      const commitResult=this.repo.commit(ctx.location,operation);
      if(this.repo.clearLineStats){try{this.repo.clearLineStats(ctx.location);}catch(_){/* Cache invalidation is best-effort; committed data remains authoritative. */}}
      return commitResult;
    }
  }
  return Service;
})();


export {BomService};
