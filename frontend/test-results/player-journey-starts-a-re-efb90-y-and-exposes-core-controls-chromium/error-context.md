# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: player-journey.spec.ts >> starts a real playable match from the lobby and exposes core controls
- Location: tests\e2e\player-journey.spec.ts:29:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /#\/room\//
Received string:  "http://127.0.0.1:5000/#/"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    13 × unexpected value "http://127.0.0.1:5000/#/"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - banner [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e10]:
            - img [ref=e11]
            - heading "CHEMISTRY UNO" [level=1] [ref=e13]
          - generic [ref=e14]:
            - generic [ref=e15] [cursor=pointer]:
              - img [ref=e17]
              - generic [ref=e19]:
                - generic [ref=e20]: JourneyArena
                - generic [ref=e21]: Local Profile
            - generic [ref=e22]:
              - button "数据库查看" [ref=e23]:
                - img [ref=e24]
              - button "Appearance" [ref=e28]:
                - img [ref=e29]
      - main [ref=e32]:
        - generic [ref=e34]:
          - generic [ref=e37]: Local Mode
          - heading "Local AI Battle Lobby" [level=2] [ref=e38]
          - paragraph [ref=e39]: This build focuses on Player vs AI. Your nickname, avatar, records, and settings are saved on this device.
        - generic [ref=e41]:
          - img [ref=e43]
          - generic [ref=e46]:
            - generic [ref=e47]:
              - generic [ref=e48]:
                - generic [ref=e49]:
                  - generic [ref=e50]: Local Mode
                  - generic [ref=e52]: Offline Edition
                - heading "AI Arena" [level=3] [ref=e53]
                - paragraph [ref=e54]: Local PvE Mode
              - img [ref=e56]
            - generic [ref=e59]:
              - generic [ref=e60]:
                - paragraph [ref=e61]: Current Player
                - generic [ref=e62]:
                  - img [ref=e64]
                  - generic [ref=e66]:
                    - paragraph [ref=e67]: JourneyArena
                    - paragraph [ref=e68]: Local Save
              - generic [ref=e69]:
                - paragraph [ref=e70]: Deck
                - button "Deck View the deck used for the current AI match" [ref=e71]:
                  - paragraph [ref=e72]: Deck
                  - paragraph [ref=e73]:
                    - img [ref=e74]
                    - text: View the deck used for the current AI match
            - generic [ref=e76]:
              - button "AI Arena" [ref=e77]:
                - img [ref=e78]
                - generic [ref=e80]: AI Arena
              - button "Tutorial Match" [ref=e81]:
                - generic [ref=e83]: Tutorial Match
      - contentinfo [ref=e85]:
        - generic [ref=e86]:
          - generic [ref=e88]: Chemistry UNO · Mendeleef Protocol vChemistry UNO Offline Local Build
          - generic [ref=e89]: © 2026 MENDELEEF PROTOCOL. LOCAL EDITION.
    - generic [ref=e92]:
      - generic [ref=e93]:
        - generic [ref=e94]:
          - img [ref=e96]
          - generic [ref=e99]:
            - heading "AI Arena" [level=2] [ref=e100]
            - paragraph [ref=e101]: Local PvE Mode
        - button [ref=e102]:
          - img [ref=e103]
      - generic [ref=e106]:
        - generic [ref=e107]:
          - generic [ref=e108]:
            - generic [ref=e109]: Match Name
            - textbox "Leave empty to generate automatically" [ref=e110]: Journey Arena
          - generic [ref=e111]:
            - generic [ref=e112]:
              - generic [ref=e113]:
                - generic [ref=e114]: AI Difficulty
                - heading "50%" [level=3] [ref=e115]
              - generic [ref=e116]: DIFFICULTY
            - slider [ref=e117] [cursor=pointer]: "50"
          - generic [ref=e118]:
            - generic [ref=e119]:
              - generic [ref=e120]: AI Count
              - generic [ref=e121]: OPPONENTS
            - generic [ref=e122]:
              - button "1 AI" [ref=e123]
              - button "2 AI" [ref=e124]
              - button "3 AI" [ref=e125]
              - button "7 AI" [ref=e126]
          - generic [ref=e128]:
            - generic [ref=e129]: Deck
            - generic [ref=e130]: DECK
          - generic [ref=e134] [cursor=pointer]:
            - generic [ref=e135]: Point Rewards
            - generic [ref=e136]: Difficulty >= 50% grants local point rewards
        - generic [ref=e137]:
          - button "Cancel" [ref=e138]
          - button "Start Match" [ref=e139]:
            - generic [ref=e140]: Start Match
  - generic [ref=e142]:
    - generic [ref=e143]:
      - img [ref=e145]
      - heading "System Error" [level=3] [ref=e147]
    - paragraph [ref=e149]: Not logged in
    - button "确定" [ref=e151]
