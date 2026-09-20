PRAGMA foreign_keys = ON;
CREATE TABLE departments (id TEXT PRIMARY KEY, name TEXT NOT NULL, is_active INTEGER NOT NULL CHECK(is_active IN(0,1)));
CREATE TABLE lines (id TEXT PRIMARY KEY, department_id TEXT NOT NULL REFERENCES departments(id), name TEXT NOT NULL, is_active INTEGER NOT NULL CHECK(is_active IN(0,1)), remark TEXT NOT NULL DEFAULT '', UNIQUE(id, department_id));
CREATE TABLE brands (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE, is_active INTEGER NOT NULL CHECK(is_active IN(0,1)), version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE machines (
 id TEXT PRIMARY KEY, code TEXT NOT NULL, normalized_code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 department_id TEXT NOT NULL REFERENCES departments(id), line_id TEXT NOT NULL,
 manufacturer TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', serial_no TEXT NOT NULL DEFAULT '', machine_type TEXT NOT NULL DEFAULT '',
 install_date TEXT NOT NULL DEFAULT '', criticality TEXT NOT NULL, status TEXT NOT NULL, location_detail TEXT NOT NULL DEFAULT '',
 photo_file_id TEXT NOT NULL DEFAULT '', photo_file_name TEXT NOT NULL DEFAULT '', manual_url TEXT NOT NULL DEFAULT '', remark TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 is_active INTEGER NOT NULL CHECK(is_active IN(0,1)), version INTEGER NOT NULL CHECK(version>0), request_id TEXT NOT NULL,
 FOREIGN KEY(line_id, department_id) REFERENCES lines(id, department_id)
);
CREATE INDEX machines_location ON machines(department_id,line_id,is_active);
CREATE TABLE parts (
 id TEXT PRIMARY KEY, part_number TEXT NOT NULL, description TEXT NOT NULL, brand_id TEXT REFERENCES brands(id), legacy_brand_name TEXT NOT NULL DEFAULT '',
 price_minor INTEGER CHECK(price_minor IS NULL OR (price_minor>=0 AND price_minor<=99999999999900)),
 store_code TEXT NOT NULL DEFAULT '', lifespan_years REAL CHECK(lifespan_years IS NULL OR (lifespan_years>=0 AND lifespan_years<=999)), notes TEXT NOT NULL DEFAULT '',
 picture_source TEXT NOT NULL DEFAULT '', thumbnail_source TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>0), request_id TEXT NOT NULL
);
CREATE INDEX parts_number ON parts(part_number);
CREATE INDEX parts_brand ON parts(brand_id);
CREATE TABLE id_counters (kind TEXT PRIMARY KEY, value INTEGER NOT NULL CHECK(value>=0));
INSERT INTO id_counters VALUES('machines',0),('parts',0);
CREATE TABLE requests (
 key TEXT PRIMARY KEY, actor TEXT NOT NULL, operation TEXT NOT NULL, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('PENDING','DONE')), response_json TEXT, created_at TEXT NOT NULL
);
CREATE TABLE audit_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, request_key TEXT NOT NULL UNIQUE REFERENCES requests(key),
 actor TEXT NOT NULL, operation TEXT NOT NULL, entity_id TEXT NOT NULL, before_json TEXT, after_json TEXT, created_at TEXT NOT NULL
);
-- A failed compare-and-swap must abort the *whole* batch, including its audit.
CREATE TABLE mutation_guards (id TEXT PRIMARY KEY, changed INTEGER NOT NULL CHECK(changed=1));
CREATE TABLE image_operations (
 id TEXT PRIMARY KEY, request_key TEXT NOT NULL, slot TEXT NOT NULL, folder_id TEXT NOT NULL,
 file_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, mime TEXT NOT NULL, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('RESERVED','UPLOADED','ATTACHED','REVIEW')),
 created_at TEXT NOT NULL, UNIQUE(request_key,slot)
);
CREATE TABLE migration_runs (id TEXT PRIMARY KEY, snapshot_hash TEXT NOT NULL, imported_at TEXT NOT NULL, report_json TEXT NOT NULL);
CREATE TABLE user_roles (email TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN('viewer','editor','admin')));
