import http from 'node:http';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('========================================================');
  console.log('  Google Drive OAuth 2.0 Setup สำหรับ Gmail ทั่วไป');
  console.log('========================================================\n');

  let clientId = process.argv[2];
  let clientSecret = process.argv[3];

  if (!clientId || !clientSecret) {
    const files = fs.readdirSync('.');
    const jsonFile = files.find(f => f.startsWith('client_secret_') && f.endsWith('.json'));
    if (jsonFile) {
      console.log(`พบไฟล์ Credentials: ${jsonFile}`);
      const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      const conf = raw.installed || raw.web || {};
      clientId = conf.client_id;
      clientSecret = conf.client_secret;
    }
  }

  if (!clientId || !clientSecret) {
    console.error('ไม่พบ Client ID หรือ Client Secret กรุณาตรวจสอบไฟล์');
    process.exit(1);
  }

  console.log(`Client ID: ${clientId}`);

  const port = 5234;
  const redirectUri = `http://localhost:${port}`;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, redirectUri);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>เข้าสู่ระบบไม่สำเร็จ: ${error}</h2><p>สามารถปิดหน้านี้ได้</p>`);
        server.close();
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #16a34a;">🎉 เชื่อมต่อ Google Drive สำเร็จแล้ว!</h2>
          <p>ระบบได้รับสิทธิ์และกำลังดำเนินการบันทึกลง Cloudflare Workers อัตโนมัติ</p>
          <p>คุณสามารถปิดหน้าต่างนี้และกลับไปที่ IDE ได้เลยครับ</p>
        </body></html>`);
        server.close();

        console.log('\nได้รับ Authorization Code แล้ว กำลังแลกเปลี่ยนเป็น Refresh Token...');

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
          })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.refresh_token) {
          console.error('\nเกิดข้อผิดพลาดในการขอ Refresh Token:');
          console.error(tokenData);
          return;
        }

        const refreshToken = tokenData.refresh_token;

        console.log('\n🎉 ได้รับ Refresh Token เรียบร้อยแล้ว!');
        console.log('--------------------------------------------------------');
        console.log(`GOOGLE_CLIENT_ID: ${clientId}`);
        console.log(`GOOGLE_CLIENT_SECRET: ${clientSecret}`);
        console.log(`GOOGLE_REFRESH_TOKEN: ${refreshToken}`);
        console.log('--------------------------------------------------------\n');

        fs.writeFileSync('.oauth_tokens.json', JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken
        }, null, 2));

        console.log('กำลังบันทึกลง Cloudflare Secrets (Production & Staging)...');
        const setSecret = (name, val, env) => new Promise((resolve) => {
          const child = exec(`npx wrangler secret put ${name} --env ${env}`, (err, stdout, stderr) => {
            if (err) console.error(`Error setting ${name} (${env}):`, stderr);
            else console.log(`✓ ตั้งค่า ${name} บน ${env} สำเร็จ`);
            resolve();
          });
          child.stdin.write(val);
          child.stdin.end();
        });

        for (const env of ['production', 'staging']) {
          await setSecret('GOOGLE_CLIENT_ID', clientId, env);
          await setSecret('GOOGLE_CLIENT_SECRET', clientSecret, env);
          await setSecret('GOOGLE_REFRESH_TOKEN', refreshToken, env);
        }

        console.log('\n✅ บันทึก Cloudflare Secrets ทั้งหมดเรียบร้อยแล้ว!');
        console.log('ตอนนี้ระบบเชื่อมต่อ Google Drive ของบัญชีคุณโดยสมบูรณ์แล้วครับ');
      }
    } catch (err) {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive',
      access_type: 'offline',
      prompt: 'consent'
    }).toString();

    console.log(`\nกรุณาเปิดลิงก์นี้ในเบราว์เซอร์เพื่อเข้าสู่ระบบด้วยบัญชี Gmail ของคุณ:\n`);
    console.log(authUrl);
    console.log('\n(ระบบกำลังพยายามเปิดเบราว์เซอร์ให้อัตโนมัติ...)\n');

    exec(`start "" "${authUrl}"`);
  });
}

main().catch(console.error);
