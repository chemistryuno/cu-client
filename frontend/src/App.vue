<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import websocket from './utils/websocket'
import feedback from './utils/feedback'
import { useDialog } from './utils/dialog'
import AnnouncementTicker from './components/AnnouncementTicker.vue'

const CustomDialog = defineAsyncComponent(() => import('./components/CustomDialog.vue'))

const loading = ref(true)
const { showAlert } = useDialog()
const router = useRouter()

let pluginRuntimePromise: Promise<typeof import('./utils/plugin-runtime')> | null = null
let themeMediaQuery: MediaQueryList | null = null
let sessionStartupScheduled = false

const getPluginRuntime = () => {
  if (!pluginRuntimePromise) {
    pluginRuntimePromise = import('./utils/plugin-runtime')
  }
  return pluginRuntimePromise
}

const scheduleNonCriticalTask = (task: () => void, timeout = 600) => {
  const requestIdleCallback = (window as Window & typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }).requestIdleCallback

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout })
    return
  }

  window.setTimeout(task, timeout)
}

const scheduleSessionStartup = () => {
  if (sessionStartupScheduled) return
  sessionStartupScheduled = true

  scheduleNonCriticalTask(() => {
    sessionStartupScheduled = false
    if (!localStorage.getItem('user')) return

    // websocket.connect() // Disabled in offline mode
    void getPluginRuntime()
      .then(({ loadPluginScripts }) => loadPluginScripts())
      .catch((error) => {
        console.warn('[Plugin] deferred runtime load failed', error)
      })
  }, 1200)
}

const handleSystemAnnouncement = (msg: any) => {
  const ann = msg.data
  if (ann && !ann.is_ticker) {
    showAlert(ann.content, ann.title || 'System Note')
  }
}

const handleAdminBroadcast = (msg: any) => {
  const d = msg.data
  if (!d) return
  const titleMap: Record<string, string> = {
    info:    d.title || '📢 管理员通知',
    warning: d.title || '⚠️ 管理员警告',
    success: d.title || '✅ 系统提示',
    error:   d.title || '🚨 紧急通知',
  }
  const title = titleMap[d.msg_type] || d.title || '管理员广播'
  showAlert(d.content, title)
}

const updateTheme = () => {
  const storedTheme = localStorage.getItem('theme') || 'system'
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  if (storedTheme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
  } else {
    root.classList.add(storedTheme)
  }
}

updateTheme()

const handleThemeStorage = (e: StorageEvent) => {
  if (e.key === 'theme') updateTheme()
}

const handleGlobalClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const clickable = target.closest('button, a, [role="button"], input[type="button"], input[type="submit"], select, summary, .clickable, .touch-feedback, .cursor-pointer')
  if (clickable) {
    if (!clickable.hasAttribute('data-no-click-sound')) {
      feedback.click()
    }
  }
}

const handlePluginMessage = (msg: any) => {
  void getPluginRuntime()
    .then(({ dispatchPluginMessage }) => dispatchPluginMessage(msg))
    .catch((error) => {
      console.warn('[Plugin] message dispatch failed', error)
    })
}

const handleAuthChanged = () => {
  const userData = localStorage.getItem('user')
  if (userData) {
    scheduleSessionStartup()
  }
}

