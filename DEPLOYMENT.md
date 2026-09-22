# คู่มือขั้นตอนการ Deploy ระบบ Electrical Maintenance ไปยัง Cloudflare

เอกสารนี้รวบรวมขั้นตอนปฏิบัติทีละขั้นตอน (Step-by-Step Runbook) สำหรับเตรียมการและดำเนินการ Deploy ระบบ **Electrical Maintenance** (รวมโมดูล เครื่องจักร, Master อะไหล่, และ Equipment BOM) ขึ้นสู่ Cloudflare Workers + D1 Database

---

## สรุปภาพรวมสถาปัตยกรรม (Architecture Overview)

```
                        [ ผู้ใช้งาน Web Browser ]
                                    │
                                    ▼
                [ Cloudflare Worker (electrical-maintenance) ]
                          ├── /machines/ (Static Assets)
                          ├── /parts/    (Static Assets)
                          ├── /bom/      (Static Assets)
                          └── /api/v1/   (RPC API & Built-in Auth)
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
     [ Cloudflare D1 Database ]            [ Google Drive (Service Account) ]
     ├── app_users & app_sessions          └── Machine / Part Photos
     ├── machines & parts & brands
     ├── equipment_records (BOM)
     └── requests & audit_events
```

> **หมายเหตุเรื่องการยืนยันตัวตน**: ระบบรองรับการล็อกอินผ่าน **Username & Password ภายในตัว (Built-in Auth)** โดยไม่ต้องผูกกับ Cloudflare Zero Trust / Access ใดๆ (หรือสามารถเลือกใช้ Cloudflare Access เพิ่มเติมในอนาคตได้หากต้องการ)

---

## ขั้นตอนที่ 1: เตรียมทรัพยากรบน Cloudflare (Prerequisites)

### 1.1 ตรวจสอบการล็อกอิน Cloudflare Wrangler
เปิด Terminal และตรวจสอบการเชื่อมต่อกับบัญชี Cloudflare:
```bash
npx wrangler whoami
```
*หากยังไม่ได้ล็อกอิน ให้พิมพ์ `npx wrangler login` เพื่อเข้าสู่ระบบ*

### 1.2 สร้าง Cloudflare D1 Database
สร้างฐานข้อมูลแยกสำหรับสภาพแวดล้อม **Staging** และ **Production**:
```bash
# 1. สร้าง D1 สำหรับ Staging
npx wrangler d1 create electrical-maintenance-staging

# 2. สร้าง D1 สำหรับ Production
npx wrangler d1 create electrical-maintenance
```
เมื่อคำสั่งทำงานเสร็จ จะได้รับ `database_id` (เช่น `e7de11dd-...`)

### 1.3 นำ `database_id` มาใส่ใน `wrangler.jsonc`
เปิดไฟล์ `wrangler.jsonc` แล้วนำค่า `database_id` ที่ได้มาใส่ในส่วน `env.staging` และ `env.production`

---

## ขั้นตอนที่ 2: การจัดการสิทธิ์และบัญชีผู้ใช้งาน (Authentication)

ระบบมาพร้อมระบบล็อกอินในตัว โดยเก็บผู้ใช้งานและ Hash รหัสผ่าน (PBKDF2 100,000 iterations + SHA-256) ไว้ในตาราง `app_users` ของ D1:

### บัญชีผู้ดูแลระบบเริ่มต้น (Default Administrator)
- **ชื่อผู้ใช้ (Username)**: `admin`
- **รหัสผ่าน (Password)**: `admin1234`
- **สิทธิ์ (Role)**: `admin`

เมื่อผู้ใช้เข้าหน้าเว็บ ระบบจะแสดง Modal ให้ล็อกอินโดยอัตโนมัติ และเมื่อเข้าสู่ระบบสำเร็จ จะสร้าง Session Token แบบ HttpOnly Cookie (`em_session`) ที่มีอายุ 30 วัน

