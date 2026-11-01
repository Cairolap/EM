import {MachineCore} from './generated/machine-core.js';
import {PartCore} from './generated/part-core.js';
import {BomCore} from './generated/bom-core.js';
import {BomService} from './generated/bom-service.js';
import {Repository} from './repository.js';
import {columns,machineFields,partFields} from './model.js';
import {fail,conflict} from './errors.js';
import {authorizeWrite,authorizeDelete} from './auth.js';
import {readPicture,uploadPicture} from './drive.js';

const machineReads=new Set(['bootstrap','getMachines','getMachine','getMachinePhoto','getMachineTypes']);
const partReads=new Set(['bootstrap','getParts','getAllParts','getBrands','getPicture','getPart','getPartMachines']);
const bomReads=new Set(['references','searchParts','lineMachineStats','list','history','searchPartUsage','whereUsed']);

export const isRead=(scope,method)=>(scope==='machines'?machineReads:scope==='parts'?partReads:bomReads).has(method);
const publicMachine=({requestId,photoFileId,...m})=>({...m,hasPhoto:!!photoFileId});
const publicPart=({requestId,...p})=>p;

async function bomReferences(repo, actor){
 const ref=await repo.references(),rawMachines=await repo.catalog('machines');
 const bomRef={
  departments:ref.departments.map(d=>({DeptID:d.deptId,DeptName:d.deptName,Code:d.deptId,IsActive:d.isActive})),
  lines:ref.lines.map(l=>({LineID:l.lineId,DeptID:l.deptId,LineName:l.lineName,IsActive:l.isActive})),
  machines:rawMachines.map(m=>({MachineID:m.machineId,MachineCode:m.machineCode,MachineName:m.machineName,DeptID:m.deptId,LineID:m.lineId,LineOrder:m.lineOrder,IsActive:m.isActive,Status:m.status})),
  role:actor?.role,
  permissions:actor?.permissions
 };
 return bomRef;
}

function mapBomParts(rawParts){
 return rawParts.map(p=>({
  ID:p.id,'Part number':p.partNumber,Description:p.description,Brand:p.brand,
  Price:p.price,Picture:p.picture,Thumbnail:p.thumbnail,'Store code':p.storeCode,'อายุอุปกรณ์ (ปี)':p.lifespan,Notes:p.notes,
  brandId:p.brandId,version:p.version
 }));
}

async function bomContext(repo){
 const bomRef=await bomReferences(repo),rawParts=await repo.catalog('parts');
 return {bomRef,bomParts:mapBomParts(rawParts)};
}

