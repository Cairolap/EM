(() => {
  'use strict';

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const state = {
    activeTab: 'dashboard', // 'table' or 'dashboard'
    
    // References
    departments: [],
    lines: [],
    machineCatalog: [], // cached list of machines if available
    
    // Table View State
    table: {
      page: 1,
      pageSize: 50,
      search: '',
      deptId: '',
      lineId: '',
      startDate: '',
      endDate: '',
      totalCount: 0,
      totalAmount: 0,
      items: [],
      selectedIds: new Set()
    },

    // Dashboard View State
    dashboard: {
      period: 'year',
      dept: '',
      startDate: '',
      endDate: '',
      sort: 'actual-desc',
      statusFilter: '',
      searchFilter: '',
      data: null
    },

    // Import State
    importQueue: []
  };

  // Currency & Number Formatters
  const fmtMoney = (val) => {
    const n = Number(val) || 0;
    return '฿ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtNumber = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const fmtDate = (isoStr) => {
    if (!isoStr) return '-';
    // Expecting YYYY-MM-DD
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Two-year cutoff helper
  function getTwoYearCutoff() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().slice(0, 10);
  }

  // Toast Notification
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#dc2626' : '#0f172a';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3800);
  }

  // RPC Caller
  async function rpcExpenses(method, ...args) {
    const res = await fetch('/api/v1/pm-expenses/rpc', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    const result = await res.json();
    if (!result.ok) {
      throw new Error(result.error?.message || 'การดำเนินการไม่สำเร็จ');
    }
    return result.data;
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    setupViewSwitcher();
    setupTableControls();
    setupDashboardControls();
    setupImportModal();
    setupBudgetModal();
    setupExpenseFormModal();

    initDefaultDates();
    await loadReferences();
    await refreshCurrentView();
  });

  function initDefaultDates() {
    const now = new Date();
    const curYear = now.getFullYear();

    // Default dashboard range: full current year
    state.dashboard.startDate = `${curYear}-01-01`;
    state.dashboard.endDate = `${curYear}-12-31`;

    const dashStart = document.getElementById('dash-date-start');
    const dashEnd = document.getElementById('dash-date-end');
    if (dashStart) dashStart.value = state.dashboard.startDate;
    if (dashEnd) dashEnd.value = state.dashboard.endDate;
  }

  async function loadReferences() {
    try {
      const data = await rpcExpenses('getReferences');
      state.departments = data.departments || [];
      state.lines = data.lines || [];

      populateFilterDropdowns();
    } catch (err) {
      console.warn('Could not load references:', err);
    }
  }

  function populateFilterDropdowns() {
    // 1. Table collapsible filters
    const deptSelect = document.getElementById('filter-dept-select');
    const lineSelect = document.getElementById('filter-line-select');
    
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">ทั้งหมด</option>' + 
        state.departments.map(d => `<option value="${escapeHtml(d.deptId)}">${escapeHtml(d.deptName || d.deptId)}</option>`).join('');
    }

    if (lineSelect) {
      lineSelect.innerHTML = '<option value="">ทั้งหมด</option>' + 
        state.lines.map(l => `<option value="${escapeHtml(l.lineId)}">${escapeHtml(l.lineName || l.lineId)}</option>`).join('');
    }

    // 2. Add/Edit form select
    const formDept = document.getElementById('form-exp-dept');
    const formLine = document.getElementById('form-exp-line');
    if (formDept) {
      formDept.innerHTML = '<option value="">เลือกแผนก</option>' +
        state.departments.map(d => `<option value="${escapeHtml(d.deptId)}">${escapeHtml(d.deptName || d.deptId)}</option>`).join('');
    }
    if (formLine) {
      formLine.innerHTML = '<option value="">เลือกสายการผลิต</option>' +
        state.lines.map(l => `<option value="${escapeHtml(l.lineId)}">${escapeHtml(l.lineName || l.lineId)}</option>`).join('');
    }
  }

  // =========================================================================
  // VIEW SWITCHER (Table vs Dashboard)
  // =========================================================================
  function setupViewSwitcher() {
    const tabTable = document.getElementById('tab-btn-table');
    const tabDashboard = document.getElementById('tab-btn-dashboard');
    const viewTable = document.getElementById('view-table-section');
    const viewDashboard = document.getElementById('view-dashboard-section');
    const titleText = document.getElementById('title-text');
    const subtitleText = document.getElementById('page-main-subtitle');

    tabTable?.addEventListener('click', () => {
      state.activeTab = 'table';
      tabTable.classList.add('active');
      tabDashboard.classList.remove('active');
      tabTable.setAttribute('aria-selected', 'true');
      tabDashboard.setAttribute('aria-selected', 'false');
      viewTable.style.display = 'block';
      viewDashboard.style.display = 'none';
      if (titleText) titleText.textContent = 'ค่าใช้จ่าย PM';
      if (subtitleText) subtitleText.textContent = 'บันทึกและจัดการค่าใช้จ่ายงานบำรุงรักษา (PM) เชื่อมโยงเครื่องจักร';
      refreshTable();
    });

    tabDashboard?.addEventListener('click', () => {
      state.activeTab = 'dashboard';
      tabDashboard.classList.add('active');
      tabTable.classList.remove('active');
      tabDashboard.setAttribute('aria-selected', 'true');
      tabTable.setAttribute('aria-selected', 'false');
      viewDashboard.style.display = 'block';
      viewTable.style.display = 'none';
      if (titleText) titleText.textContent = 'Dashboard ค่าใช้จ่าย & งบประมาณ';
      if (subtitleText) subtitleText.textContent = 'วิเคราะห์เปรียบเทียบงบประมาณ vs ค่าใช้จ่ายจริง และแนวโน้มเบิกจ่าย';
      refreshDashboard();
    });
  }

  async function refreshCurrentView() {
    if (state.activeTab === 'table') {
      await refreshTable();
    } else {
      await refreshDashboard();
    }
  }

  // =========================================================================
  // VIEW 1: EXPENSE TABLE LOGIC
  // =========================================================================
  function setupTableControls() {
    const inputSearch = document.getElementById('input-expense-search');
    const btnClearSearch = document.getElementById('btn-clear-table-search');
    const selectPageSize = document.getElementById('select-page-size');
    const btnPrev = document.getElementById('btn-page-prev');
    const btnNext = document.getElementById('btn-page-next');
    const btnRefresh = document.getElementById('btn-table-refresh');
    const btnToggleFilter = document.getElementById('btn-toggle-filter-panel');
    const filterPanel = document.getElementById('collapsible-filter-panel');
    const btnApplyFilter = document.getElementById('btn-apply-filters');
    const btnResetFilter = document.getElementById('btn-reset-filters');
    const btnExport = document.getElementById('btn-export-excel');
    const checkSelectAll = document.getElementById('check-select-all');

    // Debounced Search
    let searchTimeout;
    inputSearch?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (btnClearSearch) btnClearSearch.style.display = val ? 'block' : 'none';
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.table.search = val;
        state.table.page = 1;
        refreshTable();
      }, 300);
    });

    btnClearSearch?.addEventListener('click', () => {
      if (inputSearch) inputSearch.value = '';
      btnClearSearch.style.display = 'none';
      state.table.search = '';
      state.table.page = 1;
      refreshTable();
    });

    // Page size
    selectPageSize?.addEventListener('change', (e) => {
      state.table.pageSize = Number(e.target.value) || 50;
      state.table.page = 1;
      refreshTable();
    });

    // Prev / Next
    btnPrev?.addEventListener('click', () => {
      if (state.table.page > 1) {
        state.table.page--;
        refreshTable();
      }
    });

    btnNext?.addEventListener('click', () => {
      const maxPages = Math.ceil(state.table.totalCount / state.table.pageSize) || 1;
      if (state.table.page < maxPages) {
        state.table.page++;
        refreshTable();
      }
    });

    btnRefresh?.addEventListener('click', () => refreshTable());

    // Toggle filter panel
    btnToggleFilter?.addEventListener('click', () => {
      if (!filterPanel) return;
      const isVisible = filterPanel.style.display !== 'none';
      filterPanel.style.display = isVisible ? 'none' : 'block';
    });

    // Apply filters
    btnApplyFilter?.addEventListener('click', () => {
      state.table.deptId = document.getElementById('filter-dept-select')?.value || '';
      state.table.lineId = document.getElementById('filter-line-select')?.value || '';
      state.table.startDate = document.getElementById('filter-start-date')?.value || '';
      state.table.endDate = document.getElementById('filter-end-date')?.value || '';
      state.table.page = 1;
      refreshTable();
    });

    // Reset filters
    btnResetFilter?.addEventListener('click', () => {
      if (document.getElementById('filter-dept-select')) document.getElementById('filter-dept-select').value = '';
      if (document.getElementById('filter-line-select')) document.getElementById('filter-line-select').value = '';
      if (document.getElementById('filter-start-date')) document.getElementById('filter-start-date').value = '';
      if (document.getElementById('filter-end-date')) document.getElementById('filter-end-date').value = '';
      state.table.deptId = '';
      state.table.lineId = '';
      state.table.startDate = '';
      state.table.endDate = '';
      state.table.page = 1;
      refreshTable();
    });

    // Select all checkbox
    checkSelectAll?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const checkboxes = document.querySelectorAll('.check-row-item');
      state.table.selectedIds.clear();
      checkboxes.forEach(cb => {
        cb.checked = checked;
        const rowId = cb.dataset.id;
        if (checked && rowId) state.table.selectedIds.add(rowId);
      });
    });

    // Export CSV
    btnExport?.addEventListener('click', exportTableToCsv);
  }

  async function refreshTable() {
    const tbody = document.getElementById('expenses-tbody');
    const badgeTotalItems = document.getElementById('badge-total-items');
    const textTotalSum = document.getElementById('text-total-sum');
    const textPageRange = document.getElementById('text-page-range');
    const btnPrev = document.getElementById('btn-page-prev');
    const btnNext = document.getElementById('btn-page-next');

    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center py-10 text-muted">กำลังโหลดข้อมูลค่าใช้จ่าย...</td></tr>`;
    }

    try {
      const offset = (state.table.page - 1) * state.table.pageSize;
      const res = await rpcExpenses('listExpenses', {
        search: state.table.search,
        deptId: state.table.deptId,
        lineId: state.table.lineId,
        startDate: state.table.startDate,
        endDate: state.table.endDate,
        limit: state.table.pageSize,
        offset: offset
      });

      state.table.items = res.items || [];
      state.table.totalCount = res.totalCount || 0;
      state.table.totalAmount = res.totalAmount || 0;

      // Update counters
      if (badgeTotalItems) badgeTotalItems.textContent = `${state.table.totalCount.toLocaleString()} รายการ`;
      if (textTotalSum) textTotalSum.textContent = fmtMoney(state.table.totalAmount);

      // Pagination info
      const startIdx = state.table.totalCount === 0 ? 0 : offset + 1;
      const endIdx = Math.min(offset + state.table.items.length, state.table.totalCount);
      if (textPageRange) textPageRange.textContent = `${startIdx}-${endIdx} จาก ${state.table.totalCount.toLocaleString()}`;

      if (btnPrev) btnPrev.disabled = state.table.page <= 1;
      if (btnNext) btnNext.disabled = endIdx >= state.table.totalCount;

      renderTableRows();
    } catch (err) {
      console.error('Error fetching expenses:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center py-10 text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderTableRows() {
    const tbody = document.getElementById('expenses-tbody');
    if (!tbody) return;

    if (!state.table.items.length) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center py-10 text-muted">ไม่พบรายการค่าใช้จ่ายที่ตรงกับเงื่อนไข</td></tr>`;
      return;
    }

    tbody.innerHTML = state.table.items.map(item => {
      const isLinked = Boolean(item.machine_id);
      const machineCode = item.machine_code || '-';
      const isSelected = state.table.selectedIds.has(String(item.id));

      return `
        <tr class="${isSelected ? 'row-selected' : ''}" data-id="${escapeHtml(item.id)}">
          <td class="td-check">
            <input type="checkbox" class="check-row-item" data-id="${escapeHtml(item.id)}" ${isSelected ? 'checked' : ''}>
          </td>
          <td class="font-mono">${fmtDate(item.doc_date)}</td>
          <td><span class="badge-dept">${escapeHtml(item.department_id || '-')}</span></td>
          <td><span class="badge-dept">${escapeHtml(item.line_name || item.line_id || '-')}</span></td>
          <td>
            <span class="badge-machine ${isLinked ? '' : 'unlinked'}" title="${isLinked ? 'เชื่อมโยงกับเครื่องจักร: ' + escapeHtml(item.machine_name || '') : 'ยังไม่พบในทะเบียนเครื่องจักร'}">
              ${escapeHtml(machineCode)}
            </span>
          </td>
          <td><span class="badge-pmno">${escapeHtml(item.pm_order_no || '-')}</span></td>
          <td style="max-width: 280px; word-break: break-word;">${escapeHtml(item.description || '-')}</td>
          <td class="text-right font-mono">${fmtNumber(item.quantity)}</td>
          <td class="text-right font-mono">${fmtNumber(item.unit_price)}</td>
          <td class="text-right font-mono" style="font-weight: 600; color: #1d4ed8;">${fmtNumber(item.amount)}</td>
          <td style="max-width: 140px; font-size: 12px; color: var(--exp-text-muted);">${escapeHtml(item.notes || '-')}</td>
          <td class="text-center">
            <div class="row-actions">
              <button type="button" class="btn-action-icon btn-edit-item" data-id="${escapeHtml(item.id)}" title="แก้ไขรายการ">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="btn-action-icon btn-delete btn-delete-item" data-id="${escapeHtml(item.id)}" title="ลบรายการ">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row listeners
    tbody.querySelectorAll('.check-row-item').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const row = e.target.closest('tr');
        if (e.target.checked) {
          state.table.selectedIds.add(id);
          row?.classList.add('row-selected');
        } else {
          state.table.selectedIds.delete(id);
          row?.classList.remove('row-selected');
        }
      });
    });

    tbody.querySelectorAll('.btn-edit-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = state.table.items.find(i => String(i.id) === String(id));
        if (item) openExpenseFormModal(item);
      });
    });

    tbody.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการค่าใช้จ่ายนี้?')) return;
        try {
          await rpcExpenses('deleteExpense', id);
          showToast('ลบรายการค่าใช้จ่ายเรียบร้อย');
          refreshTable();
        } catch (err) {
          showToast('เกิดข้อผิดพลาด: ' + err.message, true);
        }
      });
    });
  }

  function exportTableToCsv() {
    if (!state.table.items.length) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', true);
      return;
    }

    const headers = ['วันที่', 'แผนก', 'ไลน์', 'เครื่องจักร', 'PM No.', 'รายการ', 'จำนวน', 'ราคาต่อหน่วย', 'รวมเงิน(฿)', 'หมายเหตุ'];
    const rows = state.table.items.map(i => [
      i.doc_date || '',
      i.department_id || '',
      i.line_name || i.line_id || '',
      i.machine_code || '',
      i.pm_order_no || '',
      `"${(i.description || '').replace(/"/g, '""')}"`,
      i.quantity || 0,
      i.unit_price || 0,
      i.amount || 0,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pm_expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ CSV เรียบร้อย');
  }

  // =========================================================================
  // VIEW 2: DASHBOARD & BUDGET LOGIC
  // =========================================================================
  function setupDashboardControls() {
    const dashStart = document.getElementById('dash-date-start');
    const dashEnd = document.getElementById('dash-date-end');
    const periodPills = document.querySelectorAll('.btn-period');
    const deptPills = document.querySelectorAll('.btn-dept-pill');
    const selectSort = document.getElementById('select-chart-sort');
    const btnRefresh = document.getElementById('btn-dash-refresh');
    const breakdownSearch = document.getElementById('input-breakdown-search');
    const statusPills = document.querySelectorAll('.btn-status-pill');

    dashStart?.addEventListener('change', (e) => {
      state.dashboard.startDate = e.target.value;
      refreshDashboard();
    });

    dashEnd?.addEventListener('change', (e) => {
      state.dashboard.endDate = e.target.value;
      refreshDashboard();
    });

    periodPills.forEach(btn => {
      btn.addEventListener('click', () => {
        periodPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const period = btn.dataset.period;
        state.dashboard.period = period;
        applyQuickPeriod(period);
        refreshDashboard();
      });
    });

    deptPills.forEach(btn => {
      btn.addEventListener('click', () => {
        deptPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dashboard.dept = btn.dataset.dept || '';
        refreshDashboard();
      });
    });

    selectSort?.addEventListener('change', (e) => {
      state.dashboard.sort = e.target.value;
      renderBarChart();
    });

    btnRefresh?.addEventListener('click', () => refreshDashboard());

    breakdownSearch?.addEventListener('input', (e) => {
      state.dashboard.searchFilter = e.target.value.toLowerCase().trim();
      renderBreakdownTable();
    });

    statusPills.forEach(btn => {
      btn.addEventListener('click', () => {
        statusPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dashboard.statusFilter = btn.dataset.status || '';
        renderBreakdownTable();
      });
    });
  }

  function applyQuickPeriod(period) {
    const now = new Date();
    const curYear = now.getFullYear();
    const pad = (n) => String(n).padStart(2, '0');

    if (period === 'year') {
      state.dashboard.startDate = `${curYear}-01-01`;
      state.dashboard.endDate = `${curYear}-12-31`;
    } else if (period === 'h1') {
      state.dashboard.startDate = `${curYear}-01-01`;
      state.dashboard.endDate = `${curYear}-06-30`;
    } else if (period === 'h2') {
      state.dashboard.startDate = `${curYear}-07-01`;
      state.dashboard.endDate = `${curYear}-12-31`;
    } else if (period === 'month') {
      const curMonth = now.getMonth() + 1;
      const lastDay = new Date(curYear, curMonth, 0).getDate();
      state.dashboard.startDate = `${curYear}-${pad(curMonth)}-01`;
      state.dashboard.endDate = `${curYear}-${pad(curMonth)}-${pad(lastDay)}`;
    }

    const startInput = document.getElementById('dash-date-start');
    const endInput = document.getElementById('dash-date-end');
    if (startInput) startInput.value = state.dashboard.startDate;
    if (endInput) endInput.value = state.dashboard.endDate;
  }

  async function refreshDashboard() {
    try {
      const data = await rpcExpenses('getDashboard', {
        startDate: state.dashboard.startDate,
        endDate: state.dashboard.endDate,
        dept: state.dashboard.dept
      });

      state.dashboard.data = data;
      renderKpiCards(data.totals);
      renderBarChart();
      renderBreakdownTable();
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      showToast('ไม่สามารถโหลดข้อมูล Dashboard: ' + err.message, true);
    }
  }

  function renderKpiCards(totals = {}) {
    const kpiActual = document.getElementById('kpi-total-actual');
    const kpiBudget = document.getElementById('kpi-total-budget');
    const kpiVariance = document.getElementById('kpi-total-variance');
    const kpiUsagePercent = document.getElementById('kpi-usage-percent');
    const kpiProgressFill = document.getElementById('kpi-progress-fill');
    const kpiPercentBadge = document.getElementById('kpi-percent-badge');
    const kpiVarianceStatus = document.getElementById('kpi-variance-status');
    const kpiLinesCount = document.getElementById('kpi-lines-count');

    const actual = totals.actual || 0;
    const budget = totals.budget || 0;
    const variance = totals.variance || 0;
    const pct = totals.usagePercent || 0;
    const linesCount = totals.linesCount || 0;

    if (kpiActual) kpiActual.textContent = fmtMoney(actual);
    if (kpiBudget) kpiBudget.textContent = fmtMoney(budget);
    if (kpiVariance) kpiVariance.textContent = fmtMoney(variance);
    if (kpiUsagePercent) kpiUsagePercent.textContent = `${pct.toFixed(2)}%`;
    if (kpiLinesCount) kpiLinesCount.textContent = `${linesCount} ไลน์การผลิต`;

    // Progress bar fill width
    if (kpiProgressFill) {
      const fillW = Math.min(100, Math.max(0, pct));
      kpiProgressFill.style.width = `${fillW}%`;
      kpiProgressFill.style.background = pct > 100 ? '#dc2626' : pct > 80 ? '#d97706' : '#7c3aed';
    }

    // Variance badge & text
    if (kpiVarianceStatus) {
      if (variance < 0) {
        kpiVarianceStatus.textContent = 'เกินงบประมาณ';
        kpiVarianceStatus.className = 'kpi-badge badge-red';
      } else {
        kpiVarianceStatus.textContent = 'คงเหลือในงบ';
        kpiVarianceStatus.className = 'kpi-badge badge-blue';
      }
    }

    // Percent status badge
    if (kpiPercentBadge) {
      if (pct > 100) {
        kpiPercentBadge.textContent = 'เกินงบ (Over Budget)';
        kpiPercentBadge.className = 'kpi-badge badge-red';
      } else if (pct >= 80) {
        kpiPercentBadge.textContent = 'เฝ้าระวัง (Warning)';
        kpiPercentBadge.className = 'kpi-badge badge-yellow';
      } else {
        kpiPercentBadge.textContent = 'ปกติ (Within Budget)';
        kpiPercentBadge.className = 'kpi-badge badge-green';
      }
    }
  }

  function renderBarChart() {
    const container = document.getElementById('chart-bars-container');
    if (!container) return;

    const lineMetrics = state.dashboard.data?.lineMetrics || [];
    if (!lineMetrics.length) {
      container.innerHTML = `<div class="text-center py-10 text-muted">ไม่มีข้อมูลสำหรับแสดงแผนภูมิ</div>`;
      return;
    }

    // Sort items
    let sorted = [...lineMetrics];
    const sortMode = state.dashboard.sort;
    if (sortMode === 'actual-desc') {
      sorted.sort((a, b) => (b.actual || 0) - (a.actual || 0));
    } else if (sortMode === 'name-asc') {
      sorted.sort((a, b) => (a.lineName || '').localeCompare(b.lineName || ''));
    } else if (sortMode === 'percent-desc') {
      sorted.sort((a, b) => (b.usagePercent || 0) - (a.usagePercent || 0));
    }

    // Find max value for scaling
    const maxVal = Math.max(...sorted.map(d => Math.max(d.budget || 0, d.actual || 0)), 1);

    // SVG Bar Chart Dimensions
    const rowHeight = 44;
    const labelWidth = 140;
    const paddingRight = 130;
    const chartWidth = Math.max(680, container.clientWidth || 700);
    const barAreaWidth = chartWidth - labelWidth - paddingRight;
    const chartHeight = sorted.length * rowHeight + 20;

    let svgRows = sorted.map((d, idx) => {
      const y = idx * rowHeight + 10;
      const budgetWidth = Math.max(3, Math.round(((d.budget || 0) / maxVal) * barAreaWidth));
      const actualWidth = Math.max(3, Math.round(((d.actual || 0) / maxVal) * barAreaWidth));
      const lineName = d.lineName || d.lineId;

      return `
        <g class="svg-bar-group" transform="translate(0, ${y})">
          <!-- Line Name Label -->
          <text x="${labelWidth - 12}" y="20" text-anchor="end" class="svg-label-text">
            ${escapeHtml(lineName)}
          </text>

          <!-- Budget Bar (Green) -->
          <rect x="${labelWidth}" y="4" width="${barAreaWidth}" height="12" class="svg-bar-bg" rx="3"></rect>
          <rect x="${labelWidth}" y="4" width="${budgetWidth}" height="12" class="svg-bar-budget" rx="3">
            <title>งบประมาณ: ${fmtMoney(d.budget)}</title>
          </rect>

          <!-- Actual Bar (Red) -->
          <rect x="${labelWidth}" y="19" width="${barAreaWidth}" height="12" class="svg-bar-bg" rx="3"></rect>
          <rect x="${labelWidth}" y="19" width="${actualWidth}" height="12" class="svg-bar-actual" rx="3">
            <title>ค่าใช้จ่ายจริง: ${fmtMoney(d.actual)} (${d.usagePercent.toFixed(1)}%)</title>
          </rect>

          <!-- Value / % Label at end of bars -->
          <text x="${labelWidth + Math.max(budgetWidth, actualWidth) + 8}" y="14" class="svg-value-text">
            งบ: ${fmtNumber(d.budget)}
          </text>
          <text x="${labelWidth + Math.max(budgetWidth, actualWidth) + 8}" y="27" class="svg-value-text" style="fill: #dc2626; font-weight: 600;">
            จริง: ${fmtNumber(d.actual)} (${d.usagePercent.toFixed(0)}%)
          </text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg width="100%" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" style="display: block; width: 100%; max-width: 100%; overflow: hidden;">
        ${svgRows}
      </svg>
    `;
  }

  function renderBreakdownTable() {
    const tbody = document.getElementById('breakdown-tbody');
    const badgeCount = document.getElementById('badge-breakdown-lines-count');
    if (!tbody) return;

    let items = state.dashboard.data?.lineMetrics || [];

    // Filter by status
    if (state.dashboard.statusFilter) {
      items = items.filter(i => i.status === state.dashboard.statusFilter);
    }

    // Filter by search
    if (state.dashboard.searchFilter) {
      items = items.filter(i => (i.lineName || '').toLowerCase().includes(state.dashboard.searchFilter));
    }

    if (badgeCount) badgeCount.textContent = `${items.length} ไลน์`;

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-muted">ไม่พบข้อมูลสายการผลิตที่ตรงกับเงื่อนไข</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map((item, idx) => {
      let statusBadge = '<span class="status-badge status-normal">ปกติ</span>';
      let progressColor = '#16a34a';

      if (item.status === 'OVER_BUDGET') {
        statusBadge = '<span class="status-badge status-over">เกินงบ</span>';
        progressColor = '#dc2626';
      } else if (item.status === 'WARNING') {
        statusBadge = '<span class="status-badge status-warning">เฝ้าระวัง</span>';
        progressColor = '#d97706';
      }

      const cappedPct = Math.min(100, Math.max(0, item.usagePercent || 0));

      return `
        <tr>
          <td class="text-muted font-mono">${idx + 1}</td>
          <td><strong>${escapeHtml(item.lineName || item.lineId)}</strong></td>
          <td class="text-right font-mono">${fmtNumber(item.budget)}</td>
          <td class="text-right font-mono" style="color: #dc2626; font-weight: 600;">${fmtNumber(item.actual)}</td>
          <td class="text-right font-mono" style="color: ${item.variance < 0 ? '#dc2626' : '#16a34a'};">
            ${fmtNumber(item.variance)}
          </td>
          <td class="text-center">
            <span class="mini-progress-track">
              <span class="mini-progress-bar" style="width: ${cappedPct}%; background: ${progressColor}; display: block;"></span>
            </span>
            <span class="font-mono" style="font-size: 12px; font-weight: 600;">${item.usagePercent.toFixed(1)}%</span>
          </td>
          <td class="text-center">${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // MODAL 1: IMPORT SAP FILE (ZLPMRP71EXP.XLS)
  // =========================================================================
  function setupImportModal() {
    const modal = document.getElementById('modal-import');
    const btnOpen = document.getElementById('btn-open-import-modal');
    const btnClose = document.getElementById('btn-close-import-modal');
    const btnCancel = document.getElementById('btn-cancel-import');
    const btnBrowse = document.getElementById('btn-browse-file');
    const fileInput = document.getElementById('input-file-import');
    const dropzone = document.getElementById('dropzone-area');
    const btnConfirm = document.getElementById('btn-confirm-import');

    btnOpen?.addEventListener('click', () => {
      resetImportModal();
      modal.style.display = 'flex';
    });

    const closeModal = () => { modal.style.display = 'none'; };
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);

    btnBrowse?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('click', (e) => {
      if (e.target !== btnBrowse) fileInput?.click();
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
      dropzone?.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone?.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone?.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files?.length) handleFileSelected(files[0]);
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files?.length) handleFileSelected(e.target.files[0]);
    });

    btnConfirm?.addEventListener('click', confirmImport);
  }

  function resetImportModal() {
    state.importQueue = [];
    const previewContainer = document.getElementById('import-preview-container');
    const btnConfirm = document.getElementById('btn-confirm-import');
    const fileInput = document.getElementById('input-file-import');

    if (previewContainer) previewContainer.style.display = 'none';
    if (btnConfirm) btnConfirm.disabled = true;
    if (fileInput) fileInput.value = '';
  }

  function handleFileSelected(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        let text = '';

        // SAP exports from Thai systems are usually Windows-874 (TIS-620)
        try {
          text = new TextDecoder('windows-874').decode(buffer);
        } catch {
          text = new TextDecoder('utf-8').decode(buffer);
        }

        // If Windows-874 yielded strange chars, fallback to UTF-8
        if (text.includes('')) {
          try {
            text = new TextDecoder('utf-8').decode(buffer);
          } catch (_) {}
        }

        parseSapFileContent(text);
      } catch (err) {
        showToast('ไม่สามารถอ่านไฟล์ได้: ' + err.message, true);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function parseSapFileContent(content) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      showToast('ไฟล์ว่างเปล่า ไม่มีข้อมูล', true);
      return;
    }

    // Determine delimiter (tab or comma)
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    // Find header row (usually contains Equipment or Order or Posting date)
    let headerIdx = -1;
    let headers = [];

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().toLowerCase());
      if (cols.some(c => c.includes('equipment') || c.includes('order') || c.includes('amount') || c.includes('doc'))) {
        headerIdx = i;
        headers = lines[i].split(delimiter).map(c => c.trim());
        break;
      }
    }

    if (headerIdx === -1) {
      showToast('ไม่พบแถวหัวตาราง (Header) ในไฟล์ SAP นี้', true);
      return;
    }

    // Map column indices
    const colIndex = {
      equipment: -1,
      order: -1,
      date: -1,
      docNo: -1,
      material: -1,
      desc: -1,
      qty: -1,
      amount: -1,
      funcLoc: -1
    };

    headers.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower === 'equipment') colIndex.equipment = idx;
      else if (lower === 'order') colIndex.order = idx;
      else if (lower.includes('posting date') || lower === 'date') colIndex.date = idx;
      else if (lower.includes('doc. no.') || lower.includes('doc no')) colIndex.docNo = idx;
      else if (lower.includes('material no') || lower.includes('material')) colIndex.material = idx;
      else if (lower.includes('description') || lower.includes('text')) colIndex.desc = idx;
      else if (lower === 'qty.' || lower === 'qty') colIndex.qty = idx;
      else if (lower === 'amount') colIndex.amount = idx;
      else if (lower.includes('functional loc')) colIndex.funcLoc = idx;
    });

    const cutoffDate = getTwoYearCutoff();
    const parsedRecords = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const rawCols = lines[i].split(delimiter).map(c => c.trim());
      if (rawCols.length < 3) continue;

      const rawEquip = colIndex.equipment >= 0 ? rawCols[colIndex.equipment] : '';
      const rawOrder = colIndex.order >= 0 ? rawCols[colIndex.order] : '';
      const rawDate = colIndex.date >= 0 ? rawCols[colIndex.date] : '';
      const rawAmount = colIndex.amount >= 0 ? rawCols[colIndex.amount] : '0';
      const rawDesc = colIndex.desc >= 0 ? rawCols[colIndex.desc] : '';
      const rawQty = colIndex.qty >= 0 ? rawCols[colIndex.qty] : '1';
      const rawDocNo = colIndex.docNo >= 0 ? rawCols[colIndex.docNo] : '';
      const rawMat = colIndex.material >= 0 ? rawCols[colIndex.material] : '';
      const rawFuncLoc = colIndex.funcLoc >= 0 ? rawCols[colIndex.funcLoc] : '';

      // Normalize date (e.g. 20241012 or 2024-10-12)
      let docDate = '';
      if (/^\d{8}$/.test(rawDate)) {
        docDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        docDate = rawDate;
      } else if (rawDate) {
        docDate = rawDate;
      }

      // Clean order number (e.g. 000013117556 -> 13117556)
      const orderNo = rawOrder.replace(/^0+/, '') || rawOrder;

      // Clean amount (remove commas)
      const cleanAmount = parseFloat(rawAmount.replace(/,/g, '')) || 0;
      const cleanQty = parseFloat(rawQty.replace(/,/g, '')) || 1;

      // Check 2-year retention cutoff
      const isOld = docDate && docDate < cutoffDate;

      // Parse department from Functional Loc if present (e.g. 1RS-MX1-L01 -> MX)
      let parsedDept = '';
      if (rawFuncLoc) {
        const parts = rawFuncLoc.split('-');
        if (parts.length >= 2) {
          const d = parts[1].replace(/[0-9]/g, '');
          if (['CC', 'PP', 'MX', 'PC', 'PR', 'OT'].includes(d)) {
            parsedDept = d;
          }
        }
      }

      parsedRecords.push({
        machineCode: rawEquip.toUpperCase(),
        pmOrderNo: orderNo,
        docDate: docDate,
        amount: cleanAmount,
        quantity: cleanQty,
        description: rawDesc,
        docNo: rawDocNo,
        materialNo: rawMat,
        functionalLoc: rawFuncLoc,
        departmentId: parsedDept,
        isOld: isOld
      });
    }

    if (!parsedRecords.length) {
      showToast('ไม่พบข้อมูลรายการในไฟล์นี้', true);
      return;
    }

    state.importQueue = parsedRecords;
    renderImportPreview(parsedRecords);
  }

  function renderImportPreview(records) {
    const previewContainer = document.getElementById('import-preview-container');
    const totalCountEl = document.getElementById('preview-total-count');
    const linkedCountEl = document.getElementById('preview-linked-count');
    const oldCountEl = document.getElementById('preview-old-count');
    const totalAmountEl = document.getElementById('preview-total-amount');
    const tbody = document.getElementById('preview-tbody');
    const btnConfirm = document.getElementById('btn-confirm-import');

    const totalCount = records.length;
    const oldCount = records.filter(r => r.isOld).length;
    const validRecords = records.filter(r => !r.isOld);
    const totalSum = validRecords.reduce((acc, r) => acc + (r.amount || 0), 0);

    if (totalCountEl) totalCountEl.textContent = totalCount.toLocaleString();
    if (oldCountEl) oldCountEl.textContent = `${oldCount.toLocaleString()} (ข้าม)`;
    if (linkedCountEl) linkedCountEl.textContent = validRecords.filter(r => r.machineCode).length.toLocaleString();
    if (totalAmountEl) totalAmountEl.textContent = fmtMoney(totalSum);

    if (tbody) {
      tbody.innerHTML = records.slice(0, 50).map((r, idx) => {
        return `
          <tr style="${r.isOld ? 'opacity: 0.5; background: #fffbeb;' : ''}">
            <td class="font-mono text-muted">${idx + 1}</td>
            <td class="font-mono">${fmtDate(r.docDate)}</td>
            <td><strong class="font-mono">${escapeHtml(r.machineCode || '-')}</strong></td>
            <td>
              ${r.isOld 
                ? '<span class="status-badge status-warning">เกิน 2 ปี (ข้าม)</span>'
                : '<span class="status-badge status-normal">พร้อมนำเข้า</span>'}
            </td>
            <td class="font-mono">${escapeHtml(r.pmOrderNo || '-')}</td>
            <td style="max-width: 220px; word-break: break-word;">${escapeHtml(r.description || '-')}</td>
            <td class="text-right font-mono">${fmtNumber(r.quantity)}</td>
            <td class="text-right font-mono" style="font-weight: 600;">${fmtNumber(r.amount)}</td>
          </tr>
        `;
      }).join('');
    }

    if (previewContainer) previewContainer.style.display = 'block';
    if (btnConfirm) btnConfirm.disabled = validRecords.length === 0;
  }

  async function confirmImport() {
    const btnConfirm = document.getElementById('btn-confirm-import');
    const validRecords = state.importQueue.filter(r => !r.isOld);

    if (!validRecords.length) {
      showToast('ไม่มีรายการที่พร้อมนำเข้า', true);
      return;
    }

    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'กำลังนำเข้าข้อมูล...';
    }

    try {
      // Send in batches of 200 to prevent payload limits
      const batchSize = 200;
      let totalImported = 0;

      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);
        const res = await rpcExpenses('importRecords', { records: batch });
        totalImported += res.importedCount || batch.length;
      }

      showToast(`นำเข้าสำเร็จ ${totalImported.toLocaleString()} รายการ (เชื่อมโยงเครื่องจักรอัตโนมัติ)`);
      document.getElementById('modal-import').style.display = 'none';
      await refreshCurrentView();
    } catch (err) {
      console.error('Import failed:', err);
      showToast('นำเข้าไม่สำเร็จ: ' + err.message, true);
    } finally {
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'ยืนยันการนำเข้าข้อมูล';
      }
    }
  }

  // =========================================================================
  // MODAL 2: SET BUDGET MODAL
  // =========================================================================
  function setupBudgetModal() {
    const modal = document.getElementById('modal-budget');
    const btnOpen = document.getElementById('btn-open-budget-modal');
    const btnClose = document.getElementById('btn-close-budget-modal');
    const btnCancel = document.getElementById('btn-cancel-budget');
    const selectYear = document.getElementById('input-budget-year');
    const btnSave = document.getElementById('btn-save-budgets');

    btnOpen?.addEventListener('click', async () => {
      modal.style.display = 'flex';
      await loadBudgetLines(selectYear?.value || '2026');
    });

    const closeModal = () => { modal.style.display = 'none'; };
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);

    selectYear?.addEventListener('change', async (e) => {
      await loadBudgetLines(e.target.value);
    });

    btnSave?.addEventListener('click', saveBudgets);
  }

  async function loadBudgetLines(year) {
    const tbody = document.getElementById('budget-lines-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-muted">กำลังโหลดข้อมูลงบประมาณ...</td></tr>`;

    try {
      // Get dashboard for this year to read current budgets
      const dash = await rpcExpenses('getDashboard', {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`
      });

      const budgetMap = new Map();
      (dash.lineMetrics || []).forEach(m => {
        budgetMap.set(m.lineId, m.budget || 0);
      });

      tbody.innerHTML = state.lines.map(line => {
        const curBudget = budgetMap.get(line.lineId) || 0;
        return `
          <tr data-line-id="${escapeHtml(line.lineId)}" data-dept-id="${escapeHtml(line.deptId)}">
            <td><strong>${escapeHtml(line.lineName || line.lineId)}</strong></td>
            <td><span class="badge-dept">${escapeHtml(line.deptName || line.deptId)}</span></td>
            <td>
              <input type="number" step="any" min="0" class="budget-input line-budget-val" value="${curBudget}" placeholder="0.00">
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading budget lines:', err);
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-danger">ไม่สามารถโหลดข้อมูลได้</td></tr>`;
    }
  }

  async function saveBudgets() {
    const btnSave = document.getElementById('btn-save-budgets');
    const selectYear = document.getElementById('input-budget-year');
    const year = Number(selectYear?.value) || new Date().getFullYear();
    const rows = document.querySelectorAll('#budget-lines-tbody tr');

    const budgets = [];
    rows.forEach(tr => {
      const lineId = tr.dataset.lineId;
      const deptId = tr.dataset.deptId;
      const input = tr.querySelector('.line-budget-val');
      const amount = parseFloat(input?.value) || 0;
      if (lineId) {
        budgets.push({ lineId, deptId, budgetAmount: amount });
      }
    });

    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'กำลังบันทึก...';
    }

    try {
      await rpcExpenses('saveBudgets', { year, budgets });
      showToast('บันทึกงบประมาณประจำปีเรียบร้อย');
      document.getElementById('modal-budget').style.display = 'none';
      if (state.activeTab === 'dashboard') {
        refreshDashboard();
      }
    } catch (err) {
      showToast('ไม่สามารถบันทึกงบประมาณ: ' + err.message, true);
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'บันทึกงบประมาณ';
      }
    }
  }

  // =========================================================================
  // MODAL 3: ADD / EDIT EXPENSE ITEM
  // =========================================================================
  function setupExpenseFormModal() {
    const modal = document.getElementById('modal-expense-form');
    const btnOpenAdd = document.getElementById('btn-open-add-modal');
    const btnClose = document.getElementById('btn-close-expense-modal');
    const btnCancel = document.getElementById('btn-cancel-expense');
    const form = document.getElementById('form-single-expense');

    // Auto-calculate total amount from qty and price
    const inputQty = document.getElementById('form-exp-qty');
    const inputPrice = document.getElementById('form-exp-price');
    const inputAmount = document.getElementById('form-exp-amount');

    const updateAmount = () => {
      const q = parseFloat(inputQty?.value) || 0;
      const p = parseFloat(inputPrice?.value) || 0;
      if (q > 0 && p > 0 && inputAmount) {
        inputAmount.value = (q * p).toFixed(2);
      }
    };

    inputQty?.addEventListener('input', updateAmount);
    inputPrice?.addEventListener('input', updateAmount);

    btnOpenAdd?.addEventListener('click', () => openExpenseFormModal(null));

    const closeModal = () => { modal.style.display = 'none'; };
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveExpenseItem();
    });
  }

  function openExpenseFormModal(item = null) {
    const modal = document.getElementById('modal-expense-form');
    const title = document.getElementById('expense-modal-title');
    const form = document.getElementById('form-single-expense');
    if (!modal || !form) return;

    form.reset();

    const idInput = document.getElementById('form-exp-id');
    const dateInput = document.getElementById('form-exp-date');
    const machineInput = document.getElementById('form-exp-machine');
    const pmnoInput = document.getElementById('form-exp-pmno');
    const deptInput = document.getElementById('form-exp-dept');
    const lineInput = document.getElementById('form-exp-line');
    const descInput = document.getElementById('form-exp-desc');
    const qtyInput = document.getElementById('form-exp-qty');
    const priceInput = document.getElementById('form-exp-price');
    const amountInput = document.getElementById('form-exp-amount');
    const notesInput = document.getElementById('form-exp-notes');

    if (item) {
      if (title) title.textContent = 'แก้ไขรายการค่าใช้จ่าย PM';
      if (idInput) idInput.value = item.id || '';
      if (dateInput) dateInput.value = item.doc_date || '';
      if (machineInput) machineInput.value = item.machine_code || '';
      if (pmnoInput) pmnoInput.value = item.pm_order_no || '';
      if (deptInput) deptInput.value = item.department_id || '';
      if (lineInput) lineInput.value = item.line_id || '';
      if (descInput) descInput.value = item.description || '';
      if (qtyInput) qtyInput.value = item.quantity || 1;
      if (priceInput) priceInput.value = item.unit_price || 0;
      if (amountInput) amountInput.value = item.amount || 0;
      if (notesInput) notesInput.value = item.notes || '';
    } else {
      if (title) title.textContent = 'เพิ่มรายการค่าใช้จ่าย PM';
      if (idInput) idInput.value = '';
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
      if (qtyInput) qtyInput.value = '1';
      if (priceInput) priceInput.value = '0';
      if (amountInput) amountInput.value = '0';
    }

    modal.style.display = 'flex';
  }

  async function saveExpenseItem() {
    const id = document.getElementById('form-exp-id')?.value;
    const docDate = document.getElementById('form-exp-date')?.value;
    const machineCode = document.getElementById('form-exp-machine')?.value?.trim();
    const pmOrderNo = document.getElementById('form-exp-pmno')?.value?.trim();
    const departmentId = document.getElementById('form-exp-dept')?.value;
    const lineId = document.getElementById('form-exp-line')?.value;
    const description = document.getElementById('form-exp-desc')?.value?.trim();
    const quantity = parseFloat(document.getElementById('form-exp-qty')?.value) || 1;
    const unitPrice = parseFloat(document.getElementById('form-exp-price')?.value) || 0;
    const amount = parseFloat(document.getElementById('form-exp-amount')?.value) || 0;
    const notes = document.getElementById('form-exp-notes')?.value?.trim();

    if (!docDate) {
      showToast('กรุณาระบุวันที่', true);
      return;
    }
    if (!machineCode) {
      showToast('กรุณาระบุรหัสเครื่องจักร', true);
      return;
    }
    if (!description) {
      showToast('กรุณาระบุรายการอะไหล่', true);
      return;
    }

    const payload = {
      id: id || undefined,
      docDate,
      machineCode,
      pmOrderNo,
      departmentId,
      lineId,
      description,
      quantity,
      unitPrice,
      amount,
      notes
    };

    try {
      await rpcExpenses('saveExpense', payload);
      showToast(id ? 'บันทึกการแก้ไขเรียบร้อย' : 'เพิ่มรายการค่าใช้จ่ายเรียบร้อย');
      document.getElementById('modal-expense-form').style.display = 'none';
      await refreshCurrentView();
    } catch (err) {
      showToast('ไม่สามารถบันทึกได้: ' + err.message, true);
    }
  }

  // Escape HTML Helper
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
