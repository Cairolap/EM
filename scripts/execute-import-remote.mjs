import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sqlText = readFileSync('data/import_electrical.sql', 'utf8');
const statements = sqlText
  .split('\n')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`Total statements to execute: ${statements.length}`);

// Chunk statements (e.g. 100 statements per chunk)
const CHUNK_SIZE = 90;
const chunks = [];
for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
  chunks.push(statements.slice(i, i + CHUNK_SIZE));
}

console.log(`Split into ${chunks.length} chunks.`);

for (let i = 0; i < chunks.length; i++) {
  const chunkFile = `data/el_chunk_${i + 1}.sql`;
  writeFileSync(chunkFile, chunks[i].join('\n'), 'utf8');
  console.log(`\nExecuting chunk ${i + 1}/${chunks.length} (${chunks[i].length} statements)...`);

  const res = spawnSync('npx', [
    'wrangler', 'd1', 'execute', 'DB',
    '--env', 'production',
    '--remote',
    `--file=${chunkFile}`,
    '-y'
  ], {
    shell: true,
    encoding: 'utf8'
  });

  if (res.status !== 0) {
    console.error(`Error in chunk ${i + 1}:`, res.stderr || res.stdout);
    process.exit(1);
  }
  console.log(`Chunk ${i + 1} succeeded!`);
}

console.log('\nAll chunks executed successfully on remote D1 production database!');
