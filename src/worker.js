import {authenticate, authenticateUser, changePassword, createSession, destroySession} from './auth.js';
import {dispatch} from './service.js';
import {Repository} from './repository.js';
import {listUsers, createUser, updateUser, resetPassword, deleteUser} from './user-service.js';
import {AppError,fail,json} from './errors.js';

export default {
 async fetch(request,env){
  try{
   const url=new URL(request.url);

   // 1. Static Web Assets & Root Redirect (No Auth Required to load HTML/JS/CSS)
   if(!url.pathname.startsWith('/api/')){
    if(!['GET','HEAD'].includes(request.method))fail('METHOD','ไม่รองรับคำขอนี้',405);
    if(url.pathname==='/')return Response.redirect(url.origin+'/machines/',302);
    if(!env.ASSETS)fail('CONFIG','ยังไม่ได้ build หน้าเว็บ',503);
    const response=await env.ASSETS.fetch(request);
    const headers=new Headers(response.headers);
    headers.set('Cache-Control','private, no-store');
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Referrer-Policy','same-origin');
    headers.set('X-Frame-Options','DENY');
    return new Response(response.body,{status:response.status,headers});
   }

   // 2. CSRF Origin validation for state-changing POST requests
   if(request.method==='POST'){
    const origin=request.headers.get('Origin');
    if(origin && origin!==url.origin)fail('FORBIDDEN','ต้นทางคำขอไม่ถูกต้อง กรุณาเปิดหน้าเว็บใหม่',403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('VALIDATION','รองรับ JSON เท่านั้น',415);
   }

   // 3. Authentication Routes
   if(url.pathname==='/api/v1/auth/login'){
    if(request.method!=='POST')fail('METHOD','ใช้ POST สำหรับการเข้าสู่ระบบ',405);
    let body;
    try{ body=await request.json(); }catch{ fail('VALIDATION','รูปแบบข้อมูลไม่ถูกต้อง'); }
    const user=await authenticateUser(env.DB, body?.username, body?.password);
    const session=await createSession(env.DB, user.id);
    const secure=url.protocol==='https:'?'; Secure':'';
    const cookie=`em_session=${session.rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
    const res=json({ok:true,data:{
      username:user.username,
      displayName:user.display_name,
      role:user.role,
      permissions:user.permissions,
      mustChangePassword:user.mustChangePassword
    }});
    res.headers.set('Set-Cookie',cookie);
    return res;
   }

   if(url.pathname==='/api/v1/auth/logout'){
    if(request.method!=='POST')fail('METHOD','ใช้ POST สำหรับการออกจากระบบ',405);
    const cookie=request.headers.get('Cookie')||'';
    const sessionToken=cookie.match(/(?:^|;\s*)em_session=([^;]+)/)?.[1]||request.headers.get('Authorization')?.replace(/^Bearer\s+/,'');
    if(sessionToken)await destroySession(env.DB,sessionToken);
    const secure=url.protocol==='https:'?'; Secure':'';
    const res=json({ok:true});
    res.headers.set('Set-Cookie',`em_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
    return res;
   }

   // 4. Authenticate actor for all remaining protected API endpoints
   const actor=await authenticate(request,env);

   if(url.pathname==='/api/v1/auth/change-password'){
    if(request.method!=='POST')fail('METHOD','ใช้ POST สำหรับการเปลี่ยนรหัสผ่าน',405);
    let body;
    try{ body=await request.json(); }catch{ fail('VALIDATION','รูปแบบข้อมูลไม่ถูกต้อง'); }
    await changePassword(env.DB, actor.id, body?.newPassword);
    return json({ok:true});
   }

   if(url.pathname==='/api/v1/auth/me'){
    if(request.method!=='GET')fail('METHOD','ใช้ GET สำหรับการตรวจสอบสิทธิ์',405);
    return json({ok:true,data:{
      id:actor.id,
      username:actor.username,
      displayName:actor.displayName,
      role:actor.role,
      permissions:actor.permissions,
      mustChangePassword:actor.mustChangePassword
    }});
   }

   if(url.pathname==='/api/v1/health')return json({ok:true,data:{environment:env.ENVIRONMENT,maintenance:env.MAINTENANCE_MODE!=='false',role:actor.role}});

   // User Management RPC
   if(url.pathname==='/api/v1/users/rpc'){
    if(request.method!=='POST')fail('METHOD','ใช้ POST สำหรับคำสั่งผู้ใช้งาน',405);
    let body;
    try{ body=await request.json(); }catch{ fail('VALIDATION','รูปแบบคำขอไม่ถูกต้อง'); }
    const {method, args=[]} = body || {};
    let result;
    if(method==='listUsers') result=await listUsers(env,actor);
    else if(method==='createUser') result=await createUser(env,actor,args[0]);
    else if(method==='updateUser') result=await updateUser(env,actor,args[0],args[1]);
    else if(method==='resetPassword') result=await resetPassword(env,actor,args[0]);
    else if(method==='deleteUser') result=await deleteUser(env,actor,args[0]);
    else fail('NOT_FOUND','ไม่พบคำสั่งผู้ใช้นี้',404);
    return json({ok:true,data:result});
   }

   const match=url.pathname.match(/^\/api\/v1\/(machines|parts|bom)\/rpc$/);
   if(match){
    if(request.method!=='POST')fail('METHOD','ใช้ POST สำหรับคำสั่งทะเบียน',405);
    if(actor.role==='integration')fail('FORBIDDEN','บริการนี้อ่านได้เฉพาะข้อมูล BOM',403);
    const scope=match[1];
    if(actor.permissions && actor.permissions[scope]==='none')fail('FORBIDDEN','ไม่มีสิทธิ์เข้าถึงโมดูลนี้',403);
    if(Number(request.headers.get('Content-Length'))>2400000)fail('TOO_LARGE','ขนาดคำขอเกินกำหนด',413);
    const reader=request.body?.getReader();if(!reader)fail('VALIDATION','ไม่พบข้อมูล');
    const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2400000){await reader.cancel();fail('TOO_LARGE','ขนาดคำขอเกินกำหนด',413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('VALIDATION','รูปแบบคำขอไม่ถูกต้อง');}

    // Check deletion permission
    const isDelete = ['deleteMachine','deleteBrand','remove'].includes(body.method);
    if(isDelete && actor.permissions && !actor.permissions.can_delete){
      fail('FORBIDDEN','บัญชีนี้ไม่ได้รับสิทธิ์ในการลบข้อมูล',403);
    }

    return json({ok:true,data:await dispatch(env,actor,scope,body.method,body.args||[],request.headers.get('Idempotency-Key'))});
   }

   if(url.pathname.startsWith('/api/v1/integrations/bom/')){
    if(request.method!=='GET')fail('METHOD','บริการ BOM อ่านได้เท่านั้น',405);
    const repo=new Repository(env.DB);let data;
    if(url.pathname.endsWith('/references')){
     const ref=await repo.references(),machines=await repo.catalog('machines');
     data={departments:ref.departments.map(d=>({DeptID:d.deptId,DeptName:d.deptName,IsActive:d.isActive})),lines:ref.lines.map(l=>({LineID:l.lineId,DeptID:l.deptId,LineName:l.lineName,IsActive:l.isActive})),machines:machines.map(m=>({MachineID:m.machineId,MachineCode:m.machineCode,MachineName:m.machineName,DeptID:m.deptId,LineID:m.lineId,Status:m.status,IsActive:m.isActive}))};
    }else if(url.pathname.endsWith('/parts')) data=(await repo.catalog('parts')).map(p=>({ID:p.id,'Part number':p.partNumber,Description:p.description,Brand:p.brand,Price:p.price,Picture:p.picture,Thumbnail:p.thumbnail,'Store code':p.storeCode,'อายุอุปกรณ์ (ปี)':p.lifespan,Notes:p.notes}));
    else fail('NOT_FOUND','ไม่พบข้อมูล',404);
    return json({ok:true,data});
   }

   fail('NOT_FOUND','ไม่พบ API นี้',404);
  }catch(e){const known=e instanceof AppError||Boolean(e?.code);const status=e.status||(e.code==='VALIDATION'?422:e.code==='CONFLICT'?409:e.code==='UNAUTHORIZED'||e.code==='AUTH'?401:e.code==='FORBIDDEN'?403:e.code==='NOT_FOUND'?404:known?422:500);if(!known)console.error('Registry request failed',e?.name);return json({ok:false,error:{code:known?e.code:'SERVER',message:e.message||'เชื่อมต่อข้อมูลไม่สำเร็จ กรุณาลองใหม่',fields:e.fields||{}}},status);}
 }
};
