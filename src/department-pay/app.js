(function () {
  'use strict';

  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const state = {
    activeTab: 'board',
    startMonth: '',
    currentMonth: '',
    defaultBudget: 8000,
    months: [],
    items: [],
    summary: {
      totalBudget: 96000,
      totalSpent: 0,
      totalRemaining: 96000,
      totalItems: 0,
      totalUrgent: 0
    },
    filterMode: 'ALL',
    searchQuery: '',
    draggingItemId: null,
    detailItemId: null
  };

  const $ = (id) => document.getElementById(id);

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(num) {
    const val = Number(num) || 0;
    return val.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatThaiMonth(ym, short = false) {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || '-';
    const [yStr, mStr] = ym.split('-');
    const y = parseInt(yStr, 10) + 543;
    const mIdx = parseInt(mStr, 10) - 1;
    const mName = short ? THAI_MONTHS_SHORT[mIdx] : THAI_MONTHS[mIdx];
    return `${mName} ${y}`;
  }

  function shiftYearMonth(ym, offset) {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
    const [yStr, mStr] = ym.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) - 1 + Number(offset || 0);
    y += Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    return `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  function isLoggedIn() {
    return Boolean(window.EM_CURRENT_USER || window.currentUser);
  }

  async function ensureAuthenticated() {
    if (isLoggedIn()) return true;
    if (typeof window.promptLogin === 'function') {
      try {
        await window.promptLogin();
        updateAuthPill();
        return isLoggedIn();
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  function updateAuthPill() {
    const pill = $('btn-auth-status');
    const text = $('auth-status-text');
    if (!pill || !text) return;

    const user = window.EM_CURRENT_USER || window.currentUser;
    if (user) {
      pill.classList.remove('is-guest');
      pill.classList.add('is-logged-in');
      pill.title = 'เข้าสู่ระบบแล้ว สามารถเพิ่ม แก้ไข หรือลากย้ายเดือนได้ทันที';
      text.textContent = `โหมดแก้ไขได้ (${user.displayName || user.username})`;
    } else {
      pill.classList.add('is-guest');
      pill.classList.remove('is-logged-in');
      pill.title = 'คลิกเพื่อเข้าสู่ระบบสำหรับแก้ไขข้อมูล';
      text.textContent = 'ดูข้อมูลได้ไม่ต้องล็อกอิน · คลิกเพื่อล็อกอินแก้ไข';
    }
  }

  async function rpcWrite(method, payload) {
    const ok = await ensureAuthenticated();
    if (!ok) throw new Error('กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล');
    return await window.EM_RPC_SCOPE('department-pay', method, payload);
  }

  async function loadPlan() {
    try {
      const qs = new URLSearchParams();
      if (state.startMonth) qs.set('startMonth', state.startMonth);
      qs.set('months', '12');

      const res = await fetch(`/api/v1/department-pay/public?${qs.toString()}`, {
        method: 'GET',
        credentials: 'same-origin'
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || 'โหลดข้อมูลไม่สำเร็จ');

      const data = json.data;
      state.currentMonth = data.currentMonth;
      state.startMonth = data.startMonth;
      state.defaultBudget = data.defaultBudget;
      state.months = data.months || [];
      state.items = data.items || [];
      state.summary = data.summary || state.summary;

      if ($('input-start-month')) {
        $('input-start-month').value = state.startMonth;
      }

      renderKPIs();
      renderBoard();
      renderTable();
      populateMonthSelects();
    } catch (err) {
      console.error('Failed to load Department Pay plan:', err);
    }
  }

  function renderKPIs() {
    const s = state.summary;
    if ($('kpi-default-budget')) $('kpi-default-budget').textContent = `${formatMoney(state.defaultBudget)} ฿`;
    if ($('kpi-total-budget')) $('kpi-total-budget').textContent = `${formatMoney(s.totalBudget)} ฿`;
    if ($('kpi-total-spent')) $('kpi-total-spent').textContent = `${formatMoney(s.totalSpent)} ฿`;

    const remEl = $('kpi-total-remaining');
    if (remEl) {
      remEl.textContent = `${formatMoney(s.totalRemaining)} ฿`;
      remEl.closest('.dp-kpi-chip')?.classList.toggle('is-over', s.totalRemaining < 0);
    }
    if ($('tab-count-items')) $('tab-count-items').textContent = s.totalItems || 0;
  }

  function filterItemMatchesSearch(item) {
    if (!state.searchQuery) return true;
    const q = state.searchQuery.toLowerCase();
    return (
      (item.description || '').toLowerCase().includes(q) ||
      (item.brand || '').toLowerCase().includes(q) ||
      (item.leadTime || '').toLowerCase().includes(q) ||
      (item.remark || '').toLowerCase().includes(q)
    );
  }

  // ==========================================================================
  // TAB 1: 12-MONTH PLANNING BOARD (COMPACT & DRAG-AND-DROP)
  // ==========================================================================
  function renderBoard() {
    const grid = $('dp-months-grid');
    if (!grid) return;

    let monthsToShow = state.months.slice();

    if (state.filterMode === 'HAS_ITEMS') {
      monthsToShow = monthsToShow.filter(m => m.items.some(filterItemMatchesSearch));
    } else if (state.filterMode === 'URGENT') {
      monthsToShow = monthsToShow.filter(m => m.items.some(i => i.isUrgent && filterItemMatchesSearch(i)));
    } else if (state.filterMode === 'OVER_BUDGET') {
      monthsToShow = monthsToShow.filter(m => m.isOverBudget);
    } else if (state.searchQuery) {
      monthsToShow = monthsToShow.filter(m => m.items.some(filterItemMatchesSearch));
    }

    if (monthsToShow.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; background:#fff; border:1px dashed var(--dp-border); border-radius:12px; padding:40px; text-align:center; color:var(--dp-ink-secondary);">
          ไม่พบเดือนหรือรายการค่าใช้จ่ายที่ตรงกับเงื่อนไขการค้นหา
        </div>
      `;
      return;
    }

    let html = '';
    monthsToShow.forEach(m => {
      const filteredItems = m.items.filter(filterItemMatchesSearch);
      const pct = Math.min(Math.max(m.usagePercent || 0, 0), 100);
      const fillClass = m.isOverBudget ? 'is-over' : (m.usagePercent >= 85 ? 'is-warn' : '');
      const remainLabel = m.remaining >= 0
        ? `คงเหลือ ${formatMoney(m.remaining)} ฿`
        : `เกินงบ ${formatMoney(Math.abs(m.remaining))} ฿`;

      html += `
        <article class="dp-month-card${m.isCurrentMonth ? ' is-current-month' : ''}${m.isOverBudget ? ' is-over-budget' : ''}" data-month="${escapeHtml(m.yearMonth)}">
          <div class="dp-month-top-bar"></div>
          <div class="dp-month-header">
            <div class="dp-month-title-row">
              <div class="dp-month-name-group">
                <h2 class="dp-month-title">${escapeHtml(formatThaiMonth(m.yearMonth))}</h2>
                ${m.isCurrentMonth ? '<span class="dp-badge-current">เดือนนี้</span>' : ''}
              </div>
              <button type="button" class="dp-btn-month-add" data-month="${escapeHtml(m.yearMonth)}" title="เพิ่มรายการในเดือนนี้">
                + เพิ่ม
              </button>
            </div>

            <div class="dp-budget-meter">
              <div class="dp-budget-numbers">
                <button type="button" class="dp-budget-edit-trigger" data-month="${escapeHtml(m.yearMonth)}" title="คลิกเพื่อปรับงบประมาณเดือนนี้">
                  <span>ใช้ <strong>${formatMoney(m.spent)}</strong> / งบ ${formatMoney(m.budget)} ฿${m.isCustomBudget ? '*' : ''}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <span class="dp-remain-pill${m.isOverBudget ? ' is-over' : ''}">${remainLabel}</span>
              </div>
              <div class="dp-progress-track">
                <div class="dp-progress-fill ${fillClass}" style="width: ${pct}%;"></div>
              </div>
            </div>
          </div>

          <div class="dp-month-body" data-drop-month="${escapeHtml(m.yearMonth)}">
            ${filteredItems.length === 0 ? `
              <div class="dp-month-empty">
                <span>ไม่มีรายการ — กด <strong>+ เพิ่ม</strong> หรือลากรายการมาวาง</span>
              </div>
            ` : filteredItems.map(item => renderItemCardHtml(item)).join('')}
          </div>
        </article>
      `;
    });

    grid.innerHTML = html;
    bindBoardEvents(grid);
  }

  function renderItemCardHtml(item) {
    const subParts = [];
    if (item.brand) subParts.push(escapeHtml(item.brand));
    if (item.leadTime) subParts.push(`🚚 ${escapeHtml(item.leadTime)}`);

    return `
      <div class="dp-item-card${item.isUrgent ? ' is-urgent' : ''}" draggable="true" data-id="${escapeHtml(item.id)}" data-month="${escapeHtml(item.yearMonth)}" title="ลากเพื่อย้ายไปเดือนอื่น หรือกดปุ่ม i เพื่อดูรายละเอียด">
        <div class="dp-item-left">
          <span class="dp-drag-grip" aria-hidden="true">⠿</span>
          <div class="dp-item-main">
            <div class="dp-item-title-line">
              ${item.isUrgent ? `<span class="dp-tag-urgent">ด่วน</span>` : ''}
              <span class="dp-item-desc">${escapeHtml(item.description)}</span>
              ${item.fileUrl ? `
                <a href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noopener noreferrer" class="dp-link-chip" title="เปิดไฟล์/ลิงก์แนบ" onclick="event.stopPropagation();">
                  🔗
                </a>
              ` : ''}
            </div>
            ${subParts.length > 0 ? `<div class="dp-item-sub-line">${subParts.join(' · ')}</div>` : ''}
          </div>
        </div>

        <div class="dp-item-right">
          <span class="dp-item-price">${formatMoney(item.price)} ฿</span>
          <div class="dp-edit-group">
            <button type="button" class="dp-btn-act act-info btn-info-item" data-id="${escapeHtml(item.id)}" title="ดูรายละเอียดรายการ (i)">
              i
            </button>
            <button type="button" class="dp-btn-act act-urgent btn-toggle-urgent${item.isUrgent ? ' is-active' : ''}" data-id="${escapeHtml(item.id)}" title="${item.isUrgent ? 'ยกเลิกสถานะด่วน' : 'ตั้งเป็นรายการด่วน'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${item.isUrgent ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </button>
            <button type="button" class="dp-btn-act btn-edit-item" data-id="${escapeHtml(item.id)}" title="แก้ไขรายการ">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button type="button" class="dp-btn-act act-delete btn-delete-item" data-id="${escapeHtml(item.id)}" title="ลบรายการ">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function bindBoardEvents(grid) {
    grid.querySelectorAll('.dp-btn-month-add').forEach(btn => {
      btn.onclick = () => openItemModal(null, btn.dataset.month);
    });

    grid.querySelectorAll('.dp-budget-edit-trigger').forEach(btn => {
      btn.onclick = () => openBudgetModal(btn.dataset.month);
    });

    grid.querySelectorAll('.btn-info-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openDetailModal(btn.dataset.id);
      };
    });

    grid.querySelectorAll('.btn-toggle-urgent').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        handleToggleUrgent(btn.dataset.id);
      };
    });

    grid.querySelectorAll('.btn-edit-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openItemModal(btn.dataset.id);
      };
    });

    grid.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        handleDeleteItem(btn.dataset.id);
      };
    });

    // Drag & Drop cards across months
    grid.querySelectorAll('.dp-item-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        state.draggingItemId = card.dataset.id;
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.style.opacity = '0.45';
      });
      card.addEventListener('dragend', () => {
        state.draggingItemId = null;
        card.style.opacity = '';
        grid.querySelectorAll('.dp-month-card').forEach(mc => mc.classList.remove('is-drag-over'));
      });
    });

    grid.querySelectorAll('.dp-month-card').forEach(monthCard => {
      monthCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        monthCard.classList.add('is-drag-over');
      });
      monthCard.addEventListener('dragleave', () => {
        monthCard.classList.remove('is-drag-over');
      });
      monthCard.addEventListener('drop', async (e) => {
        e.preventDefault();
        monthCard.classList.remove('is-drag-over');
        const itemId = state.draggingItemId || e.dataTransfer.getData('text/plain');
        const targetMonth = monthCard.dataset.month;
        if (!itemId || !targetMonth) return;
        const item = state.items.find(i => i.id === itemId);
        if (!item || item.yearMonth === targetMonth) return;
        await handleMoveToMonth(itemId, targetMonth);
      });
    });
  }

  // ==========================================================================
  // DETAIL MODAL (i BUTTON — NO LOGIN REQUIRED TO VIEW)
  // ==========================================================================
  function openDetailModal(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    state.detailItemId = item.id;
    const body = $('dp-detail-body');
    if (!body) return;

    body.innerHTML = `
      <div class="dp-detail-grid">
        <div class="dp-detail-box full">
          <span class="dp-detail-lbl">รายละเอียด (Description)</span>
          <div class="dp-detail-val" style="font-size:15.5px;">
            ${item.isUrgent ? '<span class="dp-tag-urgent" style="margin-right:6px;">ด่วน</span>' : ''}
            ${escapeHtml(item.description)}
          </div>
        </div>

        <div class="dp-detail-box">
          <span class="dp-detail-lbl">เดือนที่วางแผน</span>
          <div class="dp-detail-val">${escapeHtml(formatThaiMonth(item.yearMonth))} (${escapeHtml(item.yearMonth)})</div>
        </div>

        <div class="dp-detail-box">
          <span class="dp-detail-lbl">ราคา (บาท)</span>
          <div class="dp-detail-val font-mono" style="color:#0284c7; font-size:16px;">${formatMoney(item.price)} ฿</div>
        </div>

        <div class="dp-detail-box">
          <span class="dp-detail-lbl">ยี่ห้อ (Brand)</span>
          <div class="dp-detail-val">${escapeHtml(item.brand || '-')}</div>
        </div>

        <div class="dp-detail-box">
          <span class="dp-detail-lbl">ระยะเวลาจัดส่ง (Lead Time)</span>
          <div class="dp-detail-val">${escapeHtml(item.leadTime || '-')}</div>
        </div>

        <div class="dp-detail-box full">
          <span class="dp-detail-lbl">ลิงก์ / URL ไฟล์แนบ</span>
          <div class="dp-detail-val">
            ${item.fileUrl ? `
              <a href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noopener noreferrer" class="dp-link-chip" style="font-size:12.5px; padding:4px 10px;">
                🔗 เปิดลิงก์ / ไฟล์แนบ (${escapeHtml(item.fileUrl)})
              </a>
            ` : '<span style="color:var(--dp-ink-muted); font-weight:400;">ไม่มีลิงก์แนบ</span>'}
          </div>
        </div>

        ${item.remark ? `
          <div class="dp-detail-box full">
            <span class="dp-detail-lbl">หมายเหตุเพิ่มเติม</span>
            <div class="dp-detail-val" style="font-weight:400; font-size:13px;">${escapeHtml(item.remark)}</div>
          </div>
        ` : ''}
      </div>
    `;

    $('modal-dp-detail').showModal();
  }

  // ==========================================================================
  // TAB 2: TABLE VIEW
  // ==========================================================================
  function renderTable() {
    const tbody = $('dp-table-body');
    if (!tbody) return;

    const filtered = state.items.filter(item => {
      if (!filterItemMatchesSearch(item)) return false;
      if (state.filterMode === 'URGENT' && !item.isUrgent) return false;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:36px; color:var(--dp-ink-muted);">
            ยังไม่มีรายการค่าใช้จ่ายแผนกในช่วง 12 เดือนนี้
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    filtered.forEach(item => {
      const monthOptions = state.months.map(m => `
        <option value="${escapeHtml(m.yearMonth)}"${m.yearMonth === item.yearMonth ? ' selected' : ''}>
          ${escapeHtml(formatThaiMonth(m.yearMonth, true))} (${escapeHtml(m.yearMonth)})
        </option>
      `).join('');

      html += `
        <tr data-id="${escapeHtml(item.id)}">
          <td>
            <select class="dp-select font-mono dp-table-month-select" data-id="${escapeHtml(item.id)}" style="padding:4px 8px; font-size:12px;">
              ${monthOptions}
            </select>
          </td>
          <td>
            <div style="font-weight:600; color:#0f172a;">
              ${item.isUrgent ? '<span class="dp-tag-urgent" style="margin-right:5px;">ด่วน</span>' : ''}
              ${escapeHtml(item.description)}
            </div>
            ${item.remark ? `<div style="font-size:11.5px; color:#64748b; margin-top:2px;">${escapeHtml(item.remark)}</div>` : ''}
          </td>
          <td>${escapeHtml(item.brand || '-')}</td>
          <td style="text-align: right;" class="font-mono">
            <strong>${formatMoney(item.price)} ฿</strong>
          </td>
          <td>${escapeHtml(item.leadTime || '-')}</td>
          <td style="text-align: center;">
            ${item.fileUrl ? `
              <a href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noopener noreferrer" class="dp-link-chip">
                🔗 เปิดลิงก์
              </a>
            ` : '<span style="color:#94a3b8;">-</span>'}
          </td>
          <td style="text-align: center;">
            <div class="dp-edit-group" style="display:inline-flex;">
              <button type="button" class="dp-btn-act act-info btn-tbl-info" data-id="${escapeHtml(item.id)}" title="ดูรายละเอียด (i)">i</button>
              <button type="button" class="dp-btn-act act-urgent btn-tbl-urgent${item.isUrgent ? ' is-active' : ''}" data-id="${escapeHtml(item.id)}" title="สลับสถานะด่วน">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${item.isUrgent ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              </button>
              <button type="button" class="dp-btn-act btn-tbl-edit" data-id="${escapeHtml(item.id)}" title="แก้ไข">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button type="button" class="dp-btn-act act-delete btn-tbl-del" data-id="${escapeHtml(item.id)}" title="ลบ">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll('.dp-table-month-select').forEach(sel => {
      sel.onchange = () => handleMoveToMonth(sel.dataset.id, sel.value);
    });
    tbody.querySelectorAll('.btn-tbl-info').forEach(btn => {
      btn.onclick = () => openDetailModal(btn.dataset.id);
    });
    tbody.querySelectorAll('.btn-tbl-urgent').forEach(btn => {
      btn.onclick = () => handleToggleUrgent(btn.dataset.id);
    });
    tbody.querySelectorAll('.btn-tbl-edit').forEach(btn => {
      btn.onclick = () => openItemModal(btn.dataset.id);
    });
    tbody.querySelectorAll('.btn-tbl-del').forEach(btn => {
      btn.onclick = () => handleDeleteItem(btn.dataset.id);
    });
  }

  // ==========================================================================
  // MOVE & URGENT ACTIONS
  // ==========================================================================
  async function handleMoveToMonth(itemId, targetMonth, markUrgent) {
    try {
      const payload = { id: itemId, targetMonth };
      if (markUrgent !== undefined) payload.isUrgent = markUrgent;
      await rpcWrite('moveItem', payload);
      await loadPlan();
    } catch (err) {
      if (err.message !== 'กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล') {
        alert(err.message || 'ย้ายเดือนไม่สำเร็จ');
      }
      await loadPlan();
    }
  }

  async function handleToggleUrgent(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    try {
      await rpcWrite('moveItem', {
        id: itemId,
        targetMonth: item.yearMonth,
        isUrgent: !item.isUrgent
      });
      await loadPlan();
    } catch (err) {
      if (err.message !== 'กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล') {
        alert(err.message || 'อัปเดตสถานะด่วนไม่สำเร็จ');
      }
    }
  }

  // ==========================================================================
  // MODAL 1: ADD / EDIT ITEM
  // ==========================================================================
  function populateMonthSelects() {
    const html = state.months.map(m => `
      <option value="${escapeHtml(m.yearMonth)}">
        ${escapeHtml(formatThaiMonth(m.yearMonth))} (${escapeHtml(m.yearMonth)}) — คงเหลือ ${formatMoney(m.remaining)} ฿
      </option>
    `).join('');

    if ($('item-year-month')) $('item-year-month').innerHTML = html;
    if ($('budget-target-month')) $('budget-target-month').innerHTML = html;
  }

  async function openItemModal(itemId = null, defaultMonth = null) {
    const ok = await ensureAuthenticated();
    if (!ok) return;

    const modal = $('modal-dp-item');
    const errEl = $('item-form-error');
    if (errEl) errEl.style.display = 'none';

    populateMonthSelects();

    if (itemId) {
      const item = state.items.find(i => i.id === itemId);
      if (!item) return;
      $('modal-item-title').textContent = 'แก้ไขรายการค่าใช้จ่ายแผนก';
      $('item-id').value = item.id;
      $('item-year-month').value = item.yearMonth;
      $('item-is-urgent').checked = Boolean(item.isUrgent);
      $('item-description').value = item.description || '';
      $('item-brand').value = item.brand || '';
      $('item-price').value = item.price || '';
      $('item-lead-time').value = item.leadTime || '';
      $('item-file-url').value = item.fileUrl || '';
      $('item-remark').value = item.remark || '';
    } else {
      $('modal-item-title').textContent = 'เพิ่มรายการค่าใช้จ่ายแผนก';
      $('item-id').value = '';
      $('item-year-month').value = defaultMonth || state.currentMonth || state.startMonth;
      $('item-is-urgent').checked = false;
      $('item-description').value = '';
      $('item-brand').value = '';
      $('item-price').value = '';
      $('item-lead-time').value = '';
      $('item-file-url').value = '';
      $('item-remark').value = '';
    }

    updateItemBudgetPreview();
    modal.showModal();
    setTimeout(() => $('item-description')?.focus(), 30);
  }

  function updateItemBudgetPreview() {
    const preview = $('item-budget-preview');
    if (!preview) return;
    const ym = $('item-year-month')?.value;
    const itemId = $('item-id')?.value;
    const enteredPrice = Number($('item-price')?.value) || 0;
    const monthObj = state.months.find(m => m.yearMonth === ym);
    if (!monthObj) {
      preview.textContent = '';
      return;
    }

    const existingItem = itemId ? state.items.find(i => i.id === itemId) : null;
    const baseSpent = monthObj.spent - (existingItem && existingItem.yearMonth === ym ? existingItem.price : 0);
    const projectedSpent = baseSpent + enteredPrice;
    const projectedRemain = monthObj.budget - projectedSpent;

    preview.innerHTML = `
      เดือน <strong>${escapeHtml(formatThaiMonth(ym))}</strong>:
      งบประมาณ <strong class="font-mono">${formatMoney(monthObj.budget)} ฿</strong> &middot;
      รวมหลังบันทึกรายการนี้ <strong class="font-mono">${formatMoney(projectedSpent)} ฿</strong> &middot;
      <span style="font-weight:700; color:${projectedRemain < 0 ? '#dc2626' : '#15803d'};">
        ${projectedRemain >= 0 ? `คงเหลือ ${formatMoney(projectedRemain)} ฿` : `⚠️ เกินงบ ${formatMoney(Math.abs(projectedRemain))} ฿`}
      </span>
    `;
  }

  async function submitItemForm(e) {
    e.preventDefault();
    const errEl = $('item-form-error');
    const submitBtn = $('btn-submit-item-modal');
    errEl.style.display = 'none';

    const id = $('item-id').value.trim();
    const yearMonth = $('item-year-month').value;
    const isUrgent = $('item-is-urgent').checked;
    const description = $('item-description').value.trim();
    const brand = $('item-brand').value.trim();
    const price = Number($('item-price').value) || 0;
    const leadTime = $('item-lead-time').value.trim();
    const fileUrl = $('item-file-url').value.trim();
    const remark = $('item-remark').value.trim();

    if (!description) {
      errEl.textContent = 'กรุณาระบุรายละเอียดรายการ (บังคับกรอก)';
      errEl.style.display = 'block';
      $('item-description')?.focus();
      return;
    }

    submitBtn.disabled = true;
    try {
      await rpcWrite('saveItem', {
        id: id || undefined,
        yearMonth,
        isUrgent,
        description,
        brand,
        price,
        leadTime,
        fileUrl,
        remark
      });

      await loadPlan();

      const isContinuous = $('item-continuous-add')?.checked && !id;
      if (isContinuous) {
        $('item-description').value = '';
        $('item-brand').value = '';
        $('item-price').value = '';
        $('item-lead-time').value = '';
        $('item-file-url').value = '';
        $('item-remark').value = '';
        $('item-is-urgent').checked = false;
        updateItemBudgetPreview();
        $('item-description')?.focus();
      } else {
        $('modal-dp-item').close();
      }
    } catch (err) {
      errEl.textContent = err.message || 'บันทึกข้อมูลไม่สำเร็จ';
      errEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function handleDeleteItem(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    const ok = await ensureAuthenticated();
    if (!ok) return;

    if (!confirm(`ต้องการลบรายการ "${item.description}" (${formatMoney(item.price)} ฿) ใช่หรือไม่?`)) return;

    try {
      await rpcWrite('deleteItem', itemId);
      await loadPlan();
    } catch (err) {
      alert('ลบรายการไม่สำเร็จ: ' + err.message);
    }
  }

  // ==========================================================================
  // MODAL 2: BUDGET SETTINGS (DEFAULT 8,000 THB & PER-MONTH OVERRIDE)
  // ==========================================================================
  async function openBudgetModal(targetMonth = null) {
    const ok = await ensureAuthenticated();
    if (!ok) return;

    populateMonthSelects();
    $('budget-default-input').value = state.defaultBudget;

    const selectedYm = targetMonth || state.currentMonth || state.startMonth;
    if ($('budget-target-month')) $('budget-target-month').value = selectedYm;
    syncBudgetModalMonthFields(selectedYm);

    $('budget-form-error').style.display = 'none';
    $('modal-dp-budget').showModal();
  }

  function syncBudgetModalMonthFields(ym) {
    const m = state.months.find(x => x.yearMonth === ym);
    if (!m) return;
    $('budget-month-amount').value = m.isCustomBudget ? m.budget : '';
    $('budget-month-note').value = m.budgetNote || '';
  }

  async function submitBudgetForm(e) {
    e.preventDefault();
    const errEl = $('budget-form-error');
    errEl.style.display = 'none';

    const defaultBudget = Number($('budget-default-input').value);
    const yearMonth = $('budget-target-month').value;
    const customAmountStr = $('budget-month-amount').value.trim();
    const note = $('budget-month-note').value.trim();

    if (!Number.isFinite(defaultBudget) || defaultBudget < 0) {
      errEl.textContent = 'กรุณาระบุงบประมาณมาตรฐานต่อเดือนให้ถูกต้อง';
      errEl.style.display = 'block';
      return;
    }

    try {
      const payload = { defaultBudget };
      if (yearMonth && customAmountStr !== '') {
        payload.yearMonth = yearMonth;
        payload.budgetAmount = Number(customAmountStr);
        payload.note = note;
      }
      await rpcWrite('saveBudget', payload);
      $('modal-dp-budget').close();
      await loadPlan();
    } catch (err) {
      errEl.textContent = err.message || 'บันทึกงบประมาณไม่สำเร็จ';
      errEl.style.display = 'block';
    }
  }

  async function handleResetMonthBudget() {
    const ym = $('budget-target-month')?.value;
    if (!ym) return;
    try {
      await rpcWrite('saveBudget', { yearMonth: ym, resetToDefault: true });
      await loadPlan();
      syncBudgetModalMonthFields(ym);
    } catch (err) {
      alert(err.message || 'รีเซ็ตงบไม่สำเร็จ');
    }
  }

  // ==========================================================================
  // EXPORT EXCEL (.XLSX)
  // ==========================================================================
  function exportDepartmentPayExcel() {
    if (typeof XLSX === 'undefined') {
      alert('ไลบรารี Excel กำลังโหลด กรุณาลองใหม่อีกครั้ง');
      return;
    }

    const summaryRows = state.months.map((m, idx) => ({
      'ลำดับ': idx + 1,
      'เดือน (YYYY-MM)': m.yearMonth,
      'เดือนภาษาไทย': formatThaiMonth(m.yearMonth),
      'งบประมาณประจำเดือน (บาท)': m.budget,
      'วางแผนใช้ไป (บาท)': m.spent,
      'งบคงเหลือ (บาท)': m.remaining,
      'สัดส่วนการใช้ (%)': m.usagePercent,
      'จำนวนรายการ': m.itemCount,
      'รายการด่วน': m.urgentCount,
      'หมายเหตุงบประมาณ': m.budgetNote || ''
    }));

    const itemRows = state.items.map((it, idx) => ({
      'ลำดับ': idx + 1,
      'เดือนที่วางแผน': it.yearMonth,
      'ชื่อเดือน': formatThaiMonth(it.yearMonth),
      'ความเร่งด่วน': it.isUrgent ? 'ด่วน' : 'ปกติ',
      'รายละเอียด (Description)': it.description,
      'ยี่ห้อ (Brand)': it.brand || '',
      'ราคา (บาท)': it.price || 0,
      'ระยะเวลาจัดส่ง (Lead Time)': it.leadTime || '',
      'ลิงก์ / URL ไฟล์': it.fileUrl || '',
      'หมายเหตุ': it.remark || ''
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 7 }, { wch: 15 }, { wch: 20 }, { wch: 22 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปงบ 12 เดือน');

    const wsItems = XLSX.utils.json_to_sheet(itemRows.length ? itemRows : [{ 'ข้อความ': 'ยังไม่มีรายการค่าใช้จ่าย' }]);
    wsItems['!cols'] = [
      { wch: 7 }, { wch: 14 }, { wch: 18 }, { wch: 12 },
      { wch: 36 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 36 }, { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'รายการค่าใช้จ่ายแผนก');

    const nowStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Department_Pay_12Months_${nowStr}.xlsx`);
  }

  // ==========================================================================
  // INITIALIZE
  // ==========================================================================
  function init() {
    updateAuthPill();
    window.addEventListener('em-auth-changed', updateAuthPill);

    $('btn-auth-status')?.addEventListener('click', () => {
      if (!isLoggedIn() && typeof window.promptLogin === 'function') {
        window.promptLogin();
      }
    });

    // View tabs
    document.querySelectorAll('.dp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        document.querySelectorAll('.dp-tab-btn').forEach(b => {
          const active = b.dataset.tab === state.activeTab;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', String(active));
        });
        $('tab-board').style.display = state.activeTab === 'board' ? 'block' : 'none';
        $('tab-table').style.display = state.activeTab === 'table' ? 'block' : 'none';
      });
    });

    // Header actions
    $('btn-add-item')?.addEventListener('click', () => openItemModal(null, state.currentMonth || state.startMonth));
    $('btn-refresh')?.addEventListener('click', loadPlan);
    $('btn-export-excel')?.addEventListener('click', exportDepartmentPayExcel);
    $('btn-open-budget-settings')?.addEventListener('click', () => openBudgetModal());

    // 12-Month window navigation
    $('btn-win-prev')?.addEventListener('click', () => {
      state.startMonth = shiftYearMonth(state.startMonth || state.currentMonth, -1);
      loadPlan();
    });
    $('btn-win-next')?.addEventListener('click', () => {
      state.startMonth = shiftYearMonth(state.startMonth || state.currentMonth, 1);
      loadPlan();
    });
    $('btn-win-current')?.addEventListener('click', () => {
      state.startMonth = state.currentMonth;
      loadPlan();
    });
    $('input-start-month')?.addEventListener('change', (e) => {
      if (e.target.value) {
        state.startMonth = e.target.value;
        loadPlan();
      }
    });

    // Filter pills
    document.querySelectorAll('#dp-filter-pills .dp-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.filterMode = pill.dataset.filter || 'ALL';
        document.querySelectorAll('#dp-filter-pills .dp-pill').forEach(p => {
          p.classList.toggle('active', p === pill);
        });
        renderBoard();
        renderTable();
      });
    });

    // Search box
    const searchInput = $('dp-search-input');
    const searchClear = $('dp-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value.trim();
        if (searchClear) searchClear.style.display = state.searchQuery ? 'inline-block' : 'none';
        renderBoard();
        renderTable();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        searchClear.style.display = 'none';
        renderBoard();
        renderTable();
      });
    }

    // Detail Modal (i button) events
    $('btn-close-detail-modal')?.addEventListener('click', () => $('modal-dp-detail').close());
    $('btn-detail-close')?.addEventListener('click', () => $('modal-dp-detail').close());
    $('btn-detail-edit')?.addEventListener('click', () => {
      const id = state.detailItemId;
      $('modal-dp-detail').close();
      if (id) openItemModal(id);
    });

    // Item Modal events
    $('btn-close-item-modal')?.addEventListener('click', () => $('modal-dp-item').close());
    $('btn-cancel-item-modal')?.addEventListener('click', () => $('modal-dp-item').close());
    $('form-dp-item')?.addEventListener('submit', submitItemForm);
    $('item-year-month')?.addEventListener('change', updateItemBudgetPreview);
    $('item-price')?.addEventListener('input', updateItemBudgetPreview);

    // Budget Modal events
    $('btn-close-budget-modal')?.addEventListener('click', () => $('modal-dp-budget').close());
    $('btn-cancel-budget-modal')?.addEventListener('click', () => $('modal-dp-budget').close());
    $('budget-target-month')?.addEventListener('change', (e) => syncBudgetModalMonthFields(e.target.value));
    $('btn-reset-month-budget')?.addEventListener('click', handleResetMonthBudget);
    $('form-dp-budget')?.addEventListener('submit', submitBudgetForm);

    loadPlan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
