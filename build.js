#!/usr/bin/env node

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const rootDir = __dirname
const frontendDir = path.join(rootDir, 'frontend')
const rendererDist = path.join(frontendDir, 'dist')
const buildRoot = path.join(rootDir, 'build')

const args = new Set(process.argv.slice(2))
const mode = args.has('--dev') || args.has('dev') ? 'dev' : 'release'
const isCleanOnly = args.has('--clean') || args.has('clean')
const targetDir = path.join(buildRoot, mode)

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const legacyBuildPaths = [
  buildRoot,
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'release'),
  rendererDist,
  path.join(frontendDir, 'release'),
  path.join(frontendDir, 'build'),
  path.join(frontendDir, 'out'),
]

function assertProjectPath(targetPath) {
  const resolvedRoot = path.resolve(rootDir)
  const resolvedTarget = path.resolve(targetPath)
  if (resolvedTarget === resolvedRoot || !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to remove path outside project: ${resolvedTarget}`)
  }
  return resolvedTarget
}

function removeIfExists(targetPath) {
  const resolvedTarget = assertProjectPath(targetPath)
  if (!fs.existsSync(resolvedTarget)) return
  fs.rmSync(resolvedTarget, { recursive: true, force: true })
}

function run(command, commandArgs, options = {}) {
  execFileSync(command, commandArgs, {
    cwd: options.cwd || rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      FORCE_COLOR: 'true',
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      ...(options.env || {}),
    },
  })
}

function cleanBuildArtifacts() {
  legacyBuildPaths.forEach(removeIfExists)
}

function verifyOutput() {
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Expected Electron output was not created: ${targetDir}`)
  }

  const entries = fs.readdirSync(targetDir)
  if (entries.length === 0) {
    throw new Error(`Electron output is empty: ${targetDir}`)
  }
}

console.log('Cleaning build artifacts...\n')

try {
  cleanBuildArtifacts()

  if (isCleanOnly) {
    console.log('Build artifacts removed.')
    process.exit(0)
  }

  console.log(`Building Chemistry UNO Electron ${mode} output...\n`)

  run(pnpm, ['-C', 'frontend', 'build'])
  run(pnpm, ['-C', 'frontend', 'electron:ensure'])

  if (mode === 'dev') {
    run(pnpm, [
      '-C',
      'frontend',
      'exec',
      'electron-builder',
      '--win',
      '--dir',
      '--x64',
      '--config.directories.output=../build/dev',
    ])
  } else {
    run(pnpm, [
      '-C',
      'frontend',
      'exec',
      'electron-builder',
      '--win',
      'nsis',
      '--x64',
      '--config.directories.output=../build/release',
    ])
  }

  removeIfExists(rendererDist)
  verifyOutput()

  console.log(`\nElectron ${mode} output: ${targetDir}`)
} catch (err) {
  try {
    removeIfExists(rendererDist)
  } catch {}
  console.error('Build failed:', err.message)
  process.exit(1)
}
