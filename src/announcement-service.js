import {fail} from './errors.js';
import {authorizeWrite, authorizeDelete} from './auth.js';
import {readPicture, streamMedia, uploadPicture, deleteDriveFile} from './drive.js';

export async function listAnnouncements(env) {
 const items = await env.DB.prepare('SELECT * FROM announcements ORDER BY sort_order ASC, created_at DESC').all();
 const settings = await env.DB.prepare('SELECT * FROM announcement_settings WHERE id=\'main\'').first();
 const mappedItems = (items.results || []).map(r => ({
  id: r.id,
  title: r.title,
  media_type: r.media_type,
  mediaType: r.media_type,
  file_id: r.file_id,
  fileId: r.file_id,
  file_name: r.file_name,
  fileName: r.file_name,
  file_url: r.file_url,
  fileUrl: r.file_url,
  sort_order: r.sort_order,
  sortOrder: r.sort_order,
  is_active: !!r.is_active,
  isActive: !!r.is_active,
  created_at: r.created_at,
  createdAt: r.created_at,
  created_by: r.created_by,
  createdBy: r.created_by
 }));
 return {
  success: true,
  items: mappedItems,
  announcements: mappedItems,
  settings: settings ? {
   company_last_incident: settings.company_last_incident || '2023-10-28',
   company_target_days: settings.company_target_days || 1200,
   dept_last_incident: settings.dept_last_incident || '2016-09-12',
   dept_target_days: settings.dept_target_days || 3802,
   slide_interval_sec: settings.slide_interval_seconds || 60,
   show_clock: settings.show_clock !== undefined ? Boolean(settings.show_clock) : true,
   show_safety: settings.show_safety !== undefined ? Boolean(settings.show_safety) : true,
   force_media_id: settings.force_media_id || '',
   force_timestamp: settings.force_timestamp || 0,
   current_media_id: settings.current_media_id || ''
  } : null
 };
}

export async function createAnnouncement(env, actor, payload, requestId) {
 authorizeWrite(actor, env, 'announcements');
 if (!payload || !payload.title) fail('VALIDATION', 'กรุณาระบุชื่อการประชาสัมพันธ์');
 const id = 'ANN-' + crypto.randomUUID().slice(0, 8);
 const now = new Date().toISOString();
 
 const image = payload.image || (payload.data_base64 || payload.dataBase64 ? {
  mime: payload.mime_type || payload.mimeType || payload.mime || (payload.media_type === 'video' ? 'video/mp4' : 'image/jpeg'),
  base64: (payload.data_base64 || payload.dataBase64).includes(',') ? (payload.data_base64 || payload.dataBase64).split(',')[1] : (payload.data_base64 || payload.dataBase64)
 } : null);

 let fileId = '', fileName = '', fileUrl = '';
 const mediaType = payload.mediaType || payload.media_type || (image?.mime?.startsWith('video/') ? 'video' : 'image');
 
 if (image) {
  const req = { key: 'ANN_REQ_' + requestId, actor: actor.id, payloadHash: requestId, now };
  const uploadRes = await uploadPicture(env, 'announcements', req, 'media', image, id, 50000000);
  fileId = uploadRes.id;
  fileName = uploadRes.name;
  fileUrl = uploadRes.url;
 }

 await env.DB.prepare(
  'INSERT INTO announcements (id, title, media_type, file_id, file_name, file_url, sort_order, is_active, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)'
 ).bind(id, payload.title.trim(), mediaType, fileId, fileName, fileUrl, Number(payload.sortOrder || payload.sort_order) || 0, now, actor.id, now, actor.id).run();

 return { id, title: payload.title, fileUrl, success: true };
}

export async function deleteAnnouncement(env, actor, idOrPayload) {
 authorizeDelete(actor, env, 'announcements');
 const id = (typeof idOrPayload === 'object' && idOrPayload !== null) ? idOrPayload.id : idOrPayload;
 const existing = await env.DB.prepare('SELECT * FROM announcements WHERE id=?').bind(id).first();
 if (!existing) fail('NOT_FOUND', 'ไม่พบรายการสื่อประชาสัมพันธ์นี้', 404);

 if (existing.file_id) {
  await deleteDriveFile(env, existing.file_id);
 }

 await env.DB.prepare('DELETE FROM announcements WHERE id=?').bind(id).run();
 return { id, success: true };
}

