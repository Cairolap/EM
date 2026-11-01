import {fail} from './errors.js';
import {getGoogleAccessToken} from './drive.js';

export const AIRCOOLING_SPREADSHEET_ID = '1qmKINhpuUOenTavwDezQHV2IP4CaweJQ0o6ZL05rKiE';
export const AIRCOOLING_SHEET_GID = '1502709574';
export const AIRCOOLING_SHEET_NAME = 'AirCoolingData';

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field.trim());
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        row.push(field.trim());
        if (row.some(x => x !== '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(x => x !== '')) rows.push(row);
  }
  return rows;
}

function calculateCleanStatus(nextCleanDate, reportStatus) {
  if (reportStatus && reportStatus !== 'resolved') return 'reported';
  if (!nextCleanDate) return 'normal';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(nextCleanDate);
  if (isNaN(target.getTime())) return 'normal';
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'due_soon';
  return 'normal';
}

export function addOneYear(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10) + 1;
    const month = match[2];
    let day = match[3];
    // Handle leap day 29 Feb -> 28 Feb in non-leap year
    if (month === '02' && day === '29') {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (!isLeap) day = '28';
    }
    return `${year}-${month}-${day}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return '';
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function generateAirCoolingId() {
  const randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return 'AC-' + randomPart;
}

export async function fetchLiveGoogleSheetData(spreadsheetId = AIRCOOLING_SPREADSHEET_ID, gid = AIRCOOLING_SHEET_GID) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || text.includes('<!DOCTYPE html>') || text.includes('Google Docs - Error')) return [];
    const parsed = parseCsv(text);
    if (parsed.length <= 1) return [];
    const dataRows = parsed.slice(1);
    return dataRows.map(r => ({
      id: r[0] || '',
      dept: r[1] || '',
      idTag: r[2] || '',
      line: r[3] || '',
      location: r[4] || '',
      brand: r[5] || '',
      power: Number(r[6]) || 0,
      serial: r[7] || '',
      details: r[8] || '',
      note: r[9] || '',
      lastCleanDate: r[10] || '',
      nextCleanDate: r[11] || '',
      imageUrl: r[12] || '',
      driveFileId: r[13] || '',
      createdAt: r[14] || '',
      updatedAt: r[15] || '',
      reportStatus: r[16] || '',
      reportInfo: r[17] || ''
    })).filter(item => item.id !== '');
  } catch (err) {
    console.warn('Cannot fetch live Google Sheets data:', err.message);
    return [];
  }
}

export async function syncFromGoogleSheets(env, actor) {
  const liveRows = await fetchLiveGoogleSheetData();
  if (!liveRows || liveRows.length === 0) {
    fail('SYNC_FAILED', 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 502);
  }

  const statements = liveRows.map(r => {
    return env.DB.prepare(`
      INSERT INTO pm_aircooling_units (
        id, dept, id_tag, line, location, brand, power, serial, details, note,
        last_clean_date, next_clean_date, image_url, drive_file_id, report_status, report_info,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        dept = excluded.dept,
        id_tag = excluded.id_tag,
        line = excluded.line,
        location = excluded.location,
        brand = excluded.brand,
        power = excluded.power,
        serial = excluded.serial,
        details = excluded.details,
        note = excluded.note,
        last_clean_date = excluded.last_clean_date,
        next_clean_date = excluded.next_clean_date,
        image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE pm_aircooling_units.image_url END,
        drive_file_id = CASE WHEN excluded.drive_file_id != '' THEN excluded.drive_file_id ELSE pm_aircooling_units.drive_file_id END,
        report_status = excluded.report_status,
        report_info = excluded.report_info,
        updated_at = excluded.updated_at
    `).bind(
      r.id, r.dept, r.idTag, r.line, r.location, r.brand, r.power, r.serial, r.details, r.note,
      r.lastCleanDate, r.nextCleanDate, r.imageUrl, r.driveFileId, r.reportStatus, r.reportInfo,
      r.createdAt || new Date().toISOString(), r.updatedAt || new Date().toISOString()
    );
  });

  // Batch insert in chunks of 50 statements
  const chunkSize = 50;
  for (let i = 0; i < statements.length; i += chunkSize) {
    await env.DB.batch(statements.slice(i, i + chunkSize));
  }

  return { success: true, count: liveRows.length };
}

export async function listAirCoolingUnits(env, options = {}) {
  const { dept, line, brand, status, search } = options;

  // Check if D1 table is empty; if so, attempt initial bootstrap sync
  const countRow = await env.DB.prepare('SELECT COUNT(*) as count FROM pm_aircooling_units').first();
  if (!countRow || countRow.count === 0) {
    try {
      await syncFromGoogleSheets(env, null);
    } catch (_) {}
  }

  let query = 'SELECT * FROM pm_aircooling_units WHERE 1=1';
  const params = [];

  if (dept && dept !== 'ALL') {
    query += ' AND dept = ?';
    params.push(dept);
  }
  if (line) {
    query += ' AND line = ?';
    params.push(line);
  }
  if (brand) {
    query += ' AND brand = ?';
    params.push(brand);
  }
  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query += ' AND (LOWER(id_tag) LIKE ? OR LOWER(line) LIKE ? OR LOWER(location) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(serial) LIKE ? OR LOWER(details) LIKE ? OR LOWER(note) LIKE ? OR LOWER(id) LIKE ?)';
    for (let i = 0; i < 8; i++) params.push(term);
  }

  query += ' ORDER BY dept ASC, id_tag ASC, id ASC';

  const res = await env.DB.prepare(query).bind(...params).all();
  const rawUnits = res.results || [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const units = rawUnits.map(r => {
    const cleanStatus = calculateCleanStatus(r.next_clean_date, r.report_status);
    let daysRemaining = null;
    if (r.next_clean_date) {
      const target = new Date(r.next_clean_date);
      if (!isNaN(target.getTime())) {
        daysRemaining = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      }
    }

    let reportInfo = null;
    if (r.report_info) {
      try {
        reportInfo = typeof r.report_info === 'object' ? r.report_info : JSON.parse(r.report_info);
      } catch (_) {
        reportInfo = { issue: r.report_info };
      }
    }

    return {
      id: r.id,
      dept: r.dept,
      idTag: r.id_tag,
      line: r.line,
      location: r.location,
      brand: r.brand,
      power: r.power,
      serial: r.serial,
      details: r.details,
      note: r.note,
      lastCleanDate: r.last_clean_date,
      nextCleanDate: r.next_clean_date,
      imageUrl: r.image_url,
      driveFileId: r.drive_file_id,
      reportStatus: r.report_status,
      reportInfo,
      cleanStatus,
      daysRemaining,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  });

  // Filter by computed status if requested
  let filteredUnits = units;
  if (status && status !== 'all') {
    filteredUnits = units.filter(u => u.cleanStatus === status);
  }

  // Compute overall stats across all units
  const statsRes = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN dept = 'CC' THEN 1 ELSE 0 END) as cc_count,
      SUM(CASE WHEN dept = 'PP' THEN 1 ELSE 0 END) as pp_count,
      SUM(CASE WHEN dept = 'MX' THEN 1 ELSE 0 END) as mx_count,
      SUM(CASE WHEN dept = 'PC' THEN 1 ELSE 0 END) as pc_count,
      SUM(CASE WHEN dept = 'PR' THEN 1 ELSE 0 END) as pr_count,
      SUM(CASE WHEN dept = 'OT' THEN 1 ELSE 0 END) as ot_count,
      SUM(CASE WHEN report_status IS NOT NULL AND report_status != '' AND report_status != 'resolved' THEN 1 ELSE 0 END) as reported_count
    FROM pm_aircooling_units
  `).first();

  let normalCount = 0;
  let dueSoonCount = 0;
  let overdueCount = 0;

  for (const u of units) {
    if (u.cleanStatus === 'normal') normalCount++;
    else if (u.cleanStatus === 'due_soon') dueSoonCount++;
    else if (u.cleanStatus === 'overdue') overdueCount++;
  }

  const stats = {
    total: statsRes?.total || 0,
    normal: normalCount,
    dueSoon: dueSoonCount,
    overdue: overdueCount,
    reported: statsRes?.reported_count || 0,
    byDept: {
      CC: statsRes?.cc_count || 0,
      PP: statsRes?.pp_count || 0,
      MX: statsRes?.mx_count || 0,
      PC: statsRes?.pc_count || 0,
      PR: statsRes?.pr_count || 0,
      OT: statsRes?.ot_count || 0
    }
  };

  return { units: filteredUnits, stats };
}

