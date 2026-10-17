(() => {
  'use strict';

  // Thai month names mapping
  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  function formatThaiMonth(yearMonthStr) {
    if (!yearMonthStr || !yearMonthStr.includes('-')) return '';
    const [y, m] = yearMonthStr.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${THAI_MONTHS[monthIndex]} ${y}`;
    }
    return yearMonthStr;
  }

  // Application State
  const state = {
    departments: [],
    lines: [],
    selectedDept: '',
    selectedLine: '',
    selectedYear: 2026,
    selectedRound: 1, // 1 to 5
    cycleData: null,
    searchQuery: '',
    currentTab: 'matrix', // 'form' or 'matrix'
    isSaving: false
  };

  // Toast Helper
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#b3261e' : '#14566f';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  // RPC Caller
  async function rpcPM(method, ...args) {
    const res = await fetch('/api/v1/pm/rpc', {
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

  function checkUrlTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'form' || tab === 'orders') return 'form';
    if (tab === 'matrix' || tab === 'overview') return 'matrix';
    return null;
  }

  // Initialize Page
  async function init() {
    setupEventHandlers();
    const targetTab = checkUrlTab();
    if (targetTab) {
      state.currentTab = targetTab;
    }
    try {
      await loadReferences();
      switchTab(state.currentTab);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  // Setup Event Listeners
  function setupEventHandlers() {
    // Tab toggles
    document.getElementById('tab-btn-form')?.addEventListener('click', () => switchTab('form'));
    document.getElementById('tab-btn-matrix')?.addEventListener('click', () => switchTab('matrix'));
    document.getElementById('btn-back-overview')?.addEventListener('click', () => {
      switchTab('matrix');
      const url = new URL(window.location);
      url.searchParams.set('tab', 'overview');
      window.history.pushState({}, '', url);
    });

    window.addEventListener('popstate', () => {
      const t = checkUrlTab();
      if (t) switchTab(t);
    });

    document.querySelectorAll('a[href*="/pm/?tab="], a[href*="/pm?tab="]').forEach(a => {
      a.addEventListener('click', (e) => {
        const u = new URL(a.href, window.location.origin);
        const t = u.searchParams.get('tab');
        if (t === 'form' || t === 'orders') {
          e.preventDefault();
          history.pushState(null, '', a.href);
          switchTab('form');
        } else if (t === 'matrix' || t === 'overview') {
          e.preventDefault();
          history.pushState(null, '', a.href);
          switchTab('matrix');
        }
      });
    });

    // Filter selectors
    document.getElementById('select-dept')?.addEventListener('change', (e) => {
      state.selectedDept = e.target.value;
      updateLineDropdown();
      if (state.currentTab === 'matrix') {
        loadMatrixData();
      }
    });

    document.getElementById('select-line')?.addEventListener('change', (e) => {
      state.selectedLine = e.target.value;
      loadCycleData();
    });

    document.getElementById('select-year')?.addEventListener('change', (e) => {
      state.selectedYear = Number(e.target.value) || 2026;
      if (state.currentTab === 'matrix') {
        loadMatrixData();
      } else {
        loadCycleData();
      }
    });

    document.getElementById('btn-refresh')?.addEventListener('click', () => {
      if (state.currentTab === 'matrix') loadMatrixData();
      else loadCycleData();
    });

    // Month change
    document.getElementById('input-target-month')?.addEventListener('input', (e) => {
      const label = document.getElementById('text-thai-month');
      if (label) label.textContent = formatThaiMonth(e.target.value);
    });

    // Search filter
    const searchInput = document.getElementById('input-machine-search');
    const clearSearchBtn = document.getElementById('btn-clear-search');
    searchInput?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      renderMachinesTable();
    });
    clearSearchBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      renderMachinesTable();
    });

    // Bulk Order Apply
    document.getElementById('btn-apply-bulk')?.addEventListener('click', applyBulkOrderNo);

    // Copy Summary
    document.getElementById('btn-copy-summary')?.addEventListener('click', copySummaryToClipboard);

    // Form Save & Cancel
    document.getElementById('btn-save-all')?.addEventListener('click', handleSaveAll);
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      loadCycleData();
      showToast('คืนค่าข้อมูลเดิมเรียบร้อย');
    });
  }

  function switchTab(tab) {
    state.currentTab = tab;
    const btnForm = document.getElementById('tab-btn-form');
    const btnMatrix = document.getElementById('tab-btn-matrix');
    const viewForm = document.getElementById('view-form-container');
    const viewMatrix = document.getElementById('view-matrix-container');
    const roundsBar = document.getElementById('pm-rounds-bar');
    const lineField = document.getElementById('filter-field-line');

    if (tab === 'form') {
      btnForm?.classList.add('active');
      btnMatrix?.classList.remove('active');
      btnForm?.setAttribute('aria-selected', 'true');
      btnMatrix?.setAttribute('aria-selected', 'false');
      if (viewForm) viewForm.style.display = 'block';
      if (viewMatrix) viewMatrix.style.display = 'none';
      if (roundsBar) roundsBar.style.display = 'flex';
      if (lineField) lineField.style.display = 'flex';
      loadCycleData();
    } else {
      btnForm?.classList.remove('active');
      btnMatrix?.classList.add('active');
      btnForm?.setAttribute('aria-selected', 'false');
      btnMatrix?.setAttribute('aria-selected', 'true');
      if (viewForm) viewForm.style.display = 'none';
      if (viewMatrix) viewMatrix.style.display = 'block';
      if (roundsBar) roundsBar.style.display = 'none';
      if (lineField) lineField.style.display = 'none';
      loadMatrixData();
    }
  }

  // Load Department and Line References
  async function loadReferences() {
    const refs = await rpcPM('getReferences');
    state.departments = refs.departments || [];
    state.lines = refs.lines || [];

    // Populate department select
    const deptSelect = document.getElementById('select-dept');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">ทุกแผนก</option>' + 
        state.departments.map(d => `<option value="${d.deptId}">${d.deptName} (${d.deptId})</option>`).join('');
    }

    // Default select first line or L00 if available
    const urlParams = new URLSearchParams(window.location.search);
    const lineParam = urlParams.get('line');
    const deptParam = urlParams.get('dept');
    const yearParam = urlParams.get('year');
    const roundParam = urlParams.get('round');

    if (yearParam) {
      state.selectedYear = Number(yearParam) || state.selectedYear;
      const yearSelect = document.getElementById('select-year');
      if (yearSelect) yearSelect.value = String(state.selectedYear);
    }
    if (roundParam) {
      state.selectedRound = Math.min(5, Math.max(1, Number(roundParam) || 1));
    }

    if (deptParam && state.departments.some(d => d.deptId === deptParam)) {
      state.selectedDept = deptParam;
    } else {
      state.selectedDept = ''; // ทุกแผนก (Default)
    }
    if (deptSelect) deptSelect.value = state.selectedDept;

    if (lineParam && state.lines.some(l => l.lineId === lineParam)) {
      updateLineDropdown(lineParam);
    } else {
      updateLineDropdown(state.lines.find(l => l.lineId === 'L00')?.lineId || state.lines[0]?.lineId || '');
    }
  }

  function updateLineDropdown(preferredLineId = null) {
    const lineSelect = document.getElementById('select-line');
    if (!lineSelect) return;

    const filteredLines = state.selectedDept 
      ? state.lines.filter(l => l.deptId === state.selectedDept)
      : state.lines;

    if (filteredLines.length === 0) {
      lineSelect.innerHTML = '<option value="">ไม่พบสายการผลิต</option>';
      state.selectedLine = '';
      return;
    }

    if (!state.selectedDept) {
      let html = '';
      state.departments.forEach(d => {
        const dLines = state.lines.filter(l => l.deptId === d.deptId);
        if (dLines.length > 0) {
          html += `<optgroup label="${d.deptName} (${d.deptId})">`;
          dLines.forEach(l => {
            html += `<option value="${l.lineId}">${l.lineName} (${l.lineId})</option>`;
          });
          html += `</optgroup>`;
        }
      });
      lineSelect.innerHTML = html;
    } else {
      lineSelect.innerHTML = filteredLines.map(l => 
        `<option value="${l.lineId}">${l.lineName} (${l.lineId})</option>`
      ).join('');
    }

    if (preferredLineId && filteredLines.some(l => l.lineId === preferredLineId)) {
      state.selectedLine = preferredLineId;
    } else if (state.selectedLine && filteredLines.some(l => l.lineId === state.selectedLine)) {
      // Keep current line
    } else {
      state.selectedLine = filteredLines[0].lineId;
    }
    lineSelect.value = state.selectedLine;

    if (state.currentTab === 'form') {
      loadCycleData();
    }
  }

  // Load PM Cycle data for current line, year, round
  async function loadCycleData() {
    if (!state.selectedLine) return;
    const tbody = document.getElementById('machines-tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-muted">กำลังโหลดข้อมูลรอบ PM...</td></tr>';
    }

    try {
      const data = await rpcPM('getCycleData', {
        lineId: state.selectedLine,
        year: state.selectedYear,
        roundNo: state.selectedRound
      });

      state.cycleData = data;
      renderRoundsNavigation();
      renderFormHeader();
      renderMachinesTable();
    } catch (err) {
      showToast(err.message, true);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-danger">${err.message}</td></tr>`;
      }
    }
  }

  // Render 5 PM Rounds Pills
  function renderRoundsNavigation() {
    const container = document.getElementById('rounds-pills-container');
    if (!container || !state.cycleData) return;

    const yearRounds = state.cycleData.yearRounds || [];
    container.innerHTML = [1, 2, 3, 4, 5].map(roundNum => {
      const roundInfo = yearRounds.find(r => r.roundNo === roundNum);
      const isActive = roundNum === state.selectedRound;
      const hasData = roundInfo && roundInfo.filledCount > 0;
      const monthText = roundInfo?.targetMonth ? ` (${formatThaiMonth(roundInfo.targetMonth).split(' ')[0]})` : '';

      return `
        <button type="button" class="round-pill ${isActive ? 'active' : ''} ${hasData ? 'has-data' : ''}" data-round="${roundNum}">
          <span class="pill-dot"></span>
          <span>PM รอบที่ ${roundNum}${monthText}</span>
          ${roundInfo && roundInfo.filledCount > 0 ? `<span class="pill-meta">${roundInfo.filledCount}/${roundInfo.totalMachines}</span>` : ''}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.round-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roundNum = Number(e.currentTarget.getAttribute('data-round'));
        if (roundNum !== state.selectedRound) {
          state.selectedRound = roundNum;
          loadCycleData();
        }
      });
    });
  }

  // Render Form Header & Meta Info
  function renderFormHeader() {
    const data = state.cycleData;
    if (!data) return;

    const lineBadge = document.getElementById('badge-line-name');
    if (lineBadge) lineBadge.textContent = `ไลน์: ${data.lineName || data.lineId}`;

    const formHeading = document.getElementById('form-heading-title');
    if (formHeading) formHeading.textContent = `จัดการ Order No. รายเครื่อง (ไลน์: ${data.lineId})`;

    const roundBadge = document.getElementById('badge-round-info');
    if (roundBadge) roundBadge.textContent = `รอบที่ ${data.roundNo}/5 (ปี ${data.year})`;

    // Target month
    const inputMonth = document.getElementById('input-target-month');
    const thaiMonthDisplay = document.getElementById('text-thai-month');
    const defaultMonth = data.targetMonth || `${data.year}-${String(Math.min(12, data.roundNo * 2)).padStart(2, '0')}`;
    if (inputMonth) inputMonth.value = defaultMonth;
    if (thaiMonthDisplay) thaiMonthDisplay.textContent = formatThaiMonth(defaultMonth);

    // Plan date & notes
    const inputPlanDate = document.getElementById('input-plan-date');
    if (inputPlanDate) inputPlanDate.value = data.planDate || '';

    const inputNotes = document.getElementById('input-cycle-notes');
    if (inputNotes) inputNotes.value = data.notes || '';
  }

  function formatMoney(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
    return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Render Machines Table
  function renderMachinesTable() {
    const tbody = document.getElementById('machines-tbody');
    if (!tbody || !state.cycleData) return;

    const machines = state.cycleData.machines || [];
    const filtered = machines.filter(m => {
      if (!state.searchQuery) return true;
      return (
        m.machineCode.toLowerCase().includes(state.searchQuery) ||
        m.machineName.toLowerCase().includes(state.searchQuery) ||
        m.orderNo.toLowerCase().includes(state.searchQuery)
      );
    });

    const countLabel = document.getElementById('text-machine-count');
    if (countLabel) countLabel.textContent = `แสดง ${filtered.length} จากทั้งหมด ${machines.length} เครื่อง`;

    // Update progress chip and summary row
    updateProgressCounter();
    updateSummaryRow();

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-muted">ไม่พบเครื่องจักรที่ตรงกับคำค้นหา</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((m, idx) => {
      const isFilled = m.orderNo && m.orderNo.trim().length > 0;
      const budget = Number(m.budgetAmount) || 0;
      const used = Number(m.usedAmount) || 0;
      const isOver = budget > 0 && used > budget;

      let statusBadge = '';
      if (isFilled) {
        if (isOver) {
          statusBadge = '<span class="status-badge badge-over" title="ค่าใช้จ่ายเกินงบประมาณ">⚠️ เกินงบ</span>';
        } else if (used > 0) {
          statusBadge = '<span class="status-badge badge-active" title="มี Order และมี คชจ. ในระบบ">✓ มีค่าใช้จ่าย</span>';
        } else {
          statusBadge = '<span class="status-badge badge-ready" title="ระบุ Order No. แล้ว">✓ ระบุ Order</span>';
        }
      } else {
        if (used > 0) {
          statusBadge = '<span class="status-badge badge-warn" title="มีค่าใช้จ่ายในระบบ แต่ยังไม่ได้ระบุ Order">⚠️ รอกรอก Order</span>';
        } else {
          statusBadge = '<span class="status-badge badge-pending" title="ยังไม่ระบุ Order No.">○ รอดำเนินการ</span>';
        }
      }

      // Link to expenses search if there is expense or order
      const orderNoTrimmed = (m.orderNo || '').trim();
      const expenseSearchTerm = orderNoTrimmed || (m.machineCode || '').trim();
      const isClickable = used > 0 || Boolean(orderNoTrimmed);

      let expenseDisplay = `<span class="expense-val-zero text-muted">฿0.00</span>`;
      if (isClickable && expenseSearchTerm) {
        const linkClass = used > 0
          ? (isOver ? 'text-danger' : 'text-success')
          : 'text-muted';
        const linkTitle = orderNoTrimmed
          ? `คลิกเพื่อดูรายการค่าใช้จ่ายของ Order No. ${orderNoTrimmed}`
          : `คลิกเพื่อค้นหารายการค่าใช้จ่ายของเครื่อง ${m.machineCode}`;

        expenseDisplay = `<a href="/pm-expenses/?tab=table&search=${encodeURIComponent(expenseSearchTerm)}" target="_blank" class="expense-val-link ${linkClass}" title="${escapeHtml(linkTitle)}">฿${formatMoney(used)}</a>`;
      }

      return `
        <tr data-machine-id="${m.machineId}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-code">
            <strong>${escapeHtml(m.machineCode)}</strong>
          </td>
          <td class="col-name">${escapeHtml(m.machineName)}</td>
          <td class="col-order">
            <input 
              type="text" 
              class="input-order-no ${isFilled ? 'filled' : ''}" 
              placeholder="เช่น 13110000" 
              value="${escapeHtml(m.orderNo || '')}" 
              data-machine-id="${m.machineId}"
              autocomplete="off"
            />
          </td>
          <td class="col-budget">
            <div class="budget-input-wrapper">
              <span class="currency-prefix">฿</span>
              <input 
                type="number" 
                step="any" 
                min="0"
                class="input-machine-budget" 
                placeholder="0.00" 
                value="${budget > 0 ? budget : ''}" 
                data-machine-id="${m.machineId}"
                autocomplete="off"
              />
            </div>
          </td>
          <td class="col-used">
            ${expenseDisplay}
          </td>
          <td class="col-status">
            ${statusBadge}
          </td>
        </tr>
      `;
    }).join('');

    // Attach listeners on inputs
    tbody.querySelectorAll('.input-order-no').forEach(input => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const machineId = e.target.getAttribute('data-machine-id');
        const machine = machines.find(item => item.machineId === machineId);
        if (machine) {
          machine.orderNo = val;
          machine.isFilled = Boolean(val);
        }
        if (val) e.target.classList.add('filled');
        else e.target.classList.remove('filled');
        updateProgressCounter();
        refreshRowStatus(e.target.closest('tr'), machine);
      });
    });

    tbody.querySelectorAll('.input-machine-budget').forEach(input => {
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        const machineId = e.target.getAttribute('data-machine-id');
        const machine = machines.find(item => item.machineId === machineId);
        if (machine) {
          machine.budgetAmount = val;
        }
        updateSummaryRow();
        refreshRowStatus(e.target.closest('tr'), machine);
      });
    });
  }

  function refreshRowStatus(row, m) {
    if (!row || !m) return;
    const isFilled = m.orderNo && m.orderNo.trim().length > 0;
    const budget = Number(m.budgetAmount) || 0;
    const used = Number(m.usedAmount) || 0;
    const isOver = budget > 0 && used > budget;

    const statusCol = row.querySelector('.col-status');
    if (statusCol) {
      if (isFilled) {
        if (isOver) {
          statusCol.innerHTML = '<span class="status-badge badge-over" title="ค่าใช้จ่ายเกินงบประมาณ">⚠️ เกินงบ</span>';
        } else if (used > 0) {
          statusCol.innerHTML = '<span class="status-badge badge-active" title="มี Order และมี คชจ. ในระบบ">✓ มีค่าใช้จ่าย</span>';
        } else {
          statusCol.innerHTML = '<span class="status-badge badge-ready" title="ระบุ Order No. แล้ว">✓ ระบุ Order</span>';
        }
      } else {
        if (used > 0) {
          statusCol.innerHTML = '<span class="status-badge badge-warn" title="มีค่าใช้จ่ายในระบบ แต่ยังไม่ได้ระบุ Order">⚠️ รอกรอก Order</span>';
        } else {
          statusCol.innerHTML = '<span class="status-badge badge-pending" title="ยังไม่ระบุ Order No.">○ รอดำเนินการ</span>';
        }
      }
    }
  }

  function updateSummaryRow() {
    if (!state.cycleData) return;
    const machines = state.cycleData.machines || [];
    const totalBudget = machines.reduce((sum, m) => sum + (Number(m.budgetAmount) || 0), 0);
    const totalUsed = machines.reduce((sum, m) => sum + (Number(m.usedAmount) || 0), 0);

    const budgetEl = document.getElementById('summary-total-budget');
    const usedEl = document.getElementById('summary-total-used');
    const diffEl = document.getElementById('summary-budget-diff');

    if (budgetEl) budgetEl.textContent = '฿' + formatMoney(totalBudget);
    if (usedEl) usedEl.textContent = '฿' + formatMoney(totalUsed);

    if (diffEl) {
      if (totalBudget > 0) {
        const diff = totalBudget - totalUsed;
        if (diff >= 0) {
          diffEl.className = 'summary-diff-badge within-budget';
          diffEl.textContent = `คงเหลือ ฿${formatMoney(diff)}`;
        } else {
          diffEl.className = 'summary-diff-badge over-budget';
          diffEl.textContent = `เกินงบ ฿${formatMoney(Math.abs(diff))}`;
        }
      } else {
        diffEl.className = 'summary-diff-badge neutral';
        diffEl.textContent = totalUsed > 0 ? `ใช้ไป ฿${formatMoney(totalUsed)}` : '-';
      }
    }
  }

  function updateProgressCounter() {
    if (!state.cycleData) return;
    const machines = state.cycleData.machines || [];
    const filledCount = machines.filter(m => m.orderNo && m.orderNo.trim().length > 0).length;
    const total = machines.length;

    const chip = document.getElementById('chip-progress-status');
    const chipText = document.getElementById('chip-progress-text');
    if (chipText) {
      chipText.textContent = `กรอกแล้ว ${filledCount}/${total} เครื่อง`;
    }
    if (chip) {
      if (total > 0 && filledCount === total) {
        chip.classList.add('complete');
      } else {
        chip.classList.remove('complete');
      }
    }
  }

  // Apply Bulk Order No
  function applyBulkOrderNo() {
    const bulkInput = document.getElementById('input-bulk-order');
    const val = bulkInput?.value.trim();
    if (!val) {
      showToast('กรุณาระบุเลข Order No. ที่ต้องการใส่', true);
      return;
    }

    if (!state.cycleData || !state.cycleData.machines.length) return;

    state.cycleData.machines.forEach(m => {
      m.orderNo = val;
      m.isFilled = true;
    });

    renderMachinesTable();
    showToast(`อัปเดต Order No. "${val}" ให้ทุกเครื่องเรียบร้อย`);
  }

  // Copy Summary to Clipboard
  function copySummaryToClipboard() {
    if (!state.cycleData || !state.cycleData.machines.length) return;
    const { lineId, year, roundNo, targetMonth, machines } = state.cycleData;

    let text = `[รายการ Order No. และงบประมาณสำหรับ PM]\n`;
    text += `ไลน์: ${lineId} | ปี: ${year} | รอบที่: ${roundNo}/5 | ประจำเดือน: ${formatThaiMonth(targetMonth)}\n`;
    text += `------------------------------------------------------------------------------------\n`;
    text += `รหัสเครื่องจักร\tชื่อเต็ม\tOrder No.\tงบประมาณ\tยอดที่ใช้ (ค่าใช้จ่าย PM)\n`;

    machines.forEach(m => {
      text += `${m.machineCode}\t${m.machineName}\t${m.orderNo || '-'}\t${m.budgetAmount || 0}\t${m.usedAmount || 0}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('คัดลอกรายการไปยังคลิปบอร์ดแล้ว');
    }).catch(() => {
      showToast('ไม่สามารถคัดลอกข้อความได้ กรุณาลองใหม่', true);
    });
  }

  // Handle Save All
  async function handleSaveAll() {
    if (state.isSaving || !state.cycleData) return;
    state.isSaving = true;

    const saveBtn = document.getElementById('btn-save-all');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.querySelector('span').textContent = 'กำลังบันทึก...';
    }

    try {
      const inputMonth = document.getElementById('input-target-month');
      const inputPlanDate = document.getElementById('input-plan-date');
      const inputNotes = document.getElementById('input-cycle-notes');

      const payload = {
        lineId: state.selectedLine,
        departmentId: state.selectedDept || state.cycleData.departmentId,
        year: state.selectedYear,
        roundNo: state.selectedRound,
        targetMonth: inputMonth?.value || '',
        planDate: inputPlanDate?.value || '',
        notes: inputNotes?.value || '',
        orders: state.cycleData.machines.map(m => ({
          machineId: m.machineId,
          orderNo: m.orderNo,
          budgetAmount: m.budgetAmount || 0,
          prNo: m.prNo,
          notes: m.notes
        }))
      };

      const result = await rpcPM('saveOrders', payload);
      showToast(`บันทึก Order No. และงบประมาณสำเร็จ (${result.savedCount} เครื่อง)`);
      await loadCycleData();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      state.isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.querySelector('span').textContent = 'บันทึกทั้งหมด';
      }
    }
  }

  // Load and Render 5-Round Matrix Overview
  async function loadMatrixData() {
    const tbody = document.getElementById('matrix-tbody');
    const yearText = document.getElementById('matrix-year-text');
    if (yearText) yearText.textContent = String(state.selectedYear);

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-muted">กำลังโหลดภาพรวมทั้งปี...</td></tr>';
    }

    try {
      const data = await rpcPM('listOverview', {
        year: state.selectedYear,
        deptId: state.selectedDept
      });

      const list = data.overview || [];
      if (list.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-muted">ไม่พบข้อมูลสายการผลิต</td></tr>';
        return;
      }

      if (tbody) {
        tbody.innerHTML = list.map(item => {
          return `
            <tr>
              <td class="col-line"><strong>${escapeHtml(item.lineName)}</strong> <span class="text-muted">(${escapeHtml(item.lineId)})</span></td>
              <td class="col-dept">${escapeHtml(item.deptName)}</td>
              <td class="col-machines-count text-center">${item.totalMachines}</td>
              ${item.rounds.map(r => {
                const isComplete = r.isComplete;
                const isPartial = !isComplete && r.filledCount > 0;
                const monthDisplay = r.targetMonth ? formatThaiMonth(r.targetMonth).split(' ')[0] : '-';
                return `
                  <td class="matrix-round-cell">
                    <button 
                      type="button" 
                      class="matrix-badge ${isComplete ? 'complete' : isPartial ? 'partial' : ''}" 
                      data-line="${item.lineId}" 
                      data-dept="${item.deptId}"
                      data-round="${r.roundNo}"
                      title="กดเพื่อเปิดจัดการ Order No."
                    >
                      <span class="matrix-badge-month">${monthDisplay}</span>
                      <span class="matrix-badge-count">${r.filledCount}/${r.totalMachines} เครื่อง</span>
                    </button>
                  </td>
                `;
              }).join('')}
            </tr>
          `;
        }).join('');

        // Attach click handlers on matrix badges
        tbody.querySelectorAll('.matrix-badge').forEach(badge => {
          badge.addEventListener('click', (e) => {
            const lineId = e.currentTarget.getAttribute('data-line');
            const deptId = e.currentTarget.getAttribute('data-dept');
            const roundNo = Number(e.currentTarget.getAttribute('data-round'));

            if (state.selectedDept && state.selectedDept !== deptId) {
              state.selectedDept = deptId;
              const deptSelect = document.getElementById('select-dept');
              if (deptSelect) deptSelect.value = deptId;
            }

            updateLineDropdown(lineId);
            state.selectedRound = roundNo;

            switchTab('form');
          });
        });
      }
    } catch (err) {
      showToast(err.message, true);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-danger">${err.message}</td></tr>`;
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', init);
})();
