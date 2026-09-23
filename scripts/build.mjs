import {readFile, writeFile, mkdir} from 'node:fs/promises';

const root = new URL('../', import.meta.url), workspace = new URL('../../', import.meta.url);
const read = url => readFile(url, 'utf8');

await mkdir(new URL('src/generated/', root), {recursive: true});

// 1. Core modules for server/tests
for (const [source, name, exportName] of [
  ['Spare part/gas/Core.js', 'machine', 'MachineCore'],
  ['Part List/gas/Core.js', 'part', 'PartCore'],
  ['Equipment BOM/gas/Core.js', 'bom', 'BomCore']
]) {
  const domain = await read(new URL(source, workspace));
  const cleanDomain = domain.replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*\)\s*module\.exports\s*=[^;]+;?/g, '');
  await writeFile(new URL(`src/generated/${name}-core.js`, root), cleanDomain + `\nexport {${exportName}};\n`);
}

// 2. BomService module for server
const bomServiceSrc = await read(new URL('Equipment BOM/gas/Service.js', workspace));
const cleanService = bomServiceSrc
  .replace(/require\(['"](\.\/Core\.js|\.\.\/gas\/Core\.js)['"]\)/g, 'BomCore')
  .replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*\)\s*module\.exports\s*=[^;]+;?/g, '');
await writeFile(
  new URL('src/generated/bom-service.js', root),
  `import {BomCore} from './bom-core.js';\n` + cleanService + `\nexport {BomService};\n`
);

// 3. Web Bundles: /machines/, /parts/, /bom/, /users/
const transportJs = await read(new URL('web/transport.js', root));

for (const [sourceFile, scope] of [
  ['Spare part/Index.html', 'machines'],
  ['Part List/Index.html', 'parts'],
  ['Equipment BOM/Index.html', 'bom'],
  ['', 'users']
]) {
  let output = '';
  if (scope === 'users') {
    const html = await read(new URL('src/users/index.html', root));
    const css = await read(new URL('src/users/styles.css', root));
    const appJs = await read(new URL('src/users/app.js', root));
    const js = transportJs + '\n' + appJs;
    output = html
      .replace('<!-- APP_STYLE -->', () => '<style>\n' + css + '\n</style>')
      .replace('<!-- APP_SCRIPT -->', () => '<script>\n' + js + '\n</script>');
  } else {
    const html = await read(new URL(sourceFile, workspace));
    const scriptInsert = '<script>\n' + transportJs + '\n</script>\n';
    if (html.includes('<script')) {
      output = html.replace(/<script(?:\s[^>]*)?>/, scriptInsert + '$&');
    } else {
      output = html + '\n' + scriptInsert;
    }
  }

  output = output.replaceAll('Google Sheets', 'ทะเบียนกลาง')
                 .replaceAll('Google Apps Script', 'Electrical Maintenance')
                 .replaceAll('บัญชี Google', 'การเชื่อมต่อ');

  const navHtml = `
<nav aria-label="ระบบซ่อมบำรุงไฟฟ้า" class="em-main-nav">
  <div class="em-nav-container">
    <div class="em-nav-left">
      <!-- Hamburger Toggle Button -->
      <button type="button" id="em-hamburger-btn" class="em-hamburger-btn" aria-label="เปิดเมนูนำทาง" aria-expanded="false" aria-controls="em-drawer">
        <svg class="em-icon-menu" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <!-- Logo แผนกซ่อมไฟฟ้า -->
      <a href="/bom/" class="em-brand-link" title="แผนกซ่อมไฟฟ้า">
        <img class="em-brand-logo" src="/Logo%20small.png" alt="แผนกซ่อมไฟฟ้า">
        <span class="em-brand-text">แผนกซ่อมไฟฟ้า</span>
      </a>
    </div>

    <!-- Desktop Navigation Links -->
    <div class="em-nav-center">
      <!-- 2. อุปกรณ์ประจำเครื่องจักร with Dropdown -->
      <div class="em-dropdown em-dropdown-bom">
        <a href="/bom/" class="em-nav-link em-dropdown-trigger${scope==='bom'?' active':''}"${scope==='bom'?' aria-current="page"':''}>
          <span>อุปกรณ์ประจำเครื่องจักร</span>
          <svg class="em-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </a>
        <div class="em-dropdown-menu">
          <div class="em-dropdown-header">เลือกแผนก</div>
          <a class="em-dropdown-item" href="/bom/?dept=CC"><span class="em-dept-badge">CC</span> ฝาจีบ</a>
          <a class="em-dropdown-item" href="/bom/?dept=PP"><span class="em-dept-badge">PP</span> ฝาเกลียว</a>
          <a class="em-dropdown-item" href="/bom/?dept=MX"><span class="em-dept-badge">MX</span> ฝาแม็กซี่</a>
          <a class="em-dropdown-item" href="/bom/?dept=PC"><span class="em-dept-badge">PC</span> ฝาพลาสติก</a>
          <a class="em-dropdown-item" href="/bom/?dept=PR"><span class="em-dept-badge">PR</span> งานพิมพ์</a>
          <a class="em-dropdown-item" href="/bom/?dept=OT"><span class="em-dept-badge">OT</span> อื่นๆ</a>
        </div>
      </div>

      <!-- 3. Master อะไหล่ with Dropdown -->
      <div class="em-dropdown em-dropdown-parts">
        <a href="/parts/" class="em-nav-link em-dropdown-trigger${scope==='parts'?' active':''}"${scope==='parts'?' aria-current="page"':''}>
          <span>Master อะไหล่</span>
          <svg class="em-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </a>
        <div class="em-dropdown-menu">
          <a class="em-dropdown-item" href="/parts/"><span class="em-item-icon">▤</span> รายการอะไหล่</a>
          <a class="em-dropdown-item" href="/parts/?action=add"><span class="em-item-icon">＋</span> เพิ่มแบบตาราง</a>
          <a class="em-dropdown-item" href="/parts/?view=batch"><span class="em-item-icon">🖼</span> อัปโหลดรูปชุด</a>
        </div>
      </div>

      <!-- 4. เครื่องจักร -->
      <a class="em-nav-link${scope==='machines'?' active':''}" href="/machines/"${scope==='machines'?' aria-current="page"':''}>เครื่องจักร</a>

    </div>

    <!-- Right: User management and account -->
    <div class="em-nav-right">
      <a id="em-nav-users" class="em-nav-link${scope==='users'?' active':''}" style="display:${scope==='users'?'inline-flex':'none'}" href="/users/"${scope==='users'?' aria-current="page"':''}>จัดการผู้ใช้งาน</a>
      <span id="em-user-badge" class="em-user-badge"></span>
    </div>
  </div>

  <!-- Mobile Drawer Overlay & Sidebar -->
  <div id="em-drawer-overlay" class="em-drawer-overlay" aria-hidden="true"></div>
  <aside id="em-drawer" class="em-drawer" aria-label="เมนูนำทางหลัก">
    <div class="em-drawer-header">
      <div class="em-drawer-brand">
        <img class="em-brand-logo" src="/Logo%20small.png" alt="แผนกซ่อมไฟฟ้า">
        <div class="em-drawer-brand-text">
          <strong>แผนกซ่อมไฟฟ้า</strong>
          <small>ระบบซ่อมบำรุงไฟฟ้า</small>
        </div>
      </div>
      <button type="button" id="em-drawer-close" class="em-drawer-close" aria-label="ปิดเมนู">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <div class="em-drawer-content">
      <!-- User Info Card in Drawer -->
      <div id="em-drawer-user-card" class="em-drawer-user-card"></div>

      <nav class="em-drawer-nav">
        <!-- 2. อุปกรณ์ประจำเครื่องจักร Accordion -->
        <div class="em-drawer-group">
          <button type="button" class="em-drawer-group-btn" aria-expanded="${scope==='bom'?'true':'false'}">
            <span class="em-drawer-group-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              อุปกรณ์ประจำเครื่องจักร
            </span>
            <svg class="em-drawer-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="em-drawer-sublist"${scope==='bom'?'':' style="display:none;"'}>
            <a class="em-drawer-subitem" href="/bom/?dept=CC"><span class="em-dept-badge">CC</span> ฝาจีบ</a>
            <a class="em-drawer-subitem" href="/bom/?dept=PP"><span class="em-dept-badge">PP</span> ฝาเกลียว</a>
            <a class="em-drawer-subitem" href="/bom/?dept=MX"><span class="em-dept-badge">MX</span> ฝาแม็กซี่</a>
            <a class="em-drawer-subitem" href="/bom/?dept=PC"><span class="em-dept-badge">PC</span> ฝาพลาสติก</a>
            <a class="em-drawer-subitem" href="/bom/?dept=PR"><span class="em-dept-badge">PR</span> งานพิมพ์</a>
            <a class="em-drawer-subitem" href="/bom/?dept=OT"><span class="em-dept-badge">OT</span> อื่นๆ</a>
          </div>
        </div>

        <!-- 3. Master อะไหล่ Accordion -->
        <div class="em-drawer-group">
          <button type="button" class="em-drawer-group-btn" aria-expanded="${scope==='parts'?'true':'false'}">
            <span class="em-drawer-group-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Master อะไหล่
            </span>
            <svg class="em-drawer-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="em-drawer-sublist"${scope==='parts'?'':' style="display:none;"'}>
            <a class="em-drawer-subitem" href="/parts/"><span class="em-item-icon">▤</span> รายการอะไหล่</a>
            <a class="em-drawer-subitem" href="/parts/?action=add"><span class="em-item-icon">＋</span> เพิ่มแบบตาราง</a>
            <a class="em-drawer-subitem" href="/parts/?view=batch"><span class="em-item-icon">🖼</span> อัปโหลดรูปชุด</a>
          </div>
        </div>

        <!-- 4. เครื่องจักร -->
        <a class="em-drawer-link${scope==='machines'?' active':''}" href="/machines/"${scope==='machines'?' aria-current="page"':''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
          เครื่องจักร
        </a>

        <!-- 5. จัดการผู้ใช้งาน -->
        <a id="em-drawer-nav-users" class="em-drawer-link${scope==='users'?' active':''}" style="display:${scope==='users'?'flex':'none'}" href="/users/"${scope==='users'?' aria-current="page"':''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          จัดการผู้ใช้งาน
        </a>
      </nav>
    </div>

    <!-- Drawer Footer -->
    <div id="em-drawer-footer" class="em-drawer-footer"></div>
  </aside>
</nav>

<style>
/* --- UNIFIED ELECTRICAL MAINTENANCE NAVIGATION BAR --- */
.em-main-nav {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  background: #152934;
  color: #ffffff;
  font-family: 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.em-nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  height: 54px;
  width: 100%;
}
.em-nav-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.em-hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}
.em-hamburger-btn:hover {
  background: rgba(128, 24, 42, 0.28);
  border-color: #80182a;
  color: #ffffff;
  transform: scale(1.04);
}
.em-brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #ffffff;
  padding: 4px 6px;
  border-radius: 6px;
  transition: opacity 0.2s;
}
.em-brand-link:hover { opacity: 0.92; }
.em-brand-logo {
  width: 34px;
  height: 34px;
  object-fit: contain;
  border-radius: 50%;
  background: #ffffff;
  padding: 2px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.em-brand-text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #ffffff;
  white-space: nowrap;
}

/* Nav Links & Dropdowns */
.em-nav-center {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}
.em-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  padding: 7px 12px;
  border-radius: 6px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
}
.em-nav-link:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}
.em-nav-link.active {
  color: #ffffff;
  font-weight: 600;
  background: rgba(128, 24, 42, 0.22);
  border-bottom-color: #80182a;
}
.em-caret {
  transition: transform 0.2s ease;
  opacity: 0.7;
}

/* Dropdown Menu */
.em-dropdown {
  position: relative;
}
.em-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  background: #18313d;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.45);
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  z-index: 10001;
}
.em-dropdown:hover .em-dropdown-menu,
.em-dropdown.is-open .em-dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.em-dropdown:hover .em-caret,
.em-dropdown.is-open .em-caret {
  transform: rotate(180deg);
}
.em-dropdown-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  padding: 6px 10px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 4px;
}
.em-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: #e2e8f0;
  text-decoration: none;
  font-size: 13px;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.em-dropdown-item:hover {
  background: rgba(128, 24, 42, 0.3);
  color: #ffffff;
}
.em-dept-badge {
  display: inline-block;
  font-family: monospace;
  font-weight: 700;
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(128, 24, 42, 0.38);
  color: #f3c4ce;
  border: 1px solid rgba(243, 196, 206, 0.45);
  border-radius: 4px;
}
.em-item-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
  color: #d68a9a;
}

/* Right User Info Badge */
.em-nav-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.em-user-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #cbd5e1;
}

/* Mobile Drawer Elements */
.em-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  z-index: 10002;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0.28s ease;
}
.em-drawer-overlay.is-active {
  opacity: 1;
  visibility: visible;
}
.em-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(320px, 86vw);
  background: #13242e;
  color: #ffffff;
  z-index: 10003;
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
}
.em-drawer.is-active {
  transform: translateX(0);
}
.em-drawer-header {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.em-drawer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.em-drawer-brand-text strong {
  display: block;
  font-size: 14.5px;
  color: #ffffff;
}
.em-drawer-brand-text small {
  font-size: 11.5px;
  color: #94a3b8;
}
.em-drawer-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.em-drawer-close:hover {
  color: #ffffff;
  background: rgba(255,255,255,0.08);
}
.em-drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.em-drawer-user-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}
.em-drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.em-drawer-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.15s ease;
}
.em-drawer-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}
.em-drawer-link.active {
  background: rgba(128, 24, 42, 0.3);
  color: #f3c4ce;
  font-weight: 600;
  border-left: 3px solid #80182a;
}
.em-drawer-group {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 2px;
  overflow: hidden;
}
.em-drawer-group-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  background: transparent;
  border: none;
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}
.em-drawer-group-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}
.em-drawer-group-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.em-drawer-arrow {
  transition: transform 0.2s ease;
  color: #94a3b8;
}
.em-drawer-group-btn[aria-expanded="true"] .em-drawer-arrow {
  transform: rotate(180deg);
  color: #f3c4ce;
}
.em-drawer-sublist {
  padding: 4px 8px 10px 32px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.em-drawer-subitem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  font-size: 13px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.em-drawer-subitem:hover {
  color: #ffffff;
  background: rgba(128, 24, 42, 0.22);
}
.em-drawer-footer {
  padding: 14px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .em-hamburger-btn {
    display: inline-flex;
  }
  .em-nav-center {
    display: none;
  }
}
@media (max-width: 600px) {
  .em-nav-right {
    display: none;
  }
  .em-nav-container {
    padding: 0 14px;
  }
  .em-nav-left {
    min-width: 0;
  }
  .em-brand-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
`;

  output = output.replace(/<body([^>]*)>/, `<body$1>${navHtml}`);

  await mkdir(new URL(`public/${scope}/`, root), {recursive: true});
  await writeFile(new URL(`public/${scope}/index.html`, root), output);
}

console.log('Built /machines/, /parts/, /bom/, /users/ and shared domain modules. No remote data changed.');
