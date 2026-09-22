/* Shared deterministic domain rules; no browser or Apps Script dependencies. */
var BomCore = (() => {
  'use strict';
  const headers = ['RecordID','EquipmentID','MachineID','PartID','Label','Quantity','InstalledAt','DueMode','ManualExpiryDate','Notes','RecordStatus','EndedAt','PreviousRecordID','CreatedAt','UpdatedAt','Version','OperationID'];
  const opHeaders = ['OperationID','Fingerprint','MachineID','Status','Plan','Result','CreatedAt','SessionRef'];
  const text = value => value == null ? '' : String(value);
  const normalized = value => text(value).normalize('NFKC').trim().toLocaleLowerCase('en-US');
  function fail(message, code = 'VALIDATION', fields = {}) { const e = new Error(message); e.code=code; e.fields=fields; throw e; }
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return null;
    const d = new Date(value+'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value && +value.slice(0,4)>=1900 ? d : null;
  }
  function today(now = new Date()) { return new Date(now.getTime()+7*3600000).toISOString().slice(0,10); }
  function days(a,b) { return Math.round((date(b)-date(a))/86400000); }
  function addMonths(value, months) {
    const d=date(value); if (!d || !Number.isInteger(months) || months<0 || months>12000) return '';
    const last = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+months+1,0));
    return new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth(),Math.min(d.getUTCDate(),last.getUTCDate()))).toISOString().slice(0,10);
  }
  function lifeMonths(part) {
    if(!part) return null;
    let raw = part['อายุอุปกรณ์ (ปี)'] ?? part['อายุอุปกรณ์'] ?? part['Lifespan'] ?? part['lifespan'];
    if(typeof raw === 'string') {
      const clean = raw.trim().replace(/,/g, '');
      const match = clean.match(/^(\d+(?:\.\d+)?)/);
      if(match) raw = match[1];
    }
    const years=Number(raw); const months=years*12;
    return years>0 && months<=12000 && Math.abs(Math.round(months)-months)<1e-8 ? Math.round(months) : null;
  }
  function elapsed(start,end) {
    if (!date(start)||!date(end)||end<start) return 'ไม่ทราบอายุ';
    const a=date(start), b=date(end);
    let m=(b.getUTCFullYear()-a.getUTCFullYear())*12+b.getUTCMonth()-a.getUTCMonth();
    if (addMonths(start,m)>end) m--;
    return `${Math.floor(m/12)} ปี ${m%12} เดือน ${days(addMonths(start,m),end)} วัน`;
  }
  function age(row,part,on=today()) {
    const end=row.RecordStatus==='ACTIVE'?on:row.EndedAt;
    const months=lifeMonths(part);
    const dueDate=row.DueMode==='MANUAL' ? (date(row.ManualExpiryDate)?row.ManualExpiryDate:'') : (months && date(row.InstalledAt)?addMonths(row.InstalledAt,months):'');
    const remainingDays=dueDate?days(on,dueDate):null;
    const ageDays=date(row.InstalledAt)&&date(end)?days(row.InstalledAt,end):null;
    let status='unknown', label='ยังระบุวันครบกำหนดไม่ได้';
    if (remainingDays!==null) {
      status=remainingDays<0?'overdue':remainingDays===0?'today':remainingDays<=30?'soon':'normal';
      label=remainingDays<0?`เกินกำหนด ${-remainingDays} วัน`:remainingDays===0?'ครบกำหนดวันนี้':`เหลือ ${remainingDays} วัน`;
    }
    return {dueDate,remainingDays,ageDays,status,label,ageText:elapsed(row.InstalledAt,end),lifeText:months?`เปลี่ยนทุก ${months/12} ปี`:'ยังไม่ระบุรอบเปลี่ยน',basis:row.DueMode==='MANUAL'?'วันหมดอายุที่ระบุเอง':'เกณฑ์ Part list ปัจจุบัน'};
  }
  function validate(input,on=today()) {
    const row={PartID:text(input.PartID).trim(),Label:text(input.Label).trim(),Quantity:Number(input.Quantity),InstalledAt:text(input.InstalledAt),DueMode:input.DueMode,ManualExpiryDate:text(input.ManualExpiryDate),Notes:text(input.Notes)};
    const fields={};
    if (!row.PartID) fields.PartID='เลือกอุปกรณ์จาก Part list';
    if (row.Label && row.Label.length>100) fields.Label='กรอก Label ไม่เกิน 100 ตัวอักษร';
    if (!Number.isSafeInteger(row.Quantity)||row.Quantity<=0||row.Quantity>100000) fields.Quantity='จำนวนต้องเป็นจำนวนเต็ม 1–100,000';
    if (row.InstalledAt && (!date(row.InstalledAt)||row.InstalledAt>on)) fields.InstalledAt='เลือกวันติดตั้งที่ถูกต้องและไม่เกินวันนี้';
    if (!['PART_LIFE','MANUAL'].includes(row.DueMode)) fields.DueMode='เลือกวิธีกำหนดวันหมดอายุ';
    if (row.DueMode==='MANUAL' && (!date(row.ManualExpiryDate)||(row.InstalledAt && row.ManualExpiryDate<row.InstalledAt))) fields.ManualExpiryDate='ระบุวันหมดอายุที่ไม่ก่อนวันติดตั้ง';
    if (row.DueMode==='PART_LIFE') row.ManualExpiryDate='';
    if (row.Notes.length>2000) fields.Notes='หมายเหตุต้องไม่เกิน 2,000 ตัวอักษร';
    if (Object.keys(fields).length) fail('ตรวจข้อมูลที่กรอก', 'VALIDATION', fields);
    return row;
  }
  function uniqueLabels(rows) {
    const seen=new Set();
    rows.forEach(r=> {
      const key=normalized(r.Label);
      if(!key) return;
      if(seen.has(key)) fail('Label ซ้ำในเครื่องจักร: '+r.Label,'VALIDATION',{Label:'ใช้ Label ที่ไม่ซ้ำ'});
      seen.add(key);
    });
  }
  function stable(value) { if(Array.isArray(value)) return '['+value.map(stable).join(',')+']'; if(value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'; return JSON.stringify(value); }
  function imageUrl(value) {
    const raw=text(value).trim();
    if(!/^https:\/\//i.test(raw))return '';
    if(!/^https:\/\/(?:www\.)?drive\.google\.com\//i.test(raw))return raw;
    const path=raw.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    const query=raw.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    const id=(path||query||[])[1];
    return id?'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w800':'';
  }
  function page(items, query = {}) {
    const isAll = query.pageSize === 'all' || query.pageSize === 'ALL' || +query.pageSize === 0 || +query.pageSize >= 999999;
    const count = items.length;
    if (isAll) {
      return { items: items.slice(), total: count, page: 1, pageSize: 'all' };
    }
    const size = [10, 25, 50, 100].includes(+query.pageSize) ? +query.pageSize : 25;
    const current = Math.max(1, Math.min(Math.ceil(count / size) || 1, Math.floor(+query.page) || 1));
    return { items: items.slice((current - 1) * size, current * size), total: count, page: current, pageSize: size };
  }
  return {headers,opHeaders,text,normalized,fail,date,today,days,addMonths,lifeMonths,age,validate,uniqueLabels,stable,imageUrl,page};
})();


export {BomCore};
