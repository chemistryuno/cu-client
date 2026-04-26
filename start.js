#!/usr/bin/env node

const { spawn, execFileSync } = require('child_process')
const net = require('net')
const path = require('path')

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

const devPort = Number(process.env.PORT || process.env.VITE_PORT || 5000)
const devURL = `http://localhost:${devPort}`
const frontendDir = path.join(__dirname, 'frontend')
const viteCli = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js')
const devCommand = {
  command: process.execPath,
  args: [viteCli, '--port', String(devPort), '--strictPort'],
  cwd: frontendDir,
}

function isHostPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, host)
  })
}

async function isPortAvailable(port) {
  const checks = await Promise.all([
    isHostPortAvailable(port, '127.0.0.1'),
    isHostPortAvailable(port, '::1'),
    isHostPortAvailable(port, '::'),
  ])
  return checks.every(Boolean)
}

function stopProcessTree(pid) {
  if (!pid) return
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
      return
    } catch {}
  }
  try {
    process.kill(pid)
  } catch {}
}

async function main() {
  console.clear()
  console.log(`${colors.cyan}${colors.bright}==================================================${colors.reset}`)
  console.log(`${colors.cyan}${colors.bright}   Chemistry UNO - Frontend Runtime Shell         ${colors.reset}`)
  console.log(`${colors.cyan}${colors.bright}==================================================${colors.reset}\n`)

  const portAvailable = await isPortAvailable(devPort)
  if (!portAvailable) {
    log('SYSTEM', `Dev server already appears to be running at ${devURL}`, colors.green)
    log('SYSTEM', 'Not starting another Vite process.', colors.yellow)
    return
  }

  log('SYSTEM', `Starting frontend-only runtime at ${devURL}...`, colors.yellow)

  const frontendProcess = spawn(devCommand.command, devCommand.args, {
    cwd: devCommand.cwd,
    shell: false,
    env: { ...process.env, FORCE_COLOR: 'true' },
  })

  frontendProcess.stdout.on('data', createModuleLogger('FRONTEND', colors.green))
  frontendProcess.stderr.on('data', createModuleLogger('FRONTEND', colors.red))

  frontendProcess.on('error', (error) => {
    log('SYSTEM', error?.message || String(error), colors.red)
    process.exit(1)
  })

  frontendProcess.on('exit', (code) => {
    if (code !== 0) log('FRONTEND', `Service stopped with code ${code}`, colors.red)
    process.exit(code || 0)
  })

  process.on('SIGINT', () => {
    console.log('\n')
    log('SYSTEM', 'Shutting down frontend...', colors.magenta)
    stopProcessTree(frontendProcess.pid)
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    stopProcessTree(frontendProcess.pid)
    process.exit(0)
  })
}

console.clear()
main().catch((error) => {
  log('SYSTEM', error?.message || String(error), colors.red)
  process.exit(1)
})
