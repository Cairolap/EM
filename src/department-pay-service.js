import { fail } from './errors.js';

const VALID_YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const VALID_STATUSES = ['PLANNED', 'APPROVED', 'ORDERED', 'RECEIVED'];

function getCurrentYearMonth() {
  const now = new Date();
  // Use UTC+7 (Thailand time)
  const thTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = thTime.getUTCFullYear();
  const m = String(thTime.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function addMonths(yearMonth, offset) {
  if (!VALID_YEAR_MONTH.test(yearMonth)) {
    fail('VALIDATION', 'รูปแบบเดือน (YYYY-MM) ไม่ถูกต้อง');
  }
  const [yStr, mStr] = yearMonth.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) - 1 + Number(offset || 0);
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function buildMonthRange(startMonth, count = 12) {
  const start = VALID_YEAR_MONTH.test(startMonth) ? startMonth : getCurrentYearMonth();
  const total = Math.min(Math.max(Number(count) || 12, 1), 24);
  const months = [];
  for (let i = 0; i < total; i++) {
    months.push(addMonths(start, i));
  }
  return months;
}

function mapItemRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    yearMonth: r.year_month,
    description: r.description || '',
    brand: r.brand || '',
    price: Number(r.price) || 0,
    leadTime: r.lead_time || '',
    fileUrl: r.file_url || '',
    isUrgent: Boolean(r.is_urgent),
    status: r.status || 'PLANNED',
    sortOrder: Number(r.sort_order) || 0,
    remark: r.remark || '',
    createdBy: r.created_by || '',
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || ''
  };
}

/**
 * List 12-month Department Pay plan (Public read allowed)
 */