export async function dispatch(env,actor,scope,method,args,key){
 const repo=new Repository(env.DB);
 if(!['machines','parts','bom'].includes(scope)||typeof method!=='string'||!Array.isArray(args)||args.length>3)fail('VALIDATION','คำขอไม่ถูกต้อง');

 if(isRead(scope,method)){
  if(scope==='machines'){
   if(method==='bootstrap'){
    const ref=await repo.references(),types=(await repo.machineTypes()).filter(t=>t.active);
    return {...ref,departments:ref.departments.filter(d=>d.isActive),lines:ref.lines.filter(l=>l.isActive),statuses:MachineCore.STATUSES,criticalities:MachineCore.CRITICALITIES,machineTypes:types.map(t=>t.name),machineTypeDetails:types,pageSizes:MachineCore.PAGE_SIZES,role:actor.role,permissions:actor.permissions};
   }
   if(method==='getMachineTypes')return (await repo.machineTypes()).filter(t=>t.active);
   if(method==='getMachines'){
    const rows=await repo.catalog(scope),result=MachineCore.query(rows,args[0]||{}),visible=rows.filter(m=>m.isActive);
    return {...result,items:result.items.map(publicMachine),statusCounts:{...Object.fromEntries(MachineCore.STATUSES.map(s=>[s,visible.filter(m=>m.status===s).length])),all:visible.length}};
   }
   const m=await repo.machine(String(args[0]));if(!m)fail('NOT_FOUND','ไม่พบเครื่องจักรนี้',404);
   if(method==='getMachine')return publicMachine(m);
   return m.photoFileId?readPicture(env,scope,m.photoFileId):null;
  }
  if(scope==='parts'){
   if(method==='getBrands')return (await repo.brands()).filter(b=>b.active).sort((a,b)=>a.name.localeCompare(b.name,'th',{numeric:true,sensitivity:'base'}));
   if(method==='getPart'){const p=await repo.part(String(args[0]));if(!p)fail('NOT_FOUND','ไม่พบ Part นี้',404);return publicPart(p);}
    if(method==='getPartMachines')return repo.partWhereUsed(String(args[0]));
   if(method==='getPicture'){const p=await repo.part(String(args[0]));if(!p)fail('NOT_FOUND','ไม่พบ Part นี้',404);const source=args[1]==='full'?p.picture:p.thumbnail||p.picture;return source?readPicture(env,scope,source):null;}
   const rows=await repo.catalog(scope);
   if(method==='bootstrap')return {parts:rows.map(publicPart),brands:(await repo.brands()).filter(b=>b.active),webAppUrl:'/parts/',role:actor.role};
   if(method==='getAllParts')return rows.map(publicPart);
   return args[0]?.all?{all:true,allTotal:rows.length,total:rows.length,items:rows.map(publicPart)}:{...PartCore.query(rows,args[0]||{}),items:PartCore.query(rows,args[0]||{}).items.map(publicPart)};
  }
  if(scope==='bom'){
   if(method==='references')return bomReferences(repo, actor);
    if(method==='searchPartUsage')return repo.searchPartWhereUsed(String(args[0]||''));
    if(method==='whereUsed')return repo.partWhereUsed(String(args[0]));
   if(method==='searchParts'){
    const query=args[0]||{};
    const {bomParts}=await bomContext(repo);
    if(query.all)return {items:bomParts,total:bomParts.length};
    const words=BomCore.normalized(query.query).split(/\s+/).filter(Boolean);
    return BomCore.page(bomParts.filter(p=>words.every(w=>BomCore.normalized([p.ID,p['Part number'],p.Description,p.Brand].join(' ')).includes(w))),query);
   }
   if(method==='lineMachineStats'){
    const query=args[0]||{},records=await repo.bomLineRecords(query.deptId,query.lineId);
    const bomRef=await bomReferences(repo);
    const rawParts=await repo.bomPartsForLine(query.deptId,query.lineId);
    const bomParts=mapBomParts(rawParts);
    const bomRepo={references:()=>bomRef,parts:()=>bomParts,lineLocation:(dept,line)=>({code:dept.DeptID,sheet:'LINE_'+line.LineID}),assertReady:()=>{},records:()=>records};
    const service=new BomService(bomRepo,()=>new Date(),()=>crypto.randomUUID());
    return service.lineMachineStats(query);
   }
   if(method==='list'){
    const query=args[0]||{},records=await repo.bomRecords(query.machineId);
    const bomRef=await bomReferences(repo);
    const rawParts=await repo.bomPartsForMachine(query.machineId);
    const bomParts=mapBomParts(rawParts);
    const bomRepo={references:()=>bomRef,parts:()=>bomParts,location:(m)=>({code:m.DeptID,sheet:'LINE_'+m.LineID}),assertReady:()=>{},records:()=>records};
    const service=new BomService(bomRepo,()=>new Date(),()=>crypto.randomUUID());
    return service.list(query);
   }
   if(method==='history'){
    const query=args[0]||{},records=await repo.bomRecords(query.machineId),events=await repo.bomEvents(query.machineId,query.equipmentId);
    const bomRef=await bomReferences(repo);
    const rawParts=await repo.bomPartsForMachine(query.machineId);
    const bomParts=mapBomParts(rawParts);
    const bomRepo={references:()=>bomRef,parts:()=>bomParts,location:(m)=>({code:m.DeptID,sheet:'LINE_'+m.LineID}),assertReady:()=>{},records:()=>records,events:()=>events};
    const service=new BomService(bomRepo,()=>new Date(),()=>crypto.randomUUID());
    return service.history(query);
   }
  }
 }

 authorizeWrite(actor,env);
 if(scope==='bom'){
  if(['add','edit','split','replace','remove'].includes(method))return saveBomMutation(repo,actor,method,args,key);
  fail('NOT_FOUND','ไม่พบคำสั่งนี้',404);
 }

 const payload=args.findLast(x=>x && typeof x==='object' && !Array.isArray(x));
 const req=await repo.request(actor,scope+':'+method,args,payload?.requestId||key);
 if(req.replay)return req.replay;
 if(['deleteMachine','deletePart'].includes(method))fail('REFERENCE_CHECK_REQUIRED','ยังไม่เปิดการลบถาวรระหว่างย้ายระบบ กรุณาซ่อนเครื่องจักรหรือคง Part ไว้เพื่อรักษาประวัติ BOM',409);
 if(scope==='machines'){
  if(method==='reorderMachine')return repo.reorderMachine(req,String(args[0]),Number(args[1]?.position));
  if(['createMachineType','deleteMachineType'].includes(method))return saveMachineType(repo,actor,env,req,method,args);
  return saveMachine(env,repo,req,method,args);
 }
 if(['createBrand','deleteBrand'].includes(method))return saveBrand(repo,req,method,args);
 if(['createPart','updatePart','updatePartImage'].includes(method))return savePart(env,repo,req,method,args);
 if(method==='createPartsBatch')return savePartsBatch(env,repo,req,args[0]);
 fail('NOT_FOUND','ไม่พบคำสั่งนี้',404);
}

