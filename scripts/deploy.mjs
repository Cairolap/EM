import {spawnSync} from 'node:child_process';

const env = process.argv[2] || 'staging';
if (!['staging', 'production'].includes(env)) {
  console.error('Invalid environment. Usage: node scripts/deploy.mjs [staging|production]');
  process.exit(1);
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {stdio: 'inherit', shell: true});
  if (result.status !== 0) {
    console.error(`Step failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}

console.log(`=== Pre-deployment checks for ${env} ===`);
run('node', ['scripts/build.mjs', env]);
run('node', ['scripts/check.mjs']);
run('npm', ['test']);

console.log(`=== Deploying to Cloudflare Workers (${env}) ===`);
run('wrangler', ['deploy', '--env', env]);
console.log(`Deployment to ${env} completed successfully.`);