export async function listDepartmentPayPlan(env, options = {}) {
  const db = env.DB;
  const currentMonth = getCurrentYearMonth();
  const startMonth = VALID_YEAR_MONTH.test(options?.startMonth) ? options.startMonth : currentMonth;
  const monthCount = Math.min(Math.max(Number(options?.months) || 12, 1), 24);
  const monthKeys = buildMonthRange(startMonth, monthCount);
  const endMonth = monthKeys[monthKeys.length - 1];

  // 1. Default monthly budget
  const settingRow = await db.prepare(
    `SELECT value FROM department_pay_settings WHERE key = 'default_monthly_budget'`
  ).first();
  const defaultBudget = settingRow && !Number.isNaN(Number(settingRow.value))
    ? Number(settingRow.value)
    : 8000;

  // 2. Custom budgets per month
  const { results: budgetRows = [] } = await db.prepare(
    `SELECT year_month, budget_amount, note, updated_by, updated_at
     FROM department_pay_budgets
     WHERE year_month >= ? AND year_month <= ?`
  ).bind(startMonth, endMonth).all();

  const budgetMap = new Map();
  for (const b of budgetRows) {
    budgetMap.set(b.year_month, {
      yearMonth: b.year_month,
      budgetAmount: Number(b.budget_amount),
      note: b.note || '',
      updatedBy: b.updated_by || '',
      updatedAt: b.updated_at || '',
      isCustom: true
    });
  }

  // 3. Items in the range (plus any items outside if requested, or within range)
  const { results: itemRows = [] } = await db.prepare(
    `SELECT *
     FROM department_pay_items
     WHERE year_month >= ? AND year_month <= ?
     ORDER BY year_month ASC, is_urgent DESC, sort_order ASC, created_at ASC`
  ).bind(startMonth, endMonth).all();

  const items = itemRows.map(mapItemRow);
  const itemsByMonth = new Map();
  monthKeys.forEach(m => itemsByMonth.set(m, []));
  for (const item of items) {
    if (!itemsByMonth.has(item.yearMonth)) {
      itemsByMonth.set(item.yearMonth, []);
    }
    itemsByMonth.get(item.yearMonth).push(item);
  }

  // 4. Build 12-month structured summary
  const months = monthKeys.map(ym => {
    const customBudget = budgetMap.get(ym);
    const budget = customBudget ? customBudget.budgetAmount : defaultBudget;
    const monthItems = itemsByMonth.get(ym) || [];
    const spent = monthItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    const remaining = budget - spent;
    const urgentCount = monthItems.filter(it => it.isUrgent).length;

    return {
      yearMonth: ym,
      isCurrentMonth: ym === currentMonth,
      budget,
      isCustomBudget: Boolean(customBudget),
      budgetNote: customBudget?.note || '',
      spent,
      remaining,
      isOverBudget: remaining < 0,
      usagePercent: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : (spent > 0 ? 100 : 0),
      itemCount: monthItems.length,
      urgentCount,
      items: monthItems
    };
  });

  const totalBudget = months.reduce((s, m) => s + m.budget, 0);
  const totalSpent = months.reduce((s, m) => s + m.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalItems = items.length;
  const totalUrgent = items.filter(i => i.isUrgent).length;

  return {
    currentMonth,
    startMonth,
    endMonth,
    monthCount,
    defaultBudget,
    summary: {
      totalBudget,
      totalSpent,
      totalRemaining,
      totalItems,
      totalUrgent
    },
    months,
    items
  };
}

/**
 * Create or Update a Department Pay item (Login required)
 */
export async function saveDepartmentPayItem(env, actor, payload = {}) {
  const db = env.DB;
  if (!payload || typeof payload !== 'object') {
    fail('VALIDATION', 'ข้อมูลรายการไม่ถูกต้อง');
  }

  const id = payload.id ? String(payload.id).trim() : '';
  const yearMonth = String(payload.yearMonth || getCurrentYearMonth()).trim();
  const description = String(payload.description || '').trim();
  const brand = String(payload.brand || '').trim();
  const rawPrice = Number(payload.price);
  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : NaN;
  const leadTime = String(payload.leadTime || '').trim();
  const fileUrl = String(payload.fileUrl || '').trim();
  const isUrgent = payload.isUrgent ? 1 : 0;
  const rawStatus = String(payload.status || 'PLANNED').trim().toUpperCase();
  const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'PLANNED';
  const remark = String(payload.remark || '').trim();
  const actorName = actor?.displayName || actor?.username || 'system';

  if (!VALID_YEAR_MONTH.test(yearMonth)) {
    fail('VALIDATION', 'กรุณาเลือกเดือนที่วางแผนให้ถูกต้อง (YYYY-MM)', 422, { yearMonth: 'รูปแบบเดือนไม่ถูกต้อง' });
  }
  if (!description) {
    fail('VALIDATION', 'กรุณาระบุรายละเอียดรายการ (บังคับ)', 422, { description: 'กรุณาระบุรายละเอียด' });
  }
  if (Number.isNaN(price) || price < 0) {
    fail('VALIDATION', 'กรุณาระบุราคาเป็นตัวเลขที่ถูกต้อง (ตั้งแต่ 0 ขึ้นไป)', 422, { price: 'ราคาไม่ถูกต้อง' });
  }

  if (id) {
    const existing = await db.prepare(`SELECT id FROM department_pay_items WHERE id = ?`).bind(id).first();
    if (!existing) fail('NOT_FOUND', 'ไม่พบรายการที่ต้องการแก้ไข', 404);

    await db.prepare(
      `UPDATE department_pay_items
       SET year_month = ?,
           description = ?,
           brand = ?,
           price = ?,
           lead_time = ?,
           file_url = ?,
           is_urgent = ?,
           status = ?,
           remark = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      yearMonth,
      description,
      brand,
      price,
      leadTime,
      fileUrl,
      isUrgent,
      status,
      remark,
      id
    ).run();

    const updated = await db.prepare(`SELECT * FROM department_pay_items WHERE id = ?`).bind(id).first();
    return mapItemRow(updated);
  } else {
    const newId = 'DP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const maxSortRow = await db.prepare(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM department_pay_items WHERE year_month = ?`
    ).bind(yearMonth).first();
    const nextSort = (Number(maxSortRow?.max_sort) || 0) + 10;

    await db.prepare(
      `INSERT INTO department_pay_items (
        id, year_month, description, brand, price, lead_time, file_url,
        is_urgent, status, sort_order, remark, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      newId,
      yearMonth,
      description,
      brand,
      price,
      leadTime,
      fileUrl,
      isUrgent,
      status,
      nextSort,
      remark,
      actorName
    ).run();

    const created = await db.prepare(`SELECT * FROM department_pay_items WHERE id = ?`).bind(newId).first();
    return mapItemRow(created);
  }
}

/**
 * Move an item to another month (or shift by +/- months, optionally toggling urgent status)
 */
export async function moveDepartmentPayItem(env, actor, payload = {}) {
  const db = env.DB;
  const id = String(payload?.id || '').trim();
  if (!id) fail('VALIDATION', 'กรุณาระบุรหัสรายการที่ต้องการย้ายเดือน');

  const existing = await db.prepare(`SELECT * FROM department_pay_items WHERE id = ?`).bind(id).first();
  if (!existing) fail('NOT_FOUND', 'ไม่พบรายการที่ต้องการย้ายเดือน', 404);

  let targetMonth = payload?.targetMonth ? String(payload.targetMonth).trim() : '';
  if (!targetMonth && typeof payload?.offsetMonths === 'number') {
    targetMonth = addMonths(existing.year_month, payload.offsetMonths);
  }
  if (!VALID_YEAR_MONTH.test(targetMonth)) {
    fail('VALIDATION', 'เดือนปลายทางไม่ถูกต้อง');
  }

  const isUrgent = payload?.isUrgent !== undefined
    ? (payload.isUrgent ? 1 : 0)
    : Number(existing.is_urgent) || 0;

  await db.prepare(
    `UPDATE department_pay_items
     SET year_month = ?,
         is_urgent = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(targetMonth, isUrgent, id).run();

  const updated = await db.prepare(`SELECT * FROM department_pay_items WHERE id = ?`).bind(id).first();
  return mapItemRow(updated);
}

/**
 * Delete a Department Pay item (Login required)
 */
export async function deleteDepartmentPayItem(env, actor, id) {
  const db = env.DB;
  const cleanId = String(id || '').trim();
  if (!cleanId) fail('VALIDATION', 'กรุณาระบุรหัสรายการที่ต้องการลบ');

  const existing = await db.prepare(`SELECT id FROM department_pay_items WHERE id = ?`).bind(cleanId).first();
  if (!existing) fail('NOT_FOUND', 'ไม่พบรายการที่ต้องการลบ', 404);

  await db.prepare(`DELETE FROM department_pay_items WHERE id = ?`).bind(cleanId).run();
  return { deletedId: cleanId };
}

/**
 * Update monthly budget (either global default budget or a specific month's budget)
 */
export async function saveDepartmentPayBudget(env, actor, payload = {}) {
  const db = env.DB;
  const actorName = actor?.displayName || actor?.username || 'system';

  // 1. Update global default monthly budget if provided
  if (payload?.defaultBudget !== undefined && payload?.defaultBudget !== null && payload?.defaultBudget !== '') {
    const defAmount = Number(payload.defaultBudget);
    if (!Number.isFinite(defAmount) || defAmount < 0) {
      fail('VALIDATION', 'งบประมาณต่อเดือนต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
    }
    await db.prepare(
      `INSERT INTO department_pay_settings (key, value, updated_at)
       VALUES ('default_monthly_budget', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(String(defAmount)).run();
  }

  // 2. Update or reset specific month's budget if yearMonth is provided
  if (payload?.yearMonth) {
    const ym = String(payload.yearMonth).trim();
    if (!VALID_YEAR_MONTH.test(ym)) {
      fail('VALIDATION', 'รูปแบบเดือน (YYYY-MM) ไม่ถูกต้อง');
    }

    if (payload.resetToDefault) {
      await db.prepare(`DELETE FROM department_pay_budgets WHERE year_month = ?`).bind(ym).run();
    } else if (payload.budgetAmount !== undefined && payload.budgetAmount !== null && payload.budgetAmount !== '') {
      const amount = Number(payload.budgetAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        fail('VALIDATION', 'งบประมาณประจำเดือนต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
      }
      const note = String(payload.note || '').trim();
      await db.prepare(
        `INSERT INTO department_pay_budgets (year_month, budget_amount, note, updated_by, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(year_month) DO UPDATE SET
           budget_amount = excluded.budget_amount,
           note = excluded.note,
           updated_by = excluded.updated_by,
           updated_at = datetime('now')`
      ).bind(ym, amount, note, actorName).run();
    }
  }

  return { ok: true };
}
