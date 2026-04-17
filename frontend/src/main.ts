import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { OFFLINE_MODE } from './utils/runtimeConfig'
import { installOfflineFetchInterceptor } from './utils/offlineBackend'
import { ensureAuthReady } from './utils/authSession'
import './index.css'

const syncViewportHeight = () => {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`)
}

let viewportSyncRaf = 0

const scheduleViewportSync = () => {
  if (viewportSyncRaf) return

  viewportSyncRaf = window.requestAnimationFrame(() => {
    viewportSyncRaf = 0
    syncViewportHeight()
  })
}

const markBootSplashReady = () => {
  const splash = document.getElementById('boot-splash')

  window.requestAnimationFrame(() => {
    document.body.classList.add('app-ready')

    if (!splash) return

    window.setTimeout(() => {
      splash.remove()
    }, 360)
  })
}

const scheduleNonCriticalTask = (task: () => void, timeout = 1000) => {
  const requestIdleCallback = (window as Window & typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }).requestIdleCallback

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout })
    return
  }

  window.setTimeout(task, timeout)
}

async function bootstrap() {
  if (OFFLINE_MODE) {
    installOfflineFetchInterceptor()
  }
  scheduleViewportSync()
  window.addEventListener('resize', scheduleViewportSync, { passive: true })
  window.addEventListener('orientationchange', scheduleViewportSync, { passive: true })
  window.visualViewport?.addEventListener('resize', scheduleViewportSync)

  await ensureAuthReady()

  const app = createApp(App)
  app.use(router)
  app.mount('#app')
  markBootSplashReady()

  scheduleNonCriticalTask(() => {
    void import('./utils/plugin-runtime')
      .then(({ initializePluginRuntime }) => initializePluginRuntime())
      .catch((error) => {
        console.warn('[Plugin] deferred runtime init failed', error)
      })
  })
}

void bootstrap()
