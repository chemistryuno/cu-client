#!/usr/bin/env node

const { spawn } = require('child_process')

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
}

function log(module, message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const prefix = `${colors.dim}[${timestamp}]${colors.reset} ${color}${colors.bright}[${module}]${colors.reset}`
  console.log(`${prefix} ${message}`)
}

function createModuleLogger(moduleName, color) {
  return (data) => {
    data.toString().split('\n').forEach((line) => {
      if (line.trim()) log(moduleName, line, color)
    })
  }
}

console.clear()
console.log(`${colors.cyan}${colors.bright}==================================================${colors.reset}`)
console.log(`${colors.cyan}${colors.bright}   Chemistry UNO - Frontend Runtime Shell         ${colors.reset}`)
console.log(`${colors.cyan}${colors.bright}==================================================${colors.reset}\n`)

log('SYSTEM', 'Starting frontend-only runtime...', colors.yellow)

const frontendProcess = spawn('pnpm', ['-C', 'frontend', 'dev'], {
  cwd: __dirname,
  shell: true,
  env: { ...process.env, FORCE_COLOR: 'true' },
})

frontendProcess.stdout.on('data', createModuleLogger('FRONTEND', colors.green))
frontendProcess.stderr.on('data', createModuleLogger('FRONTEND', colors.red))

frontendProcess.on('exit', (code) => {
  if (code !== 0) log('FRONTEND', `Service stopped with code ${code}`, colors.red)
  process.exit(code || 0)
})

process.on('SIGINT', () => {
  console.log('\n')
  log('SYSTEM', 'Shutting down frontend...', colors.magenta)
  frontendProcess.kill()
  process.exit(0)
})
