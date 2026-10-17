import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { database, seed } from './db.mjs';
import { listExpenses, importExpenseRecords, deleteExpensesByRange, getDashboardData, saveLineBudgets, getTwoYearCutoffDate } from '../src/pm-expense-service.js';

test('PM Expenses service: import SAP XLS, machine auto-link, 2-year retention, and dashboard analytics', async () => {
  const db = database();
  seed(db);

  // Seed machine LNR301 in Line L01 / MX
  db.raw.exec(`
    INSERT INTO machines (
      id, code, normalized_code, name, department_id, line_id,
      criticality, status, created_at, created_by, updated_at, updated_by, is_active, version, request_id
    ) VALUES 
      ('M-LNR301', 'LNR301', 'lnr301', 'Lining Machine 301', 'D01', 'L01', 'สูง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r-exp-1'),
      ('M-PRS224', 'PRS224', 'prs224', 'Press 224', 'D01', 'L01', 'สูง', 'ใช้งาน', '2026-01-01', 'sys', '2026-01-01', 'sys', 1, 1, 'r-exp-2');
  `);

  const env = { DB: db, MAINTENANCE_MODE: 'false' };
  const actor = { id: 'test-admin', username: 'admin', role: 'admin' };

  // 1. Read and parse actual SAP file: tests/ZLPMRP71EXP 261012.XLS
  const fileBuf = readFileSync(new URL('./ZLPMRP71EXP 261012.XLS', import.meta.url));
  const decodedText = new TextDecoder('windows-874').decode(fileBuf);
  const lines = decodedText.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split('\t').map(h => h.trim());

  const rawRows = lines.slice(1).map(line => {
    const cols = line.split('\t');
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx].trim() : '';
    });
    return obj;
  });

  assert.ok(rawRows.length > 50, 'Sample SAP file should have more than 50 rows');

  // 2. Import records (test both raw array and { records: [...] } wrapper)
  const importResult = await importExpenseRecords(env, actor, { records: rawRows });
  assert.equal(importResult.success, true);
  assert.ok(importResult.importedCount > 0);
  assert.ok(importResult.linkedMachineCount >= 2, 'Should link machines like LNR301 and PRS224');

  // 3. Query expenses
  const list = await listExpenses(env, { limit: 100 });
  assert.ok(list.items.length > 0);
  assert.ok(list.totalAmount > 0);

  // Verify LNR301 record was linked and mapped according to user specification:
  // เครื่องจักร = Equipment (LNR301)
  // แผนก = Equipment ไปเทียบในรายการเครื่องจักร (D01)
  // ไลน์ = Equipment ไปเทียบในรายการเครื่องจักร (L01)
  // PM No. = Order (13117541)
  // รายการ = Description (Material no.) ('ดอกสว่าน 4.5 มม.ไฮสปีด SUTTON. (TD015)')
  // จำนวน = Qty (1)
  // ราคา/หน่วย = Amount / Qty (45)
  // รวม = Amount (45)
  const lnrRecord = list.items.find(item => item.machineCode === 'LNR301');
  assert.ok(lnrRecord, 'LNR301 expense record must exist');
  assert.equal(lnrRecord.machineId, 'M-LNR301');
  assert.equal(lnrRecord.machineName, 'Lining Machine 301');
  assert.equal(lnrRecord.departmentId, 'D01');
  assert.equal(lnrRecord.lineId, 'L01');
  assert.equal(lnrRecord.pmOrderNo, '13117541');
  assert.equal(lnrRecord.description, 'ดอกสว่าน 4.5 มม.ไฮสปีด SUTTON. (TD015)');
  assert.equal(lnrRecord.quantity, 1);
  assert.equal(lnrRecord.amount, 45);
  assert.equal(lnrRecord.unitPrice, 45);

  // Verify PRS224 record with unit price calculation: Amount 24 / Qty 2 = 12
  const prsRecord = list.items.find(item => item.machineCode === 'PRS224' && item.docNo === '0049087749');
  assert.ok(prsRecord, 'PRS224 record must exist');
  assert.equal(prsRecord.machineId, 'M-PRS224');
  assert.equal(prsRecord.departmentId, 'D01');
  assert.equal(prsRecord.lineId, 'L01');
  assert.equal(prsRecord.pmOrderNo, '13117643');
  assert.equal(prsRecord.description, 'แปรงทาสี 1นิ้ว (G022)');
  assert.equal(prsRecord.quantity, 2);
  assert.equal(prsRecord.amount, 24);
  assert.equal(prsRecord.unitPrice, 12);

  // 4. Test Search by space-separated terms, line ID, and order number
  const searchRes = await listExpenses(env, { search: 'LNR301 TD015' });
  assert.ok(searchRes.items.length >= 1);
  assert.equal(searchRes.items[0].machineCode, 'LNR301');

  const searchLineRes = await listExpenses(env, { search: 'L01' });
  assert.ok(searchLineRes.items.length >= 2, 'Search by line ID L01 should return records');

  const searchOrderRes = await listExpenses(env, { search: '13117541' });
  assert.ok(searchOrderRes.items.length >= 1, 'Search by Order No 13117541 should return records');
  assert.equal(searchOrderRes.items[0].pmOrderNo, '13117541');

  // 5. Test 2-Year Retention Policy:
  // Insert an old record (3 years ago) and verify it gets pruned or skipped
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const oldDateStr = threeYearsAgo.toISOString().slice(0, 10);

  const oldImportRes = await importExpenseRecords(env, actor, [
    {
      docDate: oldDateStr,
      machineCode: 'LNR301',
      description: 'Old Part 3 Years Ago',
      amount: '500'
    }
  ]);
  assert.equal(oldImportRes.skippedOldCount, 1, 'Records older than 2 years must be skipped');

  // 6. Test Dashboard & Budgeting
  await saveLineBudgets(env, actor, {
    year: 2026,
    budgets: [
      { lineId: 'L01', deptId: 'D01', budgetAmount: 100000, notes: 'Budget 2026' }
    ]
  });

  const dashboard = await getDashboardData(env, { startDate: '2026-01-01', endDate: '2026-12-31' });
  assert.ok(dashboard.kpi.totalActual > 0);
  assert.equal(dashboard.kpi.totalBudget, 100000);
  assert.ok(dashboard.lineBreakdown.length > 0);

  const l01Breakdown = dashboard.lineBreakdown.find(b => b.lineId === 'L01');
  assert.ok(l01Breakdown);
  assert.equal(l01Breakdown.budget, 100000);
  assert.ok(l01Breakdown.actual > 0);

  // 7. Test deleteExpensesByRange (เลือกลบเป็นช่วงวันที่)
  const beforeDel = await listExpenses(env, { startDate: '2026-01-01', endDate: '2026-12-31' });
  assert.ok(beforeDel.totalCount > 0);

  const delRes = await deleteExpensesByRange(env, actor, {
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    deptId: 'D01'
  });
  assert.equal(delRes.success, true);
  assert.ok(delRes.deletedCount > 0);

  const afterDel = await listExpenses(env, { startDate: '2026-01-01', endDate: '2026-12-31', deptId: 'D01' });
  assert.equal(afterDel.totalCount, 0);
});