async function saveBomMutation(repo,actor,method,args,key){
 const payload=args[0];
 if(!payload||typeof payload!=='object')fail('VALIDATION','ไม่พบข้อมูลคำขอ');
 const opId=payload.operationId||key||crypto.randomUUID();
 payload.operationId=opId;
 if(actor&&(actor.role==='admin'||actor.permissions?.bom==='admin'))payload.isAdmin=true;
 const req=await repo.request(actor,'bom:'+method,args,opId);
 if(req.replay)return req.replay;
 const prior=await repo.bomOperation(opId);
 const fingerprint=BomCore.stable({kind:method,payload});
 if(prior){
  if(prior.Fingerprint!==fingerprint)fail('CONFLICT','รหัสคำสั่งนี้ใช้กับข้อมูลอื่นแล้ว กรุณาตรวจผลเดิมก่อน',409);
  return JSON.parse(prior.Result);
 }
 const {bomRef,bomParts}=await bomContext(repo);
 const records=await repo.bomRecords(payload.machineId);
 let committedPlan=null;
 const bomRepo={
  references:()=>bomRef,parts:()=>bomParts,location:(m)=>({code:m.DeptID,sheet:'LINE_'+m.LineID}),
  assertReady:()=>{},records:()=>records,operation:()=>null,
  commit:(loc,op)=>{committedPlan=op;return JSON.parse(op.Result);},
  replay:(loc,op)=>JSON.parse(op.Result)
 };
 const service=new BomService(bomRepo,()=>new Date(),()=>crypto.randomUUID());
 service.mutate(method,payload,actor.id);
 if(!committedPlan)fail('VALIDATION','ประมวลผลคำสั่งไม่สำเร็จ');
 const planObj=JSON.parse(committedPlan.Plan);
 return repo.bomCommit(req,committedPlan,planObj.changes||[],planObj.additions||[],actor.id);
}

