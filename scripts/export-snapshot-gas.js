/**
 * =========================================================================
 * Google Apps Script: Snapshot Exporter
 * ระบบส่งออกข้อมูลจริงทั้งหมดจาก Google Sheets เพื่อย้ายเข้าสู่ Cloudflare D1
 * =========================================================================
 * 
 * วิธีใช้งาน:
 * 1. นำโค้ดในไฟล์นี้ไปวางใน Google Apps Script Editor ของโปรเจกต์ Equipment BOM หรือสร้างสคริปต์ใหม่
 * 2. เลือกฟังก์ชัน "exportCompleteSnapshot" แล้วกดปุ่ม "เรียกใช้ (Run)"
 * 3. เมื่อรันเสร็จ ไฟล์ JSON จะถูกสร้างและบันทึกลงใน Google Drive ของคุณโดยอัตโนมัติ
 *    พร้อมแสดงลิงก์เปิดไฟล์ในแท็บ "บันทึกการดำเนินการ (Execution Log)"
 * 4. ดาวน์โหลดไฟล์ .json นั้นมาไว้ที่โฟลเดอร์ data/ ของระบบ Electrical Maintenance เช่น:
 *    data/snapshot_production.json
 * 5. รันคำสั่งนำเข้าสู่ Cloudflare D1:
 *    node scripts/import-snapshot.mjs data/snapshot_production.json
 *    npx wrangler d1 execute DB --env staging --remote --file=migrations/import_xxxxxxxx.sql
 */

