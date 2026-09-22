# แผนพัฒนา Electrical Maintenance — อุปกรณ์ประจำเครื่องจักร

**สถานะ:** พร้อมพัฒนา  
**วันที่:** 22 กันยายน 2026  
**เป้าหมายการปล่อย:** Staging ก่อน Production  
**เส้นทางระบบ:** `/bom/`  
**เอกสารอ้างอิง:** ภาพหน้าจอมือถือ 3 ภาพจากผู้ใช้, `../Equipment BOM/DESIGN.md`, `../Equipment BOM/UX-CONTRACT.md` และโค้ดปัจจุบันใน `../Equipment BOM/src/`

## 1. เป้าหมาย

ปรับหน้า “อุปกรณ์ประจำเครื่องจักร” ให้ทำงานบนโทรศัพท์ได้สะดวกขึ้น และเชื่อมกับ Master อะไหล่บน Cloudflare อย่างถูกต้อง โดยมีงานหลัก 3 เรื่อง:

1. กดรูป Part แล้วเปิดดูรายละเอียด Part และรูปขนาดใหญ่ได้
2. ปุ่ม `✎ Part Edit` เปิด `/parts/?id=<PartID>` ของระบบเดียวกัน
3. ออกแบบรายการอุปกรณ์และฟอร์มเพิ่ม/แก้ไขสำหรับจอเล็กใหม่ ไม่ย่อหน้าจอเดสก์ท็อปลงมาตรง ๆ

ทุกการเปลี่ยนแปลงต้องขึ้น `electrical-maintenance-staging` และผ่าน UAT ก่อน deploy Production

## 2. ข้อค้นพบจากหน้าจอและโค้ดปัจจุบัน

| จุดตรวจ | สภาพปัจจุบัน | ผลกระทบ |
|---|---|---|
| ภาพ Part ในหัวกลุ่ม | `image(part)` คืน `<span>` ที่มี `<img>` และไม่มี action | ผู้ใช้เห็นภาพแต่กดเพื่อดูรายละเอียดไม่ได้ |
| รายละเอียด | มี `openDetail(row)` ซึ่งผูกกับ Label หนึ่งรายการ และรวมข้อมูล Part/ประวัติ | ใช้แสดงรายละเอียด Label ได้ แต่ภาพในหัวกลุ่มแทน Part ทั้งกลุ่ม จึงไม่ควรเลือก Label แรกแบบเงียบ ๆ |
| Part Edit | มี logic เลือก Apps Script URL หรือ `/parts/` ตาม hostname | เส้นทางขึ้นกับ environment และยังมี URL เก่าฝังใน source |
| รายการบนมือถือ | CSS เปลี่ยน grid เดสก์ท็อปเป็นแถวซ้อนกัน | ข้อมูล, checkbox และปุ่มคำสั่งเบียดกันตามภาพที่ 3 |
| ฟอร์มเพิ่มอุปกรณ์ | rail 4 ส่วนและตาราง Label อยู่ใน dialog เดียว | บนมือถือเป็นฟอร์มยาว มีพื้นที่ scroll แคบและต้องเลื่อนไปมามากตามภาพที่ 2 |
| แถบเลือกหลายรายการ | action อยู่ใน flow เดิม | เมื่อรายการยาว ปุ่มสำคัญหลุดออกจากหน้าจอและเข้าถึงยาก |
| Build/Deploy | `Electrical Maintenance/scripts/build.mjs` bundle source จาก `Equipment BOM`; deploy script รัน check, test, build ก่อน Wrangler | ต้องแก้ source ใน `Equipment BOM/src/` แล้ว build จากโปรเจกต์ Electrical Maintenance ห้ามแก้ `public/bom/index.html` โดยตรง |

## 3. ขอบเขตงาน

### 3.1 กดภาพเพื่อดูรายละเอียด Part

เพิ่ม `openPartDetail(part, groupContext)` แยกจาก `openDetail(row)` เพราะภาพในหัวกลุ่มเป็นภาพของ Part ซึ่งอาจมีหลาย Label

พฤติกรรม:

- เปลี่ยนกรอบภาพหรือ placeholder “ไม่มีรูป” เป็น `<button type="button">` ขนาดแตะอย่างน้อย 44×44 px
- ชื่อสำหรับ screen reader: `ดูรายละเอียด Part <Part number>`
- กดแล้วเปิด native `<dialog>` รายละเอียด Part โดยไม่เปลี่ยนสถานะเปิด/ปิดของ `<details>` กลุ่มนั้น
- dialog แสดงรูปหลักแบบ `object-fit: contain`, Part number, Description, Part ID, Brand, Store code, อายุอุปกรณ์, Notes และจำนวน Label ที่ติดตั้งปัจจุบัน
- ถ้ามี Picture ให้มีปุ่ม `เปิดรูปต้นฉบับ` ในแท็บใหม่; URL ต้องผ่าน `BomCore.imageUrl()` ก่อน
- ถ้ารูปโหลดไม่ได้ ให้คงรายละเอียดข้อความไว้และแสดง `โหลดรูปไม่สำเร็จ` พร้อมปุ่มลองใหม่
- ถ้าไม่มีรูป ให้ placeholder ยังคงกดเปิดรายละเอียด Part ได้
- ปุ่มปิด, Escape, focus trap และคืน focus กลับมาที่ภาพเดิมใช้ native dialog contract เดิม
- ปุ่ม `ดูรายละเอียด` ในแต่ละ Label ยังเปิด `openDetail(row)` เพื่อดู lifecycle และประวัติของ Label นั้นเหมือนเดิม