async function saveMachine(env,repo,req,method,args){
 const creating=method==='createMachine',lifecycle=['archiveMachine','restoreMachine','retireMachine'].includes(method);
 if(!creating&&!lifecycle&&method!=='updateMachine')fail('NOT_FOUND','ไม่พบคำสั่งนี้',404);
 const before=creating?null:await repo.machine(String(args[0]));if(!creating&&!before)fail('NOT_FOUND','ไม่พบเครื่องจักรนี้',404);
 const payload=creating?args[0]:lifecycle?{...before,version:args[1]}:args[1];if(!payload)fail('VALIDATION','ไม่พบข้อมูล');
 if(before&&before.version!==Number(payload.version))conflict();
 const activeTypes=(await repo.machineTypes()).filter(t=>t.active).map(t=>t.name);
 const validation=MachineCore.validate(payload, activeTypes);
 if(before && MachineCore.normalize(before.machineType)===MachineCore.normalize(validation.value.machineType))delete validation.errors.machineType;
 if(Object.keys(validation.errors).length)fail('VALIDATION','ตรวจสอบช่องที่ระบุด้านล่าง',422,validation.errors);
 const value=validation.value,ref=await repo.references();
 const dept=ref.departments.find(d=>d.deptId===value.deptId),line=ref.lines.find(l=>l.lineId===value.lineId);
 if(!dept||(!dept.isActive&&before?.deptId!==dept.deptId))fail('VALIDATION','แผนกนี้ไม่พร้อมใช้งาน',422,{deptId:'เลือกแผนกใหม่'});
 if(!line||line.deptId!==value.deptId||(!line.isActive&&before?.lineId!==line.lineId))fail('VALIDATION','ไลน์ผลิตไม่อยู่ในแผนกที่เลือก',422,{lineId:'เลือกไลน์ใหม่'});
 const duplicate=await env.DB.prepare('SELECT id FROM machines WHERE normalized_code=? AND id<>?').bind(MachineCore.normalize(value.machineCode),before?.machineId||'').first();
 if(duplicate)fail('DUPLICATE','รหัสเครื่องจักรนี้มีอยู่แล้ว',409,{machineCode:'ใช้รหัสอื่น'});
 const id=before?.machineId||await repo.nextId('machines');
 let photoFileId=before?.photoFileId||'',photoFileName=before?.photoFileName||'';
 if(!lifecycle&&payload.image){const image=await uploadPicture(env,'machines',req,'full',payload.image,id);photoFileId=image.id;photoFileName=image.name;}
 else if(!lifecycle&&payload.removePhoto){photoFileId='';photoFileName='';}
 if(method==='archiveMachine')value.isActive=false;if(method==='restoreMachine')value.isActive=true;if(method==='retireMachine')value.status='ปลดระวาง';
 const m={...value,machineId:id,photoFileId,photoFileName,createdAt:before?.createdAt||req.now,createdBy:before?.createdBy||req.actor,updatedAt:req.now,updatedBy:req.actor,version:before?before.version+1:1,requestId:req.key};
 return repo.commit(req,'machines',id,before,{...columns(machineFields,m),normalized_code:MachineCore.normalize(m.machineCode)},{machineId:id,version:m.version});
}

