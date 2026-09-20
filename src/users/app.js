(() => {
  'use strict';

  let allUsers = [];
  let currentTargetUserId = null;

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
    toast.style.background = isError ? '#dc2626' : '#1e293b';
    toast.style.display = 'block';
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
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:24px">${err.message}</td></tr>`;
    }
  }

  function renderStats() {
    const total = allUsers.length;
    const perm = allUsers.filter(u => u.userType === 'permanent').length;
    const temp = allUsers.filter(u => u.userType === 'temporary').length;
    const admin = allUsers.filter(u => u.role === 'admin' || u.permissions?.users === 'admin').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-perm').textContent = perm;
    document.getElementById('stat-temp').textContent = temp;
    document.getElementById('stat-admin').textContent = admin;
  }

  function renderTable() {
    const tbody = document.getElementById('user-table-body');
    const search = document.getElementById('input-search').value.toLowerCase().trim();
    const typeFilter = document.getElementById('select-type-filter').value;
    const statusFilter = document.getElementById('select-status-filter').value;

    const filtered = allUsers.filter(u => {
      const matchSearch = !search || u.username.toLowerCase().includes(search) || (u.displayName || '').toLowerCase().includes(search);
      const matchType = !typeFilter || u.userType === typeFilter;
      const matchStatus = !statusFilter || (statusFilter === 'active' ? u.isActive : !u.isActive);
      return matchSearch && matchType && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#64748b;padding:24px">ไม่พบข้อมูลผู้ใช้งาน</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const isExpired = u.userType === 'temporary' && u.expiresAt && Date.now() > new Date(u.expiresAt).getTime();
      let typeBadge = '';
      if (u.userType === 'temporary') {
        const dateStr = u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        typeBadge = isExpired
          ? `<span class="badge badge-expired">หมดอายุแล้ว (${dateStr})</span>`
          : `<span class="badge badge-temp">ชั่วคราว (ถึง ${dateStr})</span>`;
      } else {
        typeBadge = `<span class="badge badge-perm">ถาวร</span>`;
      }

      const statusBadge = u.isActive
        ? `<span class="badge badge-active">ใช้งาน</span>`
        : `<span class="badge badge-inactive">ระงับการใช้งาน</span>`;

      const p = u.permissions || {};
      const modClass = val => val === 'write' ? 'has-write' : val === 'read' ? 'has-read' : 'has-none';
      const modText = (val, name) => `${name}: ${val === 'write' ? 'แก้ไข' : val === 'read' ? 'ดู' : 'ปิด'}`;

      const permsHtml = `
        <div class="module-badges">
          <span class="badge-mod ${modClass(p.machines)}">${modText(p.machines, 'เครื่องจักร')}</span>
          <span class="badge-mod ${modClass(p.parts)}">${modText(p.parts, 'อะไหล่')}</span>
          <span class="badge-mod ${modClass(p.bom)}">${modText(p.bom, 'BOM')}</span>
          ${p.users === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
        </div>
      `;

      const delBadge = p.can_delete ? `<span style="color:#16a34a;font-weight:600">✓ ได้</span>` : `<span style="color:#94a3b8">✗ ไม่ได้</span>`;

      return `
        <tr>
          <td><strong>${u.username}</strong></td>
          <td>${u.displayName || '-'}</td>
          <td>${typeBadge}</td>
          <td>${permsHtml}</td>
          <td>${delBadge}</td>
          <td>${statusBadge}</td>
          <td style="text-align:right">
            <div class="action-cell">
              <button class="action-btn btn-edit" data-id="${u.id}" title="แก้ไขสิทธิ์">✏️ แก้ไข</button>
              <button class="action-btn btn-reset" data-id="${u.id}" data-user="${u.username}" title="รีเซ็ตรหัสผ่านเป็น 1234">🔑 รีเซ็ต 1234</button>
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

  function openCreateModal() {
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

    document.getElementById('perm-machines').value = 'write';
    document.getElementById('perm-parts').value = 'write';
    document.getElementById('perm-bom').value = 'write';
    document.getElementById('perm-users').value = 'none';
    document.getElementById('perm-can-delete').checked = false;

    document.getElementById('modal-user').style.display = 'flex';
  }

  function openEditModal(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;

    document.getElementById('modal-user-title').textContent = `แก้ไขสิทธิ์ผู้ใช้: ${user.username}`;
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
    document.getElementById('perm-machines').value = p.machines || 'write';
    document.getElementById('perm-parts').value = p.parts || 'write';
    document.getElementById('perm-bom').value = p.bom || 'write';
    document.getElementById('perm-users').value = p.users || 'none';
    document.getElementById('perm-can-delete').checked = Boolean(p.can_delete);

    document.getElementById('modal-user').style.display = 'flex';
  }

  function openResetModal(id, username) {
    currentTargetUserId = id;
    document.getElementById('reset-target-user').textContent = username;
    document.getElementById('modal-reset').style.display = 'flex';
  }

  async function toggleUserStatus(id, currentlyActive) {
    const newActive = !currentlyActive;
    try {
      await rpcUsers('updateUser', id, { isActive: newActive });
      showToast(`ปรับสถานะผู้ใช้เป็น ${newActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} แล้ว`);
      loadUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function deleteUserConfirm(id, username) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี '${username}' ออกจากระบบอย่างถาวร?`)) return;
    try {
      await rpcUsers('deleteUser', id);
      showToast(`ลบบัญชี '${username}' เรียบร้อยแล้ว`);
      loadUsers();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  // Form submission
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

    const permissions = {
      machines: document.getElementById('perm-machines').value,
      parts: document.getElementById('perm-parts').value,
      bom: document.getElementById('perm-bom').value,
      users: document.getElementById('perm-users').value,
      can_delete: document.getElementById('perm-can-delete').checked
    };

    const role = permissions.users === 'admin' ? 'admin' : (permissions.machines === 'write' || permissions.parts === 'write' || permissions.bom === 'write') ? 'editor' : 'viewer';

    try {
      if (id) {
        await rpcUsers('updateUser', id, { displayName, role, userType, expiresAt, permissions });
        showToast('อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว');
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
      showToast('รีเซ็ตรหัสผ่านเป็น 1234 เรียบร้อย ผู้ใช้จะถูกบังคับเปลี่ยนรหัสทันทีเมื่อล็อกอิน');
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

  // Initialize
  document.addEventListener('DOMContentLoaded', loadUsers);
})();
