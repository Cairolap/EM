(() => {
  'use strict';

  let allUsers = [];
  let currentTargetUserId = null;

  // Granular Permissions State for Modal
  let currentPerms = {
    machines: 'write',
    parts: 'write',
    bom: 'write',
    pm: 'write',
    pm_expenses: 'write',
    pr_tracker: 'write',
    announcements: 'write',
    users: 'none',
    can_delete: false
  };

  const MODULE_KEYS = ['machines', 'parts', 'bom', 'pm', 'pm_expenses', 'pr_tracker', 'announcements'];

  const MODULE_METAS = {
    machines: { label: 'เครื่องจักร', icon: '⚙️' },
    parts: { label: 'อะไหล่', icon: '🔩' },
    bom: { label: 'BOM', icon: '📑' },
    pm: { label: 'PM Orders', icon: '⏱️' },
    pm_expenses: { label: 'งบ PM', icon: '💰' },
    pr_tracker: { label: 'สโตร์/PR', icon: '📦' },
    announcements: { label: 'ประกาศ', icon: '📢' },
    users: { label: 'Admin', icon: '⭐' }
  };

  // Pre-configured role templates
  const ROLE_PRESETS = {
    admin: {
      machines: 'write',
      parts: 'write',
      bom: 'write',
      pm: 'write',
      pm_expenses: 'write',
      pr_tracker: 'write',
      announcements: 'write',
      users: 'admin',
      can_delete: true
    },
    tech: {
      machines: 'write',
      parts: 'write',
      bom: 'write',
      pm: 'write',
      pm_expenses: 'read',
      pr_tracker: 'write',
      announcements: 'read',
      users: 'none',
      can_delete: false
    },
    store: {
      machines: 'read',
      parts: 'write',
      bom: 'read',
      pm: 'read',
      pm_expenses: 'write',
      pr_tracker: 'write',
      announcements: 'read',
      users: 'none',
      can_delete: false
    },
    planner: {
      machines: 'write',
      parts: 'write',
      bom: 'write',
      pm: 'write',
      pm_expenses: 'write',
      pr_tracker: 'write',
      announcements: 'write',
      users: 'none',
      can_delete: true
    },
    viewer: {
      machines: 'read',
      parts: 'read',
      bom: 'read',
      pm: 'read',
      pm_expenses: 'read',
      pr_tracker: 'read',
      announcements: 'read',
      users: 'none',
      can_delete: false
    },
    deny: {
      machines: 'none',
      parts: 'none',
      bom: 'none',
      pm: 'none',
      pm_expenses: 'none',
      pr_tracker: 'none',
      announcements: 'none',
      users: 'none',
      can_delete: false
    }
  };

  async function rpcUsers(method, ...args) {
    const res = await fetch('/api/v1/users/rpc', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error?.message || 'คำขอไม่สำเร็จ');
    return result.data;
  }

  function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = isError ? '#dc2626' : '#0f172a';
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
  }

  async function loadUsers() {
    try {
      allUsers = await rpcUsers('listUsers');
      renderStats();
      renderTable();
    } catch (err) {
      showToast(err.message, true);
      const tbody = document.getElementById('user-table-body');
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:32px;font-weight:600">${err.message}</td></tr>`;
    }
  }

  function renderStats() {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.isActive).length;
    const perm = allUsers.filter(u => u.userType === 'permanent').length;
    const temp = allUsers.filter(u => u.userType === 'temporary').length;
    const admin = allUsers.filter(u => u.role === 'admin' || u.permissions?.users === 'admin').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-admin').textContent = admin;
    document.getElementById('stat-perm').textContent = perm;
    document.getElementById('stat-temp').textContent = temp;
    document.getElementById('total-count').textContent = total;
  }

  function renderTable() {
    const tbody = document.getElementById('user-table-body');
    const search = (document.getElementById('input-search').value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('select-type-filter').value;
    const statusFilter = document.getElementById('select-status-filter').value;
    const roleFilter = document.getElementById('select-role-filter').value;

    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = search ? 'block' : 'none';

    const now = Date.now();

    const filtered = allUsers.filter(u => {
      const matchSearch = !search ||
        u.username.toLowerCase().includes(search) ||
        (u.displayName || '').toLowerCase().includes(search);

      const isExpired = u.userType === 'temporary' && u.expiresAt && now > new Date(u.expiresAt).getTime();
      let matchType = true;
      if (typeFilter === 'permanent') matchType = u.userType === 'permanent';
      else if (typeFilter === 'temporary') matchType = u.userType === 'temporary' && !isExpired;
      else if (typeFilter === 'expired') matchType = isExpired;

      const matchStatus = !statusFilter || (statusFilter === 'active' ? u.isActive : !u.isActive);

      let matchRole = true;
      const p = u.permissions || {};
      const isAdmin = u.role === 'admin' || p.users === 'admin';
      const hasWrite = Object.entries(p).some(([k, v]) => k !== 'users' && k !== 'can_delete' && v === 'write');
      if (roleFilter === 'admin') matchRole = isAdmin;
      else if (roleFilter === 'editor') matchRole = hasWrite;
      else if (roleFilter === 'viewer') matchRole = !isAdmin && !hasWrite;
      else if (roleFilter === 'can_delete') matchRole = Boolean(p.can_delete);

      return matchSearch && matchType && matchStatus && matchRole;
    });

    document.getElementById('filter-count').textContent = filtered.length;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:36px">ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const isExpired = u.userType === 'temporary' && u.expiresAt && now > new Date(u.expiresAt).getTime();
      let typeBadge = '';
      if (u.userType === 'temporary') {
        const dateStr = u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
        typeBadge = isExpired
          ? `<span class="badge badge-expired" title="หมดอายุเมื่อ ${dateStr}">หมดอายุแล้ว</span>`
          : `<span class="badge badge-temp" title="ใช้งานได้ถึง ${dateStr}">ชั่วคราว (${dateStr})</span>`;
      } else {
        typeBadge = `<span class="badge badge-perm">ถาวร</span>`;
      }

      const statusBadge = u.isActive
        ? `<span class="badge badge-active">● ใช้งาน</span>`
        : `<span class="badge badge-inactive">○ ระงับ</span>`;

      const p = u.permissions || {};
      const isAdmin = u.role === 'admin' || p.users === 'admin';

      // Count write permissions
      const writeCount = MODULE_KEYS.filter(k => p[k] === 'write').length;
      const readCount = MODULE_KEYS.filter(k => p[k] === 'read').length;

      let rolePill = '';
      if (isAdmin) {
        rolePill = `<span class="badge badge-role-admin">👑 ผู้ดูแลระบบ (Admin)</span>`;
      } else if (writeCount >= 5) {
        rolePill = `<span class="badge badge-role-editor">✏️ ผู้แก้ไข (${writeCount} โมดูล)</span>`;
      } else if (writeCount > 0) {
        rolePill = `<span class="badge badge-role-editor">✏️ ผู้ดูแลบางส่วน (${writeCount} โมดูล)</span>`;
      } else if (readCount > 0) {
        rolePill = `<span class="badge badge-role-viewer">👁️ ดูอย่างเดียว</span>`;
      } else {
        rolePill = `<span class="badge badge-inactive">🔒 ปิดสิทธิ์ทุกโมดูล</span>`;
      }

      // Render module chips
      const chipsHtml = MODULE_KEYS.map(k => {
        const meta = MODULE_METAS[k];
        const val = p[k] || 'write'; // Default legacy fallback
        const chipClass = val === 'write' ? 'chip-write' : val === 'read' ? 'chip-read' : 'chip-none';
        const label = val === 'write' ? `${meta.label}: แก้ไข` : val === 'read' ? `${meta.label}: ดู` : meta.label;
        return `<span class="perm-chip ${chipClass}"><span class="perm-chip-dot"></span>${meta.icon} ${label}</span>`;
      }).join('');

      const adminChip = p.users === 'admin'
        ? `<span class="perm-chip chip-admin"><span class="perm-chip-dot"></span>⭐ ผู้ดูแลผู้ใช้</span>`
        : '';

      const delBadge = p.can_delete
        ? `<span style="color:#16a34a;font-weight:700">✓ ได้</span>`
        : `<span style="color:#94a3b8;font-weight:500">—</span>`;

      const initialChar = (u.displayName || u.username || '?').charAt(0).toUpperCase();
      const avatarClass = isAdmin ? 'avatar-admin' : u.userType === 'temporary' ? 'avatar-temp' : '';

      return `
        <tr>
          <td>
            <div class="user-identity-cell">
              <div class="user-avatar ${avatarClass}">${initialChar}</div>
              <div class="user-names">
                <div class="user-username">
                  ${u.username}
                  ${isAdmin ? '<span title="ผู้ดูแลระบบ" style="font-size:12px">👑</span>' : ''}
                </div>
                <div class="user-display-name" title="${u.displayName || '-'}">${u.displayName || '-'}</div>
              </div>
            </div>
          </td>
          <td>${typeBadge}</td>
          <td>
            <div class="perm-matrix-cell">
              <div>${rolePill}</div>
              <div class="perm-chips-grid">
                ${chipsHtml}
                ${adminChip}
              </div>
            </div>
          </td>
          <td style="text-align:center">${delBadge}</td>
          <td style="text-align:center">${statusBadge}</td>
          <td style="text-align:right">
            <div class="action-cell">
              <button class="action-btn btn-edit-action btn-edit" data-id="${u.id}" title="แก้ไขข้อมูลและสิทธิ์">✏️ สิทธิ์</button>
              <button class="action-btn btn-reset-action btn-reset" data-id="${u.id}" data-user="${u.username}" title="รีเซ็ตรหัสผ่านเป็น 1234">🔑 1234</button>
              <button class="action-btn btn-toggle" data-id="${u.id}" data-active="${u.isActive ? '1' : '0'}" title="${u.isActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}">${u.isActive ? '🚫 ระงับ' : '✅ เปิด'}</button>
              ${u.username !== 'admin' ? `<button class="action-btn action-btn-danger btn-delete" data-id="${u.id}" data-user="${u.username}" title="ลบผู้ใช้">🗑️</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableEvents();
  }

  function attachTableEvents() {
    document.querySelectorAll('.btn-edit').forEach(b => {
      b.onclick = () => openEditModal(b.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-reset').forEach(b => {
      b.onclick = () => openResetModal(b.getAttribute('data-id'), b.getAttribute('data-user'));
    });
    document.querySelectorAll('.btn-toggle').forEach(b => {
      b.onclick = () => toggleUserStatus(b.getAttribute('data-id'), b.getAttribute('data-active') === '1');
    });
    document.querySelectorAll('.btn-delete').forEach(b => {
      b.onclick = () => deleteUserConfirm(b.getAttribute('data-id'), b.getAttribute('data-user'));
    });
  }

  // Update UI segmented buttons to reflect currentPerms
  function syncPermsUI() {
    // 1. Standard module segmented controls
    document.querySelectorAll('.perm-segmented').forEach(container => {
      const key = container.getAttribute('data-key');
      const currentVal = currentPerms[key] || (key === 'users' ? 'none' : 'write');
      container.querySelectorAll('.seg-btn').forEach(btn => {
        const btnVal = btn.getAttribute('data-val');
        if (btnVal === currentVal) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    });

    // 2. Can Delete Switch Toggle
    const chk = document.getElementById('perm-can-delete');
    const lbl = document.getElementById('label-can-delete');
    if (chk) {
      chk.checked = Boolean(currentPerms.can_delete);
      if (lbl) {
        lbl.textContent = chk.checked ? '✓ อนุญาตให้ลบได้' : 'ไม่อนุญาต';
        lbl.className = 'switch-text' + (chk.checked ? ' active' : '');
      }
    }
  }

  function setPreset(presetName) {
    const template = ROLE_PRESETS[presetName];
    if (!template) return;
    currentPerms = { ...template };
    syncPermsUI();
    showToast(`ปรับใช้แม่แบบ: ${getPresetLabel(presetName)} แล้ว`);
  }

  function getPresetLabel(key) {
    switch (key) {
      case 'admin': return '👑 ผู้ดูแลระบบ (Admin)';
      case 'tech': return '⚡ ช่างซ่อมบำรุง / วิศวกร';
      case 'store': return '📦 เจ้าหน้าที่สโตร์ / จัดซื้อ';
      case 'planner': return '📊 ผู้วางแผน / หัวหน้างาน';
      case 'viewer': return '👁️ ผู้เข้าชม (ดูอย่างเดียว)';
      case 'deny': return '🚫 ปิดทุกสิทธิ์';
      default: return key;
    }
  }

  function batchSet(value) {
    MODULE_KEYS.forEach(k => {
      currentPerms[k] = value;
    });
    syncPermsUI();
    showToast(value === 'write' ? 'ให้สิทธิ์แก้ไขทุกโมดูลแล้ว' : value === 'read' ? 'ให้สิทธิ์ดูได้ทุกโมดูลแล้ว' : 'ปิดการเข้าถึงทุกโมดูลแล้ว');
  }

  function openCreateModal() {
    document.getElementById('modal-user-badge').textContent = 'สร้างใหม่';
    document.getElementById('modal-user-title').textContent = 'เพิ่มผู้ใช้งานใหม่';
    document.getElementById('user-id').value = '';
    document.getElementById('u-username').value = '';
    document.getElementById('u-username').disabled = false;
    document.getElementById('group-password').style.display = 'block';
    document.getElementById('u-password').required = true;
    document.getElementById('u-password').value = '';
    document.getElementById('u-display-name').value = '';
    document.getElementById('u-type').value = 'permanent';
    document.getElementById('group-expiry').style.display = 'none';
    document.getElementById('u-expires-at').value = '';

    // Default to tech permissions
    currentPerms = { ...ROLE_PRESETS.tech };
    syncPermsUI();

    document.getElementById('modal-user').style.display = 'flex';
    setTimeout(() => { document.getElementById('u-username').focus(); }, 100);
  }

  function openEditModal(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;

    document.getElementById('modal-user-badge').textContent = 'แก้ไข';
    document.getElementById('modal-user-title').textContent = `แก้ไขสิทธิ์ผู้ใช้: @${user.username}`;
    document.getElementById('user-id').value = user.id;
    document.getElementById('u-username').value = user.username;
    document.getElementById('u-username').disabled = true;
    document.getElementById('group-password').style.display = 'none';
    document.getElementById('u-password').required = false;
    document.getElementById('u-display-name').value = user.displayName || '';
    document.getElementById('u-type').value = user.userType || 'permanent';

    if (user.userType === 'temporary') {
      document.getElementById('group-expiry').style.display = 'block';
      if (user.expiresAt) {
        const d = new Date(user.expiresAt);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('u-expires-at').value = iso;
      } else {
        document.getElementById('u-expires-at').value = '';
      }
    } else {
      document.getElementById('group-expiry').style.display = 'none';
    }

    const p = user.permissions || {};
    currentPerms = {
      machines: p.machines || 'write',
      parts: p.parts || 'write',
      bom: p.bom || 'write',
      pm: p.pm || (p.machines || 'write'),
      pm_expenses: p.pm_expenses || p.pm || (p.machines || 'write'),
      pr_tracker: p.pr_tracker || p.pm || (p.machines || 'write'),
      announcements: p.announcements || 'write',
      users: p.users || (user.role === 'admin' ? 'admin' : 'none'),
      can_delete: Boolean(p.can_delete)
    };

    syncPermsUI();
    document.getElementById('modal-user').style.display = 'flex';
  }

  function openResetModal(id, username) {
    currentTargetUserId = id;
    document.getElementById('reset-target-user').textContent = '@' + username;
    document.getElementById('modal-reset').style.display = 'flex';
  }

  async function toggleUserStatus(id, currentlyActive) {
    const newActive = !currentlyActive;
    try {
      await rpcUsers('updateUser', id, { isActive: newActive });
      showToast(`ปรับสถานะเป็น ${newActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} เรียบร้อย`);
      loadUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function deleteUserConfirm(id, username) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี '@${username}' ออกจากระบบอย่างถาวร?`)) return;
    try {
      await rpcUsers('deleteUser', id);
      showToast(`ลบบัญชี '@${username}' เรียบร้อยแล้ว`);
      loadUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  // Bind Segmented Controls
  function initSegmentedControls() {
    document.querySelectorAll('.perm-segmented').forEach(container => {
      const key = container.getAttribute('data-key');
      container.querySelectorAll('.seg-btn').forEach(btn => {
        btn.onclick = () => {
          const val = btn.getAttribute('data-val');
          currentPerms[key] = val;
          syncPermsUI();
        };
      });
    });

    const chkDelete = document.getElementById('perm-can-delete');
    if (chkDelete) {
      chkDelete.onchange = (e) => {
        currentPerms.can_delete = e.target.checked;
        const lbl = document.getElementById('label-can-delete');
        if (lbl) {
          lbl.textContent = e.target.checked ? '✓ อนุญาตให้ลบได้' : 'ไม่อนุญาต';
          lbl.className = 'switch-text' + (e.target.checked ? ' active' : '');
        }
      };
    }

    // Role Presets Buttons
    document.querySelectorAll('.preset-btn').forEach(b => {
      b.onclick = () => setPreset(b.getAttribute('data-preset'));
    });

    // Batch Action Buttons
    document.getElementById('btn-batch-write')?.addEventListener('click', () => batchSet('write'));
    document.getElementById('btn-batch-read')?.addEventListener('click', () => batchSet('read'));
    document.getElementById('btn-batch-none')?.addEventListener('click', () => batchSet('none'));
  }

  // Form Submission
  document.getElementById('form-user').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('user-id').value;
    const username = document.getElementById('u-username').value.trim().toLowerCase();
    const password = document.getElementById('u-password').value;
    const displayName = document.getElementById('u-display-name').value.trim();
    const userType = document.getElementById('u-type').value;
    let expiresAt = null;

    if (userType === 'temporary') {
      const expVal = document.getElementById('u-expires-at').value;
      if (!expVal) {
        alert('กรุณาระบุวัน-เวลาหมดอายุสำหรับผู้ใช้ชั่วคราว');
        return;
      }
      expiresAt = new Date(expVal).toISOString();
    }

    const permissions = { ...currentPerms };

    // Compute effective global role
    const role = permissions.users === 'admin'
      ? 'admin'
      : MODULE_KEYS.some(k => permissions[k] === 'write') ? 'editor' : 'viewer';

    try {
      if (id) {
        await rpcUsers('updateUser', id, { displayName, role, userType, expiresAt, permissions });
        showToast('อัปเดตข้อมูลและสิทธิ์ผู้ใช้เรียบร้อยแล้ว');
      } else {
        await rpcUsers('createUser', { username, password, displayName, role, userType, expiresAt, permissions });
        showToast('สร้างผู้ใช้งานใหม่เรียบร้อยแล้ว');
      }
      document.getElementById('modal-user').style.display = 'none';
      loadUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Reset confirmation
  document.getElementById('btn-confirm-reset').onclick = async () => {
    if (!currentTargetUserId) return;
    try {
      await rpcUsers('resetPassword', currentTargetUserId);
      showToast('รีเซ็ตรหัสผ่านเป็น 1234 เรียบร้อย ผู้ใช้จะถูกบังคับเปลี่ยนรหัสผ่านทันที');
      document.getElementById('modal-reset').style.display = 'none';
      loadUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Type change toggles expiry input
  document.getElementById('u-type').onchange = (e) => {
    document.getElementById('group-expiry').style.display = e.target.value === 'temporary' ? 'block' : 'none';
  };

  // Close modals
  document.getElementById('btn-create-user').onclick = openCreateModal;
  document.getElementById('modal-user-close').onclick = () => { document.getElementById('modal-user').style.display = 'none'; };
  document.getElementById('btn-cancel-user').onclick = () => { document.getElementById('modal-user').style.display = 'none'; };
  document.getElementById('modal-reset-close').onclick = () => { document.getElementById('modal-reset').style.display = 'none'; };
  document.getElementById('btn-cancel-reset').onclick = () => { document.getElementById('modal-reset').style.display = 'none'; };

  // Search & Filter listeners
  document.getElementById('input-search').oninput = renderTable;
  document.getElementById('select-type-filter').onchange = renderTable;
  document.getElementById('select-status-filter').onchange = renderTable;
  document.getElementById('select-role-filter').onchange = renderTable;
  document.getElementById('btn-clear-search').onclick = () => {
    document.getElementById('input-search').value = '';
    renderTable();
  };

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    initSegmentedControls();
    loadUsers();
  });
})();
