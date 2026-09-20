import {readFile, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const sqlFile = process.argv[2] || 'migrations/import_253c2f9b.sql';
const env = process.argv[3] || 'staging';
const applyRemote = process.argv.includes('--remote');

console.log(`Reading ${sqlFile}...`);
const raw = await readFile(sqlFile, 'utf8');
const lines = raw.split('\n');

const statements = [];
let current = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('--')) continue;
  current += line + '\n';
  if (trimmed.endsWith(';')) {
    statements.push(current.trim());
    current = '';
  }
}
if (current.trim()) statements.push(current.trim());

console.log(`Found ${statements.length} SQL statements.`);

// Chunk into ~400 statements per batch
const CHUNK_SIZE = 400;
const chunks = [];
for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
  chunks.push(statements.slice(i, i + CHUNK_SIZE));
}

console.log(`Split into ${chunks.length} batches (max ${CHUNK_SIZE} statements per batch).`);

for (let i = 0; i < chunks.length; i++) {
  const chunkSql = [
    'PRAGMA foreign_keys = OFF;',
    ...chunks[i],
    'PRAGMA foreign_keys = ON;'
  ].join('\n\n');

  const chunkPath = `migrations/chunk_${i + 1}.sql`;
  await writeFile(chunkPath, chunkSql, 'utf8');
  console.log(`Wrote ${chunkPath} (${chunks[i].length} statements)`);

  if (applyRemote) {
    console.log(`\nExecuting batch ${i + 1}/${chunks.length} on Cloudflare D1 (${env})...`);
    const args = ['d1', 'execute', 'DB', `--env=${env}`, '--remote', `--file=${chunkPath}`];
    const res = spawnSync('npx wrangler', args, {stdio: 'inherit', shell: true});
    if (res.status !== 0) {
      console.error(`❌ Batch ${i + 1} failed!`);
      process.exit(res.status || 1);
    }
    console.log(`✅ Batch ${i + 1} completed.`);
  }
}

console.log(`\n🎉 All ${chunks.length} batches processed successfully.`);