export async function getAirCoolingUnit(env, id) {
  if (!id) fail('VALIDATION', 'กรุณาระบุ ID อุปกรณ์');
  const r = await env.DB.prepare('SELECT * FROM pm_aircooling_units WHERE id = ?').bind(id).first();
  if (!r) fail('NOT_FOUND', 'ไม่พบข้อมูลเครื่อง Air Cooling ที่ระบุ', 404);

  const cleanStatus = calculateCleanStatus(r.next_clean_date, r.report_status);
  let reportInfo = null;
  if (r.report_info) {
    try {
      reportInfo = JSON.parse(r.report_info);
    } catch (_) {
      reportInfo = { issue: r.report_info };
    }
  }

  return {
    id: r.id,
    dept: r.dept,
    idTag: r.id_tag,
    line: r.line,
    location: r.location,
    brand: r.brand,
    power: r.power,
    serial: r.serial,
    details: r.details,
    note: r.note,
    lastCleanDate: r.last_clean_date,
    nextCleanDate: r.next_clean_date,
    imageUrl: r.image_url,
    driveFileId: r.drive_file_id,
    reportStatus: r.report_status,
    reportInfo,
    cleanStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export async function saveAirCoolingUnit(env, actor, data = {}) {
  const isNew = !data.id;
  const id = data.id ? String(data.id).trim() : generateAirCoolingId();

  let existing = null;
  if (!isNew) {
    existing = await env.DB.prepare('SELECT * FROM pm_aircooling_units WHERE id = ?').bind(id).first();
    if (!existing) fail('NOT_FOUND', 'ไม่พบเครื่อง Air Cooling ที่ต้องการแก้ไข', 404);
  }

  const dept = (data.dept !== undefined)
    ? String(data.dept || '').trim().toUpperCase()
    : (existing?.dept || '');

  const idTag = (data.idTag !== undefined || data.id_tag !== undefined)
    ? String(data.idTag || data.id_tag || '').trim()
    : (existing?.id_tag || '');

  const line = (data.line !== undefined)
    ? String(data.line || '').trim()
    : (existing?.line || '');

  const location = (data.location !== undefined)
    ? String(data.location || '').trim()
    : (existing?.location || '');

  const brand = (data.brand !== undefined)
    ? String(data.brand || '').trim()
    : (existing?.brand || '');

  const power = (data.power !== undefined)
    ? (Number(data.power) || 0)
    : (existing?.power || 0);

  const serial = (data.serial !== undefined)
    ? String(data.serial || '').trim()
    : (existing?.serial || '');

  const details = (data.details !== undefined)
    ? String(data.details || '').trim()
    : (existing?.details || '');

  const note = (data.note !== undefined)
    ? String(data.note || '').trim()
    : (existing?.note || '');

  const lastCleanProvided = (data.lastCleanDate !== undefined || data.last_clean_date !== undefined);
  const nextCleanProvided = (data.nextCleanDate !== undefined || data.next_clean_date !== undefined);

  const lastCleanDate = lastCleanProvided
    ? String(data.lastCleanDate || data.last_clean_date || '').trim()
    : (existing?.last_clean_date || '');

  let nextCleanDate = '';
  if (nextCleanProvided) {
    nextCleanDate = String(data.nextCleanDate || data.next_clean_date || '').trim();
  } else if (lastCleanProvided && lastCleanDate) {
    // When lastCleanDate is updated but nextCleanDate is omitted, automatically calculate +1 year
    nextCleanDate = addOneYear(lastCleanDate);
  } else {
    nextCleanDate = existing?.next_clean_date || '';
  }

  // Also fallback if nextCleanDate is empty but lastCleanDate exists
  if (!nextCleanDate && lastCleanDate) {
    nextCleanDate = addOneYear(lastCleanDate);
  }

  let imageUrl = existing?.image_url || '';
  if (data.imageUrl !== undefined || data.image_url !== undefined) {
    const passed = String(data.imageUrl || data.image_url || '').trim();
    if (passed !== '' || isNew) imageUrl = passed;
  }

  let driveFileId = existing?.drive_file_id || '';
  if (data.driveFileId !== undefined || data.drive_file_id !== undefined) {
    const passed = String(data.driveFileId || data.drive_file_id || '').trim();
    if (passed !== '' || isNew) driveFileId = passed;
  }

  if (!idTag) fail('VALIDATION', 'กรุณาระบุ ID Tag (เช่น CC-01)');
  if (!dept) fail('VALIDATION', 'กรุณาเลือกแผนก (Dept)');

  const now = new Date().toISOString();

  if (isNew) {
    await env.DB.prepare(`
      INSERT INTO pm_aircooling_units (
        id, dept, id_tag, line, location, brand, power, serial, details, note,
        last_clean_date, next_clean_date, image_url, drive_file_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, dept, idTag, line, location, brand, power, serial, details, note,
      lastCleanDate, nextCleanDate, imageUrl, driveFileId, now, now
    ).run();
  } else {
    await env.DB.prepare(`
      UPDATE pm_aircooling_units SET
        dept = ?,
        id_tag = ?,
        line = ?,
        location = ?,
        brand = ?,
        power = ?,
        serial = ?,
        details = ?,
        note = ?,
        last_clean_date = ?,
        next_clean_date = ?,
        image_url = ?,
        drive_file_id = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      dept, idTag, line, location, brand, power, serial, details, note,
      lastCleanDate, nextCleanDate, imageUrl, driveFileId,
      now, id
    ).run();
  }

  const result = await getAirCoolingUnit(env, id);

  // Sync to Google Sheets (ทะเบียนกลาง)
  try {
    await syncUnitToGoogleSheet(env, result);
  } catch (err) {
    console.warn('Google Sheets sync warning:', err.message);
  }

  return result;
}

export async function deleteAirCoolingUnit(env, actor, id) {
  if (!id) fail('VALIDATION', 'กรุณาระบุ ID อุปกรณ์ที่ต้องการลบ');
  const existing = await env.DB.prepare('SELECT id, drive_file_id FROM pm_aircooling_units WHERE id = ?').bind(id).first();
  if (!existing) fail('NOT_FOUND', 'ไม่พบเครื่อง Air Cooling ที่ระบุ', 404);

  await env.DB.prepare('DELETE FROM pm_aircooling_units WHERE id = ?').bind(id).run();

  // Remove from Google Sheets (ทะเบียนกลาง)
  try {
    await deleteUnitFromGoogleSheet(env, id);
  } catch (err) {
    console.warn('Google Sheets delete warning:', err.message);
  }

  return { success: true, id };
}

export async function reportAirCoolingIssue(env, actor, data = {}) {
  const id = String(data.id || '').trim();
  if (!id) fail('VALIDATION', 'กรุณาระบุ ID อุปกรณ์');
  const issue = String(data.issue || 'แจ้งปัญหาการทำงาน').trim();
  const details = String(data.details || '').trim();
  const reporter = String(data.reporter || actor?.displayName || actor?.username || 'ผู้ปฏิบัติงาน').trim();
  const phone = String(data.phone || '').trim();
  const imageUrl = String(data.imageUrl || '').trim();
  const driveFileId = String(data.driveFileId || '').trim();
  const reportedAt = new Date().toLocaleString('th-TH');

  const reportInfo = JSON.stringify({
    issue,
    details,
    reporter,
    phone,
    imageUrl,
    driveFileId,
    reportedAt
  });

  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE pm_aircooling_units SET
      report_status = 'pending',
      report_info = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(reportInfo, now, id).run();

  const result = await getAirCoolingUnit(env, id);
  try {
    await syncUnitToGoogleSheet(env, result);
  } catch (err) {
    console.warn('Google Sheets sync warning on report:', err.message);
  }
  return result;
}

export async function resolveAirCoolingIssue(env, actor, id) {
  if (!id) fail('VALIDATION', 'กรุณาระบุ ID อุปกรณ์');
  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE pm_aircooling_units SET
      report_status = 'resolved',
      updated_at = ?
    WHERE id = ?
  `).bind(now, id).run();

  const result = await getAirCoolingUnit(env, id);
  try {
    await syncUnitToGoogleSheet(env, result);
  } catch (err) {
    console.warn('Google Sheets sync warning on resolve:', err.message);
  }
  return result;
}

/**
 * ซิงค์รายการเครื่อง Air Cooling ไปยัง Google Sheets (ทะเบียนกลาง)
 * @param {Object} env 
 * @param {Object} unit 
 * @returns {Promise<{success: boolean, action?: string, row?: number, error?: string}>}
 */
export async function syncUnitToGoogleSheet(env, unit) {
  if (!unit || !unit.id) return { success: false, reason: 'INVALID_UNIT' };

  try {
    const access = await getGoogleAccessToken(env);
    if (!access) return { success: false, reason: 'NO_AUTH' };

    const spreadsheetId = AIRCOOLING_SPREADSHEET_ID;
    const sheetName = AIRCOOLING_SHEET_NAME;

    // 1. ค้นหาแถวในชีตตาม ID (หรือ ID Tag)
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:C`,
      {
        headers: { Authorization: `Bearer ${access}` },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!getRes.ok) {
      const err = await getRes.text();
      console.warn('Google Sheets API get rows error:', getRes.status, err);
      return { success: false, error: err };
    }

    const data = await getRes.json();
    const rows = data.values || [];

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const rowId = rows[i]?.[0];
      const rowTag = rows[i]?.[2];
      if ((rowId && rowId === unit.id) || (unit.idTag && rowTag === unit.idTag)) {
        rowIndex = i + 1; // 1-indexed ในชีต
        break;
      }
    }

    let reportInfoStr = '';
    if (unit.reportInfo) {
      reportInfoStr = typeof unit.reportInfo === 'object' ? JSON.stringify(unit.reportInfo) : String(unit.reportInfo);
    }

    const rowValues = [
      unit.id || '',
      unit.dept || '',
      unit.idTag || '',
      unit.line || '',
      unit.location || '',
      unit.brand || '',
      unit.power ?? 0,
      unit.serial || '',
      unit.details || '',
      unit.note || '',
      unit.lastCleanDate || '',
      unit.nextCleanDate || '',
      unit.imageUrl || '',
      unit.driveFileId || '',
      unit.createdAt || new Date().toISOString(),
      unit.updatedAt || new Date().toISOString(),
      unit.reportStatus || '',
      reportInfoStr
    ];

    if (rowIndex > 0) {
      // อัปเดตแถวเดิม
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:R${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${access}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: `${sheetName}!A${rowIndex}:R${rowIndex}`,
            majorDimension: 'ROWS',
            values: [rowValues]
          }),
          signal: AbortSignal.timeout(10000)
        }
      );
      if (!updateRes.ok) {
        const err = await updateRes.text();
        console.warn('Google Sheets API update error:', updateRes.status, err);
        return { success: false, error: err };
      }
      return { success: true, action: 'updated', row: rowIndex };
    } else {
      // เพิ่มแถวใหม่
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:R:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: `${sheetName}!A:R`,
            majorDimension: 'ROWS',
            values: [rowValues]
          }),
          signal: AbortSignal.timeout(10000)
        }
      );
      if (!appendRes.ok) {
        const err = await appendRes.text();
        console.warn('Google Sheets API append error:', appendRes.status, err);
        return { success: false, error: err };
      }
      return { success: true, action: 'appended' };
    }
  } catch (err) {
    console.warn('syncUnitToGoogleSheet exception:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * ลบรายการออกจาก Google Sheets (ทะเบียนกลาง)
 * @param {Object} env 
 * @param {string} id 
 */
export async function deleteUnitFromGoogleSheet(env, id) {
  try {
    const access = await getGoogleAccessToken(env);
    if (!access) return { success: false, reason: 'NO_AUTH' };

    const spreadsheetId = AIRCOOLING_SPREADSHEET_ID;
    const sheetName = AIRCOOLING_SHEET_NAME;

    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:A`,
      {
        headers: { Authorization: `Bearer ${access}` },
        signal: AbortSignal.timeout(10000)
      }
    );
    if (!getRes.ok) return { success: false };
    const data = await getRes.json();
    const rows = data.values || [];

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]?.[0] === id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:R${rowIndex}:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}` },
          signal: AbortSignal.timeout(10000)
        }
      );
      return { success: true, row: rowIndex };
    }
    return { success: false, reason: 'NOT_FOUND' };
  } catch (err) {
    console.warn('deleteUnitFromGoogleSheet error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getAirCoolingReferences(env) {
  const deptsRes = await env.DB.prepare("SELECT DISTINCT dept FROM pm_aircooling_units WHERE dept != '' ORDER BY dept ASC").all();
  const linesRes = await env.DB.prepare("SELECT DISTINCT line, dept FROM pm_aircooling_units WHERE line != '' ORDER BY line ASC").all();
  const brandsRes = await env.DB.prepare("SELECT DISTINCT brand FROM pm_aircooling_units WHERE brand != '' ORDER BY brand ASC").all();
  const locationsRes = await env.DB.prepare("SELECT DISTINCT location, dept FROM pm_aircooling_units WHERE location != '' ORDER BY location ASC").all();

  return {
    departments: (deptsRes.results || []).map(r => r.dept),
    lines: (linesRes.results || []).map(r => ({ line: r.line, dept: r.dept })),
    brands: (brandsRes.results || []).map(r => r.brand),
    locations: (locationsRes.results || []).map(r => ({ location: r.location, dept: r.dept })),
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${AIRCOOLING_SPREADSHEET_ID}/edit?gid=${AIRCOOLING_SHEET_GID}#gid=${AIRCOOLING_SHEET_GID}`
  };
}