function exportCompleteSnapshot() {
  const CONFIG = {
    machines: '1x08c0h6iuPKLc4CSGChW1c6XmHXLBSoF1Kx8pPXbwBw',
    parts: '1fnLyZPTjMnQna1QJ_lw5oABhTF3ZE4HNHqa3xxN8I9w',
    departments: {
      CC: {name: 'ฝาจีบ', id: '1A-f2MLXRE1vPNCib_AbW7r-z_oGSrvp_2dbHBAYoOpA'},
      PP: {name: 'ฝาเกลียว', id: '1D9Iqgvlfn5djuelTClIoveodaekC36IzS1zyHJFHL4k'},
      MX: {name: 'ฝาแม็กซี่', id: '1j-kn4cIWPN514aTTGQUyG4TXFvsV3x8eNBjpeoln3Jk'},
      PC: {name: 'ฝาพลาสติก', id: '1BLT14dffnwKFWc2sFRj4ATayWOYX1xRGNItf47wgyw0'},
      PR: {name: 'งานพิมพ์', id: '1wa78VhSPCvn4y2R6htP6emNzBzlsGh4VO_RVETr94gY'},
      OT: {name: 'อื่นๆ', id: '1cJaHDOIrF8F6PnDVogibparw4BGVt4tTcTBk3Swp9do'}
    }
  };

  const formatDate = v => {
    if (!v) return '';
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
    const s = String(v).trim();
    return s;
  };

  const readSheet = (ss, sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(h => String(h).trim());
    return values.slice(1).filter(r => r.some(v => v !== '')).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        if (!h) return;
        const val = row[i];
        obj[h] = val instanceof Date ? formatDate(val) : val;
      });
      return obj;
    });
  };

  Logger.log('1. Reading Machines Registry...');
  const machinesDb = SpreadsheetApp.openById(CONFIG.machines);
  const departments = readSheet(machinesDb, 'Departments');
  const lines = readSheet(machinesDb, 'Lines');
  const machines = readSheet(machinesDb, 'Machines');

  Logger.log('2. Reading Master Parts Catalog...');
  const partsDb = SpreadsheetApp.openById(CONFIG.parts);
  const parts = readSheet(partsDb, 'Parts');
  const brands = readSheet(partsDb, 'Brands');

  Logger.log('3. Reading Equipment BOM records from Department Spreadsheets...');
  const equipment = [];

  for (const deptCode of Object.keys(CONFIG.departments)) {
    const deptInfo = CONFIG.departments[deptCode];
    try {
      const deptDb = SpreadsheetApp.openById(deptInfo.id);
      const sheets = deptDb.getSheets();
      for (const sheet of sheets) {
        const sName = sheet.getName();
        // ข้ามชีตประวัติคำสั่ง หรือชีตระบบภายใน
        if (sName.startsWith('LEDGER') || sName.startsWith('_') || sheet.getLastRow() < 2) continue;
        const rows = readSheet(deptDb, sName);
        for (const r of rows) {
          const recId = r.RecordID || r.recordId || r.id;
          const partId = r.PartID || r.partId;
          const label = r.Label || r.label;
          if (recId || partId || label) {
            equipment.push({
              id: recId || Utilities.getUuid(),
              equipment_id: r.EquipmentID || r.equipmentId || recId || Utilities.getUuid(),
              machine_id: r.MachineID || r.machineId || '',
              part_id: partId || '',
              label: label || '',
              quantity: Number(r.Quantity != null ? r.Quantity : (r.quantity != null ? r.quantity : 1)) || 1,
              installed_at: formatDate(r.InstalledAt || r.installedAt),
              due_mode: r.DueMode || r.dueMode || 'PART_LIFE',
              manual_expiry_date: formatDate(r.ManualExpiryDate || r.manualExpiryDate),
              notes: r.Notes || r.notes || '',
              record_status: r.RecordStatus || r.recordStatus || 'ACTIVE',
              ended_at: formatDate(r.EndedAt || r.endedAt),
              previous_record_id: r.PreviousRecordID || r.previousRecordId || '',
              created_at: formatDate(r.CreatedAt || r.createdAt) || new Date().toISOString(),
              created_by: r.CreatedBy || r.createdBy || 'migration',
              updated_at: formatDate(r.UpdatedAt || r.updatedAt) || new Date().toISOString(),
              updated_by: r.UpdatedBy || r.updatedBy || 'migration',
              version: Number(r.Version || r.version) || 1,
              operation_id: r.OperationID || r.operationId || 'migration'
            });
          }
        }
      }
    } catch (e) {
      Logger.log('⚠️ ข้อผิดพลาดในการอ่านแผนก ' + deptCode + ': ' + e.message);
    }
  }

  const snapshot = {
    exportedAt: new Date().toISOString(),
    departments,
    lines,
    brands,
    machines,
    parts,
    equipment
  };

  const jsonContent = JSON.stringify(snapshot, null, 2);
  const fileName = 'electrical-maintenance-snapshot-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss') + '.json';
  const file = DriveApp.createFile(fileName, jsonContent, 'application/json');

  Logger.log('==============================================');
  Logger.log('🎉 ส่งออกข้อมูล Snapshot สำเร็จเรียบร้อย!');
  Logger.log('📁 ชื่อไฟล์ใน Google Drive: ' + file.getName());
  Logger.log('🔗 ลิงก์เปิดไฟล์ใน Google Drive: ' + file.getUrl());
  Logger.log('----------------------------------------------');
  Logger.log('สรุปจำนวนข้อมูลที่ส่งออก:');
  Logger.log('- แผนก (Departments): ' + departments.length);
  Logger.log('- ไลน์ผลิต (Lines): ' + lines.length);
  Logger.log('- ยี่ห้อ (Brands): ' + brands.length);
  Logger.log('- เครื่องจักร (Machines): ' + machines.length);
  Logger.log('- Master อะไหล่ (Parts): ' + parts.length);
  Logger.log('- อุปกรณ์ประจำเครื่อง (Equipment BOM): ' + equipment.length);
  Logger.log('==============================================');

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    url: file.getUrl(),
    counts: {
      departments: departments.length,
      lines: lines.length,
      brands: brands.length,
      machines: machines.length,
      parts: parts.length,
      equipment: equipment.length
    }
  };
}
