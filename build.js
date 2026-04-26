#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const rootDir = __dirname
const frontendDist = path.join(rootDir, 'frontend', 'dist')

console.log('Building Chemistry UNO frontend...\n')

try {
  execSync('pnpm build:frontend', { stdio: 'inherit', cwd: rootDir })

  console.log('\nVerifying build output...')
  if (!fs.existsSync(frontendDist)) {
    console.error(`Frontend dist not found at: ${frontendDist}`)
    process.exit(1)
  }

  console.log(`Frontend dist: ${frontendDist}`)
  console.log('\nBuild successful. Run `pnpm start` for local development or `pnpm -C frontend preview` to preview the production build.')
} catch (err) {
  console.error('Build failed:', err.message)
  process.exit(1)
}
