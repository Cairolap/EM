# Baseline Manifest & Source Ownership Map

**สถานะ:** บันทึก Baseline ปัจจุบัน (Production Baseline Manifest)  
**วันที่:** 22 กันยายน 2026  
**อ้างอิง:** `web/production-baseline/`, Cloudflare Workers (`electrical-maintenance`), Cloudflare D1 (`4201d512-...`)

---

## 1. รายการหน้าเว็บและ Source Ownership (Asset Baseline)

| หน้า (URL Path) | Production Baseline Asset | SHA-256 Hash | ขนาด (Bytes) | RPC Endpoint | เจ้าของ Source (Source Owner) |
|---|---|---|---|---|---|
| `/machines/` | `web/production-baseline/machines/index.html` | `194afd76a7e124c6204563610cc2aeaf22f00354819ab6eb3a24631a73787d45` | 147,874 | `/api/v1/machines/rpc` | `web/production-baseline/machines/index.html` (เดิมมาจาก `Spare part/`) |
| `/parts/` | `web/production-baseline/parts/index.html` | `9d1d3fe3ba9cc9af72d9c4230c02ed31926759ccfcbbba1e0bab613c92a83a93` | 161,963 | `/api/v1/parts/rpc` | `web/production-baseline/parts/index.html` (เดิมมาจาก `Part List/`) |
| `/bom/` | `web/production-baseline/bom/index.html` | `9f4472ddbe5d658ff6909ce8cbb2f6f04c10aec0948c8b843dc7c3b423478c94` | 809,714 | `/api/v1/bom/rpc` | `web/production-baseline/bom/index.html` (เดิมมาจาก `Equipment BOM/`) |
| `/users/` | `web/production-baseline/users/index.html` | `ca562bb447592202fed0a11f7b529c17b8c36bf8e6a8aa73b8722d154d3b2008` | 51,265 | `/api/v1/users/rpc` | `src/users/` (`index.html`, `styles.css`, `app.js`) |

---

## 2. พฤติกรรมสำคัญและ API Contract แต่ละโมดูล

### 2.1 `/machines/` (เครื่องจักร)
- **RPC Methods:**
  - `bootstrap`: โหลด departments, lines, statuses, criticalities, machineTypes, pageSizes, role
  - `getMachines`: ค้นหาและกรองรายการเครื่องจักร (รองรับ `lineOrder`, pagination, status filter, keyword search)
  - `getMachine`: ดึงข้อมูลเครื่องจักรเดี่ยว
  - `getPicture`: ดึงรูปภาพเครื่องจักรจาก Google Drive
  - `createMachine`, `updateMachine`, `archiveMachine`, `restoreMachine`, `retireMachine`: Mutation พร้อม Audit Log
- **ฟีเจอร์สำคัญใน Baseline:**
  - จัดการลำดับเครื่องจักรในไลน์ผลิต (`lineOrder`) 1–9999
  - ปุ่มจัดเรียงลำดับ 1..N อัตโนมัติ (`#reindex-line-btn`)
  - อัปโหลดรูปภาพผ่าน Google Drive OAuth 2.0

### 2.2 `/parts/` (Master อะไหล่)
- **RPC Methods:**
  - `bootstrap`: โหลดรายการ Parts, Brands, webAppUrl, role
  - `getAllParts`: ดึงรายการอะไหล่ทั้งหมด
  - `getBrands`: ดึงรายชื่อยี่ห้อ (Brands)
  - `getPicture`: ดึงรูปภาพอะไหล่ (thumbnail/full)
  - `createPart`, `updatePart`, `updatePartImage`, `createBrand`, `deleteBrand`: บันทึกข้อมูลอะไหล่
- **ฟีเจอร์สำคัญใน Baseline:**
  - ตารางกรอกหลายรายการและนำเข้าจาก Excel (**Bulk Table Add & Excel Import**)
  - รองรับ Parameter `?id=<PartID>` เพื่อค้นหาและไฮไลต์รายการที่ต้องการโดยตรง

### 2.3 `/bom/` (อุปกรณ์ประจำเครื่องจักร)
- **RPC Methods:**
  - `references`: ดึงแผนก, ไลน์, เครื่องจักร, สถานะ
  - `searchParts`: ค้นหาอะไหล่สำหรับติดตั้งในเครื่อง
  - `lineMachineStats`: สถิติอุปกรณ์ของเครื่องจักรในไลน์
  - `list`: รายการอุปกรณ์ที่ติดตั้งในเครื่องจักร (Active/Archived)
  - `history`: ประวัติการเปลี่ยนแปลงอุปกรณ์
  - `add`, `edit`, `split`, `replace`, `remove`: Mutation บันทึกการเปลี่ยนแปลง
- **ฟีเจอร์สำคัญใน Baseline:**
  - คำนวณอายุและวันหมดอายุ (DueMode: `MANUAL` หรือ `PART_LIFE`)
  - ป้องกัน Label ซ้ำในเครื่องจักรเดียวกัน
- **ฟีเจอร์เป้าหมายใน Phase 2:**
  - กดรูป Part เพื่อเปิด Dialog ดูรายละเอียดและรูปขยาย
  - ปุ่ม `✎ Part Edit` ลิงก์ตรงไปยัง `/parts/?id=<PartID>`
  - Layout responsive รองรับหน้าจอโทรศัพท์ (360px+)

### 2.4 `/users/` (จัดการผู้ใช้งาน)
- **RPC / Auth Routes:**
  - `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/logout`, `/api/v1/auth/change-password`
  - `/api/v1/users/rpc`: `listUsers`, `createUser`, `updateUser`, `resetPassword`, `deleteUser`
- **ฟีเจอร์สำคัญใน Baseline:**
  - สิทธิ์รายโมดูล (`machines`, `parts`, `bom`, `users`: none / read / write / admin)
  - กำหนดสิทธิ์ลบข้อมูล (`can_delete`)
  - ประเภทผู้ใช้ถาวร vs ชั่วคราว (กำหนดวันหมดอายุ บล็อกที่ HTTP 401 เมื่อหมดอายุ)
  - รีเซ็ตรหัสผ่านเป็น `1234` พร้อมติดธง `force_password_change` บังคับเปลี่ยนทันที

---

## 3. Worker Source Parity Status

- **Database:** Cloudflare D1 Database (`electrical-maintenance` / `electrical-maintenance-staging`)
- **Query Optimization (Additive):**
  - เพิ่ม `partsByIds(ids)` ใน `src/repository.js` เพื่อให้อ่านเฉพาะอะไหล่ที่เกี่ยวข้อง
  - เพิ่ม Index ใน `migrations/0005_bom_read_indexes.sql` สำหรับ `equipment_records(machine_id, record_status, created_at)`
  - ปรับ `bomContext` ใน `src/service.js` ให้โหลดเฉพาะอะไหล่ที่จำเป็น ลด Rows Read เกิน 70%
- **Build Guard:**
  - `scripts/build.mjs` ให้ความสำคัญกับ `web/production-baseline/` ก่อนเสมอ ทำให้การ build ไม่เกิด regression ทับ baseline ปัจจุบัน
