import fs from 'node:fs';
import path from 'node:path';

// 1. Area to Dept and Line mappings
const AREA_MAP = {
  'PP 28STD5': { deptId: 'PP', lineId: 'PP12', lineName: '28STD5' },
  'PP 28STD6': { deptId: 'PP', lineId: 'PP18', lineName: '28STD6' },
  'PP 28STD7': { deptId: 'PP', lineId: 'PP20', lineName: '28STD7' },
  'PP 28SHL4': { deptId: 'PP', lineId: 'PP19', lineName: '28SHL4' },
  'PP 30ED15DIE': { deptId: 'PP', lineId: 'PP11', lineName: '30ED15DIE' },
  'PP COMPOSITE 2': { deptId: 'PP', lineId: 'PPC2', lineName: 'COMPOSITE 2' },
  'MX XP331': { deptId: 'MX', lineId: 'MX331', lineName: 'XP331' },
  'PR Line 1': { deptId: 'PR', lineId: 'PR01', lineName: 'Line 1' },
  'CC Line 2': { deptId: 'CC', lineId: 'CC2', lineName: 'Line 2' }
};

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length > 0) {
      const obj = {};
      header.forEach((h, idx) => {
        obj[h] = vals[idx] !== undefined ? vals[idx].trim() : '';
      });
      rows.push(obj);
    }
  }
  return rows;
}

function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result.map(s => s.replace(/^"+|"+$/g, '').trim());
}

export function loadAndPrepareItems() {
  const file1 = 'D:/Wep Local/EM/tests/purchase-requisition-2026-10-17.csv';
  const file2 = 'D:/Wep Local/EM/tests/purchase-requisition-2026-10-17 (1).csv';

  const rows1 = parseCsv(fs.readFileSync(file1, 'utf8'));
  const rows2 = parseCsv(fs.readFileSync(file2, 'utf8'));

  // Load Order -> Machine Cache
  let orderMachineMap = new Map();
  try {
    const cacheData = JSON.parse(fs.readFileSync('data/order_machine_cache_utf8.json', 'utf8'));
    cacheData.forEach(row => {
      if (row.order_no) {
        orderMachineMap.set(row.order_no.trim(), {
          machineId: row.machine_id || '',
          machineCode: row.machine_code || '',
          lineId: row.line_id || '',
          deptId: row.department_id || ''
        });
      }
    });
  } catch (err) {
    console.warn('Could not read order_machine_cache_utf8.json', err.message);
  }

  // Deduplicate and merge: File 2 has updated details for overlapping records
  const itemsMap = new Map();

  function makeKey(r) {
    const order = (r['ORDER'] || '').trim();
    const pr = (r['PR / เบิกสโตร์'] || '').trim();
    const po = (r['PO'] || '').trim();
    const qty = (r['Qty'] || '').trim();
    if (!pr && !po) {
      return `${order}###${(r['Description'] || '').trim().toLowerCase()}###${qty}`;
    }
    return `${order}###${pr}###${po}###${qty}`;
  }

  // Load File 1 first
  rows1.forEach(r => {
    itemsMap.set(makeKey(r), r);
  });

  // Load File 2 (overwrites if matching key, otherwise adds)
  rows2.forEach(r => {
    itemsMap.set(makeKey(r), r);
  });

  const mergedRows = Array.from(itemsMap.values());
  const now = new Date().toISOString();

  let machineMatchedCount = 0;

  const prepared = mergedRows.map((r, index) => {
    const createdDate = (r['วันที่สร้าง'] || '').trim() || now.slice(0, 10);
    const orderNo = (r['ORDER'] || '').trim();
    const area = (r['พื้นที่'] || '').trim();
    const description = (r['Description'] || '').trim();
    const qty = parseFloat((r['Qty'] || '1').replace(/,/g, '')) || 1;
    const rawPrice = parseFloat((r['Price (บาท)'] || '0').replace(/,/g, ''));
    const price = rawPrice > 0 ? rawPrice : null;
    const docNo = (r['PR / เบิกสโตร์'] || '').trim();
    const poNo = (r['PO'] || '').trim();
    const deliveryDate = (r['Delivery'] || '').trim();

    // Determine docType: if docNo starts with 14 -> STORE (เบิก), else PR (ซื้อ)
    const isStore = docNo.startsWith('14');
    const docType = isStore ? 'STORE' : 'PR';

    // Map Area
    const areaInfo = AREA_MAP[area] || { deptId: '', lineId: '', lineName: area };
    let deptId = areaInfo.deptId;
    let lineId = areaInfo.lineId;
    let machineId = '';
    let machineCode = '';

    // Auto-link Machine by Order PM if available
    if (orderNo && orderMachineMap.has(orderNo)) {
      const mInfo = orderMachineMap.get(orderNo);
      machineId = mInfo.machineId;
      machineCode = mInfo.machineCode;
      machineMatchedCount++;
      if (!lineId && mInfo.lineId) lineId = mInfo.lineId;
      if (!deptId && mInfo.deptId) deptId = mInfo.deptId;
    }

    // Monotonic unique ID for imported items
    const hex = (index + 1).toString(16).padStart(4, '0').toUpperCase();
    const id = `PRT-IMP-${hex}`;

    return {
      id,
      createdDate,
      docType,
      docNo,
      departmentId: deptId,
      lineId: lineId,
      machineId,
      machineCode,
      orderNo,
      description,
      qty,
      unit: 'ชิ้น',
      price,
      poNo,
      deliveryDate,
      isArchived: 0,
      notes: `นำเข้าจาก CSV ทะเบียนจัดซื้อเดิม (${area})`
    };
  });

  return { prepared, machineMatchedCount };
}