export async function updateAnnouncementSettings(env, actor, payload) {
 authorizeWrite(actor, env, 'announcements');
 const settings = payload?.settings || payload || {};
 const now = new Date().toISOString();

 if (settings.media_id || settings.mediaId) {
  const mediaId = settings.media_id || settings.mediaId;
  const isActive = settings.is_active !== undefined ? (settings.is_active ? 1 : 0) : 1;
  await env.DB.prepare('UPDATE announcements SET is_active=?, updated_at=?, updated_by=? WHERE id=?')
   .bind(isActive, now, actor.id, mediaId).run();
  return { success: true, media_id: mediaId, is_active: isActive };
 }
 
 const companyLast = settings.company_last_incident || settings.companyLastIncident || '2023-10-28';
 const companyTarget = Number(settings.company_target_days || settings.companyTargetDays) || 1200;
 const deptLast = settings.dept_last_incident || settings.deptLastIncident || '2016-09-12';
 const deptTarget = Number(settings.dept_target_days || settings.deptTargetDays) || 3802;
 const slideInterval = Number(settings.slide_interval_sec || settings.slideIntervalSeconds) || 60;
 const showClock = settings.show_clock !== undefined ? (settings.show_clock ? 1 : 0) : (settings.showClock ? 1 : 0);
 const showSafety = settings.show_safety !== undefined ? (settings.show_safety ? 1 : 0) : (settings.showSafety ? 1 : 0);

 await env.DB.prepare(
  'INSERT INTO announcement_settings (id, company_last_incident, company_target_days, dept_last_incident, dept_target_days, slide_interval_seconds, show_clock, show_safety, updated_at) VALUES (\'main\', ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET company_last_incident=excluded.company_last_incident, company_target_days=excluded.company_target_days, dept_last_incident=excluded.dept_last_incident, dept_target_days=excluded.dept_target_days, slide_interval_seconds=excluded.slide_interval_seconds, show_clock=excluded.show_clock, show_safety=excluded.show_safety, updated_at=excluded.updated_at'
 ).bind(
  companyLast,
  companyTarget,
  deptLast,
  deptTarget,
  slideInterval,
  showClock,
  showSafety,
  now
 ).run();

 return { success: true };
}

export async function getAnnouncementMedia(env, id, request) {
 const item = await env.DB.prepare('SELECT * FROM announcements WHERE id=?').bind(id).first();
 if (!item || !item.file_id) fail('NOT_FOUND', 'ไม่พบไฟล์นี้', 404);
 return streamMedia(env, 'announcements', item.file_id, request);
}

export async function forceAnnouncementSlide(env, actor, payload) {
 authorizeWrite(actor, env, 'announcements');
 const mediaId = payload?.media_id || payload?.mediaId || payload?.id;
 if (!mediaId) fail('VALIDATION', 'กรุณาระบุสื่อที่ต้องการแสดง');
 const now = Date.now();
 
 // If media is inactive, auto-activate it so TV can display it
 await env.DB.prepare('UPDATE announcements SET is_active=1 WHERE id=?').bind(mediaId).run();

 await env.DB.prepare('UPDATE announcement_settings SET force_media_id=?, force_timestamp=?, current_media_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=\'main\'')
  .bind(mediaId, now, mediaId).run();

 return { success: true, force_media_id: mediaId, force_timestamp: now };
}

export async function reportCurrentAnnouncement(env, payload) {
 const mediaId = payload?.media_id || payload?.mediaId || payload?.id || '';
 if (mediaId) {
  await env.DB.prepare('UPDATE announcement_settings SET current_media_id=? WHERE id=\'main\'').bind(mediaId).run();
 }
 return { success: true };
}

export async function getAnnouncementState(env) {
 const settings = await env.DB.prepare('SELECT force_media_id, force_timestamp, current_media_id, slide_interval_seconds FROM announcement_settings WHERE id=\'main\'').first();
 return {
  force_media_id: settings?.force_media_id || '',
  force_timestamp: settings?.force_timestamp || 0,
  current_media_id: settings?.current_media_id || '',
  slide_interval_sec: settings?.slide_interval_seconds || 60
 };
}

