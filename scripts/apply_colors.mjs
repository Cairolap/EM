import { readFileSync, writeFileSync } from 'node:fs';

// --- 1. UPDATE Spare part/Index.html ---
const sparePartPath = '../Spare part/Index.html';
let sparePart = readFileSync(sparePartPath, 'utf8');

// Replace CSS variables
sparePart = sparePart.replace(
  /--color-primary:\s*#[a-fA-F0-9]+;/,
  '--color-primary: #1e3a8a;'
).replace(
  /--color-primaryStrong:\s*#[a-fA-F0-9]+;/,
  '--color-primaryStrong: #172554;'
).replace(
  /--color-accent:\s*#[a-fA-F0-9]+;/,
  '--color-accent: #0284c7;'
).replace(
  /--color-danger:\s*#[a-fA-F0-9]+;/,
  '--color-danger: #881337;'
).replace(
  /--focus-ring:\s*#[a-fA-F0-9]+;/,
  '--focus-ring: #38bdf8;'
);

// Add custom machine type CSS if not present
if (!sparePart.includes('.type-mgmt-row')) {
  const extraCss = `
.type-form-inline {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.type-form-inline input {
  flex: 1;
}
.type-mgmt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-control);
  margin-bottom: 4px;
}
.type-mgmt-row:hover {
  background: var(--color-surfaceMuted);
}
.type-name {
  font-weight: 500;
  color: var(--color-ink);
}
.link-button {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 4px;
  text-decoration: underline;
  transition: color 150ms ease;
}
.link-button:hover {
  color: var(--color-primary);
}
`;
  sparePart = sparePart.replace('</style>', extraCss + '\n</style>');
}
writeFileSync(sparePartPath, sparePart);
console.log('Updated Spare part/Index.html styles');

// --- 2. UPDATE EM/scripts/build.mjs ---
const buildScriptPath = 'scripts/build.mjs';
let buildScript = readFileSync(buildScriptPath, 'utf8');

// Replace nav background
buildScript = buildScript.replace('background: #152934;', 'background: #0d1e38;');
buildScript = buildScript.replace('border-bottom: 1px solid rgba(255, 255, 255, 0.08);', 'border-bottom: 1px solid rgba(56, 189, 248, 0.18);');
buildScript = buildScript.replace('box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);', 'box-shadow: 0 4px 20px rgba(10, 25, 47, 0.35);');

// Hamburger hover
buildScript = buildScript.replace('background: rgba(204, 104, 28, 0.25);', 'background: rgba(14, 165, 233, 0.2);');
buildScript = buildScript.replace('border-color: #cc681c;', 'border-color: #38bdf8;');

// Active desktop link
buildScript = buildScript.replace('background: rgba(204, 104, 28, 0.15);', 'background: rgba(14, 165, 233, 0.18);');
buildScript = buildScript.replace('border-bottom-color: #cc681c;', 'border-bottom-color: #38bdf8;');

// Dropdown
buildScript = buildScript.replace('background: #18313d;', 'background: #0f223d;');
buildScript = buildScript.replace('border: 1px solid rgba(255, 255, 255, 0.14);', 'border: 1px solid rgba(56, 189, 248, 0.22);');
buildScript = buildScript.replace('color: #94a3b8;\n  padding: 6px 10px 4px;', 'color: #7dd3fc;\n  padding: 6px 10px 4px;');
buildScript = buildScript.replace('background: rgba(204, 104, 28, 0.22);', 'background: rgba(14, 165, 233, 0.2);');

// Badges
buildScript = buildScript.replace('background: rgba(204, 104, 28, 0.25);', 'background: rgba(14, 165, 233, 0.18);');
buildScript = buildScript.replace('color: #fb923c;', 'color: #38bdf8;');
buildScript = buildScript.replace('border: 1px solid rgba(204, 104, 28, 0.4);', 'border: 1px solid rgba(56, 189, 248, 0.35);');
buildScript = buildScript.replace('color: #f97316;', 'color: #38bdf8;');