### การตั้งค่า Secrets เพิ่มเติม (Optional / เสริม)
หากต้องการใช้งาน Google Drive สำหรับบันทึกรูปภาพเครื่องจักร/อะไหล่ สามารถตั้งค่าผ่าน `wrangler secret put`:
```bash
# Google Service Account สำหรับอัปโหลดรูปภาพไปยัง Google Drive
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL --env staging
npx wrangler secret put GOOGLE_PRIVATE_KEY --env staging
```

---

## ขั้นตอนที่ 3: รัน Database Migrations บน Cloudflare D1

นำเข้าโครงสร้างตาราง (Registry + Equipment BOM) ขึ้นสู่คลาวด์:

```bash
# สำหรับ Staging
npx wrangler d1 migrations apply DB --env staging --remote

# สำหรับ Production
npx wrangler d1 migrations apply DB --env production --remote
```
ระบบจะรัน:
- `0001_registry.sql`: ตาราง departments, lines, machines, brands, parts, id_counters, requests, audit_events
- `0002_equipment_bom.sql`: ตาราง equipment_records, equipment_operations

---

## ขั้นตอนที่ 4: ย้ายข้อมูลจาก Google Sheets (Data Snapshot Migration)

### 4.1 Export ข้อมูลจาก Google Sheets เดิม
นำข้อมูลจาก Google Sheets (Machines, Parts, Equipment BOM) ส่งออกมาเป็นไฟล์ JSON เช่น `data/snapshot_production.json`

### 4.2 ตรวจสอบความถูกต้องและสร้าง SQL นำเข้า
ใช้สคริปต์ `scripts/import-snapshot.mjs`:
```bash
node scripts/import-snapshot.mjs data/snapshot_production.json
```
สคริปต์จะ:
1. ตรวจสอบ Foreign Keys (เช่น ไลน์ตรงกับแผนก, อะไหล่ตรงกับแบรนด์)
2. คำนวณ SHA-256 Checksum บันทึกลงตาราง `migration_runs`
3. คำนวณค่าสูงสุดของ ID เพื่ออัปเดต `id_counters` (ป้องกันการออกรหัสซ้ำ)
4. สร้างไฟล์ SQL สำหรับนำเข้าในโฟลเดอร์ `migrations/import_xxxxxxxx.sql`

### 4.3 นำเข้าข้อมูลขึ้น D1 บน Cloudflare
```bash
# นำเข้าสู่ Staging เพื่อทดสอบความสมบูรณ์
npx wrangler d1 execute DB --env staging --remote --file=migrations/import_xxxxxxxx.sql

# เมื่อทดสอบผ่านแล้ว นำเข้าสู่ Production
npx wrangler d1 execute DB --env production --remote --file=migrations/import_xxxxxxxx.sql
```

---

## ขั้นตอนที่ 5: สั่ง Deploy ขึ้น Cloudflare Workers

ระบบมีสคริปต์อัตโนมัติ `scripts/deploy.mjs` ที่จะตรวจเช็กความปลอดภัย 3 ด่านก่อน deploy เสมอ:
1. `npm run check`: ตรวจไวยากรณ์ JavaScript ของ Worker และ Web Bundles
2. `npm test`: รัน Test Suites ทั้งหมด (ต้องผ่าน 100% เท่านั้น)
3. `npm run build`: สร้าง Web Bundles (`/machines/`, `/parts/`, `/bom/`) พร้อมโลโก้ Base64 ล่าสุด

### คำสั่งสั่ง Deploy:
```bash
# 1. Deploy ขึ้น Staging
npm run deploy:staging

# 2. Deploy ขึ้น Production
npm run deploy:production
```

---

## ขั้นตอนที่ 6: การตรวจสอบหลัง Deploy (Post-Deployment Verification)

1. **ตรวจสอบความพร้อมของระบบ (Health Check)**:
   - เข้า URL: `https://<your-worker-domain>/api/v1/health`
   - ตรวจดูสถานะ `maintenance: true/false` และ `role`
2. **ปลดโหมดบำรุงรักษา (Disable Maintenance Mode)**:
   - ขณะนำเข้าข้อมูลเริ่มต้น ค่า `MAINTENANCE_MODE` จะเป็น `"true"` (เปิดให้อ่านข้อมูลได้อย่างเดียว บล็อกการแก้ไข)
   - เมื่อตรวจสอบข้อมูลเรียบร้อยแล้ว ให้ปรับใน `wrangler.jsonc` เป็น `"MAINTENANCE_MODE": "false"` แล้วรัน `npm run deploy:<env>` อีกครั้งเพื่อเปิดรับคำขอแก้ไขตามปกติ