ไม่ใช้ `onclick` บน `<img>` และไม่ใช้ภาพเป็นปุ่มโดยไม่มี accessible name

### 3.2 Part Edit

กำหนด helper กลาง:

```js
function partEditUrl(partId) {
  return '/parts/?id=' + encodeURIComponent(partId);
}
```

กติกา:

- ปุ่ม `✎ Part Edit` ใช้ `partEditUrl(group.PartID)` เสมอ
- เปิดแท็บใหม่ด้วย `<a target="_blank" rel="noopener noreferrer">` เพราะเป็น navigation ไม่ใช่ action
- URL ที่ได้ต้องมีรูปแบบ `/parts/?id=PART-000022`
- ถ้าไม่มี Part ID ไม่ render link และแสดงข้อความ `ไม่พบ Part ใน Master อะไหล่`
- ลบ hard-coded Apps Script URL และ hostname branching ออกจาก `Equipment BOM/src/app.js`
- หลังเปิด Part Edit หน้า BOM ต้องรักษาแผนก, ไลน์, เครื่องจักร, filter, หน้าที่เปิด และรายการที่เลือกไว้
- หน้า `/parts/` ต้องเปิด editor ของ ID ที่ส่งมา; กรณีไม่พบ ID แสดง error พร้อมปุ่มกลับรายการ ไม่เลือก Part ที่ชื่อคล้ายกันแทน

### 3.3 Mobile presentation ใหม่

Breakpoint หลักคง `780px` ตาม design contract แต่แยกการ render:

- `renderDesktopGroup(group)` สำหรับจอกว้าง
- `renderMobileGroup(group)` สำหรับจอไม่เกิน 780px
- business data, selection, mutation และ validation ใช้ state/service ชุดเดียวกัน
- listener `matchMedia('(max-width: 780px)')` re-render เฉพาะเมื่อ breakpoint เปลี่ยน ไม่ re-render ทุก pixel ระหว่าง resize

โครงสร้างหน้าเครื่องจักรบนมือถือ:

```text
┌────────────────────────────────────┐
│ ← ฝาเกลียว / 28STD7       VID2O7 │
│ VID7.1                              │
│ [รีเฟรช] [เลือกเครื่อง] [+ เพิ่ม] │
├────────────────────────────────────┤
│ 82 Part · 82 รายการ · 10 ตรวจสอบ │
├────────────────────────────────────┤
│ [ค้นหา........................ ×] │
│ [ตัวกรอง (2)] [ติดตั้งปัจจุบัน ▼] │
├────────────────────────────────────┤
│ [ภาพ] 03101307                 1 ชิ้น│
│        GEARED MOTOR...              │
│        PART-000022 · SACMI          │
│ [ดูรายละเอียด Part] [Part Edit ↗] │
│ ────────────────────────────────── │
│ □ Label —                          │
│   ติดตั้ง 31 พ.ค. 2018             │
│   เหลือ 2,443 วัน · กำหนด ...      │
│ [รายละเอียด] [แก้ไข] [ถอดออก]     │
└────────────────────────────────────┘
┌ sticky selection bar ──────────────┐
│ เลือก 2 รายการ [เปลี่ยน] [ถอด]   │
└────────────────────────────────────┘
```

#### Header และตัวกรอง

- ลด breadcrumb เหลือ back action + บริบทสำคัญหนึ่งบรรทัด
- machine name/code ต้องเห็นก่อนสถิติและไม่ถูกตัดโดยไม่มีทางดูเต็ม
- สรุปตัวเลขเป็นแถบ compact; แสดงเฉพาะค่าที่ใช้ตัดสินใจจริง
- Search แสดงตลอด มี clear button และรองรับ IME ตาม contract เดิม
- ตัวกรองรองเปิดใน app-owned filter sheet; ปุ่มแสดงจำนวน filter ที่ใช้อยู่
- filter sheet มี `ล้างตัวกรอง` และ `แสดงผล` ชัดเจน; Escape/Back ปิดได้โดยไม่ล้างค่าที่เลือกแล้ว

#### Part card

- หัว card ใช้ 3 ส่วน: ภาพ 56×56, identity, quantity
- Part number และ Description เป็นลำดับข้อมูลหลัก; Part ID และ Brand เป็น metadata
- ภาพ, `ดูรายละเอียด Part`, และ `Part Edit ↗` มีหน้าที่ไม่ซ้ำกัน
- action ของ Part อยู่ในแถว 2 ปุ่มเต็มความกว้าง; `เพิ่ม Label` อยู่ใน action section ของ card
- หลีกเลี่ยงปุ่มข้อความยาว 3 ปุ่มในบรรทัดเดียว

