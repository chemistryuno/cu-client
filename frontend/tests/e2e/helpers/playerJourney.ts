import { expect, type Page } from '@playwright/test'

export const LOCAL_STORAGE_KEYS = {
  tutorialDone: 'chemistry-uno-lobby-tutorial-completed',
  tutorialSkipped: 'chemistry-uno-lobby-tutorial-skipped',
  tutorialMode: 'chemistry-uno-tutorial-mode',
  offlineState: 'chemistry-uno-offline-state-v2',
} as const

const resolveRuntimeStateStorageKey = (keys: string[], targetKey: string) => {
  return keys.find((key) => key === targetKey || key.endsWith(`:${targetKey}`)) || targetKey
}

export const resetRuntimeState = async (page: Page) => {
  await page.goto('/#/login')
  await page.evaluate(({ keys }) => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    Object.values(keys).forEach((key) => {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    })
  }, { keys: LOCAL_STORAGE_KEYS })
  await page.reload()
}

export const seedLocalIdentity = async (page: Page, nickname = 'E2EPlayer', avatar = 'flask') => {
  await page.goto('/#/login')
  await page.getByTestId('login-nickname-input').fill(nickname)
  await page.getByTestId(`avatar-option-${avatar}`).click()
  await page.getByTestId('login-submit-button').click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByTestId('lobby-page')).toBeVisible()
}

const getTutorialOverlay = (page: Page) => page.locator('.tutorial-overlay')

export const dismissLobbyTutorialIfPresent = async (page: Page) => {
  const overlay = getTutorialOverlay(page)
  await page.waitForTimeout(1200)
  if (await overlay.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /skip tutorial/i }).click()
    await expect(overlay).toBeHidden()
  }
}

export const skipLobbyTutorial = async (page: Page) => {
  await page.evaluate(({ keys }) => {
    window.localStorage.setItem(keys.tutorialDone, 'true')
    window.localStorage.setItem(keys.tutorialSkipped, 'true')
  }, { keys: LOCAL_STORAGE_KEYS })
  await dismissLobbyTutorialIfPresent(page)
  await expect(page.getByTestId('lobby-page')).toBeVisible()
}

export const completeLobbyTutorial = async (page: Page) => {
  const overlay = getTutorialOverlay(page)
  await expect(overlay).toBeVisible()
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: /next/i }).click()
  }
  await page.getByRole('button', { name: /get started/i }).click()
  await page.waitForTimeout(500)
  if (!/#\/room\//.test(page.url())) {
    await page.getByTestId('lobby-tutorial-button').click()
  }
}

export const seedReplayHistory = async (page: Page, nickname = 'ReplayUser') => {
  await page.evaluate(({ stateKey, replayKey, userName }) => {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter(Boolean) as string[]
    const resolvedStateKey = keys.find((key) => key === stateKey || key.endsWith(`:${stateKey}`)) || stateKey
    const raw = window.localStorage.getItem(resolvedStateKey)
    if (!raw) return
    const state = JSON.parse(raw)
    const now = new Date().toISOString()
    const replayHistory = {
      id: 999,
      room_id: 'replay-room-999',
      winner_uid: 1,
      winner_name: userName,
      is_invalid: false,
      invalid_reason: '',
      has_replay: true,
      replay_events: [],
      replay_permanent: true,
      replay_expires_at: null,
      replay_cleared_at: null,
      cheat_detected: false,
      cheat_uids: [],
      players: [1, -1],
      original_player_count: 2,
      quitted_count: 0,
      finished_players: [1, -1],
      started_at: now,
      finished_at: now,
      created_at: now,
      player_profiles: [
        { uid: 1, username: 'local-player', nickname: userName, avatar: 'flask', is_ai: false },
        { uid: -1, username: 'ai-player', nickname: 'Offline AI', avatar: 'flask', is_ai: true },
      ],
      replay: {
        events: [],
      },
    }
    state.histories = [replayHistory, ...(state.histories || []).filter((item: any) => item.id !== replayHistory.id)]
    window.localStorage.setItem(resolvedStateKey, JSON.stringify(state))
    window.localStorage.removeItem(replayKey)
  }, { stateKey: LOCAL_STORAGE_KEYS.offlineState, replayKey: LOCAL_STORAGE_KEYS.tutorialMode, userName: nickname })
}

export const setCurrentUserRole = async (page: Page, role: 'user' | 'co_worker' | 'admin') => {
  return page.evaluate(({ stateKey, targetRole }) => {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter(Boolean) as string[]
    const resolvedStateKey = keys.find((key) => key === stateKey || key.endsWith(`:${stateKey}`)) || stateKey
    const rawState = window.localStorage.getItem(resolvedStateKey)
    if (!rawState) return false

    const state = JSON.parse(rawState)
    const sessionUid = state.session_uid
    if (!sessionUid || !Array.isArray(state.users)) return false

    const currentUser = state.users.find((user: any) => Number(user.uid) === Number(sessionUid))
    if (!currentUser) return false

    currentUser.role = targetRole
    currentUser.is_admin = targetRole === 'admin'
    window.localStorage.setItem(resolvedStateKey, JSON.stringify(state))

    const userStorageKeys = keys.filter((key) => key === 'user' || key.endsWith(':user'))
    userStorageKeys.forEach((key) => {
      const rawUser = window.localStorage.getItem(key)
      if (!rawUser) return
      try {
        const parsed = JSON.parse(rawUser)
        parsed.role = targetRole
        parsed.is_admin = targetRole === 'admin'
        window.localStorage.setItem(key, JSON.stringify(parsed))
      } catch {
        // ignore malformed legacy user payloads
      }
    })

    return true
  }, { stateKey: LOCAL_STORAGE_KEYS.offlineState, targetRole: role })
}

export const openAiArenaAndStart = async (page: Page, roomName = 'E2E Arena') => {
  await dismissLobbyTutorialIfPresent(page)
  await page.getByTestId('lobby-ai-arena-button').click()
  await page.getByTestId('ai-room-name-input').fill(roomName)
  await page.getByTestId('ai-room-start-button').click()
  await expect(page).toHaveURL(/#\/room\//)
}

export const waitForGameRoomReady = async (page: Page) => {
  await expect(page.getByTestId('game-players-toggle')).toBeVisible()
  await expect(page.getByTestId('game-substance-input')).toBeVisible()
}