onMounted(() => {
  try {
    themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    themeMediaQuery.addEventListener('change', updateTheme)
    window.addEventListener('storage', handleThemeStorage)
    window.addEventListener('theme-changed', updateTheme)
    window.addEventListener('auth-changed', handleAuthChanged)
    const userData = localStorage.getItem('user')

    if (userData) {
      scheduleSessionStartup()
    }

    websocket.on('system_announcement', handleSystemAnnouncement)
    websocket.on('admin_broadcast', handleAdminBroadcast)
    websocket.on('plugin_message', handlePluginMessage)

    window.addEventListener('click', handleGlobalClick, true)
  } catch (err) {
    console.error('App initialization failed:', err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  themeMediaQuery?.removeEventListener('change', updateTheme)
  websocket.off('system_announcement', handleSystemAnnouncement)
  websocket.off('admin_broadcast', handleAdminBroadcast)
  websocket.off('plugin_message', handlePluginMessage)
  
  window.removeEventListener('click', handleGlobalClick, true)
  window.removeEventListener('storage', handleThemeStorage)
  window.removeEventListener('theme-changed', updateTheme)
  window.removeEventListener('auth-changed', handleAuthChanged)
})
</script>

<template>
  <div v-if="loading" class="app-loader-shell">
    <div class="app-loader-shell__mesh" aria-hidden="true"></div>
    <div class="app-loader-card">
      <div class="app-loader-atom" aria-hidden="true">
        <span class="app-loader-ring app-loader-ring--a"></span>
        <span class="app-loader-ring app-loader-ring--b"></span>
        <span class="app-loader-ring app-loader-ring--c"></span>
        <span class="app-loader-core"></span>
      </div>
      <p class="app-loader-title">Chemistry UNO</p>
      <p class="app-loader-subtitle">Preparing reactive chamber</p>
      <div class="app-loader-progress" aria-hidden="true"></div>
    </div>
  </div>
  <template v-else>
    <div class="app-viewport transition-colors duration-300 min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-slate-200">
      <AnnouncementTicker />
      <router-view v-slot="{ Component, route }">
        <Transition name="app-route" mode="out-in">
          <div :key="route.fullPath" class="app-route-shell">
            <component :is="Component" />
          </div>
        </Transition>
      </router-view>
      <CustomDialog />
    </div>
  </template>
</template>

<style>
.app-route-shell {
  will-change: opacity, transform, filter;
  min-height: var(--app-height);
}

.app-route-enter-active,
.app-route-leave-active {
  transition: opacity 220ms ease;
}

.app-route-enter-from {
  opacity: 0;
}

.app-route-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-route-enter-active,
  .app-route-leave-active {
    transition-duration: 1ms;
  }

  .app-route-enter-from,
  .app-route-leave-to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>

<style scoped>
.app-loader-shell {
  position: relative;
  display: flex;
  min-height: var(--app-height);
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.2), transparent 38%),
    radial-gradient(circle at bottom, rgba(45, 212, 191, 0.16), transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #eef6ff 52%, #e7f4f1 100%);
  color: #0f172a;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.app-viewport {
  min-height: var(--app-height);
}

:global(.dark) .app-loader-shell {
  background:
    radial-gradient(circle at top, rgba(34, 211, 238, 0.16), transparent 38%),
    radial-gradient(circle at bottom, rgba(16, 185, 129, 0.14), transparent 34%),
    linear-gradient(180deg, #020617 0%, #0b1120 52%, #071a17 100%);
  color: #e2e8f0;
}

.app-loader-shell__mesh {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, black 28%, transparent 88%);
  opacity: 0.8;
}

.app-loader-card {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  gap: 18px;
  min-width: min(88vw, 320px);
  padding: 32px 28px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    0 24px 80px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(18px);
  overflow: hidden;
}

:global(.dark) .app-loader-card {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.5);
  box-shadow:
    0 24px 80px rgba(2, 6, 23, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.app-loader-card::before {
  content: "";
  position: absolute;
  inset: auto -20% -45% -20%;
  height: 58%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
  transform: translateX(-120%);
  animation: loader-sheen 2.4s ease-in-out infinite;
}

.app-loader-atom {
  position: relative;
  display: grid;
  width: 104px;
  height: 104px;
  place-items: center;
}

.app-loader-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 2px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 0 24px rgba(45, 212, 191, 0.24);
}

:global(.dark) .app-loader-ring {
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.18);
}

.app-loader-ring--a {
  transform: rotate(18deg);
  animation: loader-orbit-a 2.2s linear infinite;
}

.app-loader-ring--b {
  transform: rotate(76deg) scaleX(0.78);
  animation: loader-orbit-b 2.8s linear infinite;
}

.app-loader-ring--c {
  transform: rotate(-42deg) scaleY(0.74);
  animation: loader-orbit-c 3.4s linear infinite;
}

.app-loader-core {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, #ffffff 0%, #38bdf8 35%, #14b8a6 100%);
  box-shadow:
    0 0 0 10px rgba(20, 184, 166, 0.08),
    0 0 34px rgba(56, 189, 248, 0.45);
  animation: loader-core-pulse 1.8s ease-in-out infinite;
}

.app-loader-core::before,
.app-loader-core::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  background: #f8fafc;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.app-loader-core::before {
  top: -18px;
  left: 32px;
  width: 8px;
  height: 8px;
  animation: loader-electron-a 1.8s linear infinite;
}

.app-loader-core::after {
  right: 30px;
  bottom: -16px;
  width: 6px;
  height: 6px;
  animation: loader-electron-b 2.1s linear infinite;
}

.app-loader-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.app-loader-subtitle {
  margin: 0;
  font-family: Consolas, "SFMono-Regular", monospace;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  color: rgba(15, 23, 42, 0.68);
  text-transform: uppercase;
}

:global(.dark) .app-loader-subtitle {
  color: rgba(226, 232, 240, 0.72);
}

.app-loader-progress {
  position: relative;
  width: min(220px, 64vw);
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
}

.app-loader-progress::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0), rgba(56, 189, 248, 0.95), rgba(45, 212, 191, 0.92), rgba(56, 189, 248, 0));
  transform: translateX(-100%);
  animation: loader-progress 1.35s ease-in-out infinite;
}

@keyframes loader-orbit-a {
  to {
    transform: rotate(378deg);
  }
}

@keyframes loader-orbit-b {
  to {
    transform: rotate(-284deg) scaleX(0.78);
  }
}

@keyframes loader-orbit-c {
  to {
    transform: rotate(318deg) scaleY(0.74);
  }
}

@keyframes loader-core-pulse {
  0%, 100% {
    transform: scale(0.94);
  }

  50% {
    transform: scale(1.08);
  }
}

@keyframes loader-progress {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

@keyframes loader-electron-a {
  0% {
    transform: translate(0, 0) scale(0.9);
    opacity: 0.9;
  }

  50% {
    transform: translate(-4px, 2px) scale(1.15);
    opacity: 1;
  }

  100% {
    transform: translate(0, 0) scale(0.9);
    opacity: 0.9;
  }
}

@keyframes loader-electron-b {
  0% {
    transform: translate(0, 0) scale(0.85);
    opacity: 0.8;
  }

  50% {
    transform: translate(5px, -2px) scale(1.1);
    opacity: 1;
  }

  100% {
    transform: translate(0, 0) scale(0.85);
    opacity: 0.8;
  }
}

@keyframes loader-sheen {
  0%, 35% {
    transform: translateX(-120%);
  }

  65%, 100% {
    transform: translateX(120%);
  }
}
</style>
