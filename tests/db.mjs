import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function database() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_registry.sql', '0002_equipment_bom.sql', '0003_auth_users.sql', '0004_user_permissions.sql', '0005_bom_read_indexes.sql', '0006_machine_display_order.sql', '0007_machine_types.sql']) {
    db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  }
  const wrap = (sql, args=[]) => ({
    bind: (...values) => wrap(sql, values),
    async first(column) { const row=db.prepare(sql).get(...args); return row ? (column ? row[column] : {...row}) : null; },
    async all() { return {results:db.prepare(sql).all(...args).map(r=>({...r}))}; },
    async run() { const r=db.prepare(sql).run(...args); return {success:true,meta:{changes:Number(r.changes)}}; }
  });
  return {prepare:sql=>wrap(sql), async batch(statements) {db.exec('BEGIN');try {const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}, raw:db};
}
export function seed(db) {
  db.raw.exec("INSERT INTO departments VALUES('D01','ฝ่ายผลิต',1); INSERT INTO lines VALUES('L01','D01','ไลน์ 1',1,''); INSERT INTO brands VALUES('B01','ABB','abb',1,1)");
}