#### Label card

- หนึ่ง Label เป็นหนึ่ง sub-card และ checkbox อยู่มุมซ้ายบน
- แยก `สถานะ/กำหนด`, `วันติดตั้ง`, `จำนวน` เป็นข้อมูลที่อ่านกวาดสายตาได้
- action ใช้ 3 ปุ่ม: `รายละเอียด`, `แก้ไข`, `ถอดออก`; ถ้ากว้างไม่พอให้ 2 คอลัมน์และ `ถอดออก` เต็มแถว
- status ไม่สื่อด้วยสีอย่างเดียว และไม่ซ่อนข้อมูลไว้ใน hover
- inactive/history row มี treatment ต่างจาก active และไม่มี mutation ที่ใช้ไม่ได้

#### Selection bar

- เมื่อเลือกอย่างน้อย 1 Label ให้แสดง bottom action bar แบบ sticky เหนือ safe area
- แสดงจำนวนที่เลือกและปุ่ม `บันทึกการเปลี่ยนพร้อมกัน` / `ถอดออกพร้อมกัน`
- content ใต้ bar มี padding-bottom เท่าความสูง bar ป้องกันรายการสุดท้ายถูกบัง
- ปิด bar ทันทีเมื่อ selection ถูก clear จาก refresh/filter/page ตามกติกาเดิม

### 3.4 Mobile editor เป็น full-screen step flow

บนจอไม่เกิน 780px เปลี่ยน add/edit dialog เป็น full-screen sheet และมี scroll owner เดียว:

| ขั้น | เนื้อหา | Next gate |
|---|---|---|
| 1. เลือก Part | Part picker + Part summary | ต้องมี Part |
| 2. วันที่และอายุ | วันที่ติดตั้ง, expiry mode, manual expiry | วันที่และ mode ต้อง valid |
| 3. Label | จำนวนแถว, paste หลาย Label, แก้ Label/จำนวน | Label ไม่ซ้ำและจำนวนถูกต้อง |
| 4. ตรวจสอบ | Notes + summary ก่อนบันทึก | ยืนยัน operation เดิม |

- header แสดง `ขั้น 1 จาก 4` และปุ่มปิด 44×44 px
- footer sticky มี `ย้อนกลับ` และ `ถัดไป`/`ตรวจสอบข้อมูลก่อนบันทึก`
- เปลี่ยนขั้นแล้วเลื่อนไปบนสุดและ focus heading
- Error อยู่ที่ field และมี summary; ห้ามทิ้งค่าที่กรอกเมื่อย้อนขั้นหรือ API ล้มเหลว
- keyboard บนมือถือไม่บัง field/action; footer ปรับตาม `visualViewport`
- dirty close เปิด discard dialog เดิม
- desktop editor คงรูปแบบ rail + table เดิม เว้นแต่ shared bug จำเป็นต้องแก้

## 4. State และ component contract

เพิ่ม state โดยไม่แตะ schema หรือ API:

```js
state.viewport = 'mobile' | 'desktop';
state.partDetail = null;
state.mobileFiltersOpen = false;
state.editorStep = 1;
```

Component owners:

| Capability | Owner |
|---|---|
| รูป/placeholder | `partImageButton(part, onOpen)` |
| Part detail | `openPartDetail`, `renderPartDetail` และ native `#part-detail` dialog |
| Part Edit link | `partEditUrl`, `partEditLink` |
| Desktop group | `renderDesktopGroup` |
| Mobile group | `renderMobileGroup` |
| Label content | shared view-model จาก `labelViewModel(row)` |
| Mobile filter sheet | native dialog variant `#mobile-filters` |
| Mobile editor steps | shared editor state + `renderMobileEditorStep` |

ห้ามคัดลอก business rules เช่น age status, editability, quantity หรือ selection limit ไปไว้ใน CSS/mobile renderer ให้ renderer รับค่าที่คำนวณจาก owner เดิม

## 5. ไฟล์ที่จะเปลี่ยน

| ไฟล์ | งาน |
|---|---|
| `Equipment BOM/src/app.js` | image button/detail, Part Edit URL, desktop/mobile renderers, filter sheet และ editor steps |
| `Equipment BOM/src/index.html` | เพิ่ม `part-detail` และ `mobile-filters` dialogs; เพิ่ม semantic containers สำหรับ mobile editor |
| `Equipment BOM/src/styles.css` | mobile card system, full-screen sheets, sticky bars, safe-area/visual viewport และ states |
| `Equipment BOM/DESIGN.md` | บันทึก mobile presentation, image detail และ navigation owner |
| `Equipment BOM/UX-CONTRACT.md` | เพิ่ม flow/state/focus contracts และ relative Part link |
| `Equipment BOM/tests/ui-contract.test.cjs` | ตรวจ semantic button/link/dialog และ CSS contract |
| `Equipment BOM/tests/workflow.test.cjs` | ตรวจ URL, viewport render, selection และ editor step state |
| `Electrical Maintenance/src/repository.js` | แทน full-catalog reads ด้วย query ที่กรอง/แบ่งหน้า และบันทึก query metrics |
| `Electrical Maintenance/src/service.js` | แยก endpoint สำหรับ search/list/detail และไม่โหลด Parts ทั้งชุดใน flow BOM |
| `Electrical Maintenance/migrations/0003_bom_read_indexes.sql` | เพิ่มเฉพาะ index ที่ `EXPLAIN QUERY PLAN` ยืนยันว่า hot query ใช้จริง |
| `Electrical Maintenance/scripts/build.mjs` | ไม่ควรต้องแก้; ใช้ bundle source ล่าสุดไป `/bom/` |
| `Electrical Maintenance/public/bom/index.html` | generated artifact จาก build เท่านั้น |

