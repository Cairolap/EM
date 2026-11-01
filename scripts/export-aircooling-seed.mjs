import {writeFile} from 'node:fs/promises';

const SPREADSHEET_ID = '1qmKINhpuUOenTavwDezQHV2IP4CaweJQ0o6ZL05rKiE';
const GID = '1502709574';

const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID}`;
const res = await fetch(url);
if (!res.ok) throw new Error('Failed to fetch spreadsheet: ' + res.status);
const csvText = await res.text();

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

const rows = parseCsv(csvText);
console.log('Total parsed rows:', rows.length);
const headers = rows[0];
console.log('Headers:', headers);

const dataRows = rows.slice(1);
console.log('Data rows count:', dataRows.length);

const sqlStatements = [
  '-- Air Cooling initial data seed from Google Sheets (AirCoolingData)',
  '-- SPREADSHEET_ID: ' + SPREADSHEET_ID + ' (gid: ' + GID + ')',
  ''
];

function escapeSql(val) {
  if (val === null || val === undefined) return "''";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

for (const r of dataRows) {
  const id = r[0] || '';
  if (!id) continue;
  const dept = r[1] || '';
  const idTag = r[2] || '';
  const line = r[3] || '';
  const location = r[4] || '';
  const brand = r[5] || '';
  const power = Number(r[6]) || 0;
  const serial = r[7] || '';
  const details = r[8] || '';
  const note = r[9] || '';
  const lastClean = r[10] || '';
  const nextClean = r[11] || '';
  const imageUrl = r[12] || '';
  const driveFileId = r[13] || '';
  const createdAt = r[14] || '';
  const updatedAt = r[15] || '';
  const reportStatus = r[16] || '';
  const reportInfo = r[17] || '';

  sqlStatements.push(
    `INSERT OR IGNORE INTO pm_aircooling_units (id, dept, id_tag, line, location, brand, power, serial, details, note, last_clean_date, next_clean_date, image_url, drive_file_id, report_status, report_info, created_at, updated_at) VALUES (${escapeSql(id)}, ${escapeSql(dept)}, ${escapeSql(idTag)}, ${escapeSql(line)}, ${escapeSql(location)}, ${escapeSql(brand)}, ${power}, ${escapeSql(serial)}, ${escapeSql(details)}, ${escapeSql(note)}, ${escapeSql(lastClean)}, ${escapeSql(nextClean)}, ${escapeSql(imageUrl)}, ${escapeSql(driveFileId)}, ${escapeSql(reportStatus)}, ${escapeSql(reportInfo)}, ${escapeSql(createdAt)}, ${escapeSql(updatedAt)});`
  );
}

await writeFile('data/aircooling_seed.sql', sqlStatements.join('\n') + '\n');
console.log('Saved data/aircooling_seed.sql with', dataRows.length, 'records.');
