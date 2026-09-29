import {fail} from './errors.js';
let tokenCache=null;
export function fileId(source){
 if(!source)return '';
 if(/^[\w-]{20,}$/.test(source))return source;
 try{const url=new URL(source);if(!['drive.google.com','docs.google.com'].includes(url.hostname))return '';return url.searchParams.get('id')||url.pathname.match(/\/d\/([\w-]+)/)?.[1]||'';}catch{return '';}
}
export function fastBase64Decode(b64) {
 if (typeof Uint8Array.fromBase64 === 'function') {
  return Uint8Array.fromBase64(b64);
 }
 const binary = atob(b64);
 const len = binary.length;
 const bytes = new Uint8Array(len);
 for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
 return bytes;
}
export function decodeImage(image,max=1500000){
 if(!image||!['image/jpeg','image/png','image/webp'].includes(image.mime)||typeof image.base64!=='string'||image.base64.length>Math.ceil(max/3)*4+4)fail('VALIDATION','รองรับรูป JPEG, PNG หรือ WebP ที่ขนาดไม่เกินกำหนด');
 let bytes;try{bytes=fastBase64Decode(image.base64);}catch{fail('VALIDATION','ไฟล์รูปไม่ถูกต้อง');}
 const hex=Array.from(bytes.slice(0,12),b=>b.toString(16).padStart(2,'0')).join('');
 const valid=image.mime==='image/jpeg'?hex.startsWith('ffd8ff'):image.mime==='image/png'?hex.startsWith('89504e470d0a1a0a'):hex.startsWith('52494646')&&hex.slice(16,24)==='57454250';
 if(!valid||!bytes.length||bytes.length>max)fail('VALIDATION','เนื้อหารูปไม่ตรงกับชนิดไฟล์หรือขนาดเกินกำหนด');
 return bytes;
}
async function getServiceAccountToken(email, privateKeyPem) {
 const cleanKey = privateKeyPem
  .replace(/\\n/g, '')
  .replace(/-----BEGIN [A-Z ]+-----/g, '')
  .replace(/-----END [A-Z ]+-----/g, '')
  .replace(/\s+/g, '');
 const bytes = fastBase64Decode(cleanKey);

 const cryptoKey = await crypto.subtle.importKey(
  'pkcs8',
  bytes.buffer,
  { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  false,
  ['sign']
 );

 const now = Math.floor(Date.now() / 1000);
 const enc = new TextEncoder();
 const b64url = obj => btoa(unescape(encodeURIComponent(typeof obj === 'string' ? obj : JSON.stringify(obj)))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

 const header = b64url({ alg: 'RS256', typ: 'JWT' });
 const payload = b64url({
  iss: email,
  scope: 'https://www.googleapis.com/auth/drive',
  aud: 'https://oauth2.googleapis.com/token',
  exp: now + 3600,
  iat: now
 });

 const dataToSign = enc.encode(`${header}.${payload}`);
 const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataToSign);
 const signBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
 const assertion = `${header}.${payload}.${signBase64}`;

 const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
   grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
   assertion
  }),
  signal: AbortSignal.timeout(15000)
 });

 if (!response.ok) fail('DRIVE_AUTH', 'บัญชี Service Account เชื่อมต่อ Drive ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์', 503);
 return await response.json();
}

