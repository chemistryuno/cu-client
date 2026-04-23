import { test, expect } from '@playwright/test'
import {
  callOfflineApi,
  getExpectedRuntimeStateKey,
  openAiArenaAndStart,
  resetRuntimeState,
  seedLocalIdentity,
  seedReplayHistory,
  setCurrentUserRole,
  simulateRuntimeHost,
  skipLobbyTutorial,
  waitForGameRoomReady,
  type RuntimeHostMode,
} from './helpers/playerJourney'

const runtimeHosts: RuntimeHostMode[] = ['browser', 'electron', 'capacitor']

for (const host of runtimeHosts) {
  test(`${host} validates startup persistence room replay and admin flows`, async ({ page }) => {
    await simulateRuntimeHost(page, host)
    await resetRuntimeState(page)

    const nickname = `Host_${host}`
    await seedLocalIdentity(page, nickname, 'flask')

    const authConfig = await callOfflineApi(page, '/auth/config')
    expect(authConfig.status).toBe(200)
    expect(authConfig.data?.host).toBe(host)

    const expectedStateKey = getExpectedRuntimeStateKey(host)
    const persistedState = await page.evaluate((stateKey) => window.localStorage.getItem(stateKey), expectedStateKey)
    expect(persistedState).toBeTruthy()

    await page.reload()
    await expect(page.getByTestId('lobby-page')).toBeVisible()
    await expect(page.getByTestId('lobby-user-chip')).toContainText(nickname)

    await skipLobbyTutorial(page)
    await openAiArenaAndStart(page, `${host}_arena`)
    await waitForGameRoomReady(page)
    await page.getByTestId('game-draw-button').click()

    await seedReplayHistory(page, nickname)
    await page.goto('/#/profile/history')
    await expect(page.getByTestId('profile-page')).toBeVisible()
    await page.getByTestId('history-replay-999').click()
    await expect(page).toHaveURL(/#\/replay\/999/)

    const roleSet = await setCurrentUserRole(page, 'admin')
    expect(roleSet).toBeTruthy()

    const capabilities = await callOfflineApi(page, '/admin/capabilities')
    expect(capabilities.status).toBe(200)
    expect(capabilities.data?.is_admin).toBeTruthy()
    expect(capabilities.data?.can_moderate).toBeTruthy()

    const trustBoundary = await callOfflineApi(page, '/admin/trust-boundary')
    expect(trustBoundary.status).toBe(200)
    expect(trustBoundary.data?.host).toBe(host)

    const announcementTitle = `Host ${host} notice`
    const createAnnouncement = await callOfflineApi(page, '/admin/announcements', 'POST', {
      title: announcementTitle,
      content: `host validation on ${host}`,
      type: 'info',
    })
    expect(createAnnouncement.status).toBe(200)

    const listAnnouncements = await callOfflineApi(page, '/admin/announcements')
    expect(listAnnouncements.status).toBe(200)
    expect((listAnnouncements.data || []).some((entry: { title?: string }) => entry.title === announcementTitle)).toBeTruthy()

    const updateConfigs = await callOfflineApi(page, '/admin/configs', 'PUT', {
      level_cap: 77,
      level_step_exp: 120,
    })
    expect(updateConfigs.status).toBe(200)
    expect(updateConfigs.data?.level_cap).toBe(77)
    expect(updateConfigs.data?.level_step_exp).toBe(120)
  })
}
