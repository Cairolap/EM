(() => {
  'use strict';

  // App State
  const state = {
    units: [],
    filteredUnits: [],
    stats: { total: 0, normal: 0, dueSoon: 0, overdue: 0, reported: 0 },
    currentDept: 'ALL',
    currentStatus: 'all',
    searchQuery: '',
    currentView: 'table',
    selectedUnit: null,
    isLoading: false,
    qrInstanceDetail: null,
    qrInstanceSticker: null
  };

  // Toast Notification Helper
  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#b3261e' : '#176487';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }

  // RPC Caller
  async function rpcAirCooling(method, ...args) {
    const res = await fetch('/api/v1/pm-aircooling/rpc', {
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

  // DOM Elements
  const el = {
    loadingState: document.getElementById('ac-loading-state'),
    emptyState: document.getElementById('ac-empty-state'),
    tableViewContainer: document.getElementById('ac-table-view-container'),
    cardViewContainer: document.getElementById('ac-card-view-container'),
    tableTbody: document.getElementById('ac-table-tbody'),
    cardsGrid: document.getElementById('ac-cards-grid'),
    footerSummary: document.getElementById('ac-footer-summary'),
    searchInput: document.getElementById('ac-search-input'),
    searchClear: document.getElementById('ac-search-clear'),
    statusFilter: document.getElementById('select-status-filter'),
    deptPillsContainer: document.getElementById('ac-dept-pills-container'),
    btnViewTable: document.getElementById('btn-view-table'),
    btnViewCard: document.getElementById('btn-view-card'),
    btnSyncSheets: document.getElementById('btn-sync-sheets'),
    btnExportExcel: document.getElementById('btn-export-excel'),
    btnAddUnit: document.getElementById('btn-add-unit'),
    btnResetFilters: document.getElementById('btn-reset-filters'),

    // KPI Values
    statTotal: document.getElementById('stat-total-val'),
    statNormal: document.getElementById('stat-normal-val'),
    statDueSoon: document.getElementById('stat-duesoon-val'),
    statOverdue: document.getElementById('stat-overdue-val'),
    statReported: document.getElementById('stat-reported-val'),

    // Form Modal
    modalUnitForm: document.getElementById('modal-unit-form'),
    formUnit: document.getElementById('form-unit'),
    formTitle: document.getElementById('modal-form-title'),
    unitId: document.getElementById('unit-id'),
    formDept: document.getElementById('form-dept'),
    formIdTag: document.getElementById('form-id-tag'),
    formLine: document.getElementById('form-line'),
    formLocation: document.getElementById('form-location'),
    formBrand: document.getElementById('form-brand'),
    formPower: document.getElementById('form-power'),
    formSerial: document.getElementById('form-serial'),
    formLastClean: document.getElementById('form-last-clean'),
    formNextClean: document.getElementById('form-next-clean'),
    formDetails: document.getElementById('form-details'),
    formNote: document.getElementById('form-note'),
    formImageUrl: document.getElementById('form-image-url'),
    formDriveFileId: document.getElementById('form-drive-file-id'),
    formImageFile: document.getElementById('form-image-file'),
    formImageUrlInput: document.getElementById('form-image-url-input'),
    btnSelectFile: document.getElementById('btn-select-file'),
    btnClearImage: document.getElementById('btn-clear-image'),
    imgPreviewWrap: document.getElementById('image-preview-wrap'),
    imgPreviewImg: document.getElementById('image-preview-img'),
    imgPreviewPlaceholder: document.getElementById('image-preview-placeholder'),
    btnSaveUnit: document.getElementById('btn-save-unit'),

    // Detail Modal
    modalUnitDetail: document.getElementById('modal-unit-detail'),
    detailTagBadge: document.getElementById('detail-tag-badge'),
    detailTitle: document.getElementById('detail-title'),
    detailImg: document.getElementById('detail-img'),
    detailNoImg: document.getElementById('detail-no-img'),
    detailStatusBanner: document.getElementById('detail-status-banner'),
    detailBannerText: document.getElementById('detail-banner-text'),
    detailBannerDays: document.getElementById('detail-banner-days'),
    detailQrcodeContainer: document.getElementById('detail-qrcode-container'),
    btnPrintSticker: document.getElementById('btn-print-sticker'),
    detailId: document.getElementById('detail-id'),
    detailDept: document.getElementById('detail-dept'),
    detailLine: document.getElementById('detail-line'),
    detailLocation: document.getElementById('detail-location'),
    detailBrand: document.getElementById('detail-brand'),
    detailPower: document.getElementById('detail-power'),
    detailSerial: document.getElementById('detail-serial'),
    detailLastClean: document.getElementById('detail-last-clean'),
    detailNextClean: document.getElementById('detail-next-clean'),
    detailDetails: document.getElementById('detail-details'),
    detailNote: document.getElementById('detail-note'),
    detailIssueBox: document.getElementById('detail-issue-box'),
    detailIssueTime: document.getElementById('detail-issue-time'),
    detailIssueTitle: document.getElementById('detail-issue-title'),
    detailIssueDesc: document.getElementById('detail-issue-desc'),
    detailIssueReporter: document.getElementById('detail-issue-reporter'),
    btnResolveIssue: document.getElementById('btn-resolve-issue'),
    btnQuickCleanToday: document.getElementById('btn-quick-clean-today'),
    btnOpenReport: document.getElementById('btn-open-report'),
    btnEditCurrent: document.getElementById('btn-edit-current'),
    btnDeleteCurrent: document.getElementById('btn-delete-current'),

    // Report Modal
    modalReportIssue: document.getElementById('modal-report-issue'),
    formReport: document.getElementById('form-report'),
    reportUnitId: document.getElementById('report-unit-id'),
    reportIssueTitle: document.getElementById('report-issue-title'),
    reportIssueDetails: document.getElementById('report-issue-details'),
    reportReporter: document.getElementById('report-reporter'),
    reportPhone: document.getElementById('report-phone'),

    // QR Print Modal
    modalPrintSticker: document.getElementById('modal-print-sticker'),
    printableQrcode: document.getElementById('printable-qrcode'),
    stickerTag: document.getElementById('sticker-tag'),
    stickerDept: document.getElementById('sticker-dept'),
    stickerLine: document.getElementById('sticker-line'),
    stickerLoc: document.getElementById('sticker-loc'),
    stickerBrand: document.getElementById('sticker-brand'),
    btnTriggerPrint: document.getElementById('btn-trigger-print')
  };

  // Status mapping
  const STATUS_MAP = {
    normal: { text: 'ปกติ', badgeClass: 'normal', icon: '🟢' },
    due_soon: { text: 'ใกล้ถึงกำหนด', badgeClass: 'due_soon', icon: '⏳' },
    overdue: { text: 'เกินกำหนด', badgeClass: 'overdue', icon: '🔴' },
    reported: { text: 'แจ้งปัญหา', badgeClass: 'reported', icon: '⚠️' }
  };

  // Helper: Format Dates
  function formatDate(dStr) {
    if (!dStr) return '-';
    // If ISO date string YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
      return dStr.slice(0, 10);
    }
    return dStr;
  }

  // Load Data from Server
  async function loadData(silent = false) {
    if (!silent) {
      el.loadingState.style.display = 'flex';
      el.tableViewContainer.style.display = 'none';
      el.cardViewContainer.style.display = 'none';
      el.emptyState.style.display = 'none';
    }

    try {
      const result = await rpcAirCooling('listUnits', {
        dept: state.currentDept,
        status: state.currentStatus,
        search: state.searchQuery
      });

      state.units = result.units || [];
      state.stats = result.stats || { total: 0, normal: 0, dueSoon: 0, overdue: 0, reported: 0 };
      
      renderStats();
      applyClientFilter();
    } catch (err) {
      showToast('โหลดข้อมูลล้มเหลว: ' + err.message, true);
    } finally {
      el.loadingState.style.display = 'none';
    }
  }

  // Render Stats
  function renderStats() {
    el.statTotal.textContent = state.stats.total || 0;
    el.statNormal.textContent = state.stats.normal || 0;
    el.statDueSoon.textContent = state.stats.dueSoon || 0;
    el.statOverdue.textContent = state.stats.overdue || 0;
    el.statReported.textContent = state.stats.reported || 0;
  }

  // Apply Filter in Memory (Fast, Zero Lag)
  function applyClientFilter() {
    let list = state.units;

    if (state.currentDept && state.currentDept !== 'ALL') {
      list = list.filter(u => u.dept === state.currentDept);
    }

    if (state.currentStatus && state.currentStatus !== 'all') {
      list = list.filter(u => u.cleanStatus === state.currentStatus);
    }

    if (state.searchQuery && state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(u => 
        (u.idTag && u.idTag.toLowerCase().includes(q)) ||
        (u.line && u.line.toLowerCase().includes(q)) ||
        (u.location && u.location.toLowerCase().includes(q)) ||
        (u.brand && u.brand.toLowerCase().includes(q)) ||
        (u.serial && u.serial.toLowerCase().includes(q)) ||
        (u.details && u.details.toLowerCase().includes(q)) ||
        (u.note && u.note.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
    }

    state.filteredUnits = list;

    if (list.length === 0) {
      el.tableViewContainer.style.display = 'none';
      el.cardViewContainer.style.display = 'none';
      el.emptyState.style.display = 'flex';
    } else {
      el.emptyState.style.display = 'none';
      if (state.currentView === 'table') {
        el.tableViewContainer.style.display = 'block';
        el.cardViewContainer.style.display = 'none';
        renderTable(list);
      } else {
        el.tableViewContainer.style.display = 'none';
        el.cardViewContainer.style.display = 'block';
        renderCards(list);
      }
    }

    el.footerSummary.textContent = `แสดง ${list.length} จาก ${state.units.length} รายการ`;
  }

  // Render Table Rows
  function renderTable(list) {
    el.tableTbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    list.forEach(unit => {
      const tr = document.createElement('tr');
      if (unit.cleanStatus === 'overdue') tr.classList.add('row-overdue');
      if (unit.cleanStatus === 'reported') tr.classList.add('row-reported');

      const st = STATUS_MAP[unit.cleanStatus] || STATUS_MAP.normal;
      const deptClass = `badge-${unit.dept ? unit.dept.toLowerCase() : 'ot'}`;

      // Photo
      const photoHtml = unit.imageUrl 
        ? `<div class="unit-thumb-cell"><img src="${unit.imageUrl}" class="unit-thumb-img" alt="${unit.idTag}" loading="lazy"></div>`
        : `<div class="unit-thumb-cell" style="color:var(--ink-muted);font-size:1.1rem;">❄️</div>`;

      tr.innerHTML = `
        <td>${photoHtml}</td>
        <td><span class="unit-tag-pill">${unit.idTag || '-'}</span></td>
        <td><span class="badge ${deptClass}">${unit.dept || '-'}</span></td>
        <td>${unit.line || '-'}</td>
        <td class="font-bold">${unit.location || '-'}</td>
        <td>${unit.brand || '-'}${unit.power ? ` (${unit.power}W)` : ''}</td>
        <td class="text-right font-mono">${unit.power ? unit.power + ' W' : '-'}</td>
        <td class="font-mono" style="font-size:0.76rem;">${unit.serial || '-'}</td>
        <td class="font-mono">${formatDate(unit.lastCleanDate)}</td>
        <td class="font-mono font-bold">${formatDate(unit.nextCleanDate)}</td>
        <td>
          <span class="status-pill ${st.badgeClass}">
            <span>${st.icon}</span>
            <span>${st.text}</span>
          </span>
        </td>
        <td class="text-center">
          <div class="ac-action-group">
            <button type="button" class="btn-icon" data-action="view" data-id="${unit.id}" title="ดูรายละเอียด / QR">🔍</button>
            <button type="button" class="btn-icon" data-action="edit" data-id="${unit.id}" title="แก้ไขข้อมูล">✏️</button>
            <button type="button" class="btn-icon delete" data-action="delete" data-id="${unit.id}" title="ลบรายการ">🗑️</button>
          </div>
        </td>
      `;

      // Click row to view
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openUnitDetail(unit.id);
      });

      fragment.appendChild(tr);
    });

    el.tableTbody.appendChild(fragment);
  }

  // Render Card Grid
  function renderCards(list) {
    el.cardsGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    list.forEach(unit => {
      const card = document.createElement('div');
      card.className = 'ac-unit-card';
      if (unit.cleanStatus === 'overdue') card.style.borderColor = 'var(--danger)';
      if (unit.cleanStatus === 'reported') card.style.borderColor = 'var(--purple)';

      const st = STATUS_MAP[unit.cleanStatus] || STATUS_MAP.normal;
      const deptClass = `badge-${unit.dept ? unit.dept.toLowerCase() : 'ot'}`;

      const photoHtml = unit.imageUrl 
        ? `<div class="card-image-box"><img src="${unit.imageUrl}" alt="${unit.idTag}" loading="lazy"></div>`
        : `<div class="card-image-box" style="color:var(--ink-muted);font-size:2rem;">❄️</div>`;

      card.innerHTML = `
        <div class="card-top-row">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="unit-tag-pill">${unit.idTag || '-'}</span>
            <span class="badge ${deptClass}">${unit.dept || '-'}</span>
          </div>
          <span class="status-pill ${st.badgeClass}">
            <span>${st.icon}</span>
            <span>${st.text}</span>
          </span>
        </div>
        ${photoHtml}
        <div class="card-details-list">
          <div class="card-details-row">
            <span class="label">ตำแหน่ง:</span>
            <span class="val font-bold">${unit.location || '-'} (${unit.line || '-'})</span>
          </div>
          <div class="card-details-row">
            <span class="label">ยี่ห้อ / ไฟ:</span>
            <span class="val">${unit.brand || '-'} / ${unit.power ? unit.power + 'W' : '-'}</span>
          </div>
          <div class="card-details-row">
            <span class="label">กำหนดล้าง:</span>
            <span class="val font-mono font-bold">${formatDate(unit.nextCleanDate)}</span>
          </div>
        </div>
        <div class="ac-action-group" style="justify-content:flex-end;margin-top:4px;">
          <button type="button" class="btn btn-secondary btn-sm" data-action="view" data-id="${unit.id}">รายละเอียด</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${unit.id}">แก้ไข</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openUnitDetail(unit.id);
      });

      fragment.appendChild(card);
    });

    el.cardsGrid.appendChild(fragment);
  }

  // Open Unit Detail Modal
  async function openUnitDetail(id) {
    const unit = state.units.find(u => u.id === id);
    if (!unit) return;
    state.selectedUnit = unit;

    el.detailTagBadge.textContent = unit.idTag || '-';
    el.detailTitle.textContent = `${unit.idTag || 'เครื่อง'} - ${unit.location || unit.line || ''}`;
    el.detailId.textContent = unit.id;
    el.detailDept.textContent = unit.dept || '-';
    el.detailLine.textContent = unit.line || '-';
    el.detailLocation.textContent = unit.location || '-';
    el.detailBrand.textContent = unit.brand || '-';
    el.detailPower.textContent = unit.power ? unit.power + ' Watt' : '-';
    el.detailSerial.textContent = unit.serial || '-';
    el.detailLastClean.textContent = formatDate(unit.lastCleanDate);
    el.detailNextClean.textContent = formatDate(unit.nextCleanDate);
    el.detailDetails.textContent = unit.details || '-';
    el.detailNote.textContent = unit.note || '-';

    // Image
    if (unit.imageUrl) {
      el.detailImg.src = unit.imageUrl;
      el.detailImg.style.display = 'block';
      el.detailNoImg.style.display = 'none';
    } else {
      el.detailImg.style.display = 'none';
      el.detailNoImg.style.display = 'flex';
    }

    // Status Banner
    const st = STATUS_MAP[unit.cleanStatus] || STATUS_MAP.normal;
    el.detailStatusBanner.className = `status-banner ${st.badgeClass}`;
    el.detailBannerText.textContent = `${st.icon} ${st.text}`;
    if (unit.daysRemaining !== null) {
      if (unit.daysRemaining < 0) {
        el.detailBannerDays.textContent = `เลยกำหนดมาแล้ว ${Math.abs(unit.daysRemaining)} วัน`;
      } else if (unit.daysRemaining === 0) {
        el.detailBannerDays.textContent = `ถึงกำหนดล้างในวันนี้`;
      } else {
        el.detailBannerDays.textContent = `เหลืออีก ${unit.daysRemaining} วัน`;
      }
    } else {
      el.detailBannerDays.textContent = '';
    }

    // QR Code
    el.detailQrcodeContainer.innerHTML = '';
    const qrUrl = `${window.location.origin}/pm-aircooling/?id=${encodeURIComponent(unit.id)}`;
    if (typeof QRCode !== 'undefined') {
      new QRCode(el.detailQrcodeContainer, {
        text: qrUrl,
        width: 110,
        height: 110,
        colorDark: '#1e293b',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    // Issues
    if (unit.reportStatus && unit.reportStatus !== 'resolved' && unit.reportInfo) {
      el.detailIssueBox.style.display = 'block';
      el.detailIssueTime.textContent = unit.reportInfo.reportedAt || '';
      el.detailIssueTitle.textContent = unit.reportInfo.issue || 'แจ้งปัญหา';
      el.detailIssueDesc.textContent = unit.reportInfo.details || '';
      el.detailIssueReporter.textContent = `ผู้แจ้ง: ${unit.reportInfo.reporter || '-'} ${unit.reportInfo.phone ? `(${unit.reportInfo.phone})` : ''}`;
    } else {
      el.detailIssueBox.style.display = 'none';
    }

    el.modalUnitDetail.showModal();
  }

  // Open Add Modal
  function openAddModal() {
    state.selectedUnit = null;
    el.formTitle.textContent = 'เพิ่มเครื่อง Air Cooling ใหม่';
    el.formUnit.reset();
    el.unitId.value = '';
    el.formImageUrl.value = '';
    el.formDriveFileId.value = '';
    el.imgPreviewImg.style.display = 'none';
    el.imgPreviewPlaceholder.style.display = 'flex';
    el.btnClearImage.style.display = 'none';
    el.modalUnitForm.showModal();
  }

  // Open Edit Modal
  function openEditModal(unit) {
    state.selectedUnit = unit;
    el.formTitle.textContent = `แก้ไขเครื่อง ${unit.idTag || unit.id}`;
    el.unitId.value = unit.id;
    el.formDept.value = unit.dept || '';
    el.formIdTag.value = unit.idTag || '';
    el.formLine.value = unit.line || '';
    el.formLocation.value = unit.location || '';
    el.formBrand.value = unit.brand || '';
    el.formPower.value = unit.power || '';
    el.formSerial.value = unit.serial || '';
    el.formLastClean.value = unit.lastCleanDate ? unit.lastCleanDate.slice(0, 10) : '';
    el.formNextClean.value = unit.nextCleanDate ? unit.nextCleanDate.slice(0, 10) : '';
    el.formDetails.value = unit.details || '';
    el.formNote.value = unit.note || '';
    el.formImageUrl.value = unit.imageUrl || '';
    el.formDriveFileId.value = unit.driveFileId || '';
    el.formImageUrlInput.value = unit.imageUrl || '';

    if (unit.imageUrl) {
      el.imgPreviewImg.src = unit.imageUrl;
      el.imgPreviewImg.style.display = 'block';
      el.imgPreviewPlaceholder.style.display = 'none';
      el.btnClearImage.style.display = 'inline-flex';
    } else {
      el.imgPreviewImg.style.display = 'none';
      el.imgPreviewPlaceholder.style.display = 'flex';
      el.btnClearImage.style.display = 'none';
    }

    el.modalUnitForm.showModal();
  }

  // Save Unit (Form Submit)
  async function handleSaveUnit(e) {
    e.preventDefault();
    const btn = el.btnSaveUnit;
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'กำลังบันทึก...';

    const payload = {
      id: el.unitId.value,
      dept: el.formDept.value,
      idTag: el.formIdTag.value,
      line: el.formLine.value,
      location: el.formLocation.value,
      brand: el.formBrand.value,
      power: Number(el.formPower.value) || 0,
      serial: el.formSerial.value,
      lastCleanDate: el.formLastClean.value,
      nextCleanDate: el.formNextClean.value,
      details: el.formDetails.value,
      note: el.formNote.value,
      imageUrl: el.formImageUrl.value || el.formImageUrlInput.value,
      driveFileId: el.formDriveFileId.value
    };

    try {
      await rpcAirCooling('saveUnit', payload);
      showToast('บันทึกข้อมูลและอัปเดตลงทะเบียนกลาง (Google Sheets) เรียบร้อย');
      el.modalUnitForm.close();
      await loadData(true);
    } catch (err) {
      showToast('บันทึกไม่สำเร็จ: ' + err.message, true);
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'บันทึกข้อมูล';
    }
  }

  // Delete Unit
  async function handleDeleteUnit(id) {
    const unit = state.units.find(u => u.id === id);
    const tag = unit ? unit.idTag || unit.id : id;
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเครื่อง "${tag}"?`)) return;

    try {
      await rpcAirCooling('deleteUnit', id);
      showToast('ลบรายการและอัปเดตทะเบียนกลางเรียบร้อยแล้ว');
      if (el.modalUnitDetail.open) el.modalUnitDetail.close();
      await loadData(true);
    } catch (err) {
      showToast('ลบไม่สำเร็จ: ' + err.message, true);
    }
  }

  // Quick Clean Today
  async function handleQuickCleanToday() {
    if (!state.selectedUnit) return;
    
    // Current local date YYYY-MM-DD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    // Advance 1 year
    let nextYear = year + 1;
    let nextDay = day;
    if (month === '02' && day === '29') {
      const isLeap = (nextYear % 4 === 0 && nextYear % 100 !== 0) || (nextYear % 400 === 0);
      if (!isLeap) nextDay = '28';
    }
    const nextYearStr = `${nextYear}-${month}-${nextDay}`;

    const tag = state.selectedUnit.idTag || state.selectedUnit.id;
    if (!confirm(`ต้องการบันทึกการล้างเครื่อง "${tag}" ในวันนี้ (${today}) ใช่หรือไม่?\nกำหนดล้างรอบถัดไปจะเปลี่ยนเป็น: ${nextYearStr}\n(ระบบจะบันทึกอัปเดตลงทะเบียนกลาง Google Sheets ด้วย)`)) return;

    try {
      await rpcAirCooling('saveUnit', {
        ...state.selectedUnit,
        lastCleanDate: today,
        nextCleanDate: nextYearStr
      });
      showToast(`บันทึกล้างเครื่อง "${tag}" สำเร็จ รอบถัดไปคือ ${nextYearStr} (อัปเดตทะเบียนกลางแล้ว)`);
      el.modalUnitDetail.close();
      await loadData(true);
    } catch (err) {
      showToast('บันทึกล้มเหลว: ' + err.message, true);
    }
  }

  // Report Issue
  function openReportIssue() {
    if (!state.selectedUnit) return;
    el.reportUnitId.value = state.selectedUnit.id;
    el.formReport.reset();
    el.modalReportIssue.showModal();
  }

  async function handleSaveReport(e) {
    e.preventDefault();
    const id = el.reportUnitId.value;
    const payload = {
      id,
      issue: el.reportIssueTitle.value,
      details: el.reportIssueDetails.value,
      reporter: el.reportReporter.value,
      phone: el.reportPhone.value
    };

    try {
      await rpcAirCooling('reportIssue', payload);
      showToast('ส่งรายงานปัญหาเรียบร้อยแล้ว');
      el.modalReportIssue.close();
      el.modalUnitDetail.close();
      await loadData(true);
    } catch (err) {
      showToast('รายงานปัญหาไม่สำเร็จ: ' + err.message, true);
    }
  }

  // Resolve Issue
  async function handleResolveIssue() {
    if (!state.selectedUnit) return;
    if (!confirm('ยืนยันว่าปัญหาได้รับการแก้ไขและเครื่องพร้อมใช้งานปกติแล้ว?')) return;

    try {
      await rpcAirCooling('resolveIssue', state.selectedUnit.id);
      showToast('บันทึกแก้ไขปัญหาเรียบร้อย');
      el.modalUnitDetail.close();
      await loadData(true);
    } catch (err) {
      showToast('บันทึกไม่สำเร็จ: ' + err.message, true);
    }
  }

  // Print QR Sticker Modal
  function openPrintSticker(unit) {
    if (!unit) return;
    el.stickerTag.textContent = unit.idTag || '-';
    el.stickerDept.textContent = unit.dept || '-';
    el.stickerLine.textContent = unit.line || '-';
    el.stickerLoc.textContent = unit.location || '-';
    el.stickerBrand.textContent = `${unit.brand || '-'} ${unit.power ? `(${unit.power}W)` : ''}`;

    el.printableQrcode.innerHTML = '';
    const qrUrl = `${window.location.origin}/pm-aircooling/?id=${encodeURIComponent(unit.id)}`;
    if (typeof QRCode !== 'undefined') {
      new QRCode(el.printableQrcode, {
        text: qrUrl,
        width: 90,
        height: 90,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    el.modalPrintSticker.showModal();
  }

  // Sync with Google Sheets
  async function handleSyncSheets() {
    const btn = el.btnSyncSheets;
    btn.disabled = true;
    showToast('กำลังเชื่อมต่อและซิงค์ข้อมูลกับ Google Sheets...');

    try {
      const res = await rpcAirCooling('syncGoogleSheets');
      showToast(`ซิงค์ข้อมูลสำเร็จ อัปเดตทั้งหมด ${res.count} เครื่อง`);
      await loadData(true);
    } catch (err) {
      showToast('ซิงค์ล้มเหลว: ' + err.message, true);
    } finally {
      btn.disabled = false;
    }
  }

  // Export to Excel (SheetJS)
  function handleExportExcel() {
    if (typeof XLSX === 'undefined') {
      showToast('ไลบรารี Excel กำลังโหลด กรุณาลองใหม่อีกครั้ง');
      return;
    }

    const exportRows = state.filteredUnits.map((u, idx) => ({
      'ลำดับ': idx + 1,
      'ID Tag': u.idTag,
      'แผนก': u.dept,
      'สายการผลิต': u.line,
      'ตำแหน่งติดตั้ง': u.location,
      'ยี่ห้อ': u.brand,
      'กำลังไฟ (W)': u.power || 0,
      'Serial No.': u.serial,
      'วันที่ล้างล่าสุด': u.lastCleanDate,
      'กำหนดล้างรอบถัดไป': u.nextCleanDate,
      'สถานะการล้าง': STATUS_MAP[u.cleanStatus]?.text || 'ปกติ',
      'รายละเอียด': u.details,
      'หมายเหตุ': u.note,
      'ลิงก์รูปถ่าย': u.imageUrl,
      'รหัสอ้างอิง ID': u.id
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AirCoolingData');
    
    const nowStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Air_Cooling_PM_${nowStr}.xlsx`);
    showToast('ส่งออกไฟล์ Excel เรียบร้อยแล้ว');
  }

  // Image Upload Handling (Client File to Base64)
  function setupImageUpload() {
    el.btnSelectFile.onclick = () => el.formImageFile.click();
    el.imgPreviewWrap.onclick = () => el.formImageFile.click();

    el.formImageFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('กรุณาเลือกไฟล์ภาพ JPEG, PNG หรือ WebP เท่านั้น', true);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('ขนาดไฟล์รูปต้องไม่เกิน 2MB', true);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        el.imgPreviewImg.src = base64;
        el.imgPreviewImg.style.display = 'block';
        el.imgPreviewPlaceholder.style.display = 'none';
        el.btnClearImage.style.display = 'inline-flex';
        el.formImageUrl.value = base64;
      };
      reader.readAsDataURL(file);
    };

    el.btnClearImage.onclick = () => {
      el.formImageFile.value = '';
      el.formImageUrl.value = '';
      el.formDriveFileId.value = '';
      el.formImageUrlInput.value = '';
      el.imgPreviewImg.src = '';
      el.imgPreviewImg.style.display = 'none';
      el.imgPreviewPlaceholder.style.display = 'flex';
      el.btnClearImage.style.display = 'none';
    };

    el.formImageUrlInput.oninput = (e) => {
      const url = e.target.value.trim();
      if (url) {
        el.imgPreviewImg.src = url;
        el.imgPreviewImg.style.display = 'block';
        el.imgPreviewPlaceholder.style.display = 'none';
        el.btnClearImage.style.display = 'inline-flex';
        el.formImageUrl.value = url;
      }
    };
  }

  // Event Listeners
  function initEventListeners() {
    // Dept Pills Filter
    el.deptPillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.dept-pill');
      if (!pill) return;
      el.deptPillsContainer.querySelectorAll('.dept-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentDept = pill.dataset.dept;
      applyClientFilter();
    });

    // KPI Card Click Filter
    document.querySelectorAll('.ac-stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const status = card.dataset.filterStatus;
        if (state.currentStatus === status) {
          state.currentStatus = 'all';
          card.classList.remove('active-filter');
        } else {
          document.querySelectorAll('.ac-stat-card').forEach(c => c.classList.remove('active-filter'));
          card.classList.add('active-filter');
          state.currentStatus = status;
        }
        el.statusFilter.value = state.currentStatus;
        applyClientFilter();
      });
    });

    // Status Filter Select
    el.statusFilter.addEventListener('change', (e) => {
      state.currentStatus = e.target.value;
      document.querySelectorAll('.ac-stat-card').forEach(c => {
        c.classList.toggle('active-filter', c.dataset.filterStatus === state.currentStatus);
      });
      applyClientFilter();
    });

    // Search Input
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      el.searchClear.style.display = state.searchQuery ? 'block' : 'none';
      applyClientFilter();
    });

    el.searchClear.addEventListener('click', () => {
      el.searchInput.value = '';
      state.searchQuery = '';
      el.searchClear.style.display = 'none';
      applyClientFilter();
    });

    // View Switcher
    el.btnViewTable.addEventListener('click', () => {
      state.currentView = 'table';
      el.btnViewTable.classList.add('active');
      el.btnViewCard.classList.remove('active');
      applyClientFilter();
    });

    el.btnViewCard.addEventListener('click', () => {
      state.currentView = 'card';
      el.btnViewCard.classList.add('active');
      el.btnViewTable.classList.remove('active');
      applyClientFilter();
    });

    // Action Buttons
    el.btnSyncSheets.addEventListener('click', handleSyncSheets);
    el.btnExportExcel.addEventListener('click', handleExportExcel);
    el.btnAddUnit.addEventListener('click', openAddModal);
    el.btnResetFilters.addEventListener('click', () => {
      state.currentDept = 'ALL';
      state.currentStatus = 'all';
      state.searchQuery = '';
      el.searchInput.value = '';
      el.searchClear.style.display = 'none';
      el.statusFilter.value = 'all';
      el.deptPillsContainer.querySelectorAll('.dept-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.dept === 'ALL');
      });
      document.querySelectorAll('.ac-stat-card').forEach(c => c.classList.remove('active-filter'));
      applyClientFilter();
    });

    // Table / Card Action Delegation
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;

      if (action === 'view') {
        openUnitDetail(id);
      } else if (action === 'edit') {
        const u = state.units.find(x => x.id === id);
        if (u) openEditModal(u);
      } else if (action === 'delete') {
        handleDeleteUnit(id);
      }
    });

    // Modals Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dialog = e.target.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    // Form Last Clean Date -> Auto +1 Year on Next Clean Date
    el.formLastClean.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const year = parseInt(match[1], 10) + 1;
          const month = match[2];
          let day = match[3];
          if (month === '02' && day === '29') {
            const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            if (!isLeap) day = '28';
          }
          el.formNextClean.value = `${year}-${month}-${day}`;
        }
      }
    });

    // Detail Action Buttons
    el.btnQuickCleanToday.addEventListener('click', handleQuickCleanToday);
    el.btnOpenReport.addEventListener('click', openReportIssue);
    el.btnEditCurrent.addEventListener('click', () => {
      if (state.selectedUnit) {
        el.modalUnitDetail.close();
        openEditModal(state.selectedUnit);
      }
    });
    el.btnDeleteCurrent.addEventListener('click', () => {
      if (state.selectedUnit) {
        handleDeleteUnit(state.selectedUnit.id);
      }
    });
    el.btnResolveIssue.addEventListener('click', handleResolveIssue);
    el.btnPrintSticker.addEventListener('click', () => {
      if (state.selectedUnit) {
        openPrintSticker(state.selectedUnit);
      }
    });

    el.btnTriggerPrint.addEventListener('click', () => {
      window.print();
    });

    // Form Submissions
    el.formUnit.addEventListener('submit', handleSaveUnit);
    el.formReport.addEventListener('submit', handleSaveReport);

    setupImageUpload();

    // Deep link support via ?id=...
    const urlParams = new URLSearchParams(window.location.search);
    const deepId = urlParams.get('id');
    if (deepId) {
      setTimeout(() => openUnitDetail(deepId), 500);
    }
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadData();
  });

})();