ไม่มีการเปลี่ยน business schema ของ BOM แต่เพิ่ม migration สำหรับ index และปรับ read API/repository เพื่อจำกัดจำนวนแถวที่สแกน

## 6. แผนลด Cloudflare D1 Rows read

### 6.1 Baseline จากภาพและข้อจำกัดในการตีความ

ภาพ Cloudflare แสดง `Rows read 700.28K / 5M` หรือประมาณ **14.0%** ของเพดานที่แสดง, `Rows written 9.11K / 100K` หรือประมาณ **9.1%**, และ storage 6.7 MB จาก 5 GB

ตัวเลขในภาพเป็นยอดรวมของ 5 databases จึงยังสรุปไม่ได้ว่า Electrical Maintenance หรือหน้า BOM ใช้ครบ 700.28K แถว ต้องเก็บ baseline ราย database และราย query บน Staging ก่อนปรับ การเปิด query จาก Dashboard หรือ Wrangler เพื่อวัดผลก็นับเป็น usage เช่นกัน จึงให้รันชุดวัดแบบมีขอบเขตและบันทึกจำนวนครั้ง

Cloudflare นับ `Rows read` ตามแถวที่ query สแกน ไม่ใช่เฉพาะแถวที่ส่งกลับ และ D1 response มี `meta.rows_read`, `meta.rows_written` และ duration ให้ใช้วัดราย query รายละเอียดดู [D1 Metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) และ [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)

### 6.2 จุดใช้ Rows read สูงที่พบในโค้ด

| Hot path | พฤติกรรมปัจจุบัน | ปัญหา |
|---|---|---|
| `Repository.catalog('parts')` | `SELECT` Parts สูงสุด 10,001 แถว แล้วค้นหา/แบ่งหน้าใน JavaScript | ทุกการโหลด catalog อาจอ่านทั้งตาราง แม้แสดง 10–50 รายการ |
| `Repository.catalog('machines')` | อ่าน Machines ทั้งชุดก่อน `MachineCore.query()` | filter แผนก/ไลน์/page ไม่ลดแถวที่ D1 สแกน |
| `BomService.searchParts()` | โหลด Parts ทั้งชุดแล้วค้นหา | พิมพ์ค้นหาหลายครั้งทำให้ full read ซ้ำ แม้มี debounce |
| `BomService.list()` | โหลด record ทั้งเครื่องและ Parts ทั้งชุดเพื่อ join ใน memory | ใช้ rows read ตามขนาด Parts และประวัติทั้งหมด ไม่ใช่ผลลัพธ์หน้าปัจจุบัน |
| `lineMachineStats()` | โหลด records ของทั้งไลน์และ Parts ทั้งชุดแล้วคำนวณ | หน้าเลือกเครื่องอาจใช้ read สูงทุกครั้งที่เปลี่ยนไลน์/refresh |
| `bomEvents()` | อ่าน operation ของเครื่องทั้งหมด แล้ว parse/filter EquipmentID ใน JavaScript | ประวัติ Label หนึ่งตัวอ่าน event ที่ไม่เกี่ยวข้องทั้งหมด |
| `references()` / `brands()` | อ่านตารางอ้างอิงทั้งชุดทุก call | แต่ละตารางเล็ก แต่ถูกเรียกซ้ำบ่อยและรวม usage ได้ |

การเพิ่มรายละเอียดเมื่อกดภาพต้อง **ไม่เพิ่ม D1 query**: ใช้ข้อมูล `group.part` ที่โหลดอยู่แล้วเปิด dialog ส่วนรูปต้นฉบับโหลดจาก Google Drive เฉพาะเมื่อผู้ใช้กดดู

### 6.3 Instrumentation ก่อน optimize

เพิ่ม query wrapper ที่ตั้งชื่อ query และอ่าน metadata จาก D1 โดย log เฉพาะ:

```text
environment, queryName, rowsRead, rowsWritten,
rowsReturned, durationMs, cacheHit, requestRoute
```