export function generateSql(items) {
  const now = new Date().toISOString();
  const escapeSql = s => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
  const numSql = n => (n === null || n === undefined ? 'NULL' : Number(n));

  const sqlLines = [
    '-- Auto-generated PR & Store Tracker CSV Import',
    `-- Generated at: ${now}`,
    `-- Total records: ${items.length}`,
    ''
  ];

  for (const item of items) {
    const cols = [
      'id', 'created_date', 'doc_type', 'doc_no', 'department_id', 'line_id',
      'machine_id', 'machine_code', 'order_no', 'description', 'qty', 'unit',
      'price', 'po_no', 'delivery_date', 'is_archived', 'archived_at', 'archived_by',
      'notes', 'created_at', 'created_by', 'updated_at', 'updated_by'
    ];

    const vals = [
      escapeSql(item.id),
      escapeSql(item.createdDate),
      escapeSql(item.docType),
      escapeSql(item.docNo),
      escapeSql(item.departmentId),
      escapeSql(item.lineId),
      escapeSql(item.machineId),
      escapeSql(item.machineCode),
      escapeSql(item.orderNo),
      escapeSql(item.description),
      numSql(item.qty),
      escapeSql(item.unit),
      numSql(item.price),
      escapeSql(item.poNo),
      escapeSql(item.deliveryDate),
      item.isArchived,
      'NULL',
      "''",
      escapeSql(item.notes),
      escapeSql(now),
      "'import'",
      escapeSql(now),
      "'import'"
    ];

    sqlLines.push(
      `INSERT INTO pr_tracker_items (${cols.join(', ')}) VALUES (${vals.join(', ')}) ` +
      `ON CONFLICT (id) DO UPDATE SET ` +
      `created_date = excluded.created_date, ` +
      `doc_type = excluded.doc_type, ` +
      `doc_no = excluded.doc_no, ` +
      `department_id = excluded.department_id, ` +
      `line_id = excluded.line_id, ` +
      `machine_id = excluded.machine_id, ` +
      `machine_code = excluded.machine_code, ` +
      `order_no = excluded.order_no, ` +
      `description = excluded.description, ` +
      `qty = excluded.qty, ` +
      `unit = excluded.unit, ` +
      `price = excluded.price, ` +
      `po_no = excluded.po_no, ` +
      `delivery_date = excluded.delivery_date, ` +
      `notes = excluded.notes, ` +
      `updated_at = excluded.updated_at, ` +
      `updated_by = excluded.updated_by;`
    );
  }

  return sqlLines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('import-pr-tracker-csv.mjs')) {
  const { prepared, machineMatchedCount } = loadAndPrepareItems();
  console.log(`\n========================================`);
  console.log(`  PR & Store Tracker CSV Data Import`);
  console.log(`========================================`);
  console.log(`Total records prepared: ${prepared.length}`);
  console.log(`Auto-linked to machine: ${machineMatchedCount} items`);
  console.log(`PR (ซื้อ): ${prepared.filter(i => i.docType === 'PR').length}`);
  console.log(`STORE (เบิก): ${prepared.filter(i => i.docType === 'STORE').length}`);
  console.log(`With PO: ${prepared.filter(i => i.poNo).length}`);
  console.log(`With Delivery Date: ${prepared.filter(i => i.deliveryDate).length}`);

  const totalAmount = prepared.reduce((sum, i) => sum + (i.price ? i.price * i.qty : 0), 0);
  const totalQty = prepared.reduce((sum, i) => sum + i.qty, 0);
  console.log(`Total Quantity: ${totalQty.toLocaleString('th-TH')} ชิ้น`);
  console.log(`Total Amount: ฿ ${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  const sqlContent = generateSql(prepared);
  fs.writeFileSync('data/import_pr_items.sql', sqlContent, 'utf8');
  console.log(`\nGenerated SQL written to data/import_pr_items.sql (${sqlContent.length} bytes)`);
}
