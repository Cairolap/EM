export class AppError extends Error {
  constructor(code,message,status=422,fields={}) {super(message);this.code=code;this.status=status;this.fields=fields;}
}
export const fail=(code,message,status=422,fields={})=>{throw new AppError(code,message,status,fields);};
export const conflict=()=>fail('CONFLICT','ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดรายการล่าสุดก่อนบันทึกอีกครั้ง',409);
export function stable(value) {
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export async function hash(value) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function json(data,status=200) {return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});}