- ไม่ log SQL parameter, search text, Part number, user identity หรือข้อมูลโรงงาน
- เปิด detailed sampling 100% บน Staging; Production ใช้ sampled logs หรือ Cloudflare Analytics เพื่อไม่สร้าง log noise
- เพิ่ม response header `Server-Timing` เฉพาะ Staging เพื่อดู D1 duration; ไม่ส่งจำนวนหรือรายละเอียด query ที่เป็นข้อมูลภายในให้ Production client
- สร้าง baseline ด้วย workload เดิม 20 รอบและ workload ใหม่ 20 รอบ โดยใช้ข้อมูลชุดเดียวกันและล้าง client cache ก่อนแต่ละชุด
- แยกผล `rows read ต่อ action`, `rows read ต่อ query`, p50/p95 duration และ `rows returned`
- ใช้ D1 dashboard/GraphQL แยก `electrical-maintenance-staging` ออกจาก database อื่น; metrics ย้อนหลังมีช่วงเก็บจำกัดตามเอกสาร Cloudflare

ชุด baseline:

1. Login และเปิด `/bom/`
2. เลือกแผนก → ไลน์ → เครื่องจักร
3. ค้น Part 5 คำ โดยพิมพ์/ล้างคำค้น
4. เปิด Part group และ detail 3 รายการ
5. เปลี่ยนหน้า 3 หน้า
6. เปิดประวัติ Label 3 รายการ
7. เพิ่ม/แก้ Label อย่างละ 1 ครั้ง เพื่อวัด read/write trade-off

### 6.4 ปรับ query ให้กรองที่ D1

#### A. Machines และ Parts catalog

- แทน `catalog()` ใน hot path ด้วย `listMachines(query)` และ `listParts(query)` ที่รับ filter, sort, limit และ cursor/page
- เลือกเฉพาะคอลัมน์ที่หน้าจอต้องใช้; detail endpoint ค่อยอ่านคอลัมน์เต็มเมื่อเปิดรายละเอียด
- ใช้ `LIMIT pageSize + 1` สำหรับ cursor pagination เพื่อตรวจว่ามีหน้าถัดไป หลีกเลี่ยง `COUNT(*)` ทุก keypress
- ถ้าหน้าจอต้องแสดง total จริง ให้คำนวณเมื่อ filter ถูก commit ไม่คำนวณซ้ำระหว่าง IME/keypress ทุกตัว
- search request debounce 300 ms, abort request เก่า และ deduplicate request ที่มี parameter ชุดเดียวกัน

#### B. BOM list

- query เฉพาะ `equipment_records.machine_id = ?`
- ปกติ filter `record_status = 'ACTIVE'`; โหลด history เมื่อผู้ใช้เลือก history เท่านั้น
- join `parts` ด้วย `part_id` ใน D1 และ select field ที่ใช้แสดง/คำนวณอายุ แทนการโหลด Parts ทั้งชุดมาสร้าง Map
- paginate ที่ D1 ตามกลุ่ม Part; ห้ามโหลดทุก record แล้ว slice ใน Worker
- summary total ใช้ aggregate query แยกที่ cache ได้ และไม่รันซ้ำเมื่อเปลี่ยนเฉพาะการเปิด/ปิด `<details>`

#### C. Line machine statistics

- filter `record_status='ACTIVE'` ตั้งแต่ SQL
- join machines เฉพาะ department/line ที่เลือก โดยใช้ index ที่มีอยู่ `(department_id, line_id, is_active)`
- select เฉพาะ machine_id, part_id, quantity, due fields และ lifespan ที่ต้องคำนวณ
- aggregate distinct Part และ quantity ใน SQL; คำนวณ due status จากชุดคอลัมน์จำเป็นเท่านั้น
- cache ผลตาม `departmentId + lineId + Bangkok date + data revision` 60–90 วินาที
- mutation ของ Label ในไลน์นั้น invalidate cache key; line อื่นไม่ถูกล้าง

#### D. History/events

- `bomRecords(machineId, equipmentId, cursor)` filter EquipmentID ที่ D1 และแบ่งหน้า
- เปลี่ยน operation ledger ให้มีตารางเชื่อม `equipment_operation_items(operation_id, equipment_id)` หรือคอลัมน์ที่ query ได้ แทน parse `plan_json` ของทุก operation
- ถ้ายังไม่เพิ่มตารางเชื่อมในรอบแรก ให้จำกัด query ด้วย machine/status/date/cursor และเก็บ migration ตารางเชื่อมเป็น Phase 2 หลังวัดผล

### 6.5 Index ที่เสนอและวิธีตัดสิน

ห้ามสร้าง index ทั้งหมดโดยเดา ให้รัน `EXPLAIN QUERY PLAN` บน Staging และเพิ่มเมื่อผล hot query เป็น `SCAN` หรือใช้ index ไม่ตรงเงื่อนไข

ตัวเลือก migration `0003_bom_read_indexes.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_equipment_machine_status_part_created
ON equipment_records(machine_id, record_status, part_id, created_at);

CREATE INDEX IF NOT EXISTS idx_equipment_machine_equipment_created
ON equipment_records(machine_id, equipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operations_machine_status_created
ON equipment_operations(machine_id, status, created_at DESC);
```

