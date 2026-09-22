import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const accountId = '08d9a36e92b96a9896b48366ad05b79a';
const scriptName = 'electrical-maintenance';

async function main() {
  console.log('========================================================');
  console.log('  ดึงโค้ดและข้อมูลล่าสุดจาก Cloudflare (Pull from Cloudflare)');
  console.log('========================================================\n');

  // 1. ตรวจสอบ Token ของ Wrangler
  const tomlPath = path.join(process.env.APPDATA || '', 'xdg.config', '.wrangler', 'config', 'default.toml');
  if (!fs.existsSync(tomlPath)) {
    console.error('❌ ไม่พบไฟล์ default.toml ของ Wrangler กรุณารัน npx wrangler login ก่อน');
    process.exit(1);
  }

  const tomlContent = fs.readFileSync(tomlPath, 'utf8');
  const tokenMatch = tomlContent.match(/oauth_token\s*=\s*["']([^"']+)["']/);
  if (!tokenMatch) {
    console.error('❌ ไม่พบ oauth_token ใน default.toml');
    process.exit(1);
  }
  const token = tokenMatch[1];

  // 2. ดึงโค้ด Worker Script จาก Cloudflare API
  console.log('📥 1. กำลังดึง Worker Script จาก Cloudflare REST API...');
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`;
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    console.error(`❌ ดึง Worker Script ไม่สำเร็จ: HTTP ${res.status}`);
  } else {
    const text = await res.text();
    const boundary = text.split('\r\n')[0].trim();
    const parts = text.split(boundary);
    for (const p of parts) {
      const headerEnd = p.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headers = p.slice(0, headerEnd);
      const body = p.slice(headerEnd + 4).replace(/\r\n$/, '');
      if (headers.includes('name="worker.js"')) {
        fs.mkdirSync('src/downloaded', { recursive: true });
        fs.writeFileSync('src/downloaded/worker.js', body);
        console.log(`✓ บันทึก Worker Script (${body.length} bytes) ไปที่ src/downloaded/worker.js`);
      }
    }
  }

  // 3. ดึงไฟล์หน้าเว็บจริง (Frontend Assets)
  console.log('\n📥 2. กำลังดึงหน้าเว็บจริง (Frontend Assets) จาก Cloudflare Workers...');
  const pages = ['machines', 'parts', 'bom', 'users'];
  for (const page of pages) {
    const url = `https://electrical-maintenance.eercsc.workers.dev/${page}/`;
    try {
      const pageRes = await fetch(url);
      if (pageRes.ok) {
        const html = await pageRes.text();
        fs.mkdirSync(`public/${page}`, { recursive: true });
        fs.writeFileSync(`public/${page}/index.html`, html);
        console.log(`✓ ดึงหน้า /${page}/ (${html.length} bytes) -> public/${page}/index.html`);
      } else {
        console.warn(`⚠️ ดึงหน้า /${page}/ ล้มเหลว: HTTP ${pageRes.status}`);
      }
    } catch (err) {
      console.error(`❌ เกิดข้อผิดพลาดในการดึงหน้า /${page}/:`, err.message);
    }
  }

  // 4. ดึง Snapshot ฐานข้อมูล Cloudflare D1
  console.log('\n📥 3. กำลัง Export ฐานข้อมูล Cloudflare D1 (Production Snapshot)...');
  try {
    fs.mkdirSync('data', { recursive: true });
    execSync('npx wrangler d1 export electrical-maintenance --remote --output data/snapshot_production.sql -y', {
      stdio: 'inherit'
    });
    console.log('✓ บันทึกฐานข้อมูลไปที่ data/snapshot_production.sql เรียบร้อยแล้ว');
  } catch (err) {
    console.error('⚠️ Export ฐานข้อมูล D1 ล้มเหลว:', err.message);
  }

  console.log('\n========================================================');
  console.log('  🎉 ดึงโค้ดและข้อมูลทั้งหมดจาก Cloudflare สำเร็จเรียบร้อย!');
  console.log('========================================================\n');
}

main().catch(console.error);
