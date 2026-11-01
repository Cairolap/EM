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
    
    // Directory pagination & filters
    filterType: 'ALL',
    searchQuery: '',
    locationFilter: '',
    dirPage: 1,
    dirPageSize: 50,

    // Quick Wiring pagination & filters
    wiringFilterType: 'ALL',
    wiringSearchQuery: '',
    wiringStatusFilter: 'UNLINKED',
    wiringPage: 1,
    wiringPageSize: 50,

    selectedNodeId: null,
    explorerSearchQuery: '',
    downstreamFilterQuery: '',
    pendingWiring: new Map(), // id -> parentId
    formImage: null, // { mime, base64 } or null
    removeImageFlag: false,
    formRemovedChildIds: [],
    parentExcludeId: null,
    parentDropdownOpen: false,
    parentHighlightIndex: -1,
    wiringDropdownOpen: false,
    wiringDropdownNodeId: null,
    wiringDropdownTrigger: null,
    wiringHighlightIndex: -1
  };

  // DOM Elements cache
  const $ = id => document.getElementById(id);

  // Auth State & Guards
  function isLoggedIn() {
    return Boolean(window.EM_CURRENT_USER || window.currentUser);
  }

  async function ensureAuthenticated() {
    if (isLoggedIn()) return true;
    try {
      const meRes = await fetch('/api/v1/auth/me', { credentials: 'same-origin' });
      if (meRes.ok) {
        const meJson = await meRes.json();
        if (meJson.ok && meJson.data) {
          window.currentUser = meJson.data;
          window.EM_CURRENT_USER = meJson.data;
          updateAuthPill();
          return true;
        }
      }
    } catch (_) {}

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
      pill.title = `เข้าสู่ระบบแล้ว (${user.displayName || user.username}) สามารถเพิ่ม แก้ไข ลบ และส่งออกข้อมูลได้`;
      text.textContent = `โหมดแก้ไขได้ (${user.displayName || user.username})`;
    } else {
      pill.classList.remove('is-logged-in');
      pill.classList.add('is-guest');
      pill.title = 'ดูข้อมูลได้ไม่ต้องล็อกอิน (คลิกเพื่อเข้าสู่ระบบหากต้องการเพิ่ม แก้ไข หรือส่งออก)';
      text.textContent = 'ดูข้อมูลได้ (คลิกเพื่อล็อกอิน)';
    }
  }

  // RPC Client Helper
  async function rpc(method, ...args) {
    const res = await fetch('/api/v1/electrical/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    if (res.status === 401) {
      const authed = await ensureAuthenticated();
      if (authed) {
        return rpc(method, ...args);
      }
    }
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
      // 1. Try public read endpoint first (no login required to view diagram)
      const pubRes = await fetch('/api/v1/electrical/public', { credentials: 'same-origin' });
      if (pubRes.ok) {
        const pubJson = await pubRes.json();
        if (pubJson.ok && pubJson.data) {
          state.nodes = pubJson.data.nodes || [];
          state.references = pubJson.data.references || { nodes: [], machines: [], types: [] };
          updateKpis();
          populateDropdowns();
          renderCurrentTab();
          updateAuthPill();
          syncNodeFromUrl({ scrollToTop: false });
          return;
        }
      }

      // Fallback to RPC if public API fails
      const [nodes, refs] = await Promise.all([
        rpc('listNodes', {}),
        rpc('getReferences')
      ]);
      state.nodes = nodes || [];
      state.references = refs || { nodes: [], machines: [], types: [] };

      updateKpis();
      populateDropdowns();
      renderCurrentTab();
      updateAuthPill();
      syncNodeFromUrl({ scrollToTop: false });
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
    closeWiringDropdown();
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

  // Natural sort comparator so MDB1, MDB2..MDB10 and Q1, Q2..Q10 sort numerically
  function naturalCompare(a, b) {
    return String(a.nodeCode || '').localeCompare(String(b.nodeCode || ''), undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }

  function getNodeById(id) {
    if (!id) return null;
    return state.nodes.find(n => n.id === id) || null;
  }

  function getChildrenOf(parentId) {
    if (!parentId) return [];
    return state.nodes.filter(n => n.parentId === parentId).sort(naturalCompare);
  }

  function getAncestorsOf(nodeId) {
    const chain = [];
    const visited = new Set();
    let curr = getNodeById(nodeId);
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      chain.unshift(curr);
      curr = curr.parentId ? getNodeById(curr.parentId) : null;
    }
    return chain;
  }

  function getNodeDriveFileId(node) {
    if (!node) return '';
    const rawId = String(node.driveFileId || '').trim();
    if (rawId) return rawId;
    const rawUrl = String(node.imageUrl || '').trim();
    return rawUrl.match(/\/d\/([\w-]{10,})/)?.[1]
      || rawUrl.match(/[?&]id=([\w-]{10,})/)?.[1]
      || '';
  }

  function getNodePhotoUrl(node) {
    if (!node) return '';
    const fileId = getNodeDriveFileId(node);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    const rawUrl = String(node.imageUrl || '').trim();
    if (rawUrl && !rawUrl.includes('drive.google.com/file/d/')) {
      return rawUrl;
    }
    return '';
  }

  // URL Linking Helpers for Deep-Linking & Sharing Panels
  function getNodeShareUrl(node) {
    if (!node) return window.location.origin + window.location.pathname;
    const url = new URL(window.location.href);
    url.searchParams.set('node', node.nodeCode || node.id);
    return url.toString();
  }

  function updateBrowserUrl(nodeId, replace = false) {
    if (typeof window === 'undefined' || !window.history) return;
    const url = new URL(window.location.href);
    if (nodeId) {
      const node = getNodeById(nodeId);
      const codeOrId = node?.nodeCode || nodeId;
      url.searchParams.set('node', codeOrId);
    } else {
      url.searchParams.delete('node');
      url.searchParams.delete('code');
      url.searchParams.delete('id');
    }
    const newRelative = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
    const currentRelative = window.location.pathname + window.location.search + window.location.hash;
    if (newRelative !== currentRelative) {
      if (replace) {
        window.history.replaceState({ nodeId }, '', newRelative);
      } else {
        window.history.pushState({ nodeId }, '', newRelative);
      }
    }
  }

  function syncNodeFromUrl(options = {}) {
    if (!state.nodes || state.nodes.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const target = (params.get('node') || params.get('code') || params.get('id') || '').trim();
    if (!target) {
      if (state.selectedNodeId) {
        openNodeInExplorer(null, { syncUrl: false, scrollToTop: false });
      }
      return;
    }

    const found = state.nodes.find(n => 
      String(n.nodeCode || '').toLowerCase() === target.toLowerCase() ||
      String(n.id || '').toLowerCase() === target.toLowerCase()
    );

    if (found) {
      openNodeInExplorer(found.id, { syncUrl: false, scrollToTop: options.scrollToTop !== false });
    }
  }

  // ==========================================================================
  // TAB 1: PANEL EXPLORER (MDB HOME CARDS & DRILL-DOWN DETAIL VIEW)
  // ==========================================================================

  function openNodeInExplorer(nodeId, options = {}) {
    state.selectedNodeId = nodeId || null;
    state.downstreamFilterQuery = '';
    const drop = $('explorer-search-dropdown');
    if (drop) drop.style.display = 'none';

    if (options.syncUrl !== false) {
      updateBrowserUrl(nodeId, options.replaceState === true);
    }

    if (state.currentTab !== 'diagram') {
      switchTab('diagram');
    } else {
      renderDiagram();
    }

    if (options.scrollToTop !== false) {
      const targetEl = $('tab-diagram');
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        if (rect.top < 0 || rect.top > 260) {
          window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 72), behavior: 'smooth' });
        }
      }
    }
  }

  function renderDiagram() {
    const homeView = $('explorer-home-view');
    const detailView = $('explorer-detail-view');
    const emptyState = $('diagram-empty-state');
    const mdbGrid = $('explorer-mdb-grid');
    if (!homeView || !detailView || !mdbGrid) return;

    renderMdbQuickStrip();
    renderExplorerBreadcrumbs();

    // If selectedNodeId is set, verify it still exists
    const activeNode = state.selectedNodeId ? getNodeById(state.selectedNodeId) : null;
    if (state.selectedNodeId && !activeNode) {
      state.selectedNodeId = null;
    }

    if (activeNode) {
      homeView.style.display = 'none';
      detailView.style.display = 'block';
      renderExplorerDetail(activeNode);
    } else {
      detailView.style.display = 'none';
      homeView.style.display = 'block';
      renderExplorerHome();
    }
  }

  function renderMdbQuickStrip() {
    const strip = $('explorer-mdb-strip');
    if (!strip) return;

    // Only show MDB quick strip when on Home View; when inside a panel, show Breadcrumbs instead so we keep a single compact bar!
    const mdbs = state.nodes.filter(n => n.nodeType === 'MDB').sort(naturalCompare);
    if (mdbs.length === 0 || state.selectedNodeId) {
      strip.style.display = 'none';
      return;
    }
    strip.style.display = 'flex';

    let html = `
      <button type="button" class="el-mdb-pill is-active" data-mdb-id="">
        <span>⚡ MDB ทั้งหมด</span>
        <span class="el-mdb-pill-count">${mdbs.length}</span>
      </button>
    `;

    mdbs.forEach(m => {
      const childCount = getChildrenOf(m.id).length;
      html += `
        <button type="button" class="el-mdb-pill" data-mdb-id="${m.id}" title="${escapeHtml(m.name)}">
          <span>${escapeHtml(m.nodeCode)}</span>
          <span class="el-mdb-pill-count">${childCount}</span>
        </button>
      `;
    });

    strip.innerHTML = html;

    strip.querySelectorAll('.el-mdb-pill').forEach(btn => {
      btn.onclick = () => {
        const targetId = btn.dataset.mdbId;
        if (!targetId) {
          state.explorerSearchQuery = '';
          const sInput = $('explorer-search-input');
          const sClear = $('explorer-search-clear');
          if (sInput) sInput.value = '';
          if (sClear) sClear.style.display = 'none';
          openNodeInExplorer(null, { scrollToTop: false });
        } else {
          openNodeInExplorer(targetId);
        }
      };
    });
  }

  function renderExplorerBreadcrumbs() {
    const nav = $('explorer-breadcrumbs');
    if (!nav) return;

    if (!state.selectedNodeId) {
      nav.style.display = 'none';
      nav.innerHTML = '';
      return;
    }
    nav.style.display = 'flex';

    const chain = getAncestorsOf(state.selectedNodeId);
    const current = chain[chain.length - 1];
    const parentId = current?.parentId || '';

    let html = `
      <button type="button" class="el-crumb-back" id="btn-explorer-back" title="ย้อนกลับไปขั้นก่อนหน้า">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span>ย้อนกลับ</span>
      </button>
      <button type="button" class="el-crumb-home" data-jump-id="">
        <span>🏠 MDB ทั้งหมด</span>
      </button>
    `;

    chain.forEach((item, idx) => {
      const isLast = idx === chain.length - 1;
      html += `
        <span class="el-crumb-sep">&rsaquo;</span>
        <button type="button" class="el-crumb-btn${isLast ? ' is-active' : ''}" data-jump-id="${item.id}">
          <span class="kpi-badge badge-${item.nodeType.toLowerCase()}">${escapeHtml(item.nodeType)}</span>
          <span class="font-mono">${escapeHtml(item.nodeCode)}</span>
        </button>
      `;
    });

    nav.innerHTML = html;

    $('btn-explorer-back')?.addEventListener('click', () => {
      openNodeInExplorer(parentId || null);
    });

    nav.querySelectorAll('[data-jump-id]').forEach(btn => {
      btn.onclick = () => {
        const targetId = btn.dataset.jumpId;
        openNodeInExplorer(targetId || null);
      };
    });
  }

  function renderExplorerHome() {
    const mdbGrid = $('explorer-mdb-grid');
    const emptyState = $('diagram-empty-state');
    const searchBanner = $('explorer-search-banner');
    const titleEl = $('explorer-home-title');
    const countEl = $('explorer-home-count');
    if (!mdbGrid || !emptyState) return;

    const q = (state.explorerSearchQuery || '').trim().toLowerCase();
    let cardsToShow = [];

    if (q) {
      cardsToShow = state.nodes.filter(n =>
        (n.nodeCode || '').toLowerCase().includes(q) ||
        (n.name || '').toLowerCase().includes(q) ||
        (n.location || '').toLowerCase().includes(q) ||
        (n.remark || '').toLowerCase().includes(q) ||
        (n.parentCode || '').toLowerCase().includes(q)
      ).sort(naturalCompare);

      if (searchBanner) searchBanner.style.display = 'flex';
      if (titleEl) titleEl.textContent = `ผลการค้นหา "${state.explorerSearchQuery}"`;
      if (countEl) countEl.textContent = `${cardsToShow.length} รายการ`;
    } else {
      // Initial / Home screen: show ONLY MDB cards, no extra header banner!
      cardsToShow = state.nodes.filter(n => n.nodeType === 'MDB').sort(naturalCompare);
      if (searchBanner) searchBanner.style.display = 'none';
    }

    if (cardsToShow.length === 0) {
      mdbGrid.innerHTML = '';
      emptyState.style.display = 'flex';
      const h3 = emptyState.querySelector('h3');
      const p = emptyState.querySelector('p');
      if (q) {
        if (h3) h3.textContent = `ไม่พบตู้หรืออุปกรณ์ที่ตรงกับ "${state.explorerSearchQuery}"`;
        if (p) p.textContent = 'ลองค้นหาด้วยรหัสตู้ ชื่อตู้ หรือสถานที่ติดตั้งอีกครั้ง';
      } else {
        if (h3) h3.textContent = 'ยังไม่มีรายการตู้ควบคุมหลัก (MDB)';
        if (p) p.textContent = 'เริ่มต้นสร้างตู้จ่ายไฟหลัก (MDB) เพื่อเริ่มใช้งานแผนผังโครงข่าย';
      }
      return;
    }

    emptyState.style.display = 'none';

    let html = '';
    cardsToShow.forEach(node => {
      const children = getChildrenOf(node.id);
      const photoUrl = getNodePhotoUrl(node);
      const fileId = getNodeDriveFileId(node);
      const fallbackThumb = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w300` : '';
      const isMdb = node.nodeType === 'MDB';
      const hasDistinctName = !isMdb && node.name && node.name.trim().toUpperCase() !== (node.nodeCode || '').trim().toUpperCase();
      const subtitleText = hasDistinctName ? node.name : (node.location ? `📍 ${node.location}` : (node.name || 'ตู้จ่ายไฟหลัก'));
      const parentInfo = node.parentCode ? `${escapeHtml(node.parentCode)}` : '';

      html += `
        <article class="el-mdb-home-card type-${node.nodeType.toLowerCase()}" data-id="${node.id}">
          <div class="el-mdb-card-top-bar"></div>
          <div class="el-mdb-card-body">
            <div class="el-mdb-card-head">
              <div class="el-mdb-card-title-wrap">
                <div class="el-mdb-card-code-row">
                  <span class="kpi-badge badge-${node.nodeType.toLowerCase()}">${escapeHtml(node.nodeType)}</span>
                  <span class="el-mdb-card-code">${escapeHtml(node.nodeCode)}</span>
                </div>
                <div class="el-mdb-card-name" title="${escapeHtml(subtitleText)}">${escapeHtml(subtitleText)}</div>
              </div>
              ${photoUrl ? `
                <img src="${escapeHtml(photoUrl)}" class="el-mdb-card-thumb" alt="${escapeHtml(node.nodeCode)}" loading="lazy" data-fallback="${escapeHtml(fallbackThumb)}" onerror="if(this.dataset.fallback && this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}else{this.style.display='none';}">
              ` : ''}
            </div>

            <div class="el-mdb-card-specs">
              <div class="el-mdb-spec-box">
                <span class="el-mdb-spec-lbl">พิกัดกระแส</span>
                <span class="el-mdb-spec-val font-mono">${node.currentRating ? node.currentRating + ' A' : '-'}</span>
              </div>
              <div class="el-mdb-spec-box">
                <span class="el-mdb-spec-lbl">แรงดัน</span>
                <span class="el-mdb-spec-val">${escapeHtml(node.voltage || '-')}</span>
              </div>
              ${hasDistinctName && node.location ? `
                <div class="el-mdb-spec-box full-row">
                  <span class="el-mdb-spec-lbl">สถานที่</span>
                  <span class="el-mdb-spec-val">${escapeHtml(node.location)}</span>
                </div>
              ` : ''}
              ${parentInfo ? `
                <div class="el-mdb-spec-box full-row">
                  <span class="el-mdb-spec-lbl">ต้นทาง</span>
                  <span class="el-mdb-spec-val font-mono" style="color:#0284c7;">${parentInfo}</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="el-mdb-card-footer">
            <span class="el-mdb-subcount">
              <span>🔌 วงจรย่อย:</span>
              <span class="el-sub-badge">${children.length}</span>
            </span>
            <a href="?node=${encodeURIComponent(node.nodeCode)}" class="el-mdb-open-cta font-mono" data-id="${node.id}">เปิดผัง &rarr;</a>
          </div>
        </article>
      `;
    });

    mdbGrid.innerHTML = html;

    mdbGrid.querySelectorAll('.el-mdb-home-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('a')) e.preventDefault();
        openNodeInExplorer(card.dataset.id);
      };
    });
  }

  function renderExplorerDetail(node) {
    const detailContainer = $('explorer-detail-view');
    if (!detailContainer) return;

    const children = getChildrenOf(node.id);
    const photoUrl = getNodePhotoUrl(node);
    const fileId = getNodeDriveFileId(node);
    const fallbackLarge = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800` : '';
    const driveHref = fileId ? `https://drive.google.com/file/d/${fileId}/view` : '';
    const hasDistinctName = node.name && node.name.trim().toUpperCase() !== (node.nodeCode || '').trim().toUpperCase();

    const parentHtml = node.parentId && node.parentCode
      ? `<a class="el-feeder-jump-link font-mono" id="detail-jump-parent" data-id="${node.parentId}">
           <span>${escapeHtml(node.parentCode)} (${escapeHtml(node.parentName || '')})</span>
           <span>&uarr;</span>
         </a>`
      : 'ตู้ประธาน (MDB) / ยังไม่เชื่อมโยง';

    const filterVal = (state.downstreamFilterQuery || '').trim().toLowerCase();
    const visibleChildren = filterVal
      ? children.filter(c =>
          (c.nodeCode || '').toLowerCase().includes(filterVal) ||
          (c.name || '').toLowerCase().includes(filterVal) ||
          (c.location || '').toLowerCase().includes(filterVal)
        )
      : children;

    let childrenHtml = '';
    if (children.length === 0) {
      childrenHtml = `
        <div class="el-empty-sub" style="grid-column: 1 / -1; padding:16px; text-align:center; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px;">
          ไม่มีตู้หรืออุปกรณ์ย่อยที่ต่อออกจากรายการนี้ (ปลายทาง / End Load)
        </div>
      `;
    } else if (visibleChildren.length === 0) {
      childrenHtml = `
        <div class="el-empty-sub" style="grid-column: 1 / -1; padding:14px; text-align:center; background:#f8fafc; border-radius:8px;">
          ไม่พบลูกตู้ที่ตรงกับคำค้นหา "${escapeHtml(state.downstreamFilterQuery)}"
        </div>
      `;
    } else {
      visibleChildren.forEach(c => {
        const subCount = getChildrenOf(c.id).length;
        const showLoc = c.location && c.location !== node.location;
        childrenHtml += `
          <a href="?node=${encodeURIComponent(c.nodeCode)}" class="el-downstream-item" data-child-id="${c.id}" title="${escapeHtml(c.nodeCode)} - ${escapeHtml(c.name)}">
            <div class="el-downstream-item-left">
              <span class="kpi-badge badge-${c.nodeType.toLowerCase()}">${escapeHtml(c.nodeType)}</span>
              <div class="el-downstream-text-group">
                <div class="el-downstream-main-line">
                  <strong class="el-downstream-code">${escapeHtml(c.nodeCode)}</strong>
                  <span class="el-downstream-name">${escapeHtml(c.name)}</span>
                </div>
                ${showLoc ? `<span class="el-downstream-loc">&middot; ${escapeHtml(c.location)}</span>` : ''}
              </div>
            </div>
            <div class="el-downstream-item-right">
              ${subCount > 0 ? `<span class="el-downstream-sub-pill">${subCount}</span>` : ''}
              <span class="el-downstream-amp">${c.currentRating ? c.currentRating + 'A' : ''}</span>
              <span class="el-downstream-arrow">&rsaquo;</span>
            </div>
          </a>
        `;
      });
    }

    detailContainer.innerHTML = `
      <div class="el-detail-card">
        <!-- Compact Dark Navy Header -->
        <div class="el-detail-header">
          <div class="el-detail-header-left">
            <div class="el-detail-title-row">
              <span class="kpi-badge badge-${node.nodeType.toLowerCase()}">${escapeHtml(node.nodeType)}</span>
              <h2 class="el-detail-code">${escapeHtml(node.nodeCode)}</h2>
            </div>
            ${hasDistinctName ? `<div class="el-detail-subtitle">${escapeHtml(node.name)}</div>` : ''}
          </div>

          <div class="el-detail-header-actions">
            <button type="button" class="el-detail-btn-link" id="btn-detail-copy-link" title="คัดลอกลิงก์ตรงสำหรับเปิดตู้ ${escapeHtml(node.nodeCode)}" aria-label="คัดลอกลิงก์">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <span class="el-detail-btn-link-text">คัดลอกลิงก์</span>
            </button>
            <button type="button" class="el-detail-close-btn" id="btn-detail-close" title="ปิดและกลับไปหน้าหลัก MDB" aria-label="ปิด">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Responsive Body: 2 columns on Desktop, 1 column on Mobile -->
        <div class="el-detail-body">
          <!-- Left Column: Photo, Technical Specs, Remark, Actions -->
          <div class="el-detail-col-left">
            <div class="el-detail-photo-card">
              ${photoUrl ? `
                <img src="${escapeHtml(photoUrl)}" class="el-detail-photo-img" id="detail-photo-img" alt="${escapeHtml(node.nodeCode)}" data-fallback="${escapeHtml(fallbackLarge)}" onerror="if(this.dataset.fallback && this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}else{this.style.display='none';this.nextElementSibling.style.display='flex';}">
                <div class="el-detail-photo-empty" style="display:none;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <span>ไม่มีรูปภาพในระบบ</span>
                </div>
              ` : `
                <div class="el-detail-photo-empty">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <span>ไม่มีรูปภาพในระบบ</span>
                </div>
              `}
              ${driveHref ? `
                <a href="${escapeHtml(driveHref)}" target="_blank" rel="noopener noreferrer" class="el-drive-link" style="padding:5px 10px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <span>เปิดดูใน Google Drive</span>
                </a>
              ` : ''}
            </div>

            <div>
              <h4 class="el-section-title" style="margin-bottom:6px; font-size:11.5px;">ข้อมูลทางเทคนิค (TECHNICAL SPECS)</h4>
              <div class="el-detail-spec-grid">
                <div class="el-detail-spec-box">
                  <span class="el-detail-spec-label">พิกัดกระแส (Rating)</span>
                  <span class="el-detail-spec-value font-mono">${node.currentRating ? node.currentRating + ' A' : '-'}</span>
                </div>
                <div class="el-detail-spec-box">
                  <span class="el-detail-spec-label">ระดับแรงดัน (Voltage)</span>
                  <span class="el-detail-spec-value">${escapeHtml(node.voltage || '-')}</span>
                </div>
                <div class="el-detail-spec-box">
                  <span class="el-detail-spec-label">สถานที่ติดตั้ง (Location)</span>
                  <span class="el-detail-spec-value">${escapeHtml(node.location || '-')}</span>
                </div>
                <div class="el-detail-spec-box">
                  <span class="el-detail-spec-label">ตู้ต้นทาง (Feeder Source)</span>
                  <span class="el-detail-spec-value">${parentHtml}</span>
                </div>
              </div>
            </div>

            ${node.remark && node.remark !== '-' ? `
              <div>
                <h4 class="el-section-title" style="margin-bottom:4px; font-size:11.5px;">หมายเหตุ / ข้อมูลเพิ่มเติม</h4>
                <p class="el-inspector-remark" style="padding:7px 10px; font-size:12px;">${escapeHtml(node.remark)}</p>
              </div>
            ` : ''}

            <div class="el-detail-footer">
              <button type="button" id="btn-detail-edit" class="btn btn-secondary btn-sm" style="flex:1;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>แก้ไขข้อมูล</span>
              </button>
              <button type="button" id="btn-detail-delete" class="btn btn-danger-ghost btn-sm" title="ลบตู้/อุปกรณ์นี้">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>

          <!-- Right Column: Downstream Connected Panels / Circuits -->
          <div class="el-detail-col-right">
            <div class="el-downstream-header">
              <h4 class="el-downstream-title">
                <span>ตู้และอุปกรณ์ที่รับไฟต่อไป</span>
                <span class="el-sub-badge">${children.length}</span>
              </h4>
              <button type="button" id="btn-detail-add-child" class="btn btn-secondary btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>เพิ่มลูกตู้/วงจร</span>
              </button>
            </div>

            ${children.length > 6 ? `
              <div class="el-downstream-filter">
                <input type="text" id="detail-downstream-search" class="el-input el-select-sm" style="width:100%;" placeholder="กรองค้นหาลูกตู้/วงจรใน ${escapeHtml(node.nodeCode)}..." value="${escapeHtml(state.downstreamFilterQuery)}">
              </div>
            ` : ''}

            <div class="el-downstream-list" id="detail-downstream-list">
              ${childrenHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire up detail events
    $('btn-detail-close')?.addEventListener('click', () => {
      openNodeInExplorer(null);
    });

    $('btn-detail-copy-link')?.addEventListener('click', async () => {
      const shareUrl = getNodeShareUrl(node);
      const btn = $('btn-detail-copy-link');
      const textEl = btn?.querySelector('.el-detail-btn-link-text');
      
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          copied = true;
        }
      } catch (_) {}

      if (!copied) {
        try {
          const ta = document.createElement('textarea');
          ta.value = shareUrl;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copied = true;
        } catch (_) {}
      }

      if (btn) {
        btn.classList.add('is-copied');
        if (textEl) textEl.textContent = 'คัดลอกแล้ว!';
        setTimeout(() => {
          btn.classList.remove('is-copied');
          if (textEl) textEl.textContent = 'คัดลอกลิงก์';
        }, 2200);
      }
    });

    $('detail-photo-img')?.addEventListener('click', () => {
      openLightbox(photoUrl);
    });

    $('detail-jump-parent')?.addEventListener('click', (e) => {
      e.preventDefault();
      openNodeInExplorer(node.parentId);
    });

    $('btn-detail-add-child')?.addEventListener('click', () => {
      openCreateModal({
        parentId: node.id,
        location: node.location,
        voltage: node.voltage
      });
    });

    $('btn-detail-edit')?.addEventListener('click', () => {
      openEditModal(node.id);
    });

    $('btn-detail-delete')?.addEventListener('click', () => {
      confirmDeleteNode(node.id);
    });

    const dsSearch = $('detail-downstream-search');
    if (dsSearch) {
      dsSearch.addEventListener('input', (e) => {
        state.downstreamFilterQuery = e.target.value;
        const pos = dsSearch.selectionStart;
        renderExplorerDetail(node);
        const newInput = $('detail-downstream-search');
        if (newInput) {
          newInput.focus();
          if (typeof pos === 'number') newInput.setSelectionRange(pos, pos);
        }
      });
    }

    detailContainer.querySelectorAll('.el-downstream-item').forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        openNodeInExplorer(item.dataset.childId);
      };
    });
  }

  function initExplorerSearch() {
    const searchInput = $('explorer-search-input');
    const clearBtn = $('explorer-search-clear');
    const dropdown = $('explorer-search-dropdown');
    if (!searchInput) return;

    function updateSearchDropdown(query) {
      if (!dropdown) return;
      const q = (query || '').trim().toLowerCase();
      if (!q || !state.selectedNodeId) {
        dropdown.style.display = 'none';
        return;
      }

      const matches = state.nodes.filter(n =>
        (n.nodeCode || '').toLowerCase().includes(q) ||
        (n.name || '').toLowerCase().includes(q) ||
        (n.location || '').toLowerCase().includes(q)
      ).sort(naturalCompare).slice(0, 15);

      if (matches.length === 0) {
        dropdown.innerHTML = `<div style="padding:12px; color:#64748b; font-size:13px; text-align:center;">ไม่พบตู้หรืออุปกรณ์ที่ตรงกับ "${escapeHtml(query)}"</div>`;
        dropdown.style.display = 'block';
        return;
      }

      let html = '';
      matches.forEach(m => {
        html += `
          <div class="el-search-drop-item" data-id="${m.id}">
            <div style="display:flex; align-items:center; gap:8px; min-width:0;">
              <span class="kpi-badge badge-${m.nodeType.toLowerCase()}">${escapeHtml(m.nodeType)}</span>
              <strong class="font-mono" style="color:#0f172a;">${escapeHtml(m.nodeCode)}</strong>
              <span style="color:#475569; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(m.name)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              ${m.parentCode ? `<span class="font-mono" style="font-size:11px; color:#0284c7;">&larr; ${escapeHtml(m.parentCode)}</span>` : ''}
              <span class="font-mono" style="font-size:12px; font-weight:600; color:#b45309;">${m.currentRating ? m.currentRating + 'A' : ''}</span>
            </div>
          </div>
        `;
      });
      dropdown.innerHTML = html;
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.el-search-drop-item').forEach(item => {
        item.onclick = () => {
          dropdown.style.display = 'none';
          searchInput.value = '';
          state.explorerSearchQuery = '';
          if (clearBtn) clearBtn.style.display = 'none';
          openNodeInExplorer(item.dataset.id);
        };
      });
    }

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      state.explorerSearchQuery = val.trim();
      if (clearBtn) clearBtn.style.display = state.explorerSearchQuery ? 'inline-block' : 'none';

      if (state.selectedNodeId) {
        updateSearchDropdown(state.explorerSearchQuery);
      } else {
        if (dropdown) dropdown.style.display = 'none';
        renderExplorerHome();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && state.explorerSearchQuery) {
        e.preventDefault();
        if (dropdown) dropdown.style.display = 'none';
        // Switch to Home grid showing all search results if currently inside a node
        if (state.selectedNodeId) {
          state.selectedNodeId = null;
          renderDiagram();
        }
      }
    });

    clearBtn?.addEventListener('click', () => {
      searchInput.value = '';
      state.explorerSearchQuery = '';
      clearBtn.style.display = 'none';
      if (dropdown) dropdown.style.display = 'none';
      if (!state.selectedNodeId) {
        renderExplorerHome();
      }
    });

    document.addEventListener('click', (e) => {
      if (dropdown && !e.target.closest('.el-explorer-search-wrap')) {
        dropdown.style.display = 'none';
      }
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

    const total = items.length;
    const pageSize = state.dirPageSize || 50;
    const totalPages = Math.ceil(total / pageSize) || 1;
    if (state.dirPage > totalPages) state.dirPage = totalPages;
    if (state.dirPage < 1) state.dirPage = 1;

    const startIdx = total === 0 ? 0 : (state.dirPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const pagedItems = items.slice(startIdx, endIdx);

    // Update pagination controls
    if ($('dir-page-start')) $('dir-page-start').textContent = total === 0 ? 0 : startIdx + 1;
    if ($('dir-page-end')) $('dir-page-end').textContent = endIdx;
    if ($('dir-page-total')) $('dir-page-total').textContent = total;
    if ($('dir-page-current')) $('dir-page-current').textContent = state.dirPage;
    if ($('dir-page-pages')) $('dir-page-pages').textContent = totalPages;
    if ($('dir-btn-prev')) $('dir-btn-prev').disabled = state.dirPage <= 1;
    if ($('dir-btn-next')) $('dir-btn-next').disabled = state.dirPage >= totalPages;

    if (pagedItems.length === 0) {
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
    pagedItems.forEach(node => {
      const thumbUrl = getNodePhotoUrl(node);
      const fileId = getNodeDriveFileId(node);
      const fallbackThumb = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w200` : '';
      const parentLabel = node.parentCode ? `${escapeHtml(node.parentCode)} - ${escapeHtml(node.parentName)}` : '<span style="color:#94a3b8;">- เมนหลัก / ยังไม่ต่อ -</span>';

      html += `
        <tr data-id="${node.id}">
          <td>
            ${thumbUrl ? `
              <img src="${escapeHtml(thumbUrl)}" class="el-table-thumbnail" alt="ตู้" data-large="${escapeHtml(thumbUrl)}" data-fallback="${escapeHtml(fallbackThumb)}" onerror="if(this.dataset.fallback && this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}else{this.style.display='none';}">
            ` : `
              <div class="el-table-thumb-empty">⚡</div>
            `}
          </td>
          <td>
            <a href="?node=${encodeURIComponent(node.nodeCode)}" class="el-table-code-link font-mono" data-id="${node.id}" title="เปิดดูตู้ ${escapeHtml(node.nodeCode)}">${escapeHtml(node.nodeCode)}</a>
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
              <button type="button" class="btn btn-secondary btn-sm btn-action-copy-link" data-id="${node.id}" data-code="${escapeHtml(node.nodeCode)}" title="คัดลอกลิงก์ตรงสำหรับเปิดตู้ ${escapeHtml(node.nodeCode)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
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
    tbody.querySelectorAll('.el-table-code-link').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        openNodeInExplorer(link.dataset.id);
      };
    });
    tbody.querySelectorAll('.btn-action-copy-link').forEach(btn => {
      btn.onclick = async () => {
        const node = getNodeById(btn.dataset.id);
        const shareUrl = getNodeShareUrl(node);
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareUrl);
          } else {
            prompt('คัดลอกลิงก์:', shareUrl);
            return;
          }
          btn.style.borderColor = '#10b981';
          btn.style.color = '#10b981';
          setTimeout(() => {
            btn.style.borderColor = '';
            btn.style.color = '';
          }, 1800);
        } catch (_) {
          prompt('คัดลอกลิงก์:', shareUrl);
        }
      };
    });
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

  function getWiringStatusBadge(isChanged, parentId) {
    if (isChanged) {
      return '<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">รอยืนยัน</span>';
    }
    if (parentId) {
      return '<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:4px; font-size:11px;">เชื่อมต่อแล้ว</span>';
    }
    return '<span style="background:#f1f5f9; color:#64748b; padding:2px 8px; border-radius:4px; font-size:11px;">สายอิสระ</span>';
  }

  function renderWiringMatrix() {
    const tbody = $('wiring-table-body');
    const saveBtn = $('btn-save-all-wiring');
    if (!tbody) return;

    if (state.nodes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">ไม่มีข้อมูลตู้</td></tr>';
      return;
    }

    // 1. Filter nodes (Exclude MDB since MDB is a main root board)
    let items = state.nodes.filter(n => n.nodeType !== 'MDB');

    if (state.wiringFilterType !== 'ALL') {
      items = items.filter(n => n.nodeType === state.wiringFilterType);
    }

    if (state.wiringSearchQuery) {
      const q = state.wiringSearchQuery.toLowerCase();
      items = items.filter(n =>
        (n.nodeCode || '').toLowerCase().includes(q) ||
        (n.name || '').toLowerCase().includes(q) ||
        (n.location || '').toLowerCase().includes(q)
      );
    }

    if (state.wiringStatusFilter === 'UNLINKED') {
      items = items.filter(n => {
        if (state.pendingWiring.has(n.id)) return true;
        return !n.parentId;
      });
    } else if (state.wiringStatusFilter === 'LINKED') {
      items = items.filter(n => {
        const effectiveParent = state.pendingWiring.has(n.id)
          ? state.pendingWiring.get(n.id)
          : n.parentId;
        return Boolean(effectiveParent);
      });
    } else if (state.wiringStatusFilter === 'PENDING') {
      items = items.filter(n => state.pendingWiring.has(n.id));
    }

    const total = items.length;
    const pageSize = state.wiringPageSize || 50;
    const totalPages = Math.ceil(total / pageSize) || 1;
    if (state.wiringPage > totalPages) state.wiringPage = totalPages;
    if (state.wiringPage < 1) state.wiringPage = 1;

    const startIdx = total === 0 ? 0 : (state.wiringPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const pagedItems = items.slice(startIdx, endIdx);

    // Update pagination controls
    if ($('wiring-page-start')) $('wiring-page-start').textContent = total === 0 ? 0 : startIdx + 1;
    if ($('wiring-page-end')) $('wiring-page-end').textContent = endIdx;
    if ($('wiring-page-total')) $('wiring-page-total').textContent = total;
    if ($('wiring-page-current')) $('wiring-page-current').textContent = state.wiringPage;
    if ($('wiring-page-pages')) $('wiring-page-pages').textContent = totalPages;
    if ($('wiring-btn-prev')) $('wiring-btn-prev').disabled = state.wiringPage <= 1;
    if ($('wiring-btn-next')) $('wiring-btn-next').disabled = state.wiringPage >= totalPages;

    if (pagedItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--el-ink-muted);">ไม่พบรายการที่ตรงกับเงื่อนไข</td></tr>';
      return;
    }

    let html = '';
    pagedItems.forEach(node => {
      const currentParentId = state.pendingWiring.has(node.id)
        ? state.pendingWiring.get(node.id)
        : (node.parentId || '');

      const parentNode = currentParentId ? state.nodes.find(n => n.id === currentParentId) : null;
      const selectedLabel = getParentOptionLabel(parentNode);

      const isChanged = state.pendingWiring.has(node.id) && state.pendingWiring.get(node.id) !== (node.parentId || '');
      const statusPill = getWiringStatusBadge(isChanged, currentParentId);

      html += `
        <tr data-id="${node.id}" class="${isChanged ? 'is-modified' : ''}">
          <td><strong class="font-mono">${escapeHtml(node.nodeCode)}</strong></td>
          <td>${escapeHtml(node.name)}</td>
          <td><span class="kpi-badge badge-${node.nodeType.toLowerCase()}">${escapeHtml(node.nodeType)}</span></td>
          <td class="font-mono">${node.currentRating ? node.currentRating + ' A' : '-'}</td>
          <td>${escapeHtml(node.location || '-')}</td>
          <td>
            <button type="button" class="el-select el-custom-select-trigger el-wiring-select-trigger font-mono" data-id="${node.id}" data-value="${escapeHtml(currentParentId)}" aria-haspopup="listbox" aria-expanded="false">
              <span class="el-custom-select-label">${escapeHtml(selectedLabel)}</span>
              <svg class="el-custom-select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </td>
          <td class="wiring-status-cell">${statusPill}</td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-danger-ghost btn-sm btn-wiring-delete" data-id="${node.id}" title="ลบตู้/อุปกรณ์นี้">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    closeWiringDropdown();

    tbody.querySelectorAll('.el-wiring-select-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.wiringDropdownOpen && state.wiringDropdownNodeId === btn.dataset.id) {
          closeWiringDropdown();
        } else {
          openWiringDropdown(btn);
        }
      });
    });

    tbody.querySelectorAll('.btn-wiring-delete').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteNode(btn.dataset.id));
    });

    if (saveBtn) {
      saveBtn.disabled = state.pendingWiring.size === 0;
      saveBtn.querySelector('span').textContent = state.pendingWiring.size > 0
        ? `บันทึกการเชื่อมโยง (${state.pendingWiring.size})`
        : 'บันทึกการเชื่อมโยง';
    }
  }

  function applyWiringSelection(nodeId, newParentId, newLabel) {
    const trigger = state.wiringDropdownTrigger || document.querySelector(`.el-wiring-select-trigger[data-id="${nodeId}"]`);
    const saveBtn = $('btn-save-all-wiring');
    const node = state.nodes.find(n => n.id === nodeId);
    const origParentId = node?.parentId || '';
    const val = newParentId || '';

    if (trigger) {
      trigger.dataset.value = val;
      const lblEl = trigger.querySelector('.el-custom-select-label');
      if (lblEl) lblEl.textContent = newLabel || getParentOptionLabel(null);
    }

    if (val === origParentId) {
      state.pendingWiring.delete(nodeId);
    } else {
      state.pendingWiring.set(nodeId, val);
    }

    const isChanged = state.pendingWiring.has(nodeId);
    const row = trigger ? trigger.closest('tr') : document.querySelector(`#wiring-table-body tr[data-id="${nodeId}"]`);
    if (row) {
      row.classList.toggle('is-modified', isChanged);
      const statusCell = row.querySelector('.wiring-status-cell');
      if (statusCell) {
        statusCell.innerHTML = getWiringStatusBadge(isChanged, val);
      }
    }

    if (saveBtn) {
      saveBtn.disabled = state.pendingWiring.size === 0;
      saveBtn.querySelector('span').textContent = state.pendingWiring.size > 0
        ? `บันทึกการเชื่อมโยง (${state.pendingWiring.size})`
        : 'บันทึกการเชื่อมโยง';
    }

    closeWiringDropdown();
  }

  function positionWiringDropdown() {
    const dropdown = $('wiring-select-dropdown');
    const trigger = state.wiringDropdownTrigger;
    if (!dropdown || !trigger || !state.wiringDropdownOpen) return;

    const rect = trigger.getBoundingClientRect();
    if (rect.bottom < 54 || rect.top > window.innerHeight) {
      closeWiringDropdown();
      return;
    }

    dropdown.style.width = `${rect.width}px`;
    dropdown.style.left = `${rect.left}px`;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top - 54;
    if (spaceBelow < 280 && spaceAbove > spaceBelow) {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = `${window.innerHeight - rect.top + 3}px`;
    } else {
      dropdown.style.bottom = 'auto';
      dropdown.style.top = `${rect.bottom + 3}px`;
    }
  }

  function renderWiringDropdownOptions(query = '') {
    const listEl = $('wiring-select-options');
    if (!listEl) return;

    const nodeId = state.wiringDropdownNodeId;
    const currentParentId = state.wiringDropdownTrigger?.dataset.value || '';
    const q = (query || '').trim().toLowerCase();

    const defaultLabel = getParentOptionLabel(null);
    const items = [];

    if (!q || defaultLabel.toLowerCase().includes(q)) {
      items.push({ value: '', label: defaultLabel });
    }

    const feederCandidates = state.nodes.filter(
      n => (n.nodeType === 'MDB' || n.nodeType === 'DB' || n.nodeType === 'LP') && n.id !== nodeId
    );

    feederCandidates.forEach(n => {
      const label = getParentOptionLabel(n);
      if (
        !q ||
        (n.nodeCode || '').toLowerCase().includes(q) ||
        (n.name || '').toLowerCase().includes(q) ||
        (n.nodeType || '').toLowerCase().includes(q) ||
        (n.location || '').toLowerCase().includes(q) ||
        label.toLowerCase().includes(q)
      ) {
        items.push({ value: n.id, label });
      }
    });

    if (items.length === 0) {
      listEl.innerHTML = `<div class="el-custom-select-empty">ไม่พบตู้ต้นทางที่ค้นหา "${escapeHtml(query)}"</div>`;
      state.wiringHighlightIndex = -1;
      return;
    }

    let html = '';
    let selectedIdx = -1;
    items.forEach((item, idx) => {
      const isSelected = item.value === currentParentId;
      if (isSelected) selectedIdx = idx;
      html += `
        <div class="el-custom-select-option${isSelected ? ' is-selected' : ''}" data-value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}" role="option" aria-selected="${isSelected}">
          ${escapeHtml(item.label)}
        </div>
      `;
    });

    listEl.innerHTML = html;
    state.wiringHighlightIndex = selectedIdx >= 0 ? selectedIdx : (q ? 0 : -1);
    updateWiringOptionHighlight();

    listEl.querySelectorAll('.el-custom-select-option').forEach(optEl => {
      optEl.addEventListener('click', (e) => {
        e.stopPropagation();
        applyWiringSelection(nodeId, optEl.dataset.value, optEl.dataset.label);
      });
    });
  }

  function updateWiringOptionHighlight() {
    const listEl = $('wiring-select-options');
    if (!listEl) return;
    const opts = listEl.querySelectorAll('.el-custom-select-option');
    opts.forEach((el, idx) => {
      el.classList.toggle('is-highlighted', idx === state.wiringHighlightIndex);
    });
    if (state.wiringHighlightIndex >= 0 && opts[state.wiringHighlightIndex]) {
      opts[state.wiringHighlightIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  async function openWiringDropdown(trigger) {
    if (!isLoggedIn()) {
      const ok = await ensureAuthenticated();
      if (!ok) return;
    }
    const dropdown = $('wiring-select-dropdown');
    const searchInput = $('wiring-select-search');
    const clearBtn = $('wiring-select-search-clear');
    if (!dropdown || !trigger) return;

    if (state.wiringDropdownTrigger && state.wiringDropdownTrigger !== trigger) {
      state.wiringDropdownTrigger.classList.remove('is-open');
      state.wiringDropdownTrigger.setAttribute('aria-expanded', 'false');
    }

    state.wiringDropdownOpen = true;
    state.wiringDropdownNodeId = trigger.dataset.id;
    state.wiringDropdownTrigger = trigger;

    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.style.display = 'block';

    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    renderWiringDropdownOptions('');
    positionWiringDropdown();

    const selectedEl = dropdown.querySelector('.el-custom-select-option.is-selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }

    setTimeout(() => searchInput?.focus(), 10);
  }

  function closeWiringDropdown() {
    const dropdown = $('wiring-select-dropdown');
    if (state.wiringDropdownTrigger) {
      state.wiringDropdownTrigger.classList.remove('is-open');
      state.wiringDropdownTrigger.setAttribute('aria-expanded', 'false');
    }
    state.wiringDropdownOpen = false;
    state.wiringDropdownNodeId = null;
    state.wiringDropdownTrigger = null;
    state.wiringHighlightIndex = -1;
    if (dropdown) dropdown.style.display = 'none';
  }

  function initWiringSelectDropdown() {
    const dropdown = $('wiring-select-dropdown');
    const searchInput = $('wiring-select-search');
    const clearBtn = $('wiring-select-search-clear');
    const listEl = $('wiring-select-options');
    if (!dropdown) return;

    searchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearBtn) clearBtn.style.display = val ? 'inline-block' : 'none';
      renderWiringDropdownOptions(val);
    });

    clearBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearBtn.style.display = 'none';
      renderWiringDropdownOptions('');
    });

    searchInput?.addEventListener('keydown', (e) => {
      const opts = listEl ? listEl.querySelectorAll('.el-custom-select-option') : [];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (opts.length > 0) {
          state.wiringHighlightIndex = (state.wiringHighlightIndex + 1) % opts.length;
          updateWiringOptionHighlight();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (opts.length > 0) {
          state.wiringHighlightIndex = (state.wiringHighlightIndex - 1 + opts.length) % opts.length;
          updateWiringOptionHighlight();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const targetOpt = opts[state.wiringHighlightIndex] || opts[0];
        if (targetOpt && state.wiringDropdownNodeId) {
          applyWiringSelection(state.wiringDropdownNodeId, targetOpt.dataset.value, targetOpt.dataset.label);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const prevTrigger = state.wiringDropdownTrigger;
        closeWiringDropdown();
        prevTrigger?.focus();
      }
    });

    window.addEventListener('scroll', () => {
      if (state.wiringDropdownOpen) positionWiringDropdown();
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (state.wiringDropdownOpen) positionWiringDropdown();
    });

    document.addEventListener('click', (e) => {
      if (
        state.wiringDropdownOpen &&
        !dropdown.contains(e.target) &&
        (!state.wiringDropdownTrigger || !state.wiringDropdownTrigger.contains(e.target))
      ) {
        closeWiringDropdown();
      }
    });
  }

  // Save all pending wiring changes in batch
  async function savePendingWiring() {
    if (!isLoggedIn()) {
      const ok = await ensureAuthenticated();
      if (!ok) return;
    }
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
    openNodeInExplorer(nodeId);
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
  // CIRCUIT BUILDER (OUTGOING BRANCH CIRCUITS TABLE)
  // ==========================================================================

  function resetCircuitTable() {
    state.formRemovedChildIds = [];
    const tbody = $('circuit-table-body');
    if (tbody) tbody.innerHTML = '';
    updateCircuitBadge();
    const p1 = $('panel-auto-gen');
    if (p1) p1.style.display = 'none';
    const p2 = $('panel-excel-paste');
    if (p2) p2.style.display = 'none';
  }

  function updateCircuitBadge() {
    const tbody = $('circuit-table-body');
    const rows = tbody ? tbody.querySelectorAll('tr') : [];
    const badge = $('circuit-count-badge');
    const emptyState = $('circuit-empty-state');
    if (badge) badge.textContent = `${rows.length} รายการ`;
    if (emptyState) emptyState.style.display = rows.length === 0 ? 'block' : 'none';

    rows.forEach((tr, idx) => {
      const idxCell = tr.querySelector('.row-idx');
      if (idxCell) idxCell.textContent = idx + 1;
    });
  }

  function addCircuitRow(data = {}) {
    const tbody = $('circuit-table-body');
    if (!tbody) return null;

    const tr = document.createElement('tr');
    if (data.id) tr.dataset.childId = data.id;

    const rowNum = tbody.querySelectorAll('tr').length + 1;
    const typeVal = (data.nodeType || 'DB').toUpperCase();

    tr.innerHTML = `
      <td class="row-idx" style="text-align:center; font-weight:600; color:#64748b;">${rowNum}</td>
      <td>
        <input type="text" class="el-input font-mono circuit-code" placeholder="เช่น Q10, LP-01" value="${escapeHtml(data.nodeCode || '')}" style="text-transform:uppercase;">
      </td>
      <td>
        <input type="text" class="el-input circuit-name" placeholder="เช่น ตู้จ่ายไฟย่อย, ปั๊มน้ำ, โหลด 1" value="${escapeHtml(data.name || '')}">
      </td>
      <td>
        <select class="el-select circuit-type">
          <option value="DB"${typeVal === 'DB' ? ' selected' : ''}>DB (ตู้ย่อย)</option>
          <option value="LP"${typeVal === 'LP' ? ' selected' : ''}>LP (โหลดพาเนล)</option>
          <option value="MC"${typeVal === 'MC' ? ' selected' : ''}>MC (เครื่องจักร)</option>
          <option value="DV"${typeVal === 'DV' ? ' selected' : ''}>DV (อุปกรณ์)</option>
        </select>
      </td>
      <td>
        <input type="number" class="el-input font-mono circuit-rating" placeholder="แอมป์" value="${data.currentRating ? data.currentRating : ''}" min="0" step="any">
      </td>
      <td>
        <input type="text" class="el-input circuit-location" placeholder="ใช้ตามตู้หลัก" value="${escapeHtml(data.location || '')}">
      </td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-danger-ghost btn-sm btn-delete-row" title="ลบแถวนี้" style="padding:4px 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    `;

    tr.querySelector('.btn-delete-row').onclick = () => {
      if (tr.dataset.childId) {
        state.formRemovedChildIds.push(tr.dataset.childId);
      }
      tr.remove();
      updateCircuitBadge();
    };

    tr.querySelector('.circuit-location')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const nextTr = tr.nextElementSibling;
        if (nextTr) {
          nextTr.querySelector('.circuit-code')?.focus();
        } else {
          const newTr = addCircuitRow();
          newTr?.querySelector('.circuit-code')?.focus();
        }
      }
    });

    tbody.appendChild(tr);
    updateCircuitBadge();
    return tr;
  }

  function collectCircuitRows() {
    const tbody = $('circuit-table-body');
    if (!tbody) return [];
    const rows = tbody.querySelectorAll('tr');
    const children = [];

    rows.forEach(tr => {
      const codeInput = tr.querySelector('.circuit-code');
      const nameInput = tr.querySelector('.circuit-name');
      const typeSelect = tr.querySelector('.circuit-type');
      const ratingInput = tr.querySelector('.circuit-rating');
      const locationInput = tr.querySelector('.circuit-location');

      const nodeCode = codeInput?.value.trim().toUpperCase() || '';
      const name = nameInput?.value.trim() || '';
      const nodeType = typeSelect?.value || 'DB';
      const currentRating = parseFloat(ratingInput?.value) || 0;
      const location = locationInput?.value.trim() || '';
      const id = tr.dataset.childId || undefined;

      if (nodeCode || name) {
        children.push({ id, nodeCode, name, nodeType, currentRating, location });
      }
    });

    return children;
  }

  // ==========================================================================
  // NODE FORM MODAL (CREATE / EDIT)
  // ==========================================================================

  async function openCreateModal(initialData = {}) {
    if (!isLoggedIn()) {
      const ok = await ensureAuthenticated();
      if (!ok) return;
    }

    $('modal-form-title').textContent = 'เพิ่มตู้ / อุปกรณ์ไฟฟ้าใหม่ (พร้อมรายการวงจรย่อย)';
    $('form-id').value = '';
    $('form-node-code').value = initialData.nodeCode || '';
    $('form-node-type').value = initialData.nodeType || 'DB';
    $('form-name').value = initialData.name || '';
    $('form-current-rating').value = initialData.currentRating || '';
    $('form-voltage').value = initialData.voltage || '400V 3P4W';
    $('form-location').value = initialData.location || '';
    $('form-remark').value = initialData.remark || '';
    $('form-error-msg').style.display = 'none';

    state.formImage = null;
    state.removeImageFlag = false;
    resetPhotoPreview();
    updateParentSelector(initialData.parentId || '');
    toggleMachinePickerRow(initialData.nodeType || 'DB');

    // Reset circuits table and start with 3 blank rows for immediate entry
    resetCircuitTable();
    addCircuitRow();
    addCircuitRow();
    addCircuitRow();

    $('modal-node-form').showModal();
    setTimeout(() => $('form-node-code')?.focus(), 50);
  }

  async function openEditModal(nodeId) {
    if (!isLoggedIn()) {
      const ok = await ensureAuthenticated();
      if (!ok) return;
    }

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
    const photoUrl = getNodePhotoUrl(node);
    setPhotoPreview(photoUrl);

    updateParentSelector(node.parentId, node.id);
    toggleMachinePickerRow(node.nodeType);

    // Reset circuits table and load existing children
    resetCircuitTable();
    try {
      const full = await rpc('getNode', node.id);
      if (full?.children && full.children.length > 0) {
        full.children.forEach(c => addCircuitRow(c));
      } else {
        addCircuitRow();
      }
    } catch {
      addCircuitRow();
    }

    $('modal-node-form').showModal();
  }

  function getParentOptionLabel(node) {
    if (!node) return '-- ไม่มี (เป็นตู้ประธาน MDB หรือยังไม่เชื่อมโยง) --';
    return `${node.nodeCode} - ${node.name} (${node.nodeType})`;
  }

  function updateParentSelector(currentParentId, excludeId) {
    const hiddenInput = $('form-parent-id');
    const labelEl = $('parent-select-label');
    state.parentExcludeId = excludeId || null;

    const val = currentParentId || '';
    if (hiddenInput) hiddenInput.value = val;

    const selectedNode = val ? state.nodes.find(n => n.id === val) : null;
    if (labelEl) {
      labelEl.textContent = getParentOptionLabel(selectedNode);
    }

    closeParentDropdown();
  }

  function renderParentDropdownOptions(query = '') {
    const listEl = $('parent-select-options');
    if (!listEl) return;

    const currentParentId = $('form-parent-id')?.value || '';
    const excludeId = state.parentExcludeId;
    const q = (query || '').trim().toLowerCase();

    const defaultLabel = '-- ไม่มี (เป็นตู้ประธาน MDB หรือยังไม่เชื่อมโยง) --';
    const items = [];

    if (!q || defaultLabel.toLowerCase().includes(q)) {
      items.push({ value: '', label: defaultLabel });
    }

    const feederCandidates = state.nodes.filter(
      n => (n.nodeType === 'MDB' || n.nodeType === 'DB' || n.nodeType === 'LP') && n.id !== excludeId
    );

    feederCandidates.forEach(n => {
      const label = getParentOptionLabel(n);
      if (
        !q ||
        (n.nodeCode || '').toLowerCase().includes(q) ||
        (n.name || '').toLowerCase().includes(q) ||
        (n.nodeType || '').toLowerCase().includes(q) ||
        (n.location || '').toLowerCase().includes(q) ||
        label.toLowerCase().includes(q)
      ) {
        items.push({ value: n.id, label });
      }
    });

    if (items.length === 0) {
      listEl.innerHTML = `<div class="el-custom-select-empty">ไม่พบตู้ต้นทางที่ค้นหา "${escapeHtml(query)}"</div>`;
      state.parentHighlightIndex = -1;
      return;
    }

    let html = '';
    let selectedIdx = -1;
    items.forEach((item, idx) => {
      const isSelected = item.value === currentParentId;
      if (isSelected) selectedIdx = idx;
      html += `
        <div class="el-custom-select-option${isSelected ? ' is-selected' : ''}" data-value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}" role="option" aria-selected="${isSelected}">
          ${escapeHtml(item.label)}
        </div>
      `;
    });

    listEl.innerHTML = html;
    state.parentHighlightIndex = selectedIdx >= 0 ? selectedIdx : (q ? 0 : -1);
    updateParentOptionHighlight();

    listEl.querySelectorAll('.el-custom-select-option').forEach(optEl => {
      optEl.addEventListener('click', (e) => {
        e.stopPropagation();
        selectParentOption(optEl.dataset.value, optEl.dataset.label);
      });
    });
  }

  function updateParentOptionHighlight() {
    const listEl = $('parent-select-options');
    if (!listEl) return;
    const opts = listEl.querySelectorAll('.el-custom-select-option');
    opts.forEach((el, idx) => {
      el.classList.toggle('is-highlighted', idx === state.parentHighlightIndex);
    });
    if (state.parentHighlightIndex >= 0 && opts[state.parentHighlightIndex]) {
      opts[state.parentHighlightIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectParentOption(value, label) {
    const hiddenInput = $('form-parent-id');
    const labelEl = $('parent-select-label');
    if (hiddenInput) hiddenInput.value = value || '';
    if (labelEl) labelEl.textContent = label || getParentOptionLabel(null);
    closeParentDropdown();
  }

  function openParentDropdown() {
    const container = $('parent-select-container');
    const trigger = $('parent-select-trigger');
    const dropdown = $('parent-select-dropdown');
    const searchInput = $('parent-select-search');
    const clearBtn = $('parent-select-search-clear');
    if (!container || !dropdown) return;

    state.parentDropdownOpen = true;
    container.classList.add('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    dropdown.style.display = 'block';

    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    renderParentDropdownOptions('');

    const selectedEl = dropdown.querySelector('.el-custom-select-option.is-selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }

    setTimeout(() => searchInput?.focus(), 10);
  }

  function closeParentDropdown() {
    const container = $('parent-select-container');
    const trigger = $('parent-select-trigger');
    const dropdown = $('parent-select-dropdown');
    state.parentDropdownOpen = false;
    state.parentHighlightIndex = -1;
    if (container) container.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (dropdown) dropdown.style.display = 'none';
  }

  function initParentSelectDropdown() {
    const container = $('parent-select-container');
    const trigger = $('parent-select-trigger');
    const dropdown = $('parent-select-dropdown');
    const searchInput = $('parent-select-search');
    const clearBtn = $('parent-select-search-clear');
    const listEl = $('parent-select-options');
    if (!container || !trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state.parentDropdownOpen) {
        closeParentDropdown();
      } else {
        openParentDropdown();
      }
    });

    searchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearBtn) clearBtn.style.display = val ? 'inline-block' : 'none';
      renderParentDropdownOptions(val);
    });

    clearBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearBtn.style.display = 'none';
      renderParentDropdownOptions('');
    });

    searchInput?.addEventListener('keydown', (e) => {
      const opts = listEl ? listEl.querySelectorAll('.el-custom-select-option') : [];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (opts.length > 0) {
          state.parentHighlightIndex = (state.parentHighlightIndex + 1) % opts.length;
          updateParentOptionHighlight();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (opts.length > 0) {
          state.parentHighlightIndex = (state.parentHighlightIndex - 1 + opts.length) % opts.length;
          updateParentOptionHighlight();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const targetOpt = opts[state.parentHighlightIndex] || opts[0];
        if (targetOpt) {
          selectParentOption(targetOpt.dataset.value, targetOpt.dataset.label);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeParentDropdown();
        trigger.focus();
      }
    });

    // Close when clicking outside inside modal or document
    document.addEventListener('click', (e) => {
      if (state.parentDropdownOpen && !container.contains(e.target)) {
        closeParentDropdown();
      }
    });
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
    if (!isLoggedIn()) {
      const ok = await ensureAuthenticated();
      if (!ok) return;
    }
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

    // Collect child circuits
    const children = collectCircuitRows();
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (!c.nodeCode) {
        errorEl.textContent = `กรุณาระบุรหัสตู้/อุปกรณ์สำหรับรายการย่อยลำดับที่ ${i + 1}`;
        errorEl.style.display = 'block';
        return;
      }
      if (!c.name) {
        errorEl.textContent = `กรุณาระบุชื่อสำหรับรายการย่อย "${c.nodeCode}"`;
        errorEl.style.display = 'block';
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'กำลังบันทึกข้อมูล...';

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
        removeImage: state.removeImageFlag,
        children,
        removedChildIds: state.formRemovedChildIds
      };

      const savedNode = await rpc('saveNode', payload);
      await loadData();

      const isContinuous = $('form-continuous-add')?.checked && !id;

      if (isContinuous) {
        // Continuous Add mode: keep location, parentId, voltage; clear code, name, and children
        $('form-node-code').value = '';
        $('form-name').value = '';
        $('form-current-rating').value = '';
        $('form-remark').value = '';
        state.formImage = null;
        state.removeImageFlag = false;
        resetPhotoPreview();
        resetCircuitTable();
        addCircuitRow();
        addCircuitRow();
        addCircuitRow();

        errorEl.style.display = 'block';
        errorEl.style.background = '#ecfdf5';
        errorEl.style.borderColor = '#6ee7b7';
        errorEl.style.color = '#065f46';
        errorEl.textContent = `✓ บันทึก "${nodeCode}" สำเร็จแล้ว สามารถกรอกรายการถัดไปได้ทันที`;
        $('form-node-code')?.focus();
        setTimeout(() => {
          if (errorEl.textContent.startsWith('✓')) errorEl.style.display = 'none';
        }, 3500);
      } else {
        $('modal-node-form').close();
        if (savedNode?.id) {
          openInspector(savedNode.id);
        }
      }
    } catch (err) {
      errorEl.style.display = 'block';
      errorEl.style.background = '#fef2f2';
      errorEl.style.borderColor = '#fca5a5';
      errorEl.style.color = '#dc2626';
      errorEl.textContent = err.message || 'บันทึกข้อมูลไม่สำเร็จ';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'บันทึกข้อมูลทั้งหมด';
    }
  }

  // Delete confirmation
  async function confirmDeleteNode(id) {
    if (!isLoggedIn()) {
      const ok = await ensureAuthenticated();
      if (!ok) return;
    }
    const node = state.nodes.find(n => n.id === id);
    if (!node) return;

    const msg = `ต้องการลบตู้/อุปกรณ์ "${node.nodeCode} - ${node.name}" ใช่หรือไม่?\n\n*หมายเหตุ: สายย่อยที่รับไฟจากตู้นี้จะถูกปลดสายออก (ตั้งค่าต้นทางเป็นว่าง) โดยไม่ถูกลบ`;
    if (!confirm(msg)) return;

    const fallbackParentId = node.parentId || null;
    try {
      await rpc('deleteNode', id);
      state.pendingWiring.delete(id);
      for (const [k, v] of state.pendingWiring.entries()) {
        if (v === id) state.pendingWiring.delete(k);
      }
      state.selectedNodeId = fallbackParentId;
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

  // Export Electrical Distribution Data to Excel (.xlsx)
  async function exportElectricalExcel() {
    if (!isLoggedIn()) {
      const ok = await ensureAuthenticated();
      if (!ok) return;
    }
    if (!state.nodes || state.nodes.length === 0) {
      alert('ยังไม่มีข้อมูลตู้หรืออุปกรณ์ไฟฟ้าสำหรับส่งออก');
      return;
    }

    const byId = new Map();
    const childrenMap = new Map();
    state.nodes.forEach(n => {
      byId.set(n.id, n);
      childrenMap.set(n.id, []);
    });
    state.nodes.forEach(n => {
      if (n.parentId && childrenMap.has(n.parentId)) {
        childrenMap.get(n.parentId).push(n);
      }
    });

    function getHierarchyMeta(node) {
      const chain = [];
      const visited = new Set();
      let curr = node;
      while (curr && !visited.has(curr.id)) {
        visited.add(curr.id);
        chain.unshift(curr);
        curr = curr.parentId ? byId.get(curr.parentId) : null;
      }
      const rootNode = chain[0] || node;
      const rootMdb = rootNode.nodeType === 'MDB' ? rootNode.nodeCode : (node.parentId ? rootNode.nodeCode : 'สายอิสระ (ยังไม่ต่อ)');
      const feederPath = chain.map(c => c.nodeCode).join(' > ');
      return {
        level: chain.length,
        rootMdb,
        feederPath
      };
    }

    const allRows = state.nodes.map((n, idx) => {
      const parent = n.parentId ? byId.get(n.parentId) : null;
      const meta = getHierarchyMeta(n);
      return {
        'ลำดับ': idx + 1,
        'สายประธานหลัก (MDB)': meta.rootMdb,
        'ระดับชั้น': meta.level,
        'รหัสตู้ / อุปกรณ์ (Tag Code)': n.nodeCode || '',
        'ชื่อตู้ / อุปกรณ์': n.name || '',
        'ประเภท (Type)': n.nodeType || '',
        'พิกัดกระแส (A)': n.currentRating || 0,
        'ระดับแรงดัน (Voltage)': n.voltage || '',
        'สถานที่ติดตั้ง (Location)': n.location || '',
        'จ่ายไฟมาจาก (Parent Code)': parent ? parent.nodeCode : (n.nodeType === 'MDB' ? 'ตู้ประธานหลัก (MDB)' : 'ยังไม่เชื่อมโยง'),
        'ชื่อตู้ต้นทาง (Parent Name)': parent ? parent.name : '',
        'เส้นทางสายไฟ (Feeder Path)': meta.feederPath,
        'จำนวนวงจรย่อย': n.childCount || (childrenMap.get(n.id)?.length || 0),
        'หมายเหตุ': n.remark || '',
        'ลิงก์รูปถ่าย (Google Drive)': n.driveWebUrl || ''
      };
    });

    const nowStr = new Date().toISOString().slice(0, 10);

    if (typeof XLSX === 'undefined') {
      // Fallback to UTF-8 BOM CSV if SheetJS is not loaded
      const headers = Object.keys(allRows[0]);
      const csvLines = [
        headers.join(','),
        ...allRows.map(row =>
          headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
        )
      ];
      const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Electrical_Distribution_${nowStr}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }

    const colWidths = [
      { wch: 7 },  // ลำดับ
      { wch: 18 }, // สายประธานหลัก
      { wch: 10 }, // ระดับชั้น
      { wch: 22 }, // รหัสตู้
      { wch: 34 }, // ชื่อตู้
      { wch: 12 }, // ประเภท
      { wch: 14 }, // พิกัดกระแส
      { wch: 16 }, // ระดับแรงดัน
      { wch: 24 }, // สถานที่ติดตั้ง
      { wch: 22 }, // จ่ายไฟมาจาก
      { wch: 28 }, // ชื่อตู้ต้นทาง
      { wch: 42 }, // เส้นทางสายไฟ
      { wch: 14 }, // จำนวนวงจรย่อย
      { wch: 28 }, // หมายเหตุ
      { wch: 36 }  // ลิงก์รูปถ่าย
    ];

    const workbook = XLSX.utils.book_new();
    const wsAll = XLSX.utils.json_to_sheet(allRows);
    wsAll['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, wsAll, 'ทะเบียนตู้ทั้งหมด');

    // Create dedicated hierarchical sheet per Root MDB
    const rootMdbs = state.nodes
      .filter(n => n.nodeType === 'MDB' && !n.parentId)
      .sort((a, b) => (a.nodeCode || '').localeCompare(b.nodeCode || '', undefined, { numeric: true, sensitivity: 'base' }));

    const usedSheetNames = new Set(['ทะเบียนตู้ทั้งหมด']);
    rootMdbs.forEach(mdb => {
      const treeNodes = [];
      const visited = new Set();
      function traverse(node) {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);
        treeNodes.push(node);
        const kids = (childrenMap.get(node.id) || []).slice().sort((a, b) =>
          (a.nodeCode || '').localeCompare(b.nodeCode || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        kids.forEach(traverse);
      }
      traverse(mdb);

      const mdbRows = treeNodes.map((n, idx) => {
        const parent = n.parentId ? byId.get(n.parentId) : null;
        const meta = getHierarchyMeta(n);
        return {
          'ลำดับ': idx + 1,
          'สายประธานหลัก (MDB)': mdb.nodeCode,
          'ระดับชั้น': meta.level,
          'รหัสตู้ / อุปกรณ์ (Tag Code)': n.nodeCode || '',
          'ชื่อตู้ / อุปกรณ์': n.name || '',
          'ประเภท (Type)': n.nodeType || '',
          'พิกัดกระแส (A)': n.currentRating || 0,
          'ระดับแรงดัน (Voltage)': n.voltage || '',
          'สถานที่ติดตั้ง (Location)': n.location || '',
          'จ่ายไฟมาจาก (Parent Code)': parent ? parent.nodeCode : 'ตู้ประธานหลัก (MDB)',
          'ชื่อตู้ต้นทาง (Parent Name)': parent ? parent.name : '',
          'เส้นทางสายไฟ (Feeder Path)': meta.feederPath,
          'จำนวนวงจรย่อย': n.childCount || (childrenMap.get(n.id)?.length || 0),
          'หมายเหตุ': n.remark || '',
          'ลิงก์รูปถ่าย (Google Drive)': n.driveWebUrl || ''
        };
      });

      let sheetName = (mdb.nodeCode || 'MDB').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'MDB';
      if (usedSheetNames.has(sheetName)) {
        sheetName = `${sheetName.slice(0, 27)}_${usedSheetNames.size}`;
      }
      usedSheetNames.add(sheetName);

      const wsMdb = XLSX.utils.json_to_sheet(mdbRows);
      wsMdb['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, wsMdb, sheetName);
    });

    XLSX.writeFile(workbook, `Electrical_Distribution_${nowStr}.xlsx`);
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

    // 2. Add node, refresh, export Excel & auth buttons
    $('btn-add-node')?.addEventListener('click', openCreateModal);
    $('btn-refresh')?.addEventListener('click', loadData);
    $('btn-export-excel')?.addEventListener('click', exportElectricalExcel);
    $('btn-auth-status')?.addEventListener('click', () => {
      if (!isLoggedIn()) {
        ensureAuthenticated();
      }
    });

    window.addEventListener('em-auth-changed', () => {
      updateAuthPill();
    });
    updateAuthPill();

    // 3. KPI card / chip filter clicks
    document.querySelectorAll('.el-kpi-card, .el-kpi-chip').forEach(card => {
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
        state.dirPage = 1;
        if (clearBtn) clearBtn.style.display = state.searchQuery ? 'inline-block' : 'none';
        renderDirectory();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        state.dirPage = 1;
        clearBtn.style.display = 'none';
        renderDirectory();
      });
    }

    // Type Pills in Directory
    document.querySelectorAll('#dir-type-pills .el-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#dir-type-pills .el-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filterType = pill.dataset.type;
        state.dirPage = 1;
        renderDirectory();
      });
    });

    // Location Filter
    $('dir-location-filter')?.addEventListener('change', (e) => {
      state.locationFilter = e.target.value;
      state.dirPage = 1;
      renderDirectory();
    });

    // Directory Pagination
    $('dir-page-size')?.addEventListener('change', (e) => {
      state.dirPageSize = parseInt(e.target.value, 10) || 50;
      state.dirPage = 1;
      renderDirectory();
    });
    $('dir-btn-prev')?.addEventListener('click', () => {
      if (state.dirPage > 1) {
        state.dirPage--;
        renderDirectory();
      }
    });
    $('dir-btn-next')?.addEventListener('click', () => {
      state.dirPage++;
      renderDirectory();
    });

    // 5. Wiring Matrix Filters & Search
    const wiringSearchInput = $('wiring-search-input');
    const wiringClearBtn = $('wiring-search-clear');
    if (wiringSearchInput) {
      wiringSearchInput.addEventListener('input', (e) => {
        state.wiringSearchQuery = e.target.value.trim();
        state.wiringPage = 1;
        if (wiringClearBtn) wiringClearBtn.style.display = state.wiringSearchQuery ? 'inline-block' : 'none';
        renderWiringMatrix();
      });
    }
    if (wiringClearBtn) {
      wiringClearBtn.addEventListener('click', () => {
        wiringSearchInput.value = '';
        state.wiringSearchQuery = '';
        state.wiringPage = 1;
        wiringClearBtn.style.display = 'none';
        renderWiringMatrix();
      });
    }

    // Type Pills in Wiring
    document.querySelectorAll('#wiring-type-pills .el-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#wiring-type-pills .el-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.wiringFilterType = pill.dataset.type;
        state.wiringPage = 1;
        renderWiringMatrix();
      });
    });

    // Status Filter in Wiring
    $('wiring-status-filter')?.addEventListener('change', (e) => {
      state.wiringStatusFilter = e.target.value;
      state.wiringPage = 1;
      renderWiringMatrix();
    });

    // Wiring Pagination
    $('wiring-page-size')?.addEventListener('change', (e) => {
      state.wiringPageSize = parseInt(e.target.value, 10) || 50;
      state.wiringPage = 1;
      renderWiringMatrix();
    });
    $('wiring-btn-prev')?.addEventListener('click', () => {
      if (state.wiringPage > 1) {
        state.wiringPage--;
        renderWiringMatrix();
      }
    });
    $('wiring-btn-next')?.addEventListener('click', () => {
      state.wiringPage++;
      renderWiringMatrix();
    });

    // Save All Wiring
    $('btn-save-all-wiring')?.addEventListener('click', savePendingWiring);

    // 6. Inspector close
    $('btn-close-inspector')?.addEventListener('click', closeInspector);
    $('inspector-overlay')?.addEventListener('click', closeInspector);

    // 7. Modal form events
    $('btn-modal-close')?.addEventListener('click', () => {
      closeParentDropdown();
      $('modal-node-form').close();
    });
    $('btn-modal-cancel')?.addEventListener('click', () => {
      closeParentDropdown();
      $('modal-node-form').close();
    });
    $('modal-node-form')?.addEventListener('cancel', (e) => {
      if (state.parentDropdownOpen) {
        e.preventDefault();
        closeParentDropdown();
      }
    });
    $('form-node')?.addEventListener('submit', submitNodeForm);
    initParentSelectDropdown();
    initWiringSelectDropdown();

    // Circuit Builder toolbar events
    $('btn-add-circuit-row')?.addEventListener('click', () => {
      const tr = addCircuitRow();
      tr?.querySelector('.circuit-code')?.focus();
    });
    $('btn-add-circuit-5')?.addEventListener('click', () => {
      for (let i = 0; i < 5; i++) addCircuitRow();
    });
    $('btn-circuit-auto-gen')?.addEventListener('click', () => {
      const panel = $('panel-auto-gen');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        $('panel-excel-paste').style.display = 'none';
      }
    });
    $('btn-close-auto-gen')?.addEventListener('click', () => {
      $('panel-auto-gen').style.display = 'none';
    });
    $('btn-run-auto-gen')?.addEventListener('click', () => {
      const prefix = ($('auto-gen-prefix').value || 'Q').trim().toUpperCase();
      const start = parseInt($('auto-gen-start').value, 10) || 1;
      const count = Math.min(50, Math.max(1, parseInt($('auto-gen-count').value, 10) || 10));
      const nodeType = $('auto-gen-type').value || 'DV';
      const amp = parseFloat($('auto-gen-amp').value) || 0;
      const parentLoc = $('form-location').value.trim();

      for (let i = 0; i < count; i++) {
        const num = start + i;
        const code = `${prefix}${num}`;
        addCircuitRow({
          nodeCode: code,
          name: `${code} Load`,
          nodeType,
          currentRating: amp,
          location: parentLoc
        });
      }
      $('panel-auto-gen').style.display = 'none';
    });

    $('btn-circuit-excel-paste')?.addEventListener('click', () => {
      const panel = $('panel-excel-paste');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        $('panel-auto-gen').style.display = 'none';
        if (panel.style.display !== 'none') {
          $('excel-paste-text')?.focus();
        }
      }
    });
    $('btn-close-excel-paste')?.addEventListener('click', () => {
      $('panel-excel-paste').style.display = 'none';
    });
    $('btn-apply-excel-paste')?.addEventListener('click', () => {
      const rawText = ($('excel-paste-text').value || '').trim();
      if (!rawText) return;

      const lines = rawText.split(/\r?\n/);
      const parentLoc = $('form-location').value.trim();

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const parts = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(',');
        const code = (parts[0] || '').trim().toUpperCase();
        const name = (parts[1] || '').trim() || code;
        let type = (parts[2] || '').trim().toUpperCase();
        if (!['MDB', 'DB', 'LP', 'MC', 'DV'].includes(type)) {
          type = 'DB';
        }
        const amp = parseFloat(parts[3]) || 0;
        const loc = (parts[4] || '').trim() || parentLoc;

        if (code) {
          addCircuitRow({
            nodeCode: code,
            name,
            nodeType: type,
            currentRating: amp,
            location: loc
          });
        }
      });

      $('excel-paste-text').value = '';
      $('panel-excel-paste').style.display = 'none';
    });

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
    $('modal-lightbox')?.addEventListener('click', (e) => {
      if (e.target === $('modal-lightbox')) {
        $('modal-lightbox').close();
      }
    });

    // 8. Explorer Search & Navigation
    initExplorerSearch();

    // 9. Popstate listener for browser back/forward buttons
    window.addEventListener('popstate', () => {
      syncNodeFromUrl({ scrollToTop: false });
    });

    // 10. Load data
    loadData();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
