import { test, expect } from '@playwright/test'
import {
  callOfflineApi,
  completeLobbyTutorial,
  getCurrentRoomId,
  openAiArenaAndStart,
  resetRuntimeState,
  seedLocalIdentity,
  seedReplayHistory,
  skipLobbyTutorial,
  waitForOfflineRoomState,
  waitForGameRoomReady,
} from './helpers/playerJourney'

test.beforeEach(async ({ page }) => {
  await resetRuntimeState(page)
})

test('creates a local identity through the real login UI', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyLogin', 'flask')
  await expect(page.getByTestId('lobby-user-chip')).toContainText('JourneyLogin')
})

test('auto-generates a nickname when entering without one', async ({ page }) => {
  await page.goto('/#/login')
  await page.getByTestId('login-submit-button').click()

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByTestId('lobby-page')).toBeVisible()

  const user = await page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}'))
  expect(String(user.nickname || '')).toMatch(/^[a-zA-Z0-9_\u4e00-\u9fa5]{1,20}$/)
  await expect(page.getByTestId('lobby-user-chip')).toContainText(user.nickname)
})

test('repairs legacy local users that are missing nicknames on main entry', async ({ page }) => {
  await seedLocalIdentity(page, 'LegacySeed', 'flask')
  await page.evaluate(() => {
    const rawState = window.localStorage.getItem('chemistry-uno-offline-state-v2')
    if (!rawState) throw new Error('Missing offline state')

    const state = JSON.parse(rawState)
    state.users = (state.users || []).map((user: any) => user.uid === state.session_uid ? { ...user, nickname: '' } : user)
    window.localStorage.setItem('chemistry-uno-offline-state-v2', JSON.stringify(state))

    const rawUser = window.localStorage.getItem('user')
    if (!rawUser) throw new Error('Missing stored user')
    window.localStorage.setItem('user', JSON.stringify({ ...JSON.parse(rawUser), nickname: '' }))
  })

  await page.reload()
  await expect(page.getByTestId('lobby-page')).toBeVisible()

  const user = await page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}'))
  expect(String(user.nickname || '')).toMatch(/^[a-zA-Z0-9_\u4e00-\u9fa5]{1,20}$/)
  await expect(page.getByTestId('lobby-user-chip')).toContainText(user.nickname)
})

test('completes the tutorial flow and enters the tutorial-backed room', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyTutorial', 'flask')
  await completeLobbyTutorial(page)
  await expect(page).toHaveURL(/#\/room\//)
  await expect(page.getByText(/Step\s*1\/(7|8)/)).toBeVisible()
  await expect(page.getByTestId('game-players-toggle')).toBeVisible()
})

test('tutorial room AI follows the scripted HCl, Br2, and draw sequence', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyScriptedAI', 'flask')
  await completeLobbyTutorial(page)
  await waitForGameRoomReady(page)

  const roomId = await getCurrentRoomId(page)
  expect(roomId).toBeTruthy()

  const roomStateStep1 = await callOfflineApi(page, `/rooms/${roomId}`, 'GET')
  expect(roomStateStep1.status).toBe(200)
  expect(roomStateStep1.data.game_state.tutorial_script_mode).toBe(true)
  expect(roomStateStep1.data.game_state.tutorial_current_step).toBe(1)

  await callOfflineApi(page, `/rooms/${roomId}/play`, 'POST', { substance: 'Mg' })
  const roomStateStep3 = await waitForOfflineRoomState(page, roomId!, (data: any) => {
    return data.game_state?.tutorial_current_step === 3 && data.game_state?.last_card?.substance === 'HCl'
  })
  expect(roomStateStep3.game_state.current_reaction).toContain('HCl')

  await callOfflineApi(page, `/rooms/${roomId}/play`, 'POST', { substance: 'NaOH' })
  const roomStateStep5 = await waitForOfflineRoomState(page, roomId!, (data: any) => {
    return data.game_state?.tutorial_current_step === 5 && data.game_state?.last_card?.substance === 'Br2'
  })
  expect(roomStateStep5.game_state.current_reaction).toContain('Br2')

  const aiHandBeforeDraw = roomStateStep5.game_state.players[1].card_count
  await callOfflineApi(page, `/rooms/${roomId}/play`, 'POST', { substance: 'Ar' })
  const roomStateStep7 = await waitForOfflineRoomState(page, roomId!, (data: any) => {
    return data.game_state?.tutorial_current_step === 7 && data.game_state?.last_card?.substance === 'Ar'
  })
  expect(roomStateStep7.game_state.players[1].card_count).toBeGreaterThan(aiHandBeforeDraw)
})

test('starts a real playable match from the lobby and exposes core controls', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyArena', 'flask')
  await skipLobbyTutorial(page)
  await openAiArenaAndStart(page, 'Journey Arena')
  await waitForGameRoomReady(page)
  await expect(page.getByTestId('game-substance-input')).toBeVisible()
  await expect(page.getByTestId('game-draw-button')).toBeVisible()
  await expect(page.getByTestId('game-hints-toggle')).toBeVisible()
  await page.getByTestId('game-hints-toggle').click()
  await page.getByTestId('game-draw-button').click()
})

test('normal offline PvE still uses non-tutorial AI flow', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyGenericAI', 'flask')
  await skipLobbyTutorial(page)
  await openAiArenaAndStart(page, 'Generic AI Arena')
  await waitForGameRoomReady(page)

  const roomId = await getCurrentRoomId(page)
  expect(roomId).toBeTruthy()

  const beforeDraw = await callOfflineApi(page, `/rooms/${roomId}`, 'GET')
  expect(beforeDraw.status).toBe(200)
  expect(beforeDraw.data.game_state.tutorial_script_mode).toBe(false)
  expect(beforeDraw.data.game_state.tutorial_current_step).toBe(0)

  await callOfflineApi(page, `/rooms/${roomId}/draw`, 'POST')
  const afterAiTurn = await waitForOfflineRoomState(page, roomId!, (data: any) => {
    return data.game_state?.tutorial_script_mode === false && data.game_state?.tutorial_current_step === 0 && data.game_state?.current_player === 0
  })

  expect(afterAiTurn.game_state.tutorial_script_mode).toBe(false)
  expect(afterAiTurn.game_state.tutorial_current_step).toBe(0)
})

test('covers related profile, replay, reactions, and substances flows', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyRegression', 'flask')
  await skipLobbyTutorial(page)
  await openAiArenaAndStart(page, 'Regression Arena')
  await waitForGameRoomReady(page)
  await page.getByTestId('game-draw-button').click()
  await seedReplayHistory(page, 'JourneyRegression')
  await page.goto('/#/profile/history')
  await expect(page.getByTestId('profile-page')).toBeVisible()
  await expect(page.getByTestId('match-history-panel')).toBeVisible()
  await page.getByTestId('history-replay-999').click()
  await expect(page).toHaveURL(/#\/replay\/999/)
  await expect(page.getByRole('heading', { name: /对局回放/i })).toBeVisible()
  await page.goto('/#/data')
  await expect(page.getByTestId('data-config-page')).toBeVisible()
  await page.getByTestId('data-nav-reactions').click()
  await expect(page.getByTestId('reactions-page')).toBeVisible()
  await page.goto('/#/data')
  await page.getByTestId('data-nav-substances').click()
  await expect(page.getByTestId('substances-page')).toBeVisible()
})
