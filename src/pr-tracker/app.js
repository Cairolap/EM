// ==========================================================================
// PR & STORE TRACKER (CLEAN OPERATIONS INBOX) - CLIENT SCRIPT
// ==========================================================================

(() => {
  'use strict';

  // State
  const state = {
    folder: 'inbox', // 'inbox' | 'archive' | 'all'
    pipelineStep: '', // '' | 'PENDING_PR' | 'PENDING_PO' | 'PENDING_RECEIPT' | 'NEAR_DELIVERY' | 'OVERDUE'
    docType: '', // '' | 'PR' | 'STORE'
    deptId: '',
    lineId: '',
    search: '',
    startDate: '',
    endDate: '',
    limit: 100,
    offset: 0,
    items: [],
    references: { departments: [], lines: [], machines: [], pmOrders: [] },
    selectedIds: new Set(),
    isInlineEditing: false,
    editedRows: new Map(),
    isFormOpen: false,
    formMode: 'create', // 'create' | 'edit'
    activeEditId: null,
    pendingDeleteIds: [],
    searchTimer: null
  };

  // DOM Cache
  const el = {
    globalSearch: document.getElementById('global-search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnCompose: document.getElementById('btn-compose'),
    currentFolderPill: document.getElementById('current-folder-pill'),

    // Live Metrics
    metricTotalCount: document.getElementById('metric-total-count'),
    metricTotalQty: document.getElementById('metric-total-qty'),
    metricTotalPrice: document.getElementById('metric-total-price'),
    footerSumQty: document.getElementById('footer-sum-qty'),
    footerSumPrice: document.getElementById('footer-sum-price'),
    textPaginationInfo: document.getElementById('text-pagination-info'),

    // Sidebar Counters
    badgeCountInbox: document.getElementById('badge-count-inbox'),
    badgeCountArchive: document.getElementById('badge-count-archive'),
    badgeCountAll: document.getElementById('badge-count-all'),
    badgeCountNearDelivery: document.getElementById('badge-count-near-delivery'),
    badgeCountOverdue: document.getElementById('badge-count-overdue'),

    // Pipeline Tabs Counters
    badgeCountPendingPr: document.getElementById('badge-count-pending-pr'),
    badgeCountPendingPo: document.getElementById('badge-count-pending-po'),
    badgeCountPendingReceipt: document.getElementById('badge-count-pending-receipt'),

    // Filters
    filterDept: document.getElementById('filter-dept'),
    filterLine: document.getElementById('filter-line'),
    filterStartDate: document.getElementById('filter-start-date'),
    filterEndDate: document.getElementById('filter-end-date'),
    btnClearDateFilter: document.getElementById('btn-clear-date-filter'),
    selectPageLimit: document.getElementById('select-page-limit'),
    activeFilterChips: document.getElementById('active-filter-chips'),

    // Compose Dock Elements
    formPane: document.getElementById('pr-form-pane'),
    form: document.getElementById('pr-entry-form'),
    formTitle: document.getElementById('form-pane-title'),
    formModeBadge: document.getElementById('form-mode-badge'),
    btnMinimizeForm: document.getElementById('btn-minimize-form'),
    btnCloseForm: document.getElementById('btn-close-form'),
    btnCancelForm: document.getElementById('btn-cancel-form'),
    formItemId: document.getElementById('form-item-id'),
    formCreatedDate: document.getElementById('form-created-date'),
    radioTypePr: document.getElementById('radio-type-pr'),
    radioTypeStore: document.getElementById('radio-type-store'),
    formDept: document.getElementById('form-dept'),
    formLine: document.getElementById('form-line'),
    formMachine: document.getElementById('form-machine'),
    formOrderNo: document.getElementById('form-order-no'),
    formDocNo: document.getElementById('form-doc-no'),
    labelDocNo: document.getElementById('label-doc-no'),
    formDescription: document.getElementById('form-description'),
    formQty: document.getElementById('form-qty'),
    formUnit: document.getElementById('form-unit'),
    formPrice: document.getElementById('form-price'),
    formCalcTotal: document.getElementById('form-calc-total'),
    formPoNo: document.getElementById('form-po-no'),
    formDeliveryDate: document.getElementById('form-delivery-date'),
    formNotes: document.getElementById('form-notes'),
    pmOrdersDatalist: document.getElementById('pm-orders-datalist'),

    // Table
    checkSelectAll: document.getElementById('check-select-all'),
    bulkActionsGroup: document.getElementById('bulk-actions-group'),
    selectedCountBadge: document.getElementById('selected-count-badge'),
    btnBulkCopy: document.getElementById('btn-bulk-copy'),
    btnBulkInlineEdit: document.getElementById('btn-bulk-inline-edit'),
    btnOpenBulkAreaModal: document.getElementById('btn-open-bulk-area-modal'),
    btnBulkArchive: document.getElementById('btn-bulk-archive'),
    btnBulkArchiveText: document.getElementById('btn-bulk-archive-text'),
    btnOpenBulkDeleteModal: document.getElementById('btn-open-bulk-delete-modal'),
    btnDeselectAll: document.getElementById('btn-deselect-all'),
    tableEditBanner: document.getElementById('table-edit-banner'),
    btnCancelTableEdit: document.getElementById('btn-cancel-table-edit'),
    btnSaveTableEdit: document.getElementById('btn-save-table-edit'),
    tbody: document.getElementById('pr-table-tbody'),
    thArchivedDate: document.getElementById('th-archived-date'),

    // Modals
    modalBulkArea: document.getElementById('modal-bulk-area'),
    bulkAreaDept: document.getElementById('bulk-area-dept'),
    bulkAreaLine: document.getElementById('bulk-area-line'),
    bulkAreaMachine: document.getElementById('bulk-area-machine'),
    bulkAreaSummaryText: document.getElementById('bulk-area-summary-text'),
    btnCancelBulkArea: document.getElementById('btn-cancel-bulk-area'),
    btnConfirmBulkArea: document.getElementById('btn-confirm-bulk-area'),
    btnCloseBulkArea: document.getElementById('btn-close-bulk-area'),

    modalAdminDelete: document.getElementById('modal-admin-delete'),
    deleteTargetPreview: document.getElementById('delete-target-preview'),
    inputAdminPassword: document.getElementById('input-admin-password'),
    adminPasswordError: document.getElementById('admin-password-error'),
    btnCancelAdminDelete: document.getElementById('btn-cancel-admin-delete'),
    btnConfirmAdminDelete: document.getElementById('btn-confirm-admin-delete'),
    btnCloseAdminDelete: document.getElementById('btn-close-admin-delete'),

    modalItemDetail: document.getElementById('modal-item-detail'),
    detailModalTitle: document.getElementById('detail-modal-title'),
    detailTypeBadge: document.getElementById('detail-type-badge'),
    detailModalBody: document.getElementById('detail-modal-body'),
    btnCloseDetail: document.getElementById('btn-close-detail'),
    btnDetailCloseBtn: document.getElementById('btn-detail-close-btn'),
    btnDetailEditBtn: document.getElementById('btn-detail-edit-btn'),

    toast: document.getElementById('toast')
  };

  // Helper Formatters
  const fmtNumber = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmtCurrency = n => '฿ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escapeHtml = str => String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));

  let toastTimer = null;
  function showToast(message, type = 'info') {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.className = `pr-toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.className = 'pr-toast';
    }, 3200);
  }

  // RPC Client
  async function callRpc(method, ...args) {
    const res = await fetch('/api/v1/pr-tracker/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      const msg = json?.error?.message || 'การเชื่อมต่อระบบล้มเหลว';
      throw new Error(msg);
    }
    return json.data;
  }

  // 1. References Loading
  async function loadReferences() {
    try {
      const data = await callRpc('getReferences');
      state.references = data || { departments: [], lines: [], machines: [], pmOrders: [] };
      populateDropdowns();
    } catch (err) {
      console.error('Failed to load references', err);
      showToast('โหลดข้อมูลอ้างอิงไม่สำเร็จ: ' + err.message, 'error');
    }
  }

  function populateDropdowns() {
    const { departments = [], pmOrders = [] } = state.references;

    const deptOpts = '<option value="">ทุกแผนก (CC, PP, ...)</option>' +
      departments.map(d => `<option value="${escapeHtml(d.deptId)}">${escapeHtml(d.deptName)} (${escapeHtml(d.deptId)})</option>`).join('');
    el.filterDept.innerHTML = deptOpts;

    const formDeptOpts = '<option value="">เลือกแผนก...</option>' +
      departments.map(d => `<option value="${escapeHtml(d.deptId)}">${escapeHtml(d.deptName)} (${escapeHtml(d.deptId)})</option>`).join('');
    el.formDept.innerHTML = formDeptOpts;
    el.bulkAreaDept.innerHTML = '<option value="">เลือกแผนกใหม่...</option>' +
      departments.map(d => `<option value="${escapeHtml(d.deptId)}">${escapeHtml(d.deptName)} (${escapeHtml(d.deptId)})</option>`).join('');

    updateLineDropdown(el.filterLine, el.filterDept.value, 'ทุกสายการผลิต');
    updateLineDropdown(el.formLine, el.formDept.value, 'เลือกสายการผลิต...');
    updateLineDropdown(el.bulkAreaLine, el.bulkAreaDept.value, 'เลือกสายการผลิตใหม่...');

    if (el.pmOrdersDatalist) {
      el.pmOrdersDatalist.innerHTML = pmOrders.map(o =>
        `<option value="${escapeHtml(o.orderNo)}">Order PM: ${escapeHtml(o.orderNo)}</option>`
      ).join('');
    }
  }

  function updateLineDropdown(selectEl, selectedDeptId, defaultLabel) {
    const { lines = [] } = state.references;
    const filtered = selectedDeptId
      ? lines.filter(l => l.deptId === selectedDeptId)
      : lines;

    selectEl.innerHTML = `<option value="">${defaultLabel}</option>` +
      filtered.map(l => `<option value="${escapeHtml(l.lineId)}">${escapeHtml(l.lineName)}</option>`).join('');
  }

  function updateMachineDropdown(selectEl, selectedLineId, selectedDeptId, defaultLabel) {
    const { machines = [] } = state.references;
    let filtered = machines;
    if (selectedLineId) {
      filtered = filtered.filter(m => m.lineId === selectedLineId);
    } else if (selectedDeptId) {
      filtered = filtered.filter(m => m.deptId === selectedDeptId);
    }

    selectEl.innerHTML = `<option value="">${defaultLabel}</option>` +
      filtered.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.code)} - ${escapeHtml(m.name)}</option>`).join('');
  }

  // 2. Load PR Items
  async function loadItems() {
    try {
      el.tbody.innerHTML = `
        <tr>
          <td colspan="14" class="text-center py-12 text-muted">
            <span class="inline-spinner"></span> กำลังดึงข้อมูล...
          </td>
        </tr>
      `;

      const params = {
        folder: state.folder,
        pipelineStep: state.pipelineStep,
        docType: state.docType,
        deptId: state.deptId,
        lineId: state.lineId,
        search: state.search,
        startDate: state.startDate,
        endDate: state.endDate,
        limit: state.limit,
        offset: state.offset
      };

      const result = await callRpc('listItems', params);
      state.items = result.items || [];
      if (result.retentionCutoff) {
        state.retentionCutoff = result.retentionCutoff;
        if (el.formCreatedDate) el.formCreatedDate.min = result.retentionCutoff;
        if (el.filterStartDate) el.filterStartDate.min = result.retentionCutoff;
      }
      renderCounters(result.pipelineCounts, result.metrics);
      renderTable();
      updateActiveFilterChips();
    } catch (err) {
      console.error('Failed to load items', err);
      el.tbody.innerHTML = `
        <tr>
          <td colspan="14" class="text-center py-12 text-muted text-danger">
            เกิดข้อผิดพลาดในการโหลดข้อมูล: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
      showToast('โหลดข้อมูลล้มเหลว: ' + err.message, 'error');
    }
  }

  // 3. Render Counters
  function renderCounters(counts = {}, metrics = {}) {
    el.badgeCountInbox.textContent = fmtNumber(counts.inbox);
    el.badgeCountArchive.textContent = fmtNumber(counts.archive);
    el.badgeCountAll.textContent = fmtNumber(counts.all);

    // Pipeline Tabs
    el.badgeCountPendingPr.textContent = fmtNumber(counts.pendingPr);
    el.badgeCountPendingPo.textContent = fmtNumber(counts.pendingPo);
    el.badgeCountPendingReceipt.textContent = fmtNumber(counts.pendingReceipt);

    // Quick Chips
    el.badgeCountNearDelivery.textContent = fmtNumber(counts.nearDelivery);
    el.badgeCountOverdue.textContent = fmtNumber(counts.overdue);

    // Header Metrics
    el.metricTotalCount.textContent = `${fmtNumber(metrics.totalCount)} รายการ`;
    el.metricTotalQty.textContent = `${fmtNumber(metrics.totalQty)} ชิ้น`;
    el.metricTotalPrice.textContent = fmtCurrency(metrics.totalAmount);

    // Footer Metrics
    el.footerSumQty.textContent = `${fmtNumber(metrics.totalQty)} ชิ้น`;
    el.footerSumPrice.textContent = fmtCurrency(metrics.totalAmount);
    el.textPaginationInfo.textContent = `แสดง ${state.items.length} จาก ${fmtNumber(metrics.totalCount)} รายการ`;

    // Folder Pill
    if (state.folder === 'inbox') el.currentFolderPill.textContent = 'กล่องงาน (Inbox)';
    else if (state.folder === 'archive') el.currentFolderPill.textContent = 'รายการที่เก็บ (Archive)';
    else el.currentFolderPill.textContent = 'รายการทั้งหมด (All)';

    if (el.btnBulkArchiveText) {
      el.btnBulkArchiveText.textContent = state.folder === 'archive' ? 'กู้คืนกลับหน้าหลัก' : 'จัดเก็บพร้อมกัน';
    }
    if (el.thArchivedDate) {
      el.thArchivedDate.style.display = state.folder === 'archive' ? 'table-cell' : 'none';
    }
  }

  // 4. Render Table
  function renderTable() {
    if (!state.items || state.items.length === 0) {
      const isFiltered = Boolean(state.search || state.pipelineStep || state.docType || state.deptId || state.startDate);
      el.tbody.innerHTML = `
        <tr>
          <td colspan="14">
            <div class="empty-state-box">
              <div class="empty-icon">📦</div>
              <h3 class="empty-title">${isFiltered ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ไม่มีรายการในกล่องนี้'}</h3>
              <p class="empty-desc">${isFiltered ? 'ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูรายการทั้งหมด' : 'คุณสามารถกดปุ่ม "เปิดคำขอ / เพิ่มรายการ" เพื่อเริ่มบันทึกงานจัดซื้อหรือเบิกสโตร์'}</p>
              ${isFiltered ? '<button type="button" id="btn-empty-reset" class="btn btn-secondary btn-sm">ล้างตัวกรองทั้งหมด</button>' : '<button type="button" id="btn-empty-add" class="btn btn-primary btn-sm">+ เพิ่มรายการใหม่</button>'}
            </div>
          </td>
        </tr>
      `;
      const btnReset = document.getElementById('btn-empty-reset');
      if (btnReset) btnReset.onclick = resetAllFilters;
      const btnAdd = document.getElementById('btn-empty-add');
      if (btnAdd) btnAdd.onclick = openCreateForm;
      updateSelectionUI();
      return;
    }

    const html = state.items.map(item => {
      const isSelected = state.selectedIds.has(item.id);
      const isEditingThisRow = state.isInlineEditing && (state.selectedIds.size === 0 || isSelected);

      let stageClass = 'pending-pr';
      let stageText = 'รอออก PR';
      if (item.pipelineStatus === 'ARCHIVED') {
        stageClass = 'archived';
        stageText = 'จัดเก็บแล้ว';
      } else if (item.pipelineStatus === 'PENDING_PO') {
        stageClass = 'pending-po';
        stageText = 'รอออก PO';
      } else if (item.pipelineStatus === 'PENDING_RECEIPT') {
        stageClass = 'pending-receipt';
        stageText = 'รอรับของ';
      }

      const isStore = item.docType === 'STORE';
      const docBadgeClass = isStore ? 'type-store' : 'type-pr';
      const docLabel = isStore ? 'เบิก' : 'ซื้อ';
      const cleanDocNo = item.docNo ? item.docNo.replace(/\s*\/\s*/g, '/') : '';

      let deliveryHtml = '<span class="text-muted">-</span>';
      if (item.deliveryDate) {
        let tag = '';
        if (item.isOverdue) tag = '<span class="tag-overdue">เกินกำหนด</span>';
        else if (item.isNearDelivery) tag = '<span class="tag-near">เร็วๆ นี้</span>';
        deliveryHtml = `
          <div class="delivery-cell">
            <span class="delivery-date">${escapeHtml(item.deliveryDate)}</span>
            ${tag}
          </div>
        `;
      }

      const orderHtml = item.orderNo
        ? `<span class="order-badge" title="Order PM: ${escapeHtml(item.orderNo)}">${escapeHtml(item.orderNo)}</span>`
        : '<span class="text-muted">-</span>';

      let areaLineText = '';
      if (item.departmentId && item.lineName) {
        areaLineText = `${item.departmentId}/${item.lineName}`;
      } else if (item.lineName) {
        areaLineText = item.lineName;
      } else if (item.departmentName) {
        areaLineText = item.departmentName;
      } else {
        areaLineText = '-';
      }

      const areaHtml = `
        <div class="area-badge-wrap">
          <span class="area-line">${escapeHtml(areaLineText)}</span>
          ${item.machineCode ? `<span class="area-machine">${escapeHtml(item.machineCode)}</span>` : ''}
        </div>
      `;

      const priceText = item.price !== null ? fmtNumber(item.price) : '-';
      const totalText = item.totalPrice !== null ? fmtCurrency(item.totalPrice) : '-';

      if (isEditingThisRow) {
        return `
          <tr class="row-inline-editing ${isSelected ? 'row-selected' : ''}" data-id="${escapeHtml(item.id)}">
            <td class="td-check">
              <label class="custom-checkbox-wrap">
                <input type="checkbox" class="custom-checkbox row-select-checkbox" data-id="${escapeHtml(item.id)}" ${isSelected ? 'checked' : ''}>
                <span class="checkbox-box"></span>
              </label>
            </td>
            <td class="td-stage"><span class="badge-stage ${stageClass}">${stageText}</span></td>
            <td class="td-doc">
              <div style="display:flex; gap:3px;">
                <select class="table-input inline-edit-field" data-field="docType" style="width:60px;">
                  <option value="PR" ${item.docType === 'PR' ? 'selected' : ''}>ซื้อ</option>
                  <option value="STORE" ${item.docType === 'STORE' ? 'selected' : ''}>เบิก</option>
                </select>
                <input type="text" class="table-input inline-edit-field" data-field="docNo" value="${escapeHtml(item.docNo)}" placeholder="เลขที่เอกสาร">
              </div>
            </td>
            <td class="td-date">${escapeHtml(item.createdDate)}</td>
            <td class="td-area">${areaHtml}</td>
            <td class="td-order">
              <input type="text" class="table-input inline-edit-field font-mono" data-field="orderNo" value="${escapeHtml(item.orderNo)}" placeholder="Order PM">
            </td>
            <td class="td-desc">
              <input type="text" class="table-input inline-edit-field" data-field="description" value="${escapeHtml(item.description)}" required>
            </td>
            <td class="td-qty text-right">
              <div style="display:flex; gap:2px;">
                <input type="number" step="any" class="table-input inline-edit-field font-mono text-right" data-field="qty" value="${item.qty}" style="width:48px;">
                <input type="text" class="table-input inline-edit-field" data-field="unit" value="${escapeHtml(item.unit)}" style="width:36px;">
              </div>
            </td>
            <td class="td-price text-right">
              <input type="number" step="any" class="table-input inline-edit-field font-mono text-right" data-field="price" value="${item.price !== null ? item.price : ''}" placeholder="0">
            </td>
            <td class="td-total text-right">${totalText}</td>
            <td class="td-po">
              <input type="text" class="table-input inline-edit-field font-mono" data-field="poNo" value="${escapeHtml(item.poNo)}" placeholder="PO No.">
            </td>
            <td class="td-delivery">
              <input type="date" class="table-input inline-edit-field" data-field="deliveryDate" value="${escapeHtml(item.deliveryDate)}">
            </td>
            ${state.folder === 'archive' ? `<td class="td-archived">${escapeHtml(item.archivedAt?.slice(0, 10) || '-')}</td>` : ''}
            <td class="td-actions">
              <button type="button" class="btn-row-action btn-row-save" data-id="${escapeHtml(item.id)}" title="บันทึก">💾</button>
            </td>
          </tr>
        `;
      }

      return `
        <tr class="${isSelected ? 'row-selected' : ''}" data-id="${escapeHtml(item.id)}">
          <td class="td-check">
            <label class="custom-checkbox-wrap">
              <input type="checkbox" class="custom-checkbox row-select-checkbox" data-id="${escapeHtml(item.id)}" ${isSelected ? 'checked' : ''}>
              <span class="checkbox-box"></span>
            </label>
          </td>
          <td class="td-stage">
            <span class="badge-stage ${stageClass}">${stageText}</span>
          </td>
          <td class="td-doc">
            <div class="doc-badge-wrap" title="${item.docNo ? escapeHtml(item.docNo) : 'ยังไม่ออกเลข'}">
              <span class="badge-doc-type ${docBadgeClass}">${docLabel}</span>
              <span class="doc-no-text">${cleanDocNo ? escapeHtml(cleanDocNo) : '<span class="text-muted" style="font-weight:normal; font-size:11px;">ยังไม่ออกเลข</span>'}</span>
            </div>
          </td>
          <td class="td-date">${escapeHtml(item.createdDate)}</td>
          <td class="td-area">${areaHtml}</td>
          <td class="td-order">${orderHtml}</td>
          <td class="td-desc">
            <div class="desc-text" data-action="detail" data-id="${escapeHtml(item.id)}" title="คลิกเพื่อดูรายละเอียด: ${escapeHtml(item.description)}">
              ${escapeHtml(item.description)}
            </div>
          </td>
          <td class="td-qty text-right font-mono">
            <strong>${fmtNumber(item.qty)}</strong> <small class="text-muted">${escapeHtml(item.unit)}</small>
          </td>
          <td class="td-price text-right font-mono">${priceText}</td>
          <td class="td-total text-right font-mono text-primary">${totalText}</td>
          <td class="td-po">
            ${item.poNo ? `<span class="font-mono" style="font-weight:600; color:#1e293b;">${escapeHtml(item.poNo)}</span>` : '<span class="text-muted">-</span>'}
          </td>
          <td class="td-delivery">${deliveryHtml}</td>
          ${state.folder === 'archive' ? `<td class="td-archived">${escapeHtml(item.archivedAt?.slice(0, 10) || '-')}</td>` : ''}
          <td class="td-actions">
            <div class="row-actions">
              <button type="button" class="btn-row-action btn-row-edit" data-id="${escapeHtml(item.id)}" title="แก้ไขรายการ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="btn-row-action btn-row-archive" data-id="${escapeHtml(item.id)}" data-archived="${item.isArchived}" title="${item.isArchived ? 'กู้คืนสู่กล่องงาน' : 'ย้ายไปจัดเก็บ'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
              </button>
              <button type="button" class="btn-row-action action-delete btn-row-delete" data-id="${escapeHtml(item.id)}" title="ลบถาวร (ใส่รหัสแอดมิน)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    el.tbody.innerHTML = html;
    updateSelectionUI();
  }

  // 5. Active Filter Chips
  function updateActiveFilterChips() {
    const chips = [];

    if (state.pipelineStep) {
      const labels = {
        PENDING_PR: 'ขั้นตอน: 1. รอออก PR / สโตร์',
        PENDING_PO: 'ขั้นตอน: 2. รอออก PO',
        PENDING_RECEIPT: 'ขั้นตอน: 3. รอรับของ',
        NEAR_DELIVERY: 'ส่งมอบเร็วๆ นี้ (7 วัน)',
        OVERDUE: 'เกินกำหนดส่งมอบ (Overdue)'
      };
      chips.push({ key: 'pipelineStep', label: labels[state.pipelineStep] || state.pipelineStep });
    }

    if (state.docType) {
      chips.push({ key: 'docType', label: state.docType === 'PR' ? 'ประเภท: ซื้อ' : 'ประเภท: เบิก' });
    }

    if (state.deptId) {
      chips.push({ key: 'deptId', label: `แผนก: ${state.deptId}` });
    }

    if (state.lineId) {
      const lineObj = state.references.lines.find(l => l.lineId === state.lineId);
      chips.push({ key: 'lineId', label: `ไลน์: ${lineObj ? lineObj.lineName : state.lineId}` });
    }

    if (state.startDate || state.endDate) {
      chips.push({ key: 'date', label: `วันที่: ${state.startDate || '...'} ถึง ${state.endDate || '...'}` });
    }

    if (chips.length === 0) {
      el.activeFilterChips.style.display = 'none';
      el.activeFilterChips.innerHTML = '';
      return;
    }

    el.activeFilterChips.style.display = 'flex';
    el.activeFilterChips.innerHTML = chips.map(c => `
      <span class="filter-pill">
        <span>${escapeHtml(c.label)}</span>
        <button type="button" class="remove-pill" data-key="${escapeHtml(c.key)}" title="นำออก">×</button>
      </span>
    `).join('') + '<button type="button" id="btn-clear-all-chips" class="btn-link-sm" style="margin-left:4px;">ล้างตัวกรองทั้งหมด</button>';

    const btnClearAll = document.getElementById('btn-clear-all-chips');
    if (btnClearAll) btnClearAll.onclick = resetAllFilters;
  }

  function resetAllFilters() {
    state.pipelineStep = '';
    state.docType = '';
    state.deptId = '';
    state.lineId = '';
    state.startDate = '';
    state.endDate = '';
    state.search = '';
    el.globalSearch.value = '';
    el.filterDept.value = '';
    el.filterLine.value = '';
    el.filterStartDate.value = '';
    el.filterEndDate.value = '';
    el.btnClearSearch.style.display = 'none';
    el.btnClearDateFilter.style.display = 'none';

    document.querySelectorAll('.btn-doc-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.doctype === '');
    });
    document.querySelectorAll('.pipeline-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.step === '');
    });
    document.querySelectorAll('.chip-item').forEach(btn => btn.classList.remove('active'));

    loadItems();
  }

  // 6. Selection
  function updateSelectionUI() {
    const totalVisible = state.items.length;
    const selectedCount = state.selectedIds.size;

    el.checkSelectAll.checked = totalVisible > 0 && selectedCount === totalVisible;
    el.checkSelectAll.indeterminate = selectedCount > 0 && selectedCount < totalVisible;

    if (selectedCount > 0) {
      el.bulkActionsGroup.style.display = 'inline-flex';
      el.selectedCountBadge.textContent = `เลือก ${selectedCount} รายการ`;
    } else {
      el.bulkActionsGroup.style.display = 'none';
    }
  }

  // 7. Compose Dock Operations
  function openCreateForm() {
    state.formMode = 'create';
    state.activeEditId = null;
    el.form.reset();
    el.formItemId.value = '';
    el.formCreatedDate.value = new Date().toISOString().slice(0, 10);
    if (state.retentionCutoff) el.formCreatedDate.min = state.retentionCutoff;
    el.radioTypePr.checked = true;
    el.formQty.value = '1';
    el.formUnit.value = 'ชิ้น';
    el.formPrice.value = '';
    el.formCalcTotal.textContent = '฿ 0.00';
    el.formTitle.textContent = 'บันทึกคำขอจัดซื้อ / เบิกสโตร์';
    el.formModeBadge.textContent = 'คำขอใหม่';

    if (state.deptId) el.formDept.value = state.deptId;
    updateLineDropdown(el.formLine, el.formDept.value, 'เลือกสายการผลิต...');
    if (state.lineId) el.formLine.value = state.lineId;
    updateMachineDropdown(el.formMachine, el.formLine.value, el.formDept.value, 'เลือกเครื่องจักร (ถ้ามี)...');

    el.formPane.classList.remove('minimized');
    el.formPane.style.display = 'block';
    state.isFormOpen = true;
    el.formDescription.focus();
  }

  async function openEditForm(id) {
    try {
      const item = state.items.find(i => i.id === id) || await callRpc('getItem', id);
      if (!item) return;

      state.formMode = 'edit';
      state.activeEditId = id;
      el.formItemId.value = item.id;
      el.formCreatedDate.value = item.createdDate || item.created_date || '';
      if (state.retentionCutoff) el.formCreatedDate.min = state.retentionCutoff;

      const docType = item.docType || item.doc_type || 'PR';
      if (docType === 'STORE') el.radioTypeStore.checked = true;
      else el.radioTypePr.checked = true;

      el.formDept.value = item.departmentId || item.department_id || '';
      updateLineDropdown(el.formLine, el.formDept.value, 'เลือกสายการผลิต...');
      el.formLine.value = item.lineId || item.line_id || '';
      updateMachineDropdown(el.formMachine, el.formLine.value, el.formDept.value, 'เลือกเครื่องจักร (ถ้ามี)...');
      el.formMachine.value = item.machineId || item.machine_id || '';

      el.formOrderNo.value = item.orderNo || item.order_no || '';
      el.formDocNo.value = item.docNo || item.doc_no || '';
      el.formDescription.value = item.description || '';
      el.formQty.value = item.qty || 1;
      el.formUnit.value = item.unit || 'ชิ้น';
      el.formPrice.value = item.price !== null && item.price !== undefined ? item.price : '';
      updateFormCalcTotal();

      el.formPoNo.value = item.poNo || item.po_no || '';
      el.formDeliveryDate.value = item.deliveryDate || item.delivery_date || '';
      el.formNotes.value = item.notes || '';

      el.formTitle.textContent = `แก้ไข: ${item.docNo || item.id}`;
      el.formModeBadge.textContent = 'แก้ไข';

      el.formPane.classList.remove('minimized');
      el.formPane.style.display = 'block';
      state.isFormOpen = true;
      el.formDescription.focus();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถเปิดข้อมูล: ' + err.message, 'error');
    }
  }

  function updateFormCalcTotal() {
    const qty = parseFloat(el.formQty.value) || 0;
    const price = parseFloat(el.formPrice.value) || 0;
    el.formCalcTotal.textContent = fmtCurrency(qty * price);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const isSaveAndNext = e.submitter && e.submitter.dataset.next === 'true';

    const payload = {
      id: el.formItemId.value || undefined,
      createdDate: el.formCreatedDate.value,
      docType: el.radioTypeStore.checked ? 'STORE' : 'PR',
      docNo: el.formDocNo.value.trim(),
      departmentId: el.formDept.value,
      lineId: el.formLine.value,
      machineId: el.formMachine.value,
      orderNo: el.formOrderNo.value.trim(),
      description: el.formDescription.value.trim(),
      qty: parseFloat(el.formQty.value) || 1,
      unit: el.formUnit.value.trim() || 'ชิ้น',
      price: el.formPrice.value !== '' ? parseFloat(el.formPrice.value) : null,
      poNo: el.formPoNo.value.trim(),
      deliveryDate: el.formDeliveryDate.value,
      notes: el.formNotes.value.trim()
    };

    if (!payload.description) {
      showToast('กรุณากรอกรายละเอียดสินค้าหรือบริการ', 'error');
      el.formDescription.focus();
      return;
    }

    if (state.retentionCutoff && payload.createdDate && payload.createdDate < state.retentionCutoff) {
      showToast(`วันที่สร้าง (${payload.createdDate}) เกินกำหนดนโยบายจัดเก็บข้อมูลย้อนหลัง 2 ปี (ระบบจัดเก็บข้อมูลไม่เก่ากว่า ${state.retentionCutoff})`, 'error');
      el.formCreatedDate.focus();
      return;
    }

    try {
      await callRpc('saveItem', payload);
      showToast(state.formMode === 'create' ? 'บันทึกคำขอใหม่เรียบร้อย' : 'บันทึกการแก้ไขเรียบร้อย', 'success');

      if (isSaveAndNext) {
        el.formDescription.value = '';
        el.formDocNo.value = '';
        el.formPoNo.value = '';
        el.formPrice.value = '';
        el.formNotes.value = '';
        el.formCalcTotal.textContent = '฿ 0.00';
        el.formDescription.focus();
      } else {
        el.formPane.style.display = 'none';
        state.isFormOpen = false;
      }

      await loadItems();
    } catch (err) {
      showToast('บันทึกล้มเหลว: ' + err.message, 'error');
    }
  }

  // 7.5 Bulk Copy to Clipboard for Email
  async function handleBulkCopyEmail() {
    if (state.selectedIds.size === 0) {
      showToast('กรุณาเลือกรายการที่ต้องการคัดลอก', 'info');
      return;
    }

    const selectedItems = state.items.filter(i => state.selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    // Plain text table (TSV for clean paste in email/chat/excel)
    const headers = ['พื้นที่', 'Order', 'รายละเอียด', 'จำนวน', 'ราคา', 'PR ถ้ามี'];
    const tsvLines = [
      headers.join('\t'),
      ...selectedItems.map(item => {
        const areaLine = item.departmentId && item.lineName ? `${item.departmentId}/${item.lineName}` : (item.lineName || item.departmentName || '-');
        const areaStr = [areaLine, item.machineCode || ''].filter(Boolean).join(' ');
        const order = item.orderNo || '-';
        const desc = item.description || '-';
        const qty = `${fmtNumber(item.qty)} ${item.unit || 'ชิ้น'}`;
        const price = item.price !== null ? fmtNumber(item.price) : '-';
        const pr = item.docNo || '-';

        return [areaStr, order, desc, qty, price, pr].join('\t');
      })
    ];
    const plainText = tsvLines.join('\r\n');

    // Rich HTML Table with clean inline styles for Email (Outlook/Gmail)
    const htmlRows = selectedItems.map((item, idx) => {
      const areaLine = item.departmentId && item.lineName ? `${item.departmentId}/${item.lineName}` : (item.lineName || item.departmentName || '-');
      const areaHtml = `<strong>${escapeHtml(areaLine)}</strong>${item.machineCode ? `<br><span style="color:#64748b; font-size:11px;">${escapeHtml(item.machineCode)}</span>` : ''}`;
      const order = item.orderNo ? `<span style="font-family:monospace; font-weight:600;">${escapeHtml(item.orderNo)}</span>` : '-';
      const desc = escapeHtml(item.description || '-');
      const qty = `<span style="font-family:monospace;">${fmtNumber(item.qty)}</span> ${escapeHtml(item.unit || 'ชิ้น')}`;
      const price = item.price !== null ? `<span style="font-family:monospace;">${fmtNumber(item.price)}</span>` : '-';
      const pr = item.docNo ? `<span style="font-family:monospace; font-weight:600; color:#0284c7;">${escapeHtml(item.docNo)}</span>` : '-';
      const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

      return `
        <tr style="background-color:${bg};">
          <td style="padding:8px 12px; border:1px solid #cbd5e1; vertical-align:top;">${areaHtml}</td>
          <td style="padding:8px 12px; border:1px solid #cbd5e1; vertical-align:top;">${order}</td>
          <td style="padding:8px 12px; border:1px solid #cbd5e1; vertical-align:top; line-height:1.4;">${desc}</td>
          <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; vertical-align:top; white-space:nowrap;">${qty}</td>
          <td style="padding:8px 12px; border:1px solid #cbd5e1; text-align:right; vertical-align:top; white-space:nowrap;">${price}</td>
          <td style="padding:8px 12px; border:1px solid #cbd5e1; vertical-align:top; white-space:nowrap;">${pr}</td>
        </tr>
      `;
    }).join('');

    const htmlTable = `
      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:Tahoma, 'Segoe UI', Arial, sans-serif; font-size:13px; color:#1e293b; border:1px solid #cbd5e1; width:100%; max-width:850px;">
        <thead>
          <tr style="background-color:#0f172a; color:#ffffff; font-weight:bold; text-align:left;">
            <th style="padding:10px 12px; border:1px solid #334155;">พื้นที่</th>
            <th style="padding:10px 12px; border:1px solid #334155;">Order</th>
            <th style="padding:10px 12px; border:1px solid #334155;">รายละเอียด</th>
            <th style="padding:10px 12px; border:1px solid #334155; text-align:right;">จำนวน</th>
            <th style="padding:10px 12px; border:1px solid #334155; text-align:right;">ราคา</th>
            <th style="padding:10px 12px; border:1px solid #334155;">PR ถ้ามี</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
    `;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([htmlTable], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      showToast(`คัดลอก ${selectedItems.length} รายการลงคลิปบอร์ดแล้ว พร้อมนำไปวางส่งอีเมล`, 'success');
    } catch (err) {
      console.warn('ClipboardItem write failed, trying text fallback', err);
      try {
        await navigator.clipboard.writeText(plainText);
        showToast(`คัดลอก ${selectedItems.length} รายการลงคลิปบอร์ดแล้ว`, 'success');
      } catch (e) {
        showToast('ไม่สามารถคัดลอกคลิปบอร์ดได้: ' + e.message, 'error');
      }
    }
  }

  // 8. Bulk Area
  function openBulkAreaModal() {
    if (state.selectedIds.size === 0) return;
    el.bulkAreaSummaryText.textContent = `กำลังอัปเดตพื้นที่สำหรับ ${state.selectedIds.size} รายการที่เลือก:`;
    el.bulkAreaDept.value = '';
    updateLineDropdown(el.bulkAreaLine, '', 'เลือกสายการผลิตใหม่...');
    updateMachineDropdown(el.bulkAreaMachine, '', '', 'เลือกเครื่องจักร...');
    el.modalBulkArea.style.display = 'flex';
  }

  async function handleConfirmBulkArea() {
    const deptId = el.bulkAreaDept.value;
    const lineId = el.bulkAreaLine.value;
    const machineId = el.bulkAreaMachine.value;

    if (!deptId && !lineId && !machineId) {
      showToast('กรุณาเลือกพื้นที่ใหม่อย่างน้อย 1 รายการ', 'error');
      return;
    }

    try {
      await callRpc('bulkUpdateArea', {
        ids: Array.from(state.selectedIds),
        departmentId: deptId,
        lineId: lineId,
        machineId: machineId
      });
      showToast(`เปลี่ยนพื้นที่เรียบร้อยแล้ว (${state.selectedIds.size} รายการ)`, 'success');
      el.modalBulkArea.style.display = 'none';
      state.selectedIds.clear();
      await loadItems();
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  }

  // 9. Bulk Archive
  async function handleArchiveSelected(shouldArchive = true) {
    if (state.selectedIds.size === 0) return;
    const actionLabel = shouldArchive ? 'จัดเก็บ' : 'กู้คืน';

    try {
      await callRpc('archiveItems', {
        ids: Array.from(state.selectedIds),
        archive: shouldArchive
      });
      showToast(`${actionLabel}เรียบร้อยแล้ว (${state.selectedIds.size} รายการ)`, 'success');
      state.selectedIds.clear();
      await loadItems();
    } catch (err) {
      showToast('ดำเนินการไม่สำเร็จ: ' + err.message, 'error');
    }
  }

  // 10. Admin Delete Modal
  function openAdminDeleteModal(ids) {
    state.pendingDeleteIds = ids;
    el.inputAdminPassword.value = '';
    el.adminPasswordError.style.display = 'none';

    const targets = state.items.filter(i => ids.includes(i.id));
    el.deleteTargetPreview.innerHTML = targets.map(t => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; border-bottom:1px solid #e2e8f0; padding-bottom:3px;">
        <span><strong>${escapeHtml(t.docNo || t.id)}</strong> - ${escapeHtml(t.description)}</span>
        <span class="font-mono text-muted">${fmtNumber(t.qty)} ${escapeHtml(t.unit)}</span>
      </div>
    `).join('');

    el.modalAdminDelete.style.display = 'flex';
    el.inputAdminPassword.focus();
  }

  async function handleConfirmAdminDelete() {
    const password = el.inputAdminPassword.value.trim();
    if (!password) {
      el.adminPasswordError.textContent = 'กรุณากรอกรหัสผ่านผู้ดูแลระบบ';
      el.adminPasswordError.style.display = 'block';
      el.inputAdminPassword.focus();
      return;
    }

    try {
      await callRpc('deleteItems', {
        ids: state.pendingDeleteIds,
        adminPassword: password
      });
      showToast(`ลบข้อมูลถาวรเรียบร้อยแล้ว (${state.pendingDeleteIds.length} รายการ)`, 'success');
      el.modalAdminDelete.style.display = 'none';
      state.pendingDeleteIds.forEach(id => state.selectedIds.delete(id));
      await loadItems();
    } catch (err) {
      el.adminPasswordError.textContent = err.message || 'รหัสผ่านไม่ถูกต้อง';
      el.adminPasswordError.style.display = 'block';
      el.inputAdminPassword.focus();
    }
  }

  // 11. Detail Modal
  async function openItemDetail(id) {
    try {
      const item = state.items.find(i => i.id === id) || await callRpc('getItem', id);
      if (!item) return;

      const isStore = (item.docType || item.doc_type) === 'STORE';
      el.detailTypeBadge.className = isStore ? 'detail-type-badge type-store' : 'detail-type-badge type-pr';
      el.detailTypeBadge.textContent = isStore ? 'เบิก' : 'ซื้อ';
      el.detailModalTitle.textContent = `${item.docNo || item.id} - ${item.description}`;

      const priceVal = item.price !== null ? fmtCurrency(item.price) : 'ไม่ได้ระบุ';
      const totalVal = item.totalPrice !== null ? fmtCurrency(item.totalPrice) : (item.price !== null ? fmtCurrency(item.price * item.qty) : 'ไม่ได้ระบุ');

      el.detailModalBody.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">หมายเลขเอกสาร:</span>
            <span class="detail-value font-mono"><strong>${escapeHtml(item.docNo || 'ยังไม่ออกเลข')}</strong></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">วันที่เปิดคำขอ:</span>
            <span class="detail-value font-mono">${escapeHtml(item.createdDate || item.created_date || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">พื้นที่ / แผนก:</span>
            <span class="detail-value">${escapeHtml(item.departmentName || item.department_id || '-')} &gt; ${escapeHtml(item.lineName || item.line_id || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">เครื่องจักร:</span>
            <span class="detail-value font-mono">${escapeHtml(item.machineCode || item.machine_code || '-')} ${item.machineName ? `(${escapeHtml(item.machineName)})` : ''}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">เลข ORDER (PM):</span>
            <span class="detail-value font-mono">${escapeHtml(item.orderNo || item.order_no || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">เลขที่ PO:</span>
            <span class="detail-value font-mono">${escapeHtml(item.poNo || item.po_no || 'ยังไม่ออก PO')}</span>
          </div>
          <div class="detail-item col-full">
            <span class="detail-label">รายละเอียดสินค้า / บริการ / อะไหล่:</span>
            <span class="detail-value" style="font-size:14px; font-weight:500;">${escapeHtml(item.description)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">จำนวน:</span>
            <span class="detail-value font-mono"><strong>${fmtNumber(item.qty)}</strong> ${escapeHtml(item.unit)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ราคา/หน่วย:</span>
            <span class="detail-value font-mono">${priceVal}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ราคารวม (฿):</span>
            <span class="detail-value font-mono text-primary" style="font-weight:700;">${totalVal}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">กำหนดส่งมอบ:</span>
            <span class="detail-value font-mono">${escapeHtml(item.deliveryDate || item.delivery_date || '-')}</span>
          </div>
          <div class="detail-item col-full">
            <span class="detail-label">หมายเหตุ:</span>
            <span class="detail-value text-muted">${escapeHtml(item.notes || '-')}</span>
          </div>
        </div>
      `;

      el.btnDetailEditBtn.onclick = () => {
        el.modalItemDetail.style.display = 'none';
        openEditForm(id);
      };

      el.modalItemDetail.style.display = 'flex';
    } catch (err) {
      console.error(err);
    }
  }

  // 12. Inline Table Edit
  function toggleInlineTableEdit() {
    state.isInlineEditing = !state.isInlineEditing;
    el.tableEditBanner.style.display = state.isInlineEditing ? 'inline-flex' : 'none';
    renderTable();
  }

  async function handleSaveTableEdit() {
    const rows = document.querySelectorAll('.pr-table tbody tr.row-inline-editing');
    const updateList = [];

    rows.forEach(tr => {
      const id = tr.dataset.id;
      if (!id) return;
      const getVal = field => {
        const input = tr.querySelector(`[data-field="${field}"]`);
        return input ? input.value : '';
      };

      updateList.push({
        id,
        docType: getVal('docType'),
        docNo: getVal('docNo'),
        orderNo: getVal('orderNo'),
        description: getVal('description'),
        qty: parseFloat(getVal('qty')) || 1,
        unit: getVal('unit'),
        price: getVal('price') !== '' ? parseFloat(getVal('price')) : null,
        poNo: getVal('poNo'),
        deliveryDate: getVal('deliveryDate')
      });
    });

    if (updateList.length === 0) {
      toggleInlineTableEdit();
      return;
    }

    try {
      await callRpc('bulkSaveItems', updateList);
      showToast(`บันทึกการแก้ไข ${updateList.length} รายการเรียบร้อยแล้ว`, 'success');
      state.isInlineEditing = false;
      el.tableEditBanner.style.display = 'none';
      await loadItems();
    } catch (err) {
      showToast('บันทึกล้มเหลว: ' + err.message, 'error');
    }
  }

  // 13. CSV Export
  function exportToCsv() {
    if (!state.items || state.items.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'info');
      return;
    }

    const headers = [
      'ID', 'วันที่สร้าง', 'ประเภทเอกสาร', 'หมายเลข PR / เลขที่เบิก', 'แผนก', 'สายการผลิต', 'เครื่องจักร',
      'เลข ORDER (PM)', 'รายละเอียด', 'จำนวน', 'หน่วย', 'ราคาต่อหน่วย (บาท)', 'ราคารวม (บาท)',
      'เลขที่ PO', 'กำหนดส่งมอบ', 'สถานะขั้นตอน', 'สถานะการจัดเก็บ', 'จัดเก็บเมื่อ', 'หมายเหตุ'
    ];

    const escapeCsv = val => {
      const s = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = state.items.map(item => [
      escapeCsv(item.id),
      escapeCsv(item.createdDate),
      escapeCsv(item.docType === 'STORE' ? 'เบิก' : 'ซื้อ'),
      escapeCsv(item.docNo),
      escapeCsv(item.departmentName),
      escapeCsv(item.lineName),
      escapeCsv(item.machineCode),
      escapeCsv(item.orderNo),
      escapeCsv(item.description),
      escapeCsv(item.qty),
      escapeCsv(item.unit),
      escapeCsv(item.price !== null ? item.price : ''),
      escapeCsv(item.totalPrice !== null ? item.totalPrice : ''),
      escapeCsv(item.poNo),
      escapeCsv(item.deliveryDate),
      escapeCsv(item.pipelineStatus),
      escapeCsv(item.isArchived ? 'จัดเก็บแล้ว' : 'รอดำเนินการ'),
      escapeCsv(item.archivedAt || ''),
      escapeCsv(item.notes)
    ].join(','));

    const csvContent = '\uFEFF' + headers.map(escapeCsv).join(',') + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `PR_Store_Ledger_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success');
  }

  // 14. Event Listeners
  function setupEventListeners() {
    // Search
    el.globalSearch.addEventListener('input', e => {
      const q = e.target.value;
      el.btnClearSearch.style.display = q ? 'flex' : 'none';
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        state.search = q;
        loadItems();
      }, 300);
    });

    el.btnClearSearch.addEventListener('click', () => {
      el.globalSearch.value = '';
      el.btnClearSearch.style.display = 'none';
      state.search = '';
      loadItems();
    });

    el.btnRefresh.addEventListener('click', loadItems);
    el.btnExportCsv.addEventListener('click', exportToCsv);
    el.btnCompose.addEventListener('click', openCreateForm);

    // Sidebar Folder Navigation
    document.querySelectorAll('.nav-folder-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav-folder-item').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        state.folder = item.dataset.folder;
        state.selectedIds.clear();
        loadItems();
      });
    });

    // Horizontal Segmented Pipeline Tabs
    document.querySelectorAll('.pipeline-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.pipeline-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.pipelineStep = tab.dataset.step;
        // Uncheck sidebar quick chips
        document.querySelectorAll('.chip-item').forEach(c => c.classList.remove('active'));
        loadItems();
      });
    });

    // Sidebar Quick Urgent Chips
    document.querySelectorAll('.chip-item').forEach(chip => {
      chip.addEventListener('click', () => {
        const step = chip.dataset.step;
        if (state.pipelineStep === step) {
          state.pipelineStep = '';
          chip.classList.remove('active');
          document.querySelector('.pipeline-tab[data-step=""]')?.classList.add('active');
        } else {
          document.querySelectorAll('.chip-item').forEach(c => c.classList.remove('active'));
          document.querySelectorAll('.pipeline-tab').forEach(t => t.classList.remove('active'));
          chip.classList.add('active');
          state.pipelineStep = step;
        }
        loadItems();
      });
    });

    // Sidebar Document Type Pills
    document.querySelectorAll('.btn-doc-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-doc-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.docType = btn.dataset.doctype;
        loadItems();
      });
    });

    // Inline Filter Bar Dropdowns
    el.filterDept.addEventListener('change', () => {
      state.deptId = el.filterDept.value;
      updateLineDropdown(el.filterLine, state.deptId, 'ทุกสายการผลิต');
      state.lineId = '';
      loadItems();
    });

    el.filterLine.addEventListener('change', () => {
      state.lineId = el.filterLine.value;
      loadItems();
    });

    const handleDateChange = () => {
      state.startDate = el.filterStartDate.value;
      state.endDate = el.filterEndDate.value;
      el.btnClearDateFilter.style.display = (state.startDate || state.endDate) ? 'inline-block' : 'none';
      loadItems();
    };
    el.filterStartDate.addEventListener('change', handleDateChange);
    el.filterEndDate.addEventListener('change', handleDateChange);
    el.btnClearDateFilter.addEventListener('click', () => {
      el.filterStartDate.value = '';
      el.filterEndDate.value = '';
      handleDateChange();
    });

    el.selectPageLimit.addEventListener('change', () => {
      state.limit = Number(el.selectPageLimit.value) || 100;
      loadItems();
    });

    // Compose Dock Header Tool Buttons
    el.btnMinimizeForm.addEventListener('click', () => {
      el.formPane.classList.toggle('minimized');
    });
    el.btnCloseForm.addEventListener('click', () => {
      el.formPane.style.display = 'none';
      state.isFormOpen = false;
    });
    el.btnCancelForm.addEventListener('click', () => {
      el.formPane.style.display = 'none';
      state.isFormOpen = false;
    });

    el.form.addEventListener('submit', handleFormSubmit);
    el.formQty.addEventListener('input', updateFormCalcTotal);
    el.formPrice.addEventListener('input', updateFormCalcTotal);

    el.formDept.addEventListener('change', () => {
      updateLineDropdown(el.formLine, el.formDept.value, 'เลือกสายการผลิต...');
      updateMachineDropdown(el.formMachine, '', el.formDept.value, 'เลือกเครื่องจักร (ถ้ามี)...');
    });
    el.formLine.addEventListener('change', () => {
      updateMachineDropdown(el.formMachine, el.formLine.value, el.formDept.value, 'เลือกเครื่องจักร (ถ้ามี)...');
    });

    // Table Select All
    el.checkSelectAll.addEventListener('change', () => {
      if (el.checkSelectAll.checked) {
        state.items.forEach(i => state.selectedIds.add(i.id));
      } else {
        state.selectedIds.clear();
      }
      renderTable();
    });

    // Table Clicks
    el.tbody.addEventListener('click', e => {
      const checkbox = e.target.closest('.row-select-checkbox');
      if (checkbox) {
        const id = checkbox.dataset.id;
        if (checkbox.checked) state.selectedIds.add(id);
        else state.selectedIds.delete(id);
        const tr = checkbox.closest('tr');
        if (tr) tr.classList.toggle('row-selected', checkbox.checked);
        updateSelectionUI();
        return;
      }

      const btnEdit = e.target.closest('.btn-row-edit');
      if (btnEdit) {
        openEditForm(btnEdit.dataset.id);
        return;
      }

      const btnArchive = e.target.closest('.btn-row-archive');
      if (btnArchive) {
        const isCurrentlyArchived = btnArchive.dataset.archived === 'true';
        state.selectedIds.clear();
        state.selectedIds.add(btnArchive.dataset.id);
        handleArchiveSelected(!isCurrentlyArchived);
        return;
      }

      const btnDelete = e.target.closest('.btn-row-delete');
      if (btnDelete) {
        openAdminDeleteModal([btnDelete.dataset.id]);
        return;
      }

      const descText = e.target.closest('[data-action="detail"]');
      if (descText) {
        openItemDetail(descText.dataset.id);
        return;
      }
    });

    // Bulk Buttons
    el.btnDeselectAll.addEventListener('click', () => {
      state.selectedIds.clear();
      renderTable();
    });
    if (el.btnBulkCopy) el.btnBulkCopy.addEventListener('click', handleBulkCopyEmail);
    el.btnBulkInlineEdit.addEventListener('click', toggleInlineTableEdit);
    el.btnOpenBulkAreaModal.addEventListener('click', openBulkAreaModal);
    el.btnBulkArchive.addEventListener('click', () => {
      handleArchiveSelected(state.folder !== 'archive');
    });
    el.btnOpenBulkDeleteModal.addEventListener('click', () => {
      if (state.selectedIds.size === 0) return;
      openAdminDeleteModal(Array.from(state.selectedIds));
    });

    // Table Edit Mode Buttons
    el.btnCancelTableEdit.addEventListener('click', toggleInlineTableEdit);
    el.btnSaveTableEdit.addEventListener('click', handleSaveTableEdit);

    // Bulk Area Modal Controls
    el.bulkAreaDept.addEventListener('change', () => {
      updateLineDropdown(el.bulkAreaLine, el.bulkAreaDept.value, 'เลือกสายการผลิตใหม่...');
      updateMachineDropdown(el.bulkAreaMachine, '', el.bulkAreaDept.value, 'เลือกเครื่องจักร...');
    });
    el.bulkAreaLine.addEventListener('change', () => {
      updateMachineDropdown(el.bulkAreaMachine, el.bulkAreaLine.value, el.bulkAreaDept.value, 'เลือกเครื่องจักร...');
    });
    el.btnCancelBulkArea.addEventListener('click', () => el.modalBulkArea.style.display = 'none');
    el.btnCloseBulkArea.addEventListener('click', () => el.modalBulkArea.style.display = 'none');
    el.btnConfirmBulkArea.addEventListener('click', handleConfirmBulkArea);

    // Admin Delete Modal Controls
    el.btnCancelAdminDelete.addEventListener('click', () => el.modalAdminDelete.style.display = 'none');
    el.btnCloseAdminDelete.addEventListener('click', () => el.modalAdminDelete.style.display = 'none');
    el.btnConfirmAdminDelete.addEventListener('click', handleConfirmAdminDelete);
    el.inputAdminPassword.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleConfirmAdminDelete();
    });

    // Detail Modal Controls
    el.btnCloseDetail.addEventListener('click', () => el.modalItemDetail.style.display = 'none');
    el.btnDetailCloseBtn.addEventListener('click', () => el.modalItemDetail.style.display = 'none');

    // Backdrop Click
    [el.modalBulkArea, el.modalAdminDelete, el.modalItemDetail].forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });

    // Escape Key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        el.modalBulkArea.style.display = 'none';
        el.modalAdminDelete.style.display = 'none';
        el.modalItemDetail.style.display = 'none';
      }
    });

    // Active Filter Chips Removal
    el.activeFilterChips.addEventListener('click', e => {
      const btnRemove = e.target.closest('.remove-pill');
      if (!btnRemove) return;
      const key = btnRemove.dataset.key;
      if (key === 'pipelineStep') {
        state.pipelineStep = '';
        document.querySelectorAll('.pipeline-tab').forEach(t => t.classList.toggle('active', t.dataset.step === ''));
        document.querySelectorAll('.chip-item').forEach(c => c.classList.remove('active'));
      } else if (key === 'docType') {
        state.docType = '';
        document.querySelectorAll('.btn-doc-pill').forEach(b => b.classList.toggle('active', b.dataset.doctype === ''));
      } else if (key === 'deptId') {
        state.deptId = '';
        el.filterDept.value = '';
      } else if (key === 'lineId') {
        state.lineId = '';
        el.filterLine.value = '';
      } else if (key === 'date') {
        state.startDate = '';
        state.endDate = '';
        el.filterStartDate.value = '';
        el.filterEndDate.value = '';
        el.btnClearDateFilter.style.display = 'none';
      }
      loadItems();
    });
  }

  // Initialization
  async function init() {
    setupEventListeners();
    await loadReferences();
    await loadItems();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