// Drawer
buildScript = buildScript.replace('background: #13242e;', 'background: #0a1728;');
buildScript = buildScript.replace('background: rgba(204, 104, 28, 0.2);\n  color: #fb923c;\n  font-weight: 600;\n  border-left: 3px solid #cc681c;', 'background: rgba(14, 165, 233, 0.18);\n  color: #38bdf8;\n  font-weight: 600;\n  border-left: 3px solid #38bdf8;');
buildScript = buildScript.replace('color: #fb923c;', 'color: #38bdf8;');
buildScript = buildScript.replace('background: rgba(204, 104, 28, 0.15);', 'background: rgba(14, 165, 233, 0.18);');

writeFileSync(buildScriptPath, buildScript);
console.log('Updated EM/scripts/build.mjs');

// --- 3. UPDATE EM/web/transport.js ---
const transportPath = 'web/transport.js';
let transport = readFileSync(transportPath, 'utf8');

// Unauthenticated login buttons
transport = transport.replace(
  'background:#cc681c;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s',
  'background:linear-gradient(135deg, #0284c7, #0369a1);color:#fff;border:1px solid rgba(56,189,248,0.4);border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 8px rgba(2,132,199,0.3)'
);
transport = transport.replace(
  'width:100%;background:#cc681c;color:#fff;border:none;border-radius:6px;padding:8px;font-size:13px;font-weight:600;cursor:pointer',
  'width:100%;background:linear-gradient(135deg, #0284c7, #0369a1);color:#fff;border:1px solid rgba(56,189,248,0.4);border-radius:6px;padding:8px;font-size:13px;font-weight:600;cursor:pointer'
);

// User avatar in drawer
transport = transport.replace(
  'width:36px;height:36px;border-radius:50%;background:#cc681c;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px',
  'width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, #1d4ed8, #0ea5e9);border:2px solid rgba(56,189,248,0.6);box-shadow:0 0 10px rgba(14,165,233,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px'
);

// Desktop logout button
transport = transport.replace(
  `background:transparent;color:#94a3b8;border:1px solid #475569;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;transition:all 0.2s" onmouseover="this.style.color='#fff';this.style.borderColor='#cbd5e1'" onmouseout="this.style.color='#94a3b8';this.style.borderColor='#475569'`,
  `background:rgba(159,18,57,0.18);color:#fecdd3;border:1px solid rgba(225,29,72,0.45);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='#9f1239';this.style.color='#fff';this.style.borderColor='#be123c'" onmouseout="this.style.background='rgba(159,18,57,0.18)';this.style.color='#fecdd3';this.style.borderColor='rgba(225,29,72,0.45)'`
);

// Drawer logout button
transport = transport.replace(
  `background:rgba(239, 68, 68, 0.15);color:#fca5a5;border:1px solid rgba(239, 68, 68, 0.3);border-radius:6px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s`,
  `background:linear-gradient(135deg, #881337 0%, #9f1239 100%);color:#ffffff;border:1px solid #be123c;border-radius:8px;padding:10px;font-size:13.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(159,18,57,0.35);transition:all 0.2s`
);

writeFileSync(transportPath, transport);
console.log('Updated EM/web/transport.js');

// --- 4. UPDATE EM/src/users/styles.css ---
const usersCssPath = 'src/users/styles.css';
let usersCss = readFileSync(usersCssPath, 'utf8');
usersCss = usersCss.replace('--primary: #cc681c;', '--primary: #0284c7;')
                   .replace('--primary-hover: #b25814;', '--primary-hover: #0369a1;')
                   .replace('--bg-dark: #18313d;', '--bg-dark: #0d1e38;')
                   .replace('--danger: #dc2626;', '--danger: #881337;');
writeFileSync(usersCssPath, usersCss);
console.log('Updated EM/src/users/styles.css');
