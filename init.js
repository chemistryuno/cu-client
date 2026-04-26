#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = __dirname
const envPath = path.join(rootDir, '.env')
const envExamplePath = path.join(rootDir, '.env.example')
const frontendDir = path.join(rootDir, 'frontend')

console.log('Initializing Chemistry UNO frontend project...\n')

console.log('Step 1: Setting up .env file')
if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath)
    console.log('Created .env from .env.example')
  } else {
    console.log('.env.example not found, skipping')
  }
} else {
  console.log('.env already exists, skipping')
}

console.log('\nStep 2: Installing frontend dependencies')
if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
  try {
    execSync('pnpm -C frontend install', { stdio: 'inherit', cwd: rootDir })
    console.log('Frontend dependencies installed')
  } catch (err) {
    console.error('Failed to install frontend dependencies:', err.message)
    process.exit(1)
  }
} else {
  console.log('Frontend node_modules already exists, skipping')
}

console.log('\nInitialization complete.')
console.log('Run `pnpm start` to launch the frontend-only game.')