async function savePart(env,repo,req,method,args){
 const creating=method==='createPart',imageOnly=method==='updatePartImage',payload=creating?args[0]:args[1];
 if(!payload)fail('VALIDATION','ไม่พบข้อมูล');
 const before=creating?null:await repo.part(String(args[0]));if(!creating&&!before)fail('NOT_FOUND','ไม่พบ Part นี้',404);
 if(before&&before.version!==Number(payload.version))conflict();
 const result=PartCore.validate(imageOnly?before:payload);if(!imageOnly&&Object.keys(result.errors).length)fail('VALIDATION','ตรวจสอบช่องที่ระบุด้านล่าง',422,result.errors);
 const value=result.value,brand=(await repo.brands()).find(b=>b.id===value.brandId);
 if(value.brandId&&(!brand||(!brand.active&&before?.brandId!==brand.id)))fail('VALIDATION','Brand นี้ไม่พร้อมใช้งาน',422,{brandId:'เลือก Brand ใหม่'});
 const id=before?.id||await repo.nextId('parts');let picture=before?.picture||'',thumbnail=before?.thumbnail||'';
 if(payload.image){picture=(await uploadPicture(env,'parts',req,'full',payload.image,id)).url;thumbnail=payload.thumbnail?(await uploadPicture(env,'parts',req,'thumbnail',payload.thumbnail,id,100000)).url:'';}
 else if(payload.removeImage){picture='';thumbnail='';}
 else if(imageOnly)fail('VALIDATION','กรุณาเลือกรูปภาพ');
 const p={...value,id,brand:brand?.name||'',picture,thumbnail,createdAt:before?.createdAt||req.now,updatedAt:req.now,version:before?before.version+1:1,requestId:req.key};
 return repo.commit(req,'parts',id,before,{...columns(partFields,p),price_minor:value.price===null?null:Math.round(value.price*100)},{id,version:p.version,picture,thumbnail});
}