- query plan ต้องเปลี่ยนจาก `SCAN` เป็น `SEARCH ... USING INDEX`
- ตรวจ leftmost-prefix ให้ตรงกับ `WHERE` จริง
- index เดิมที่ซ้ำซ้อนให้ถอดได้เฉพาะหลังเทียบ query plan และ rollback migration แล้ว
- index เพิ่ม rows written และ storage เมื่อแก้คอลัมน์ที่อยู่ใน index จึงวัด `rowsWritten` ควบคู่ ไม่เพิ่ม FTS/index โดยไม่มีหลักฐาน
- Parts prefix search ใช้ index `part_number` ที่มีอยู่; การค้น substring หลาย field ให้ทดลอง FTS5/trigram บน Staging เฉพาะเมื่อ metrics ชี้ว่า search เป็นตัวใช้ rows read หลัก

Cloudflare แนะนำใช้ `EXPLAIN QUERY PLAN` เพื่อยืนยัน `SEARCH ... USING INDEX`; index ช่วยลดแถวที่สแกน แต่มีต้นทุน write/storage ดู [Use indexes](https://developers.cloudflare.com/d1/best-practices/use-indexes/)

### 6.6 Cache และการลดคำขอซ้ำ

- Browser cache ข้อมูลอ้างอิง Departments/Lines ระหว่าง session และ coalesce คำขอพร้อมกัน
- Worker Cache API ใช้เฉพาะข้อมูลอ่านร่วมที่ผ่าน auth แล้วและไม่มีข้อมูลเฉพาะผู้ใช้ เช่น references และ line stats
- cache key ต้องมี environment, route, normalized query และ data revision
- mutation เพิ่ม revision/invalidate key ที่เกี่ยวข้อง; ห้ามใช้ TTL อย่างเดียวกับข้อมูลที่ผู้ใช้เพิ่งแก้
- Part detail ที่เปิดจากภาพใช้ object ใน list cache ไม่ query ซ้ำ; fetch detail เพิ่มเฉพาะเมื่อ field จำเป็นขาด
- ไม่ cache session, permission, audit, mutation response หรือข้อมูล error ที่อาจต่างตามผู้ใช้
- response จาก authenticated API ยังเป็น private/no-store ฝั่ง browser หากไม่มี revision-safe client cache owner

### 6.7 เป้าหมายและ acceptance criteria

เป้าหมายวัดจาก workload เดียวกันบน Staging ไม่เทียบยอด dashboard คนละช่วงเวลา:

- ลด Rows read รวมของ standard BOM journey อย่างน้อย **70%** จาก baseline
- query รายการ/ค้นหามี `rowsRead / max(rowsReturned,1) <= 5` เมื่อมีผลลัพธ์; query ที่คืน 0 แถวประเมินด้วย query plan แยก
- ไม่มี full table `SCAN` บน hot queries: login, machine list, Part search, BOM list, line stats และ Label history
- เปิด Part detail จากภาพสร้าง **0 D1 queries เพิ่มเติม** เมื่อข้อมูล Part มีอยู่ใน list payload
- เปลี่ยน Part group เปิด/ปิดสร้าง **0 network requests**
- Part search หนึ่งชุดการพิมพ์หลัง debounce ส่ง request ล่าสุดไม่เกิน 1 ครั้ง และ response เก่าเขียนทับผลใหม่ไม่ได้
- p95 D1 duration ของ read hot path ไม่แย่ลงจาก baseline และตั้งเป้าไม่เกิน 50 ms บน Staging dataset
- Rows written ต่อ mutation เพิ่มได้เฉพาะจำนวน index entries ที่อธิบายได้ และต้องไม่เกิน 2 เท่าของ baseline โดยไม่มีการอนุมัติ
- ตั้ง Cloudflare billing notification ที่ 50%, 75% และ 90% ของ Rows read limit ที่ account ใช้อยู่
- หลัง deploy Staging เก็บ metric อย่างน้อย 1 รอบ UAT เต็มและ 24 ชั่วโมงก่อนตัดสิน Production

### 6.8 ลำดับการปรับปรุง Rows read

1. Instrument และเก็บ baseline ราย query
2. เปลี่ยน full catalog/whole-machine reads เป็น filtered projection + pagination
3. ปรับ line stats และ history ให้ filter/aggregate ใน D1
4. รัน `EXPLAIN QUERY PLAN`; เพิ่ม migration index ที่พิสูจน์ว่าจำเป็น
5. เพิ่ม revision-safe cache และ request coalescing
6. รัน workload เดิม วัด rows read/write/latency เทียบ baseline
7. ถ้ายังไม่ถึงเป้า ค่อยทดลอง FTS5/trigram หรือ operation-item table บน Staging

แนวทางนี้ให้ความสำคัญกับการลด full scans ก่อน เพราะเป็นส่วนที่ลด Rows read ได้มากที่สุด; caching และ index เป็นขั้นเสริมหลัง query shape ถูกต้อง

## 7. สถานะผิดปกติและการกู้คืน

| กรณี | พฤติกรรม |
|---|---|
| รูปไม่มี/URL ไม่รองรับ | แสดง placeholder ที่ยังกดดู Part detail ได้ |
| รูปโหลดผิดพลาด | แสดงข้อความในพื้นที่รูป, รายละเอียดข้อความยังครบ, retry ได้ |
| Part ถูกลบจาก Master | แสดง PartID และ `ไม่พบ Part ใน Master อะไหล่`; ซ่อน Part Edit |
| Part Edit เปิดแล้ว ID ไม่พบ | หน้า Parts แสดง not-found state; ไม่เปิด record อื่น |
| resize ข้าม breakpoint ขณะ dialog เปิด | รักษา draft/selection; เปลี่ยน presentation โดยไม่ปิด dialog |
| session หมดอายุขณะกรอก | รักษา draft ใน memory, ล็อกอินใหม่, ห้าม submit อัตโนมัติ |
| history API ล้มเหลว | Part/Label detail ยังแสดง; ส่วนประวัติมี retry เฉพาะส่วน |
| safe-area/keyboard | sticky footer/bar ไม่ทับ field หรือรายการสุดท้าย |

## 8. ลำดับพัฒนา

### Phase 1 — Link และ Part detail

1. เพิ่ม test ของ `partEditUrl()` ให้ได้ `/parts/?id=...`
2. ลบ Apps Script URL และ hostname branching
3. เพิ่ม image button และ Part detail dialog
4. ทดสอบ no image, broken image, long text และ focus return

เกณฑ์ผ่าน: กดภาพทุก Part เปิดรายละเอียด Part ที่ถูกต้อง และ Part Edit เปิด editor ของ ID เดียวกันในแท็บใหม่

### Phase 2 — Mobile list

1. สร้าง shared view-model
2. แยก desktop/mobile renderer
3. ทำ header/filter sheet, Part cards, Label cards และ sticky selection bar
4. ตรวจ selection/filter/page/stale response ไม่เปลี่ยนจาก contract เดิม

เกณฑ์ผ่าน: ใช้งานรายการทั้งหมดได้ที่ 360 px โดยไม่มี horizontal scroll และไม่มีปุ่มซ้อน/ถูกตัด

### Phase 3 — Mobile editor

1. แยก mobile editor เป็น 4 ขั้น
2. รักษา draft/validation/review/operation ID เดิม
3. ทำ sticky footer, keyboard และ dirty-close recovery

เกณฑ์ผ่าน: เพิ่มอุปกรณ์หลาย Label บนจอ 360×640 ได้ตั้งแต่เริ่มจนบันทึก โดยไม่เกิด nested scroll และย้อนขั้นแล้วข้อมูลไม่หาย

### Phase 4 — Contract, build และ verification

1. อัปเดต DESIGN.md และ UX-CONTRACT.md
2. รัน test/check/build ของ Equipment BOM
3. รัน test/check/build ของ Electrical Maintenance เพื่อสร้าง `/bom/`
4. ตรวจ generated bundle ว่าไม่มี Apps Script URL เดิม

### Phase 5 — Rows read optimization

1. เพิ่ม query metrics และเก็บ baseline บน Staging
2. ย้าย catalog/BOM/line stats/history filtering ไป D1
3. เพิ่ม migration index ที่ผ่าน `EXPLAIN QUERY PLAN`
4. รัน workload เทียบ baseline และบันทึก rows read/write/latency

เกณฑ์ผ่าน: standard BOM journey ลด Rows read อย่างน้อย 70%, hot query ไม่มี full scan และ Part detail จากภาพไม่เพิ่ม D1 query

## 9. Testing matrix

### Automated

- `partEditUrl('PART-000022') === '/parts/?id=PART-000022'`
- ID ที่มีอักขระพิเศษถูก encode
- ภาพและ placeholder เป็น semantic button พร้อม accessible name
- image click ไม่ toggle `<details>` โดยไม่ตั้งใจ
- mobile/desktop renderer ให้ action และข้อมูลสำคัญเท่ากัน
- resize รักษา selection, filters และ editor draft
- step validation ไม่ข้าม field ที่ผิด
- Part not found, image error, history error และ session expiry มี recovery state
- grep generated BOM bundle ต้องไม่พบ `script.google.com/macros` สำหรับ Part Edit
- query-plan tests ยืนยัน hot query ใช้ index และไม่มี `SCAN equipment_records` / `SCAN parts`
- repository tests ตรวจว่า limit/filter/cursor ถูกส่งเข้า SQL ไม่ slice หลังอ่านทั้งตาราง
- instrumentation tests ตรวจ `rowsRead`, `rowsWritten`, rowsReturned และ duration โดยไม่ log parameter/PII
- Part detail จากภาพไม่เรียก transport หรือ D1 เพิ่ม

### Browser/UAT

ทดสอบ Chrome/Edge ที่ 360×640, 390×844, 430×932, 768×1024 และ desktop 1280×720:

- กดภาพที่มีรูป, ไม่มีรูป และรูปเสีย
- keyboard: Tab, Shift+Tab, Enter/Space, Escape และ focus return
- Part Edit เปิด `/parts/?id=...` และเปิด Part ถูกตัว
- ค้นหา, filter, clear, เปลี่ยนหน้า และเปิด/ปิด Part group
- เลือก Label, selection bar, bulk replace/remove
- เพิ่ม 1 Label, หลาย Label, paste Label, ย้อนขั้น, validation และ dirty close
- ข้อความไทยยาว, Part number ยาว, จำนวน 1/2 หลัก และวันที่ครบกำหนด
- portrait/landscape, 200% zoom, reduced motion และ offline/session expiry
- desktop regression: add/edit/detail/filter/bulk flows เดิมต้องไม่เสีย
- รัน standard Rows read workload ก่อน/หลัง และแนบตาราง queryName, calls, rowsRead, rowsReturned, p95 duration

## 10. Deploy Staging และ UAT gate

ใช้ฐาน `electrical-maintenance-staging` และ Worker `electrical-maintenance-staging` เท่านั้น ห้าม deploy Production ในงานพัฒนา/ทดสอบรอบนี้

ขั้นตอน:

1. บันทึก Worker version ปัจจุบันของ Staging เพื่อ rollback
2. ตรวจว่า working tree มีเฉพาะการเปลี่ยนที่ตั้งใจ และไม่มี secret/credential ถูกเพิ่มใน commit
3. เก็บ Rows read baseline และ `EXPLAIN QUERY PLAN` ของ hot queries ก่อน apply migration
4. apply migration index เฉพาะ Staging แล้วรัน:

   ```powershell
   cd "E:\Antigravity\Web App\Equipment BOM"
   npm run check
   npm test
   npm run build

   cd "E:\Antigravity\Web App\Electrical Maintenance"
   npm run check
   npm test
   npm run build
   npm run deploy:staging
   ```

5. เปิด `https://electrical-maintenance-staging.eercsc.workers.dev/bom/`
6. ทดสอบ UAT matrix ด้านบนด้วยข้อมูล Staging และบัญชีทดสอบ
7. ตรวจ `/parts/?id=...` บน origin Staging เดียวกัน
8. รัน standard Rows read workload ซ้ำและเทียบ baseline
9. บันทึกผลพร้อม screenshot จอ 390 px/desktop, query metrics, query plans และ Worker version ที่ทดสอบ
10. ถ้าพบ defect หรือ Rows read ไม่ผ่านเป้า ให้ rollback Staging ไป version ที่บันทึกไว้ และ rollback migration ตามไฟล์ที่เตรียมไว้ก่อนแก้ source/deploy ใหม่

### Go/No-Go สำหรับ Production

Production deploy ทำได้เมื่อ:

- automated checks ผ่านทั้งหมด
- UAT mobile และ desktop ผ่าน
- ไม่มี Apps Script Part Edit URL ใน generated bundle
- ไม่มี horizontal overflow ที่ 360 px
- ผู้ใช้ยืนยันภาพ, Part Edit และ flow เพิ่ม/แก้ Label บน Staging
- standard BOM journey ลด Rows read อย่างน้อย 70% และไม่มี full scan ใน hot queries
- Rows written/index storage อยู่ในกรอบที่บันทึกและยอมรับได้
- metrics หลัง UAT/24 ชั่วโมงไม่แสดง query ใหม่ที่ใช้ rows read ผิดปกติ

หลังผ่านจึงใช้ `npm run deploy:production`; การ deploy Production ไม่รวมอยู่ในแผนรอบทดสอบนี้

## 11. Definition of Done

- [ ] กดภาพหรือ placeholder แล้วเปิดรายละเอียด Part ที่ถูกตัว
- [ ] รายละเอียดภาพมี loading, no image, error, retry และ original link states
- [ ] `Part Edit` เป็นลิงก์ `/parts/?id=<PartID>` และเปิดแท็บใหม่
- [ ] ไม่มี hard-coded Apps Script Part List URL เหลือใน source/bundle
- [ ] Mobile list เป็น card presentation ใหม่และใช้งานที่ 360 px ได้โดยไม่มี horizontal scroll
- [ ] Mobile add/edit เป็น full-screen 4-step flow และมี scroll owner เดียว
- [ ] selection bar และ sticky actions ไม่บังข้อมูลหรือ keyboard
- [ ] desktop behavior ไม่ถดถอย
- [ ] มี baseline ราย database/ราย query ไม่ใช้ยอดรวม 5 databases เป็น baseline ของ BOM
- [ ] full catalog reads ถูกนำออกจาก hot path
- [ ] hot queries ผ่าน EXPLAIN QUERY PLAN และใช้ index ที่ตั้งใจ
- [ ] standard BOM journey ลด Rows read อย่างน้อย 70%
- [ ] Part detail จากภาพไม่เพิ่ม D1 query เมื่อข้อมูลอยู่ใน payload แล้ว
- [ ] บันทึกผล rows read/write/latency ก่อนและหลังไว้กับ UAT evidence
- [ ] ตั้ง Rows read notifications ที่ 50%, 75% และ 90%
- [ ] DESIGN.md และ UX-CONTRACT.md ตรงกับ runtime
- [ ] tests/check/build ผ่านทั้งสองโปรเจกต์
- [ ] deploy เฉพาะ Staging และบันทึก UAT evidence/rollback version
- [ ] Production รอการยืนยันหลังทดสอบ Staging