3. **ตรวจสอบหน้าเว็บทั้ง 4 โมดูล**:
   - `https://<your-worker-domain>/machines/`
   - `https://<your-worker-domain>/parts/`
   - `https://<your-worker-domain>/bom/`
   - `https://<your-worker-domain>/users/`

---

## ขั้นตอนที่ 7: การดึงโค้ดและข้อมูลล่าสุดจาก Cloudflare (Pull from Cloudflare)

ในกรณีที่มีการแก้ไขโค้ดหรือ Deploy จากเครื่องอื่น หรือมีการเพิ่ม/แก้ไขข้อมูลจริงใน Cloudflare D1 Database แล้วต้องการดึงข้อมูลล่าสุดทั้งหมดกลับมาอัปเดตลง Git:

### วิธีที่ 1: ใช้คำสั่งอัตโนมัติ (แนะนำ)
ระบบมีสคริปต์ดึงโค้ด Backend, หน้าเว็บ Frontend, และฐานข้อมูล D1 ทั้งหมดในคำสั่งเดียว:

```bash
npm run pull:cf
```
สคริปต์นี้จะดำเนินการให้อัตโนมัติ:
1. ดึง **Worker Script** ล่าสุดจาก Cloudflare REST API มาเก็บไว้ที่ `src/downloaded/worker.js`
2. ดึง **Frontend Web Assets** จริงทั้ง 4 หน้ามาเก็บไว้ที่ `public/`
3. Export **Cloudflare D1 Database Snapshot** ล่าสุดมาเก็บไว้ที่ `data/snapshot_production.sql`

---

### วิธีที่ 2: วิธีทำทีละขั้นตอนด้วยตนเอง (Manual Steps)

#### 1. ตรวจสอบเวอร์ชันล่าสุดบน Cloudflare
```bash
# ดูรายการเวอร์ชันที่เคย Deploy เรียงตามเวลา
npx wrangler versions list --env production

# ดูรายละเอียดของเวอร์ชันที่ต้องการ (Bindings, Secrets, วันที่)
npx wrangler versions view <VERSION_ID> --env production
```

#### 2. ดึงโค้ด Backend (Worker Script) ผ่าน Cloudflare REST API
1. ตรวจสอบ **Account ID**:
   ```bash
   npx wrangler whoami
   ```
2. อ่าน **OAuth Token** ของ Wrangler จากไฟล์:
   `%APPDATA%\xdg.config\.wrangler\config\default.toml` (ค่าใน `oauth_token = "..."`)
3. เรียก Cloudflare REST API เพื่อดาวน์โหลดสคริปต์:
   ```http
   GET https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/electrical-maintenance
   Headers:
     Authorization: Bearer <OAUTH_TOKEN>
   ```

#### 3. ดึงไฟล์หน้าเว็บ Frontend ล่าสุด
ดาวน์โหลดไฟล์ HTML ที่คอมไพล์แล้วจาก URL จริง:
```bash
# เครื่องจักร
curl -s https://electrical-maintenance.eercsc.workers.dev/machines/ -o public/machines/index.html

# Master อะไหล่
curl -s https://electrical-maintenance.eercsc.workers.dev/parts/ -o public/parts/index.html

# Equipment BOM
curl -s https://electrical-maintenance.eercsc.workers.dev/bom/ -o public/bom/index.html

# จัดการผู้ใช้
curl -s https://electrical-maintenance.eercsc.workers.dev/users/ -o public/users/index.html
```

#### 4. Export ข้อมูลล่าสุดจาก Cloudflare D1 Database
```bash
npx wrangler d1 export electrical-maintenance --remote --output data/snapshot_production.sql -y
```

#### 5. Commit และ Push ขึ้น GitHub
```bash
git add .
git commit -m "feat: sync latest Cloudflare Workers code and D1 database snapshot"
git push origin main
```