async function savePartsBatch(env,repo,req,rawItems){
 const items=Array.isArray(rawItems)?rawItems:(rawItems?.parts||[]);
 if(!items.length)fail('VALIDATION','ไม่พบข้อมูลรายการอะไหล่');

 const allExisting=await repo.catalog('parts');
 const dbPartNumbers=new Set(allExisting.map(p=>PartCore.normalize(p.partNumber)));
 const seenInBatch=new Set();
 const brands=await repo.brands();
 const brandMap=new Map(brands.map(b=>[b.id,b]));
 const brandNameMap=new Map(brands.map(b=>[PartCore.normalize(b.name),b]));

 const validRows=[];
 let skippedCount=0;

 for(const item of items){
  const pn=String(item.partNumber||'').trim();
  if(!pn){skippedCount++;continue;}
  const norm=PartCore.normalize(pn);
  if(dbPartNumbers.has(norm)||seenInBatch.has(norm)){skippedCount++;continue;}
  seenInBatch.add(norm);

  const val=PartCore.validate({
   partNumber:pn,
   description:item.description||'-',
   storeCode:item.storeCode||'',
   lifespan:item.lifespan,
   price:item.price,
   brandId:item.brandId
  });

  if(Object.keys(val.errors).length>0){skippedCount++;continue;}

  let brand=null;
  if(val.value.brandId)brand=brandMap.get(val.value.brandId);
  else if(item.brand)brand=brandNameMap.get(PartCore.normalize(item.brand));

  validRows.push({item,value:val.value,brand});
 }

 if(!validRows.length){
  return {success:true,createdCount:0,skippedCount,createdParts:[]};
 }

 const count=validRows.length;
 const counterRes=await env.DB.prepare('UPDATE id_counters SET value=value+? WHERE kind=? RETURNING value').bind(count,'parts').first();
 if(!counterRes)fail('SCHEMA','ยังไม่ได้เตรียมฐานข้อมูล',503);
 const endVal=Number(counterRes.value);
 const startVal=endVal-count+1;

 const createdParts=[];
 const statements=[];

 for(let i=0;i<count;i++){
  const {item,value,brand}=validRows[i];
  const id='PART-'+String(startVal+i).padStart(6,'0');

  let picture='',thumbnail='';
  if(item.image){
   try{
    const uploadedPic=await uploadPicture(env,'parts',req,'bulk_'+id+'_full',item.image,id);
    picture=uploadedPic.url;
    if(item.thumbnail){
     const uploadedThumb=await uploadPicture(env,'parts',req,'bulk_'+id+'_thumb',item.thumbnail,id,100000);
     thumbnail=uploadedThumb.url;
    }
   }catch(err){
    console.error('Image upload failed for part '+id,err);
   }
  }

  const p={
   ...value,
   id,
   brand:brand?.name||item.brand||'',
   brandId:brand?.id||null,
   picture,
   thumbnail,
   notes:item.notes||'',
   createdAt:req.now,
   updatedAt:req.now,
   version:1,
   requestId:req.key
  };

  const after={
   ...columns(partFields,p),
   price_minor:value.price===null?null:Math.round(value.price*100)
  };

  createdParts.push({
   ...p,
   brandActive:!!brand?.active,
   price:value.price,
   hasThumbnail:!!thumbnail,
   _after: after
  });
 }

 const response={
  success:true,
  createdCount:createdParts.length,
  skippedCount,
  createdParts: createdParts.map(({_after,...cp})=>cp)
 };

 statements.push(
  env.DB.prepare("INSERT INTO requests VALUES(?,?,?,?,'DONE',?,?)").bind(req.key,req.actor,req.operation,req.payloadHash,JSON.stringify(response),req.now)
 );

 for(const cp of createdParts){
  const after=cp._after;
  statements.push(
   env.DB.prepare(`INSERT INTO parts (${Object.keys(after).join(',')}) VALUES(${Object.keys(after).map(()=>'?').join(',')})`).bind(...Object.values(after))
  );
 }

 statements.push(
  env.DB.prepare('INSERT INTO audit_events(request_key,actor,operation,entity_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(req.key,req.actor,req.operation,createdParts.map(cp=>cp.id).join(','),null,JSON.stringify(createdParts.map(cp=>cp._after)),req.now)
 );

 statements.push(
  env.DB.prepare("UPDATE image_operations SET status='ATTACHED' WHERE request_key=? AND status='UPLOADED'").bind(req.key)
 );

 await env.DB.batch(statements);

 return response;
}

async function saveBrand(repo,req,method,args){
 const brands=await repo.brands();let before,value;
 if(method==='createBrand'){
  const name=String(args[0]||'').trim().replace(/\s+/g,' ');if(!name||name.length>100)fail('VALIDATION','กรอกชื่อ Brand 1–100 ตัวอักษร');
  before=brands.find(b=>PartCore.normalize(b.name)===PartCore.normalize(name));
  if(before?.active)fail('DUPLICATE','มี Brand นี้แล้ว',409);
  if(before&&!args[1])return {requiresReactivation:true,id:before.id,name:before.name};
  value={id:before?.id||'BR-'+crypto.randomUUID(),name:before?.name||name,active:true,version:(before?.version||0)+1};
 }else{before=brands.find(b=>b.id===String(args[0]));if(!before)fail('NOT_FOUND','ไม่พบ Brand',404);value={...before,active:false,version:before.version+1};}
 return repo.commit(req,'brands',value.id,before,{id:value.id,name:value.name,normalized_name:PartCore.normalize(value.name),is_active:Number(value.active),version:value.version},value);
}

async function saveMachineType(repo,actor,env,req,method,args){
 const types=await repo.machineTypes();let before,value;
 if(method==='createMachineType'){
  const name=String(args[0]||'').trim().replace(/\s+/g,' ');if(!name||name.length>100)fail('VALIDATION','กรอกชื่อประเภทเครื่องจักร 1–100 ตัวอักษร');
  before=types.find(t=>MachineCore.normalize(t.name)===MachineCore.normalize(name));
  if(before?.active)fail('DUPLICATE','มีประเภทเครื่องจักรนี้แล้ว',409);
  if(before&&!args[1])return {requiresReactivation:true,id:before.id,name:before.name};
  value={id:before?.id||'MT-'+crypto.randomUUID(),name:before?.name||name,active:true,version:(before?.version||0)+1};
 }else{
  authorizeDelete(actor,env,'machines');
  before=types.find(t=>t.id===String(args[0]));if(!before)fail('NOT_FOUND','ไม่พบประเภทเครื่องจักรนี้',404);
  value={...before,active:false,version:before.version+1};
 }
 return repo.commit(req,'machine_types',value.id,before,{id:value.id,name:value.name,normalized_name:MachineCore.normalize(value.name),is_active:Number(value.active),version:value.version},value);
}
