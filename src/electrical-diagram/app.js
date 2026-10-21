/**
 * Electrical Power Distribution Diagram (แผนผังระบบไฟฟ้า)
 * Single Line Diagram, Panel Directory, Quick Wiring Matrix & Google Drive Integration
 */

(function () {
  'use strict';

  // State Management
  const state = {
    nodes: [],
    references: { nodes: [], machines: [], types: [] },
    currentTab: 'diagram',
    filterType: 'ALL',
    searchQuery: '',
    locationFilter: '',
    selectedNodeId: null,
    showMachines: true,
    treeRootFilter: 'ALL',
    panZoom: { x: 40, y: 40, scale: 1.0, isPanning: false, startX: 0, startY: 0 },
    pendingWiring: new Map(), // id -> parentId
    formImage: null, // { mime, base64 } or null
    removeImageFlag: false
  };

  // DOM Elements cache
  const $ = id => document.getElementById(id);

  // RPC Client Helper
  async function rpc(method, ...args) {
    const res = await fetch('/api/v1/electrical/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      const err = new Error(json.error?.message || 'การเชื่อมต่อไม่สำเร็จ');
      err.code = json.error?.code || 'SERVER';
      throw err;
    }
    return json.data;
  }

  // Load initial data
  async function loadData() {
    try {
      const [nodes, refs] = await Promise.all([
        rpc('listNodes', {}),
        rpc('getReferences')
      ]);
      state.nodes = nodes || [];
      state.references = refs || { nodes: [], machines: [], types: [] };

      updateKpis();
      populateDropdowns();
      renderCurrentTab();
    } catch (err) {
      console.error('Failed to load electrical data:', err);
      alert('โหลดข้อมูลแผนผังระบบไฟฟ้าไม่สำเร็จ: ' + err.message);
    }
  }

  // Populate dynamic dropdowns (Parent selector, Machine picker, Tree filter)
  function populateDropdowns() {
    // 1. Root MDB filter for diagram
    const treeSelect = $('filter-tree-root');
    if (treeSelect) {
      const currentVal = treeSelect.value;
      const mdbs = state.nodes.filter(n => n.nodeType === 'MDB');
      let html = '<option value="ALL">ดูทุกสายเมน (All MDBs)</option>';
      mdbs.forEach(m => {
        html += `<option value="${m.id}">${escapeHtml(m.nodeCode)} - ${escapeHtml(m.name)}</option>`;
      });
      treeSelect.innerHTML = html;
      treeSelect.value = currentVal || 'ALL';
    }

    // 2. Location filter in Directory
    const locSelect = $('dir-location-filter');
    if (locSelect) {
      const currentLoc = locSelect.value;
      const locs = Array.from(new Set(state.nodes.map(n => n.location).filter(Boolean))).sort();
      let html = '<option value="">ทุกสถานที่ / อาคาร</option>';
      locs.forEach(loc => {
        html += `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`;
      });
      locSelect.innerHTML = html;
      locSelect.value = currentLoc || '';
    }

    // 3. Machine picker in Form Modal
    const mcSelect = $('form-machine-picker');
    if (mcSelect) {
      let html = '<option value="">-- ไม่เลือกลิงก์ (กรอกรหัสและชื่อเอง) --</option>';
      (state.references.machines || []).forEach(m => {
        html += `<option value="${m.machineId}" data-code="${escapeHtml(m.machineCode)}" data-name="${escapeHtml(m.machineName)}">
          ${escapeHtml(m.machineCode)} - ${escapeHtml(m.machineName)}
        </option>`;
      });
      mcSelect.innerHTML = html;
    }
  }

  // Update KPI counters
  function updateKpis() {
    const total = state.nodes.length;
    let mdb = 0, db = 0, lp = 0, mc = 0, dv = 0;
    state.nodes.forEach(n => {
      if (n.nodeType === 'MDB') mdb++;
      else if (n.nodeType === 'DB') db++;
      else if (n.nodeType === 'LP') lp++;
      else if (n.nodeType === 'MC') mc++;
      else if (n.nodeType === 'DV') dv++;
    });

    $('kpi-total').textContent = total;
    $('kpi-mdb').textContent = mdb;
    $('kpi-db').textContent = db;
    $('kpi-lp').textContent = lp;
    $('kpi-mc').textContent = mc;
    $('kpi-dv').textContent = dv;

    $('tab-count-all').textContent = total;
    $('pill-cnt-all').textContent = total;
    $('pill-cnt-mdb').textContent = mdb;
    $('pill-cnt-db').textContent = db;
    $('pill-cnt-lp').textContent = lp;
    $('pill-cnt-mc').textContent = mc;
    $('pill-cnt-dv').textContent = dv;
  }

  // Switch Active Tab
  function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll('.el-tab-btn').forEach(btn => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.el-tab-content').forEach(pane => {
      pane.classList.toggle('active', pane.id === 'tab-' + tabName);
    });

    renderCurrentTab();
  }

  function renderCurrentTab() {
    if (state.currentTab === 'diagram') {
      renderDiagram();
    } else if (state.currentTab === 'directory') {
      renderDirectory();
    } else if (state.currentTab === 'wiring') {
      renderWiringMatrix();
    }
  }

  // ==========================================================================
  // TAB 1: INTERACTIVE SINGLE LINE DIAGRAM
  // ==========================================================================

  function renderDiagram() {
    const nodesLayer = $('diagram-nodes-layer');
    const svgLayer = $('diagram-svg-connections');
    const emptyState = $('diagram-empty-state');
    if (!nodesLayer || !svgLayer) return;

    nodesLayer.innerHTML = '';
    svgLayer.innerHTML = '';

    if (state.nodes.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }
    emptyState.style.display = 'none';

    // Filter nodes according to toolbar controls
    let filteredNodes = state.nodes.slice();
    if (!state.showMachines) {
      filteredNodes = filteredNodes.filter(n => n.nodeType !== 'MC' && n.nodeType !== 'DV');
    }

    // Build children mapping
    const nodeMap = new Map();
    const childrenMap = new Map();
    filteredNodes.forEach(n => {
      nodeMap.set(n.id, n);
      childrenMap.set(n.id, []);
    });

    const roots = [];
    filteredNodes.forEach(n => {
      if (n.parentId && nodeMap.has(n.parentId)) {
        childrenMap.get(n.parentId).push(n);
      } else {
        roots.push(n);
      }
    });

    // If root filter is active, only show the selected root tree
    let effectiveRoots = roots;
    if (state.treeRootFilter !== 'ALL') {
      effectiveRoots = roots.filter(r => r.id === state.treeRootFilter);
      if (effectiveRoots.length === 0) {
        effectiveRoots = roots;
      }
    }

    // Compute Left-to-Right Orthogonal Hierarchy Coordinates
    const CARD_WIDTH = 240;
    const CARD_HEIGHT = 100;
    const GAP_X = 140; // horizontal distance between columns
    const GAP_Y = 28;  // vertical distance between sibling cards

    const positions = new Map(); // id -> { x, y }
    let currentGlobalY = 40;

    function layoutSubtree(nodeId, level) {
      const children = childrenMap.get(nodeId) || [];
      const x = 50 + level * (CARD_WIDTH + GAP_X);

      if (children.length === 0) {
        const y = currentGlobalY;
        currentGlobalY += CARD_HEIGHT + GAP_Y;
        positions.set(nodeId, { x, y });
        return { topY: y, bottomY: y };
      }

      const childPositions = [];
      children.forEach(child => {
        childPositions.push(layoutSubtree(child.id, level + 1));
      });

      const firstChildY = childPositions[0].topY;
      const lastChildY = childPositions[childPositions.length - 1].bottomY;
      const y = Math.round((firstChildY + lastChildY) / 2);

      positions.set(nodeId, { x, y });
      return { topY: firstChildY, bottomY: lastChildY };
    }

    effectiveRoots.forEach(root => {
      layoutSubtree(root.id, 0);
      currentGlobalY += 30; // Extra gap between major trees
    });

    // Draw SVG connections first (busbars / power feed lines)
    let svgLines = '';
    filteredNodes.forEach(child => {
      if (!child.parentId || !positions.has(child.id) || !positions.has(child.parentId)) return;

      const pPos = positions.get(child.parentId);
      const cPos = positions.get(child.id);

      const x1 = pPos.x + CARD_WIDTH;
      const y1 = pPos.y + (CARD_HEIGHT / 2);
      const x2 = cPos.x;
      const y2 = cPos.y + (CARD_HEIGHT / 2);
      const xMid = Math.round((x1 + x2) / 2);

      const d = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;
      const isSelected = state.selectedNodeId === child.id || state.selectedNodeId === child.parentId;

      svgLines += `<path class="el-conn-line${isSelected ? ' is-active' : ''}" d="${d}" data-child-id="${child.id}" data-parent-id="${child.parentId}"></path>`;
      
      // Voltage / Current rating label on connecting busbar
      if (child.currentRating > 0 && Math.abs(x2 - x1) > 60) {
        svgLines += `<text class="el-conn-text" x="${xMid}" y="${y2 - 6}">${child.currentRating}A</text>`;
      }
    });
    svgLayer.innerHTML = svgLines;

    // Render node cards
    filteredNodes.forEach(node => {
      if (!positions.has(node.id)) return;
      const pos = positions.get(node.id);

      const card = document.createElement('div');
      card.className = `el-node-card type-${node.nodeType.toLowerCase()}${state.selectedNodeId === node.id ? ' is-selected' : ''}`;
      card.style.left = pos.x + 'px';
      card.style.top = pos.y + 'px';
      card.dataset.id = node.id;

      const children = childrenMap.get(node.id) || [];
      const hasPhoto = Boolean(node.imageUrl || node.driveFileId);

      card.innerHTML = `
        <div class="el-node-card-accent"></div>
        <div class="el-node-card-content">
          <div class="el-node-header">
            <span class="kpi-badge badge-${node.nodeType.toLowerCase()}">${escapeHtml(node.nodeType)}</span>
            <span class="el-node-code">${escapeHtml(node.nodeCode)}</span>
            ${hasPhoto ? '<span title="มีรูปภาพ" style="font-size:12px;">📷</span>' : ''}
          </div>
          <div class="el-node-name" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</div>
          <div class="el-node-meta-row">
            <span class="el-node-current">${node.currentRating ? node.currentRating + ' A' : '-'}</span>
            ${children.length > 0 ? `<span class="el-node-children-tag">${children.length} สายย่อย</span>` : '<span style="font-size:11px;color:#94a3b8;">ปลายทาง</span>'}
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        openInspector(node.id);
      });

      nodesLayer.appendChild(card);
    });

    applyPanZoomTransform();
  }

  function applyPanZoomTransform() {
    const panLayer = $('diagram-pan-layer');
    if (panLayer) {
      const { x, y, scale } = state.panZoom;
      panLayer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      const zoomText = $('zoom-level-text');
      if (zoomText) zoomText.textContent = Math.round(scale * 100) + '%';
    }
  }

  // Diagram Zoom & Pan Event Listeners
  function initDiagramPanZoom() {
    const viewport = $('diagram-viewport');
    if (!viewport) return;

    // Pan with mouse drag
    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.el-node-card')) return;
      state.panZoom.isPanning = true;
      state.panZoom.startX = e.clientX - state.panZoom.x;
      state.panZoom.startY = e.clientY - state.panZoom.y;
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.panZoom.isPanning) return;
      state.panZoom.x = e.clientX - state.panZoom.startX;
      state.panZoom.y = e.clientY - state.panZoom.startY;
      applyPanZoomTransform();
    });

    window.addEventListener('mouseup', () => {
      state.panZoom.isPanning = false;
    });

    // Zoom with scroll wheel
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(2.5, Math.max(0.3, state.panZoom.scale + delta));
      
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      state.panZoom.x = mouseX - (mouseX - state.panZoom.x) * (newScale / state.panZoom.scale);
      state.panZoom.y = mouseY - (mouseY - state.panZoom.y) * (newScale / state.panZoom.scale);
      state.panZoom.scale = newScale;

      applyPanZoomTransform();
    }, { passive: false });

    // Zoom buttons
    $('btn-zoom-in')?.addEventListener('click', () => {
      state.panZoom.scale = Math.min(2.5, state.panZoom.scale + 0.15);
      applyPanZoomTransform();
    });
    $('btn-zoom-out')?.addEventListener('click', () => {
      state.panZoom.scale = Math.max(0.3, state.panZoom.scale - 0.15);
      applyPanZoomTransform();
    });
    $('btn-zoom-reset')?.addEventListener('click', () => {
      state.panZoom.scale = 1.0;
      state.panZoom.x = 40;
      state.panZoom.y = 40;
      applyPanZoomTransform();
    });

    // Fullscreen toggle
    $('btn-fullscreen')?.addEventListener('click', () => {
      viewport.classList.toggle('is-fullscreen');
      const isFull = viewport.classList.contains('is-fullscreen');
      $('btn-fullscreen').querySelector('span').textContent = isFull ? 'ออกเต็มจอ' : 'เต็มจอ';
    });

    // Tree root filter
    $('filter-tree-root')?.addEventListener('change', (e) => {
      state.treeRootFilter = e.target.value;
      renderDiagram();
    });

    // Toggle show machines
    $('toggle-show-machines')?.addEventListener('change', (e) => {
      state.showMachines = e.target.checked;
      renderDiagram();
    });
  }

  // ==========================================================================
  // TAB 2: PANEL DIRECTORY (TABLE & CARDS)
  // ==========================================================================

  function renderDirectory() {
    const tbody = $('nodes-table-body');
    if (!tbody) return;

    let items = state.nodes.slice();

    // 1. Type Filter
    if (state.filterType !== 'ALL') {
      items = items.filter(n => n.nodeType === state.filterType);
    }

    // 2. Location Filter
    if (state.locationFilter) {
      items = items.filter(n => n.location === state.locationFilter);
    }

    // 3. Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(n =>
        (n.nodeCode || '').toLowerCase().includes(q) ||
        (n.name || '').toLowerCase().includes(q) ||
        (n.location || '').toLowerCase().includes(q) ||
        (n.remark || '').toLowerCase().includes(q)
      );
    }

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding: 40px; color: var(--el-ink-muted);">
            ไม่พบข้อมูลตู้หรืออุปกรณ์ไฟฟ้าที่ตรงกับเงื่อนไขการค้นหา
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    items.forEach(node => {
      const thumbUrl = node.imageUrl || (node.driveFileId ? `https://drive.google.com/thumbnail?id=${node.driveFileId}&sz=w100` : '');
      const parentLabel = node.parentCode ? `${escapeHtml(node.parentCode)} - ${escapeHtml(node.parentName)}` : '<span style="color:#94a3b8;">- เมนหลัก / ยังไม่ต่อ -</span>';

      html += `
        <tr data-id="${node.id}">
          <td>
            ${thumbUrl ? `
              <img src="${escapeHtml(thumbUrl)}" class="el-table-thumbnail" alt="ตู้" data-large="${escapeHtml(node.imageUrl || thumbUrl)}">
            ` : `
              <div class="el-table-thumb-empty">⚡</div>
            `}
          </td>
          <td>
            <strong class="font-mono" style="color:var(--el-ink); font-size:13.5px;">${escapeHtml(node.nodeCode)}</strong>
          </td>
          <td>
            <div style="font-weight:600; color:#0f172a;">${escapeHtml(node.name)}</div>
            ${node.remark ? `<div style="font-size:11.5px; color:#64748b; margin-top:2px;">${escapeHtml(node.remark)}</div>` : ''}
          </td>
          <td>
            <span class="kpi-badge badge-${node.nodeType.toLowerCase()}">${escapeHtml(node.nodeType)}</span>
          </td>
          <td>
            <strong class="font-mono" style="color:#1e293b;">${node.currentRating ? node.currentRating + ' A' : '-'}</strong>
          </td>
          <td style="color:#64748b; font-size:12px;">
            ${escapeHtml(node.voltage || '-')}
          </td>
          <td>
            <span style="font-size:12.5px; color:#334155;">${escapeHtml(node.location || '-')}</span>
          </td>
          <td>
            <span style="font-size:12px; color:#475569;">${parentLabel}</span>
          </td>
          <td style="text-align: center;">
            <span class="el-sub-badge">${node.childCount || 0}</span>
          </td>
          <td style="text-align: center;">
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <button type="button" class="btn btn-secondary btn-sm btn-action-view" data-id="${node.id}" title="เปิดดูข้อมูล">
                ดูผัง
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-action-edit" data-id="${node.id}" title="แก้ไข">
                แก้ไข
              </button>
              <button type="button" class="btn btn-danger-ghost btn-sm btn-action-delete" data-id="${node.id}" title="ลบ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach row events
    tbody.querySelectorAll('.btn-action-view').forEach(btn => {
      btn.onclick = () => openInspector(btn.dataset.id);
    });
    tbody.querySelectorAll('.btn-action-edit').forEach(btn => {
      btn.onclick = () => openEditModal(btn.dataset.id);
    });
    tbody.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.onclick = () => confirmDeleteNode(btn.dataset.id);
    });
    tbody.querySelectorAll('.el-table-thumbnail').forEach(img => {
      img.onclick = () => openLightbox(img.dataset.large);
    });
  }

  // ==========================================================================
  // TAB 3: QUICK WIRING MATRIX
  // ==========================================================================

  function renderWiringMatrix() {
    const tbody = $('wiring-table-body');
    const saveBtn = $('btn-save-all-wiring');
    if (!tbody) return;

    if (state.nodes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">ไม่มีข้อมูลตู้</td></tr>';
      return;
    }

    let html = '';
    state.nodes.forEach(node => {
      const currentParentId = state.pendingWiring.has(node.id)
        ? state.pendingWiring.get(node.id)
        : (node.parentId || '');

      let options = '<option value="">-- เป็นตู้ประธานหลัก (MDB) หรือยังไม่เชื่อมโยง --</option>';
      state.nodes.forEach(opt => {
        if (opt.id === node.id) return; // Prevent picking self
        const selected = opt.id === currentParentId ? ' selected' : '';
        options += `<option value="${opt.id}"${selected}>${escapeHtml(opt.nodeCode)} - ${escapeHtml(opt.name)} (${opt.nodeType})</option>`;
      });

      const isChanged = state.pendingWiring.has(node.id) && state.pendingWiring.get(node.id) !== (node.parentId || '');
      const statusPill = isChanged
        ? '<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">รอยืนยัน</span>'
        : (node.parentId ? '<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:4px; font-size:11px;">เชื่อมต่อแล้ว</span>' : '<span style="background:#f1f5f9; color:#64748b; padding:2px 8px; border-radius:4px; font-size:11px;">สายอิสระ</span>');

      html += `
        <tr data-id="${node.id}" style="${isChanged ? 'background: #fffbeb;' : ''}">
          <td><strong class="font-mono">${escapeHtml(node.nodeCode)}</strong></td>
          <td>${escapeHtml(node.name)}</td>
          <td><span class="kpi-badge badge-${node.nodeType.toLowerCase()}">${escapeHtml(node.nodeType)}</span></td>
          <td class="font-mono">${node.currentRating ? node.currentRating + ' A' : '-'}</td>
          <td>${escapeHtml(node.location || '-')}</td>
          <td>
            <select class="el-select el-wiring-select" data-id="${node.id}" style="width:100%;">
              ${options}
            </select>
          </td>
          <td>${statusPill}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach wiring change listener
    tbody.querySelectorAll('.el-wiring-select').forEach(sel => {
      sel.onchange = (e) => {
        const nodeId = sel.dataset.id;
        const newParentId = e.target.value;
        const node = state.nodes.find(n => n.id === nodeId);
        if (newParentId === (node?.parentId || '')) {
          state.pendingWiring.delete(nodeId);
        } else {
          state.pendingWiring.set(nodeId, newParentId);
        }
        if (saveBtn) saveBtn.disabled = state.pendingWiring.size === 0;
        renderWiringMatrix();
      };
    });

    if (saveBtn) saveBtn.disabled = state.pendingWiring.size === 0;
  }

  // Save all pending wiring changes in batch
  async function savePendingWiring() {
    if (state.pendingWiring.size === 0) return;
    const links = [];
    state.pendingWiring.forEach((parentId, id) => {
      links.push({ id, parentId: parentId || null });
    });

    const saveBtn = $('btn-save-all-wiring');
    if (saveBtn) saveBtn.disabled = true;

    try {
      await rpc('bulkUpdateWiring', links);
      state.pendingWiring.clear();
      alert('บันทึกการเชื่อมโยงสายจ่ายไฟสำเร็จ');
      await loadData();
    } catch (err) {
      alert('บันทึกการเชื่อมโยงไม่สำเร็จ: ' + err.message);
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  // ==========================================================================
  // SLIDE-OVER INSPECTOR DRAWER
  // ==========================================================================

  async function openInspector(nodeId) {
    state.selectedNodeId = nodeId;
    const drawer = $('node-inspector');
    const overlay = $('inspector-overlay');
    if (!drawer || !overlay) return;

    try {
      const node = await rpc('getNode', nodeId);
      if (!node) return;

      $('inspect-code').textContent = node.nodeCode;
      $('inspect-name').textContent = node.name;

      const badge = $('inspect-badge');
      badge.className = `kpi-badge badge-${node.nodeType.toLowerCase()}`;
      badge.textContent = node.nodeType;

      $('inspect-current').textContent = node.currentRating ? node.currentRating + ' A' : '-';
      $('inspect-voltage').textContent = node.voltage || '-';
      $('inspect-location').textContent = node.location || '-';

      // Upstream Feeder Breadcrumb
      if (node.parentCode) {
        $('inspect-parent').innerHTML = `
          <a href="#" class="btn-inspect-jump font-mono" data-id="${node.parentId}" style="color:var(--el-primary); text-decoration:none;">
            ${escapeHtml(node.parentCode)} (${escapeHtml(node.parentName)}) &rarr;
          </a>
        `;
        $('inspect-parent').querySelector('a').onclick = (e) => {
          e.preventDefault();
          openInspector(node.parentId);
        };
      } else {
        $('inspect-parent').textContent = 'ตู้ประธาน (MDB) หรือยังไม่ได้เชื่อมโยง';
      }

      $('inspect-remark').textContent = node.remark || '-';

      // Photos & Drive Link
      const photoEl = $('inspect-photo');
      const placeholder = $('inspect-photo-placeholder');
      const driveLink = $('inspect-drive-link');

      const photoUrl = node.imageUrl || (node.driveFileId ? `https://drive.google.com/thumbnail?id=${node.driveFileId}&sz=w600` : '');
      if (photoUrl) {
        photoEl.src = photoUrl;
        photoEl.style.display = 'block';
        placeholder.style.display = 'none';
        photoEl.onclick = () => openLightbox(node.imageUrl || photoUrl);
      } else {
        photoEl.style.display = 'none';
        placeholder.style.display = 'flex';
      }

      if (node.driveFileId || node.imageUrl) {
        const fileId = node.driveFileId || (node.imageUrl.match(/\/d\/([\w-]+)/)?.[1]);
        if (fileId) {
          driveLink.href = `https://drive.google.com/file/d/${fileId}/view`;
          driveLink.style.display = 'inline-flex';
        } else {
          driveLink.style.display = 'none';
        }
      } else {
        driveLink.style.display = 'none';
      }

      // Children list
      const childrenList = $('inspect-children-list');
      const childrenCount = $('inspect-children-count');
      childrenCount.textContent = node.children.length;

      if (node.children.length === 0) {
        childrenList.innerHTML = '<div class="el-empty-sub">ไม่มีสายย่อยแยกจากตู้นี้ (End Node)</div>';
      } else {
        let cHtml = '';
        node.children.forEach(c => {
          cHtml += `
            <div class="el-child-item" data-id="${c.id}">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="kpi-badge badge-${c.nodeType.toLowerCase()}">${c.nodeType}</span>
                <strong class="font-mono">${escapeHtml(c.nodeCode)}</strong>
                <span style="font-size:12px; color:#475569;">${escapeHtml(c.name)}</span>
              </div>
              <span class="font-mono" style="font-size:12px; font-weight:600; color:#b45309;">${c.currentRating ? c.currentRating + 'A' : ''}</span>
            </div>
          `;
        });
        childrenList.innerHTML = cHtml;

        childrenList.querySelectorAll('.el-child-item').forEach(item => {
          item.onclick = () => openInspector(item.dataset.id);
        });
      }

      // Action buttons
      $('btn-inspect-edit').onclick = () => {
        closeInspector();
        openEditModal(node.id);
      };
      $('btn-inspect-delete').onclick = () => {
        confirmDeleteNode(node.id);
      };

      drawer.classList.add('is-open');
      overlay.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');

      // Highlight in diagram if active
      if (state.currentTab === 'diagram') {
        renderDiagram();
      }
    } catch (err) {
      console.error('Error fetching node details:', err);
    }
  }

  function closeInspector() {
    const drawer = $('node-inspector');
    const overlay = $('inspector-overlay');
    if (drawer) {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('is-open');
    state.selectedNodeId = null;
    if (state.currentTab === 'diagram') {
      renderDiagram();
    }
  }

  // ==========================================================================
  // NODE FORM MODAL (CREATE / EDIT)
  // ==========================================================================

  function openCreateModal() {
    $('modal-form-title').textContent = 'เพิ่มตู้ / อุปกรณ์ไฟฟ้าใหม่';
    $('form-id').value = '';
    $('form-node-code').value = '';
    $('form-node-type').value = 'DB';
    $('form-name').value = '';
    $('form-current-rating').value = '';
    $('form-voltage').value = '400V 3P4W';
    $('form-location').value = '';
    $('form-remark').value = '';
    $('form-error-msg').style.display = 'none';

    state.formImage = null;
    state.removeImageFlag = false;
    resetPhotoPreview();
    updateParentSelector('');
    toggleMachinePickerRow('DB');

    $('modal-node-form').showModal();
  }

  function openEditModal(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    $('modal-form-title').textContent = `แก้ไขข้อมูล: ${node.nodeCode}`;
    $('form-id').value = node.id;
    $('form-node-code').value = node.nodeCode;
    $('form-node-type').value = node.nodeType;
    $('form-name').value = node.name;
    $('form-current-rating').value = node.currentRating || '';
    $('form-voltage').value = node.voltage || '400V 3P4W';
    $('form-location').value = node.location || '';
    $('form-remark').value = node.remark || '';
    $('form-error-msg').style.display = 'none';

    state.formImage = null;
    state.removeImageFlag = false;

    // Photo preview
    const photoUrl = node.imageUrl || (node.driveFileId ? `https://drive.google.com/thumbnail?id=${node.driveFileId}&sz=w300` : '');
    setPhotoPreview(photoUrl);

    updateParentSelector(node.parentId, node.id);
    toggleMachinePickerRow(node.nodeType);

    $('modal-node-form').showModal();
  }

  function updateParentSelector(currentParentId, excludeId) {
    const sel = $('form-parent-id');
    if (!sel) return;

    let html = '<option value="">-- ไม่มี (เป็นตู้ประธาน MDB หรือยังไม่เชื่อมโยง) --</option>';
    state.nodes.forEach(n => {
      if (n.id === excludeId) return; // Cannot be own parent
      const selected = n.id === currentParentId ? ' selected' : '';
      html += `<option value="${n.id}"${selected}>${escapeHtml(n.nodeCode)} - ${escapeHtml(n.name)} (${n.nodeType})</option>`;
    });
    sel.innerHTML = html;
  }

  function toggleMachinePickerRow(type) {
    const row = $('row-machine-picker');
    if (row) {
      row.style.display = type === 'MC' ? 'block' : 'none';
    }
  }

  function resetPhotoPreview() {
    $('form-preview-img').style.display = 'none';
    $('form-preview-empty').style.display = 'flex';
    $('btn-remove-photo').style.display = 'none';
  }

  function setPhotoPreview(url) {
    if (url) {
      $('form-preview-img').src = url;
      $('form-preview-img').style.display = 'block';
      $('form-preview-empty').style.display = 'none';
      $('btn-remove-photo').style.display = 'inline-flex';
    } else {
      resetPhotoPreview();
    }
  }

  // Handle Photo File selection
  function handlePhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('ขนาดไฟล์เกินกำหนด (สูงสุด 15MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1];
      state.formImage = {
        mime: file.type,
        base64: base64Data
      };
      state.removeImageFlag = false;
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Submit Node Form
  async function submitNodeForm(e) {
    e.preventDefault();
    const errorEl = $('form-error-msg');
    const submitBtn = $('btn-modal-submit');
    errorEl.style.display = 'none';

    const id = $('form-id').value;
    const nodeCode = $('form-node-code').value.trim();
    const name = $('form-name').value.trim();
    const nodeType = $('form-node-type').value;
    const currentRating = parseFloat($('form-current-rating').value) || 0;
    const voltage = $('form-voltage').value.trim();
    const location = $('form-location').value.trim();
    const parentId = $('form-parent-id').value;
    const remark = $('form-remark').value.trim();

    if (!nodeCode) {
      errorEl.textContent = 'กรุณาระบุรหัสตู้ / Tag Code';
      errorEl.style.display = 'block';
      return;
    }
    if (!name) {
      errorEl.textContent = 'กรุณาระบุชื่อตู้หรืออุปกรณ์';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'กำลังบันทึก...';

    try {
      const payload = {
        id: id || undefined,
        nodeCode,
        name,
        nodeType,
        currentRating,
        voltage,
        location,
        parentId: parentId || null,
        remark,
        image: state.formImage,
        removeImage: state.removeImageFlag
      };

      await rpc('saveNode', payload);
      $('modal-node-form').close();
      await loadData();

      if (id && state.selectedNodeId === id) {
        openInspector(id);
      }
    } catch (err) {
      errorEl.textContent = err.message || 'บันทึกข้อมูลไม่สำเร็จ';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'บันทึกข้อมูล';
    }
  }

  // Delete confirmation
  async function confirmDeleteNode(id) {
    const node = state.nodes.find(n => n.id === id);
    if (!node) return;

    const msg = `ต้องการลบตู้/อุปกรณ์ "${node.nodeCode} - ${node.name}" ใช่หรือไม่?\n\n*หมายเหตุ: สายย่อยที่รับไฟจากตู้นี้จะถูกปลดสายออก (ตั้งค่าต้นทางเป็นว่าง) โดยไม่ถูกลบ`;
    if (!confirm(msg)) return;

    try {
      await rpc('deleteNode', id);
      closeInspector();
      await loadData();
    } catch (err) {
      alert('ลบข้อมูลไม่สำเร็จ: ' + err.message);
    }
  }

  // Lightbox Modal
  function openLightbox(url) {
    if (!url) return;
    $('lightbox-img').src = url;
    $('modal-lightbox').showModal();
  }

  // Helpers
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Initialize UI & Event Handlers
  function init() {
    // 1. Tab buttons
    document.querySelectorAll('.el-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 2. Add node button
    $('btn-add-node')?.addEventListener('click', openCreateModal);
    $('btn-refresh')?.addEventListener('click', loadData);

    // 3. KPI card filter clicks
    document.querySelectorAll('.el-kpi-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.filterType;
        if (type) {
          state.filterType = type;
          document.querySelectorAll('.el-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.type === type);
          });
          switchTab('directory');
        }
      });
    });

    // 4. Directory filters & Search
    const searchInput = $('dir-search-input');
    const clearBtn = $('dir-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        if (clearBtn) clearBtn.style.display = state.searchQuery ? 'inline-block' : 'none';
        renderDirectory();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearBtn.style.display = 'none';
        renderDirectory();
      });
    }

    // Type Pills
    document.querySelectorAll('.el-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.el-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filterType = pill.dataset.type;
        renderDirectory();
      });
    });

    // Location Filter
    $('dir-location-filter')?.addEventListener('change', (e) => {
      state.locationFilter = e.target.value;
      renderDirectory();
    });

    // 5. Wiring Matrix Save
    $('btn-save-all-wiring')?.addEventListener('click', savePendingWiring);

    // 6. Inspector close
    $('btn-close-inspector')?.addEventListener('click', closeInspector);
    $('inspector-overlay')?.addEventListener('click', closeInspector);

    // 7. Modal form events
    $('btn-modal-close')?.addEventListener('click', () => $('modal-node-form').close());
    $('btn-modal-cancel')?.addEventListener('click', () => $('modal-node-form').close());
    $('form-node')?.addEventListener('submit', submitNodeForm);

    // Machine Picker auto-populate
    $('form-node-type')?.addEventListener('change', (e) => {
      toggleMachinePickerRow(e.target.value);
    });
    $('form-machine-picker')?.addEventListener('change', (e) => {
      const opt = e.target.selectedOptions?.[0];
      if (opt && opt.dataset.code) {
        $('form-node-code').value = opt.dataset.code;
        $('form-name').value = opt.dataset.name;
      }
    });

    // Photo File inputs
    $('btn-select-file')?.addEventListener('click', () => $('form-file-input').click());
    $('form-file-input')?.addEventListener('change', (e) => {
      if (e.target.files?.[0]) handlePhotoFile(e.target.files[0]);
    });
    $('btn-remove-photo')?.addEventListener('click', () => {
      state.formImage = null;
      state.removeImageFlag = true;
      resetPhotoPreview();
    });

    // Lightbox close
    $('btn-lightbox-close')?.addEventListener('click', () => $('modal-lightbox').close());

    // 8. Pan & Zoom
    initDiagramPanZoom();

    // 9. Load data
    loadData();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
