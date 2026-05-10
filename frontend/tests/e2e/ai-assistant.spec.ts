import { test, expect } from '@playwright/test'
import {
  resetRuntimeState,
  seedLocalIdentity,
  skipLobbyTutorial,
} from './helpers/playerJourney'

const AI_CONFIG_STORAGE_KEY = 'chemistry-uno-ai-assistant-config-v1'

test.beforeEach(async ({ page }) => {
  await resetRuntimeState(page)
})

test('saves and restores AI assistant settings locally', async ({ page }) => {
  await seedLocalIdentity(page, 'AISettingsUser', 'flask')
  await page.goto('/#/profile/settings')
  await expect(page.getByTestId('profile-page')).toBeVisible()

  await page.getByTestId('ai-base-url-input').fill('https://mock-ai.local/v1/')
  await page.getByTestId('ai-api-key-input').fill('test-api-key')
  await page.getByTestId('ai-model-input').fill('chemistry-helper')
  await page.getByTestId('ai-config-save-button').click()

  const stored = await page.evaluate((storageKey) => {
    return JSON.parse(window.localStorage.getItem(storageKey) || '{}')
  }, AI_CONFIG_STORAGE_KEY)

  expect(stored).toEqual({
    baseUrl: 'https://mock-ai.local/v1',
    apiKey: 'test-api-key',
    model: 'chemistry-helper',
  })

  await page.reload()
  await expect(page.getByTestId('ai-base-url-input')).toHaveValue('https://mock-ai.local/v1')
  await expect(page.getByTestId('ai-api-key-input')).toHaveValue('test-api-key')
  await expect(page.getByTestId('ai-model-input')).toHaveValue('chemistry-helper')
})

test('sends assistant prompt through the configured OpenAI-compatible endpoint', async ({ page }) => {
  let chatPayload: any = null
  let authHeader = ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  await page.route('https://mock-ai.local/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    authHeader = request.headers().authorization || ''
    chatPayload = JSON.parse(request.postData() || '{}')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Lobby context received. Tune your deck before starting the next reaction.',
            },
          },
        ],
      }),
    })
  })

  await seedLocalIdentity(page, 'AIAssistantUser', 'flask')
  await skipLobbyTutorial(page)
  await page.evaluate((storageKey) => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      baseUrl: 'https://mock-ai.local',
      apiKey: 'test-api-key',
      model: 'chemistry-helper',
    }))
  }, AI_CONFIG_STORAGE_KEY)

  await page.getByTestId('lobby-ai-assistant-launcher').click()
  await expect(page.getByTestId('ai-assistant-input')).toBeVisible()
  await page.getByTestId('ai-assistant-input').fill('How can I prepare from this lobby?')
  await page.getByTestId('ai-assistant-send-button').click()

  await expect(page.getByText('Lobby context received.')).toBeVisible()
  expect(authHeader).toBe('Bearer test-api-key')
  expect(chatPayload?.model).toBe('chemistry-helper')
  expect(chatPayload?.messages?.[0]?.role).toBe('system')
  expect(chatPayload?.messages?.[0]?.content).toContain('Surface: lobby')
  expect(chatPayload?.messages?.at(-1)).toMatchObject({
    role: 'user',
    content: 'How can I prepare from this lobby?',
  })
})
