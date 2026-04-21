import { test, expect } from '@playwright/test'
import {
  completeLobbyTutorial,
  openAiArenaAndStart,
  resetRuntimeState,
  seedLocalIdentity,
  seedReplayHistory,
  skipLobbyTutorial,
  waitForGameRoomReady,
} from './helpers/playerJourney'

test.beforeEach(async ({ page }) => {
  await resetRuntimeState(page)
})

test('creates a local identity through the real login UI', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyLogin', 'flask')
  await expect(page.getByTestId('lobby-user-chip')).toContainText('JourneyLogin')
})

test('completes the tutorial flow and enters the tutorial-backed room', async ({ page }) => {
  await seedLocalIdentity(page, 'JourneyTutorial', 'flask')
  await completeLobbyTutorial(page)
  await expect(page).toHaveURL(/#\/room\//)
  await expect(page.locator('text=Step 1/7')).toBeVisible()
  await expect(page.getByTestId('game-players-toggle')).toBeVisible()
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