```

# Test source

```ts
  11  |   await page.goto('/#/login')
  12  |   await page.evaluate(({ keys }) => {
  13  |     window.localStorage.clear()
  14  |     window.sessionStorage.clear()
  15  |     Object.values(keys).forEach((key) => {
  16  |       window.localStorage.removeItem(key)
  17  |       window.sessionStorage.removeItem(key)
  18  |     })
  19  |   }, { keys: LOCAL_STORAGE_KEYS })
  20  |   await page.reload()
  21  | }
  22  | 
  23  | export const seedLocalIdentity = async (page: Page, nickname = 'E2EPlayer', avatar = 'flask') => {
  24  |   await page.goto('/#/login')
  25  |   await page.getByTestId('login-nickname-input').fill(nickname)
  26  |   await page.getByTestId(`avatar-option-${avatar}`).click()
  27  |   await page.getByTestId('login-submit-button').click()
  28  |   await expect(page).toHaveURL(/#\/$/)
  29  |   await expect(page.getByTestId('lobby-page')).toBeVisible()
  30  | }
  31  | 
  32  | const getTutorialOverlay = (page: Page) => page.locator('.tutorial-overlay')
  33  | 
  34  | export const dismissLobbyTutorialIfPresent = async (page: Page) => {
  35  |   const overlay = getTutorialOverlay(page)
  36  |   await page.waitForTimeout(1200)
  37  |   if (await overlay.isVisible().catch(() => false)) {
  38  |     await page.getByRole('button', { name: /skip tutorial/i }).click()
  39  |     await expect(overlay).toBeHidden()
  40  |   }
  41  | }
  42  | 
  43  | export const skipLobbyTutorial = async (page: Page) => {
  44  |   await page.evaluate(({ keys }) => {
  45  |     window.localStorage.setItem(keys.tutorialDone, 'true')
  46  |     window.localStorage.setItem(keys.tutorialSkipped, 'true')
  47  |   }, { keys: LOCAL_STORAGE_KEYS })
  48  |   await dismissLobbyTutorialIfPresent(page)
  49  |   await expect(page.getByTestId('lobby-page')).toBeVisible()
  50  | }
  51  | 
  52  | export const completeLobbyTutorial = async (page: Page) => {
  53  |   const overlay = getTutorialOverlay(page)
  54  |   await expect(overlay).toBeVisible()
  55  |   for (let index = 0; index < 4; index += 1) {
  56  |     await page.getByRole('button', { name: /next/i }).click()
  57  |   }
  58  |   await page.getByRole('button', { name: /get started/i }).click()
  59  |   await page.waitForTimeout(500)
  60  |   if (!/#\/room\//.test(page.url())) {
  61  |     await page.getByTestId('lobby-tutorial-button').click()
  62  |   }
  63  | }
  64  | 
  65  | export const seedReplayHistory = async (page: Page, nickname = 'ReplayUser') => {
  66  |   await page.evaluate(({ stateKey, replayKey, userName }) => {
  67  |     const raw = window.localStorage.getItem(stateKey)
  68  |     if (!raw) return
  69  |     const state = JSON.parse(raw)
  70  |     const now = new Date().toISOString()
  71  |     const replayHistory = {
  72  |       id: 999,
  73  |       room_id: 'replay-room-999',
  74  |       winner_uid: 1,
  75  |       winner_name: userName,
  76  |       is_invalid: false,
  77  |       invalid_reason: '',
  78  |       has_replay: true,
  79  |       replay_events: [],
  80  |       replay_permanent: true,
  81  |       replay_expires_at: null,
  82  |       replay_cleared_at: null,
  83  |       cheat_detected: false,
  84  |       cheat_uids: [],
  85  |       players: [1, -1],
  86  |       original_player_count: 2,
  87  |       quitted_count: 0,
  88  |       finished_players: [1, -1],
  89  |       started_at: now,
  90  |       finished_at: now,
  91  |       created_at: now,
  92  |       player_profiles: [
  93  |         { uid: 1, username: 'local-player', nickname: userName, avatar: 'flask', is_ai: false },
  94  |         { uid: -1, username: 'ai-player', nickname: 'Offline AI', avatar: 'flask', is_ai: true },
  95  |       ],
  96  |       replay: {
  97  |         events: [],
  98  |       },
  99  |     }
  100 |     state.histories = [replayHistory, ...(state.histories || []).filter((item: any) => item.id !== replayHistory.id)]
  101 |     window.localStorage.setItem(stateKey, JSON.stringify(state))
  102 |     window.localStorage.removeItem(replayKey)
  103 |   }, { stateKey: LOCAL_STORAGE_KEYS.offlineState, replayKey: LOCAL_STORAGE_KEYS.tutorialMode, userName: nickname })
  104 | }
  105 | 
  106 | export const openAiArenaAndStart = async (page: Page, roomName = 'E2E Arena') => {
  107 |   await dismissLobbyTutorialIfPresent(page)
  108 |   await page.getByTestId('lobby-ai-arena-button').click()
  109 |   await page.getByTestId('ai-room-name-input').fill(roomName)
  110 |   await page.getByTestId('ai-room-start-button').click()
> 111 |   await expect(page).toHaveURL(/#\/room\//)
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  112 | }
  113 | 
  114 | export const waitForGameRoomReady = async (page: Page) => {
  115 |   await expect(page.getByTestId('game-players-toggle')).toBeVisible()
  116 |   await expect(page.getByTestId('game-substance-input')).toBeVisible()
  117 | }
  118 | 
```