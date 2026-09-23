(() => {
 'use strict';
 const scope = location.pathname.startsWith('/parts') ? 'parts' : location.pathname.startsWith('/bom') ? 'bom' : 'machines';
 const inFlight = new Map();

 let loginPromise = null;
 let currentUser = null;

 function ensureLoginModal() {
  let modal = document.getElementById('em-auth-overlay');
  if (modal) return modal;

  const style = document.createElement('style');
  style.textContent = `
   #em-auth-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 99999;
   }
   .em-auth-card {
    background: #ffffff; color: #1e293b; border-radius: 12px; width: 100%; max-width: 380px;
    padding: 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    font-family: inherit;
   }
   .em-auth-title { font-size: 18px; font-weight: 700; color: #18313d; margin-bottom: 6px; }
   .em-auth-sub { font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.4; }
   .em-auth-field { margin-bottom: 14px; text-align: left; }
   .em-auth-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
   .em-auth-input {
    width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;
    box-sizing: border-box; transition: border-color 0.2s;
   }
   .em-auth-input:focus { outline: none; border-color: #cc681c; box-shadow: 0 0 0 3px rgba(204, 104, 28, 0.15); }
   .em-auth-btn {
    width: 100%; padding: 10px; background: #cc681c; color: #ffffff; border: none; border-radius: 6px;
    font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 8px;
   }
   .em-auth-btn:hover { background: #b25814; }
   .em-auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
   .em-auth-err { font-size: 13px; color: #dc2626; margin-top: 10px; min-height: 18px; text-align: center; }
  `;
  document.head.appendChild(style);

  modal = document.createElement('div');
  modal.id = 'em-auth-overlay';
  modal.style.display = 'none';
  modal.innerHTML = `
   <div class="em-auth-card">
    <div class="em-auth-title">เข้าสู่ระบบ Electrical Maintenance</div>
    <div class="em-auth-sub">กรุณาเข้าสู่ระบบเพื่อใช้งานระบบทะเบียนและอุปกรณ์<br><small style="color:#94a3b8">(บัญชีเริ่มต้น: admin / admin1234)</small></div>
    <form id="em-auth-form">
     <div class="em-auth-field">
      <label class="em-auth-label" for="em-auth-user">ชื่อผู้ใช้ (Username)</label>
      <input class="em-auth-input" id="em-auth-user" type="text" autocomplete="username" required placeholder="admin">
     </div>
     <div class="em-auth-field">
      <label class="em-auth-label" for="em-auth-pass">รหัสผ่าน (Password)</label>
      <input class="em-auth-input" id="em-auth-pass" type="password" autocomplete="current-password" required placeholder="••••••••">
     </div>
     <button class="em-auth-btn" id="em-auth-submit" type="submit">เข้าสู่ระบบ</button>
     <div class="em-auth-err" id="em-auth-error"></div>
    </form>
   </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('#em-auth-form');
  const errEl = modal.querySelector('#em-auth-error');
  const btn = modal.querySelector('#em-auth-submit');

  form.onsubmit = async (e) => {
   e.preventDefault();
   errEl.textContent = '';
   btn.disabled = true;
   btn.textContent = 'กำลังเข้าสู่ระบบ...';

   const username = modal.querySelector('#em-auth-user').value.trim();
   const password = modal.querySelector('#em-auth-pass').value;

   try {
    const res = await fetch('/api/v1/auth/login', {
     method: 'POST',
     credentials: 'same-origin',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    currentUser = result.data;
    updateBadge();
    modal.style.display = 'none';

    if (result.data.mustChangePassword) {
     await promptForceChangePassword();
    }

    if (loginPromise) {
     const resolve = loginPromise.resolve;
     loginPromise = null;
     resolve(currentUser);
    }
   } catch (err) {
    errEl.textContent = err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
   } finally {
    btn.disabled = false;
    btn.textContent = 'เข้าสู่ระบบ';
   }
  };

  return modal;
 }

 function promptForceChangePassword() {
  return new Promise((resolve) => {
   let modal = document.getElementById('em-force-pass-overlay');
   if (!modal) {
    modal = document.createElement('div');
    modal.id = 'em-force-pass-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100000;';
    modal.innerHTML = `
     <div class="em-auth-card">
      <div class="em-auth-title" style="color:#dc2626">⚠️ บังคับตั้งรหัสผ่านใหม่</div>
      <div class="em-auth-sub">รหัสผ่านปัจจุบันต่ำกว่า 5 ตัวอักษร หรือได้รับการรีเซ็ต เพื่อความปลอดภัยกรุณาตั้งรหัสผ่านใหม่ (อย่างน้อย 5 ตัวอักษร)</div>
      <form id="em-force-pass-form">
       <div class="em-auth-field">
        <label class="em-auth-label" for="em-new-pass">รหัสผ่านใหม่</label>
        <input class="em-auth-input" id="em-new-pass" type="password" required minlength="5" placeholder="อย่างน้อย 5 ตัวอักษร">
       </div>
       <div class="em-auth-field">
        <label class="em-auth-label" for="em-conf-pass">ยืนยันรหัสผ่านใหม่</label>
        <input class="em-auth-input" id="em-conf-pass" type="password" required minlength="5" placeholder="พิมพ์ซ้ำอีกครั้ง">
       </div>
       <button class="em-auth-btn" id="em-force-submit" type="submit">บันทึกรหัสผ่านใหม่</button>
       <div class="em-auth-err" id="em-force-err"></div>
      </form>
     </div>
    `;
    document.body.appendChild(modal);
   }

   modal.style.display = 'flex';
   const form = modal.querySelector('#em-force-pass-form');
   const errEl = modal.querySelector('#em-force-err');
   const btn = modal.querySelector('#em-force-submit');
   errEl.textContent = '';

   form.onsubmit = async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const p1 = modal.querySelector('#em-new-pass').value;
    const p2 = modal.querySelector('#em-conf-pass').value;
    if (p1 !== p2) {
     errEl.textContent = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
     return;
    }
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';
    try {
     const res = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: p1 })
     });
     const r = await res.json();
     if (!r.ok) throw new Error(r.error?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
     modal.style.display = 'none';
     if (currentUser) currentUser.mustChangePassword = false;
     resolve();
    } catch (err) {
     errEl.textContent = err.message || 'บันทึกรหัสผ่านไม่สำเร็จ';
    } finally {
     btn.disabled = false;
     btn.textContent = 'บันทึกรหัสผ่านใหม่';
    }
   };
  });
 }

 function promptLogin() {
  if (loginPromise) return loginPromise.promise;
  const modal = ensureLoginModal();
  modal.style.display = 'flex';
  const errEl = modal.querySelector('#em-auth-error');
  if (errEl) errEl.textContent = '';
  const userInput = modal.querySelector('#em-auth-user');
  if (userInput) { userInput.value = ''; userInput.focus(); }
  const passInput = modal.querySelector('#em-auth-pass');
  if (passInput) passInput.value = '';

  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  loginPromise = { promise, resolve, reject };
  return promise;
 }

 function initNavUI() {
    const hamburgerBtn = document.getElementById('em-hamburger-btn');
    const drawer = document.getElementById('em-drawer');
    const overlay = document.getElementById('em-drawer-overlay');
    const closeBtn = document.getElementById('em-drawer-close');

    function openDrawer() {
      if (drawer) {
        drawer.classList.add('is-active');
        hamburgerBtn?.setAttribute('aria-expanded', 'true');
      }
      if (overlay) overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      if (drawer) {
        drawer.classList.remove('is-active');
        hamburgerBtn?.setAttribute('aria-expanded', 'false');
      }
      if (overlay) overlay.classList.remove('is-active');
      document.body.style.overflow = '';
    }

    if (hamburgerBtn) hamburgerBtn.onclick = openDrawer;
    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (overlay) overlay.onclick = closeDrawer;

    // Drawer accordions
    document.querySelectorAll('.em-drawer-group-btn').forEach(btn => {
      btn.onclick = () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        const sublist = btn.nextElementSibling;
        if (sublist) {
          sublist.style.display = expanded ? 'none' : 'flex';
        }
      };
    });

    // Auto-handle ?dept= in Equipment BOM
    if (location.pathname.startsWith('/bom')) {
      const params = new URLSearchParams(location.search);
      const targetDept = params.get('dept');
      if (targetDept) {
        try {
          sessionStorage.setItem('BOM_LAST_DEPT', targetDept);
          sessionStorage.removeItem('BOM_LAST_LINE');
          sessionStorage.removeItem('BOM_LAST_MACHINE');
        } catch (_) {}
      }
    }

    // Auto-handle ?action=add in Parts
    if (location.pathname.startsWith('/parts')) {
      const params = new URLSearchParams(location.search);
      if (params.get('action') === 'add') {
        const checkAddBtn = () => {
          const btn = document.getElementById('add-part');
          if (btn && !btn.disabled) {
            btn.click();
          } else {
            setTimeout(checkAddBtn, 100);
          }
        };
        setTimeout(checkAddBtn, 300);
      }
    }
  }

  function updateBadge() {
    const badge = document.getElementById('em-user-badge');
    const navUsers = document.getElementById('em-nav-users');
    const drawerNavUsers = document.getElementById('em-drawer-nav-users');
    const drawerUserCard = document.getElementById('em-drawer-user-card');
    const drawerFooter = document.getElementById('em-drawer-footer');

    const canManageUsers = currentUser && (currentUser.role === 'admin' || currentUser.permissions?.users === 'admin');
    if (navUsers) navUsers.style.display = canManageUsers ? 'inline-flex' : 'none';
    if (drawerNavUsers) drawerNavUsers.style.display = canManageUsers ? 'flex' : 'none';

    if (!currentUser) {
      if (badge) {
        badge.innerHTML = '<button id="em-open-login" style="background:#cc681c;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s">เข้าสู่ระบบ</button>';
        const btn = document.getElementById('em-open-login');
        if (btn) btn.onclick = () => promptLogin();
      }
      if (drawerUserCard) {
        drawerUserCard.innerHTML = '<div style="font-size:13px;color:#94a3b8;margin-bottom:8px">ยังไม่ได้เข้าสู่ระบบ</div><button id="em-drawer-open-login" style="width:100%;background:#cc681c;color:#fff;border:none;border-radius:6px;padding:8px;font-size:13px;font-weight:600;cursor:pointer">เข้าสู่ระบบ</button>';
        const dBtn = document.getElementById('em-drawer-open-login');
        if (dBtn) dBtn.onclick = () => {
          const overlay = document.getElementById('em-drawer-overlay');
          const drawer = document.getElementById('em-drawer');
          if (drawer) drawer.classList.remove('is-active');
          if (overlay) overlay.classList.remove('is-active');
          document.body.style.overflow = '';
          promptLogin();
        };
      }
      if (drawerFooter) drawerFooter.innerHTML = '';
      return;
    }

    const roleTh = currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : currentUser.role === 'editor' ? 'แก้ไขได้' : 'ดูอย่างเดียว';

    if (badge) {
      badge.innerHTML = `
        <span style="color:#e2e8f0;display:inline-flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <strong style="font-weight:600">${currentUser.displayName || currentUser.username}</strong>
          <span style="font-size:11.5px;color:#94a3b8">(${roleTh})</span>
        </span>
        <button id="em-btn-logout" style="background:transparent;color:#94a3b8;border:1px solid #475569;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;transition:all 0.2s" onmouseover="this.style.color='#fff';this.style.borderColor='#cbd5e1'" onmouseout="this.style.color='#94a3b8';this.style.borderColor='#475569'">ออกจากระบบ</button>
      `;
      const logoutBtn = document.getElementById('em-btn-logout');
      if (logoutBtn) {
        logoutBtn.onclick = async () => {
          try {
            await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
          } catch (_) {}
          location.reload();
        };
      }
    }

    if (drawerUserCard) {
      drawerUserCard.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:#cc681c;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px">
            ${(currentUser.displayName || currentUser.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;font-size:14px;color:#fff">${currentUser.displayName || currentUser.username}</div>
            <div style="font-size:12px;color:#94a3b8">${roleTh}</div>
          </div>
        </div>
      `;
    }

    if (drawerFooter) {
      drawerFooter.innerHTML = `
        <button id="em-drawer-btn-logout" style="width:100%;background:rgba(239, 68, 68, 0.15);color:#fca5a5;border:1px solid rgba(239, 68, 68, 0.3);border-radius:6px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          ออกจากระบบ
        </button>
      `;
      const dLogoutBtn = document.getElementById('em-drawer-btn-logout');
      if (dLogoutBtn) {
        dLogoutBtn.onclick = async () => {
          try {
            await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
          } catch (_) {}
          location.reload();
        };
      }
    }
  }


  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      initNavUI();
      fetch('/api/v1/auth/me', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(async res => {
          if (res.ok && res.data) {
            currentUser = res.data;
            updateBadge();
            if (res.data.mustChangePassword) {
              await promptForceChangePassword();
            }
          } else {
            updateBadge();
          }
        })
        .catch(() => updateBadge());
    });
  }

 window.EM_RPC = async (method, ...args) => {
  const signature = JSON.stringify([method, args]);
  const payload = args.findLast(a => a && typeof a === 'object' && !Array.isArray(a));
  const requestId = payload?.requestId || payload?.operationId || inFlight.get(signature) || crypto.randomUUID();
  inFlight.set(signature, requestId);

  const doRequest = async () => {
   const controller = new AbortController();
   const timer = setTimeout(() => controller.abort(), 60000);
   try {
    const response = await fetch(`/api/v1/${scope}/rpc`, {
     method: 'POST',
     credentials: 'same-origin',
     headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId },
     body: JSON.stringify({ method, args }),
     signal: controller.signal
    });

    if (response.status === 401) {
     // Wait for user to log in via modal dialog
     await promptLogin();
     // Retry the request after successful login
     return await doRequest();
    }

    if (response.redirected || !response.headers.get('Content-Type')?.includes('application/json')) {
     throw Object.assign(new Error('กรุณาเข้าสู่ระบบใหม่ แล้วลองคำขอเดิมอีกครั้ง'), { code: 'AUTH' });
    }

    const result = await response.json();
    if (!result.ok) {
     if (result.error?.code === 'AUTH') {
      await promptLogin();
      return await doRequest();
     }
     throw Object.assign(new Error(result.error?.message || 'เชื่อมต่อไม่สำเร็จ'), result.error);
    }

    inFlight.delete(signature);
    return result.data;
   } catch (error) {
    if (error.name === 'AbortError') {
     throw Object.assign(new Error('ยังยืนยันผลไม่ได้ กรุณาตรวจข้อมูลล่าสุดหรือลองคำขอเดิมอีกครั้ง'), { code: 'TIMEOUT' });
    }
    if (!error.code) error.message = 'เชื่อมต่อไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่';
    throw error;
   } finally {
    clearTimeout(timer);
   }
  };

  return doRequest();
 };
})();
