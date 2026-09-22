import {readFile, writeFile, mkdir} from 'node:fs/promises';

const root = new URL('../', import.meta.url), workspace = new URL('../../', import.meta.url);
const productionBaseline = new URL('web/production-baseline/', root);
const read = url => readFile(url, 'utf8');
const readBase64 = async url => {
  try { return 'data:image/png;base64,' + (await readFile(url)).toString('base64'); } catch { return ''; }
};

await mkdir(new URL('src/generated/', root), {recursive: true});

// 1. Core modules for server/tests
for (const [source, name, exportName] of [
  ['Spare part', 'machine', 'MachineCore'],
  ['Part List', 'part', 'PartCore'],
  ['Equipment BOM', 'bom', 'BomCore']
]) {
  const domain = await read(new URL(source + '/gas/Core.js', workspace));
  const cleanDomain = domain.replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*\)\s*module\.exports\s*=[^;]+;?/g, '');
  await writeFile(new URL(`src/generated/${name}-core.js`, root), cleanDomain + `\nexport {${exportName}};\n`);
}

// 2. BomService module for server
const bomServiceSrc = await read(new URL('Equipment BOM/gas/Service.js', workspace));
const cleanService = bomServiceSrc
  .replace(/require\(['"]\.\/Core\.js['"]\)/g, 'BomCore')
  .replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*\)\s*module\.exports\s*=[^;]+;?/g, '');
await writeFile(
  new URL('src/generated/bom-service.js', root),
  `import {BomCore} from './bom-core.js';\n` + cleanService + `\nexport {BomService};\n`
);

// 3. Web Bundles: /machines/, /parts/, /bom/
const transportJs = await read(new URL('web/transport.js', root));
const logo = await readBase64(new URL('Equipment BOM/assets/electrical-maintenance-logo.png', workspace));
const favicon = await readBase64(new URL('Equipment BOM/assets/favicon-64.png', workspace));

for (const [source, scope, coreFile] of [
  ['Spare part', 'machines', 'Spare part/gas/Core.js'],
  ['Part List', 'parts', 'Part List/gas/Core.js'],
  ['Equipment BOM', 'bom', 'Equipment BOM/gas/Core.js'],
  ['', 'users', '']
]) {
  let domain = '', html = '', css = '', appJs = '', baselineHtml = '';
  const targetEnv = process.argv[2] || process.env.TARGET_ENV || 'staging';
  const forceSource = (process.env.BUILD_SOURCE_SCOPES || 'bom').split(',').map(s => s.trim());
  const useBaseline = targetEnv === 'production' && !process.env.BUILD_SOURCE_SCOPES
    ? true
    : !forceSource.includes(scope);

  try {
    if (useBaseline) {
      baselineHtml = await read(new URL(`${scope}/index.html`, productionBaseline));
    }
  } catch { /* Source build remains available until each production asset is captured. */ }
  if (baselineHtml) {
    await mkdir(new URL(`public/${scope}/`, root), {recursive: true});
    await writeFile(new URL(`public/${scope}/index.html`, root), baselineHtml);
    continue;
  }
  if (scope === 'users') {
    html = await read(new URL('src/users/index.html', root));
    css = await read(new URL('src/users/styles.css', root));
    appJs = await read(new URL('src/users/app.js', root));
  } else {
    domain = await read(new URL(coreFile, workspace));
    html = await read(new URL(source + '/src/index.html', workspace));
    css = await read(new URL(source + '/src/styles.css', workspace));
    const imageJs = scope === 'bom' ? '' : await read(new URL(source + '/src/image.js', workspace));
    appJs = (imageJs ? imageJs + '\n' : '') + await read(new URL(source + '/src/app.js', workspace));
  }

  const js = transportJs + '\n' + (domain ? domain + '\n' : '') + appJs;
  if (/<\/script/i.test(js)) throw new Error('Unsafe script terminator in ' + scope);

  let output = html
    .replace('__APP_LOGO__', () => logo)
    .replace('__APP_FAVICON__', () => favicon)
    .replace('<!-- APP_STYLE -->', () => '<style>\n' + css + '\n</style>')
    .replace('<!-- APP_SCRIPT -->', () => '<script>\n' + js + '\n</script>');

  output = output.replaceAll('Google Sheets', 'ทะเบียนกลาง').replaceAll('Google Apps Script', 'Electrical Maintenance');

  const navHtml = `<nav aria-label="ระบบซ่อมบำรุงไฟฟ้า" style="padding:12px 24px;background:#18313d;display:flex;gap:24px;align-items:center;flex-wrap:wrap">` +
    `<a style="color:white;text-decoration:none;font-weight:${scope==='machines'?'bold':'normal'};border-bottom:${scope==='machines'?'2px solid #cc681c':'none'};padding-bottom:2px" href="/machines/"${scope==='machines'?' aria-current="page"':''}>เครื่องจักร</a>` +
    `<a style="color:white;text-decoration:none;font-weight:${scope==='parts'?'bold':'normal'};border-bottom:${scope==='parts'?'2px solid #cc681c':'none'};padding-bottom:2px" href="/parts/"${scope==='parts'?' aria-current="page"':''}>Master อะไหล่</a>` +
    `<a style="color:white;text-decoration:none;font-weight:${scope==='bom'?'bold':'normal'};border-bottom:${scope==='bom'?'2px solid #cc681c':'none'};padding-bottom:2px" href="/bom/"${scope==='bom'?' aria-current="page"':''}>อุปกรณ์ประจำเครื่องจักร</a>` +
    `<a id="em-nav-users" style="color:white;text-decoration:none;font-weight:${scope==='users'?'bold':'normal'};border-bottom:${scope==='users'?'2px solid #cc681c':'none'};padding-bottom:2px;display:${scope==='users'?'inline-block':'none'}" href="/users/"${scope==='users'?' aria-current="page"':''}>จัดการผู้ใช้งาน</a>` +
    `<span id="em-user-badge" style="margin-left:auto;color:#cbd5e1;font-size:13px;display:flex;align-items:center;gap:12px"></span>` +
    `</nav>`;

  output = output.replace(/<body([^>]*)>/, `<body$1>${navHtml}`);

  await mkdir(new URL(`public/${scope}/`, root), {recursive: true});
  await writeFile(new URL(`public/${scope}/index.html`, root), output);
}

console.log('Built /machines/, /parts/, /bom/, /users/ and shared domain modules. No remote data changed.');
