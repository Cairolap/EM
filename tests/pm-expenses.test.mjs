import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { database, seed } from './db.mjs';
import { listExpenses, importExpenseRecords, getDashboardData, saveLineBudgets, getTwoYearCutoffDate } from '../src/pm-expense-service.js';

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

  // 2. Import records
  const importResult = await importExpenseRecords(env, actor, rawRows);
  assert.equal(importResult.success, true);
  assert.ok(importResult.importedCount > 0);
  assert.ok(importResult.linkedMachineCount >= 2, 'Should link machines like LNR301 and PRS224');

  // 3. Query expenses
  const list = await listExpenses(env, { limit: 100 });
  assert.ok(list.items.length > 0);
  assert.ok(list.totalAmount > 0);

  // Verify LNR301 record was linked
  const lnrRecord = list.items.find(item => item.machineCode === 'LNR301');
  assert.ok(lnrRecord, 'LNR301 expense record must exist');
  assert.equal(lnrRecord.machineId, 'M-LNR301');
  assert.equal(lnrRecord.machineName, 'Lining Machine 301');

  // 4. Test Search by space-separated terms
  const searchRes = await listExpenses(env, { search: 'LNR301 TD015' });
  assert.ok(searchRes.items.length >= 1);
  assert.equal(searchRes.items[0].machineCode, 'LNR301');

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
});
