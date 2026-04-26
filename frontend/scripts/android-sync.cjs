const { spawnSync } = require('node:child_process')

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

console.log('[Android] Building frontend-only offline assets')

run('pnpm', ['build'])

run('pnpm', ['cap', 'sync', 'android'])
run('node', ['scripts/android-prepare-project.cjs'])

console.log('[Android] Web assets built and synced to android project.')