async function token(env){
 if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
  if (tokenCache?.client === env.GOOGLE_CLIENT_ID && tokenCache.expires > Date.now()) return tokenCache.value;
  const response = await fetch('https://oauth2.googleapis.com/token', {
   method: 'POST',
   body: new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
   }),
   signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) fail('DRIVE_AUTH', 'บัญชีรูปภาพเชื่อมต่อไม่ได้ กรุณาติดต่อผู้ดูแลเพื่อต่ออายุสิทธิ์', 503);
  const data = await response.json();
  tokenCache = { client: env.GOOGLE_CLIENT_ID, value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
 }
 if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
  if (tokenCache?.client === env.GOOGLE_SERVICE_ACCOUNT_EMAIL && tokenCache.expires > Date.now()) return tokenCache.value;
  const data = await getServiceAccountToken(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, env.GOOGLE_PRIVATE_KEY);
  tokenCache = { client: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
 }
 fail('DRIVE_CONFIG', 'ยังไม่ได้เชื่อมบัญชีรูปภาพ กรุณาติดต่อผู้ดูแล', 503);
}
async function call(env,path,options={},timeoutMs=25000){
 const access=await token(env);
 try{return await fetch('https://www.googleapis.com'+path,{...options,headers:{...options.headers,Authorization:'Bearer '+access},signal:AbortSignal.timeout(timeoutMs)});}catch{fail('DRIVE_TIMEOUT','ยังไม่ทราบผลการเชื่อมต่อรูปภาพ กรุณาลองคำขอเดิมอีกครั้ง',503);}
}
function folder(env,scope){
 const id=scope==='announcements'?(env.ANNOUNCEMENT_FOLDER_ID||'1HH9TL8_Z3dzXrA8O-0Gx9ajq5Z2wj-h8'):(scope==='parts'&&env.PART_IMAGE_FOLDER_ID)?env.PART_IMAGE_FOLDER_ID:env.MACHINE_IMAGE_FOLDER_ID;
 if(!id||!/^[\w-]{10,}$/.test(id))fail('DRIVE_CONFIG','ยังไม่ได้ยืนยันโฟลเดอร์รูปภาพของทะเบียนนี้',503);
 return id;
}
async function metadata(env,id){const r=await call(env,`/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,parents,trashed,appProperties&supportsAllDrives=true`);if(r.status===404)return null;if(!r.ok)fail('DRIVE_UNAVAILABLE','อ่านสิทธิ์ไฟล์รูปไม่ได้ กรุณาลองใหม่',503);return r.json();}
export async function deleteDriveFile(env, fileIdInput){
 const id=fileId(fileIdInput); if(!id) return false;
 try {
  const res=await call(env,`/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`,{method:'DELETE'});
  return res.ok || res.status===404;
 } catch(_){ return false; }
}
export async function readPicture(env,scope,source){
 const id=fileId(source);if(!id)fail('IMAGE_SOURCE','รูปนี้ยังไม่ใช่ลิงก์ Drive ที่รองรับ กรุณาตรวจแหล่งรูปเดิม',422);
 const parent=folder(env,scope),meta=await metadata(env,id);
 if(!meta||meta.trashed)fail('NOT_FOUND','ไม่พบไฟล์รูปเดิม',404);
 if(!meta.parents?.includes(parent))fail('FORBIDDEN','รูปไม่ได้อยู่ในโฟลเดอร์ที่อนุญาต',403);
 if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(meta.mimeType))fail('VALIDATION','ชนิดหรือขนาดรูปเดิมไม่รองรับ');
 const response=await call(env,`/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`);if(!response.ok)fail('DRIVE_UNAVAILABLE','อ่านรูปไม่ได้ กรุณาลองใหม่',503);
 const bytes=new Uint8Array(await response.arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {mime:meta.mimeType,base64:btoa(binary)};
}
export async function streamMedia(env,scope,source,request){
 const id=fileId(source);if(!id)fail('IMAGE_SOURCE','รูปนี้ยังไม่ใช่ลิงก์ Drive ที่รองรับ กรุณาตรวจแหล่งรูปเดิม',422);
 const parent=folder(env,scope),meta=await metadata(env,id);
 if(!meta||meta.trashed)fail('NOT_FOUND','ไม่พบไฟล์รูปเดิม',404);
 if(!meta.parents?.includes(parent))fail('FORBIDDEN','รูปไม่ได้อยู่ในโฟลเดอร์ที่อนุญาต',403);
 const headers={};
 const range=request?.headers?.get('Range');
 if(range)headers['Range']=range;
 const response=await call(env,`/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,{headers});
 if(!response.ok)fail('DRIVE_UNAVAILABLE','อ่านไฟล์ไม่ได้ กรุณาลองใหม่',503);
 const resHeaders=new Headers();
 resHeaders.set('Content-Type',meta.mimeType||'video/mp4');
 resHeaders.set('Cache-Control','public, max-age=86400, s-maxage=86400');
 resHeaders.set('Accept-Ranges','bytes');
 if(response.headers.get('Content-Length'))resHeaders.set('Content-Length',response.headers.get('Content-Length'));
 if(response.headers.get('Content-Range'))resHeaders.set('Content-Range',response.headers.get('Content-Range'));
 return new Response(response.body,{status:response.status,headers:resHeaders});
}
export async function uploadPicture(env,scope,req,slot,image,entityId,max=50000000){
 const isVideo=image.mime?.startsWith('video/');
 const bytes=isVideo?fastBase64Decode(image.bytes||image.base64):decodeImage(image,max),parent=folder(env,scope),db=env.DB;
 let op=await db.prepare('SELECT * FROM image_operations WHERE request_key=? AND slot=?').bind(req.key,slot).first();
 if(!op){
  const response=await call(env,'/drive/v3/files/generateIds?count=1&space=drive&type=files');if(!response.ok)fail('DRIVE_UNAVAILABLE','เตรียมอัปโหลดไฟล์ไม่สำเร็จ',503);
  const id=(await response.json()).ids?.[0];if(!id)fail('DRIVE_UNAVAILABLE','เตรียมรหัสไฟล์ไม่สำเร็จ',503);
  const ext=image.mime.split('/')[1]||'bin';
  const name=entityId+'-'+slot+'-'+req.key.slice(0,12)+'.'+ext;
  await db.prepare("INSERT OR IGNORE INTO image_operations VALUES(?,?,?,?,?,?,?,?,'RESERVED',?)").bind(crypto.randomUUID(),req.key,slot,parent,id,name,image.mime,req.payloadHash,req.now).run();
  op=await db.prepare('SELECT * FROM image_operations WHERE request_key=? AND slot=?').bind(req.key,slot).first();
 }
 if(op.payload_hash!==req.payloadHash||op.folder_id!==parent)fail('CONFLICT','คำขอไฟล์นี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาเปิดฟอร์มใหม่',409);
 const existing=await metadata(env,op.file_id);
 if(existing){if(existing.trashed||!existing.parents?.includes(parent)||existing.appProperties?.request!==req.key)fail('CONFLICT','ไฟล์อัปโหลดไม่ตรงกับคำขอ กรุณาติดต่อผู้ดูแล',409);}
 else {
  const boundary='em_'+crypto.randomUUID();
  const info={id:op.file_id,name:op.name,parents:[parent],appProperties:{request:req.key,payload:req.payloadHash,slot}};
  const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(info)}\r\n--${boundary}\r\nContent-Type: ${image.mime}\r\n\r\n`,bytes,`\r\n--${boundary}--`]);
  const response=await call(env,'/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body},120000);
  if(!response.ok){
   const recovered=await metadata(env,op.file_id);
   if(!recovered||recovered.appProperties?.request!==req.key||recovered.appProperties?.payload!==req.payloadHash)fail('DRIVE_UNAVAILABLE','อัปโหลดไฟล์ยังไม่สำเร็จ กรุณาลองคำขอเดิมอีกครั้ง',503);
  }
 }
 await db.prepare("UPDATE image_operations SET status='UPLOADED' WHERE id=? AND status='RESERVED'").bind(op.id).run();
 return {id:op.file_id,name:op.name,url:'https://drive.google.com/file/d/'+op.file_id+'/view'};
}
