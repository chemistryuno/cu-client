# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: host-validation.spec.ts >> browser validates startup persistence room replay and admin flows
- Location: tests\e2e\host-validation.spec.ts:19:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /#\/$/
Received string:  ""

Call log:
  - Expect "toHaveURL" with timeout 10000ms

```

# Page snapshot

```yaml
- generic [ref=e9]:
  - generic [ref=e11]:
    - generic [ref=e12]:
      - paragraph [ref=e13]:
        - generic [ref=e14]: 本地玩家设置 / Local Player Setup
      - heading "Chemistry UNO / 化学 UNO" [level=1] [ref=e15]
      - paragraph [ref=e16]: 本地玩家设置 / Local Player Setup
    - img [ref=e18]
  - generic [ref=e20]:
    - generic [ref=e22]:
      - button "中文 / Chinese" [ref=e23]:
        - img [ref=e24]
        - generic [ref=e27]: 中文 / Chinese
      - button "English / 英文" [ref=e28]:
        - generic [ref=e29]: English / 英文
    - generic [ref=e30]:
      - img [ref=e32]
      - generic [ref=e34]:
        - paragraph [ref=e35]: 本地玩家预览 / Local Player Preview
        - paragraph [ref=e36]: Host_browser
        - paragraph [ref=e37]: 仅用于本机单人对战与本地战绩 / Used only for local single-player matches and local records
    - generic [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]: 昵称 / Nickname
          - button "随机生成 / Random" [ref=e42]
        - generic [ref=e43]:
          - generic:
            - img
          - textbox "输入你的玩家昵称 / Enter your player nickname" [ref=e44]: Host_browser
      - generic [ref=e45]:
        - generic [ref=e46]: 头像 / Avatar
        - generic [ref=e47]:
          - button [active] [ref=e48]:
            - img [ref=e50]
          - button [ref=e52]:
            - img [ref=e54]
          - button [ref=e66]:
            - img [ref=e68]
          - button [ref=e71]:
            - img [ref=e73]
          - button [ref=e77]:
            - img [ref=e79]
          - button [ref=e85]:
            - img [ref=e87]
          - button [ref=e92]:
            - img [ref=e94]
          - button [ref=e100]:
            - img [ref=e102]
          - button [ref=e106]:
            - img [ref=e108]
          - button [ref=e114]:
            - img [ref=e116]
          - button [ref=e124]:
            - img [ref=e126]
          - button [ref=e129]:
            - img [ref=e131]
      - generic [ref=e133]: 本版本为仅单机的玩家 VS AI 模式。昵称、头像、战绩与设置都会保存在当前设备中。 / This build is local-only Player vs AI. Nickname, avatar, records, and settings are stored on this device.
      - button "进入单机模式 / Enter Local Mode" [ref=e134]
```

# Test source

```ts
  18  |   if (host === 'capacitor') return `chemistry-uno-capacitor-runtime:${LOCAL_STORAGE_KEYS.offlineState}`
  19  |   return LOCAL_STORAGE_KEYS.offlineState
  20  | }
  21  | 
  22  | export const simulateRuntimeHost = async (page: Page, host: RuntimeHostMode) => {
  23  |   await page.addInitScript(({ hostMode }) => {
  24  |     const win = window as Window & typeof globalThis & {
  25  |       process?: { versions?: { electron?: string } }
  26  |       Capacitor?: { isNativePlatform?: () => boolean }
  27  |     }
  28  | 
  29  |     if (hostMode === 'electron') {
  30  |       win.process = {
  31  |         versions: {
  32  |           electron: '41.2.0',
  33  |         },
  34  |       }
  35  |       delete win.Capacitor
  36  |       return
  37  |     }
  38  | 
  39  |     if (hostMode === 'capacitor') {
  40  |       win.Capacitor = {
  41  |         isNativePlatform: () => true,
  42  |       }
  43  |       delete win.process
  44  |       return
  45  |     }
  46  | 
  47  |     delete win.Capacitor
  48  |     delete win.process
  49  |   }, { hostMode: host })
  50  | }
  51  | 
  52  | export const callOfflineApi = async (page: Page, path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', payload?: unknown) => {
  53  |   return page.evaluate(async ({ requestPath, requestMethod, requestPayload }) => {
  54  |     const response = await fetch(`/api${requestPath}`, {
  55  |       method: requestMethod,
  56  |       credentials: 'include',
  57  |       headers: {
  58  |         'Content-Type': 'application/json',
  59  |       },
  60  |       body: requestPayload === undefined ? undefined : JSON.stringify(requestPayload),
  61  |     })
  62  |     const data = await response.json().catch(() => null)
  63  |     return {
  64  |       status: response.status,
  65  |       data,
  66  |     }
  67  |   }, {
  68  |     requestPath: path,
  69  |     requestMethod: method,
  70  |     requestPayload: payload,
  71  |   })
  72  | }
  73  | 
  74  | export const getCurrentRoomId = async (page: Page) => {
  75  |   return page.evaluate(() => {
  76  |     const match = window.location.hash.match(/#\/room\/([^/?]+)/)
  77  |     return match?.[1] || null
  78  |   })
  79  | }
  80  | 
  81  | export const waitForOfflineRoomState = async <T = any>(
  82  |   page: Page,
  83  |   roomId: string,
  84  |   predicate: (data: T) => boolean,
  85  |   timeoutMs = 5000,
  86  | ) => {
  87  |   const startedAt = Date.now()
  88  | 
  89  |   while (Date.now() - startedAt < timeoutMs) {
  90  |     const response = await callOfflineApi(page, `/rooms/${roomId}`, 'GET')
  91  |     if (response.status === 200 && predicate(response.data as T)) {
  92  |       return response.data as T
  93  |     }
  94  |     await page.waitForTimeout(150)
  95  |   }
  96  | 
  97  |   throw new Error(`Timed out waiting for room state predicate for room ${roomId}`)
  98  | }
  99  | 
  100 | export const resetRuntimeState = async (page: Page) => {
  101 |   await page.goto('/#/login')
  102 |   await page.evaluate(({ keys }) => {
  103 |     window.localStorage.clear()
  104 |     window.sessionStorage.clear()
  105 |     Object.values(keys).forEach((key) => {
  106 |       window.localStorage.removeItem(key)
  107 |       window.sessionStorage.removeItem(key)
  108 |     })
  109 |   }, { keys: LOCAL_STORAGE_KEYS })
  110 |   await page.reload()
  111 | }
  112 | 
  113 | export const seedLocalIdentity = async (page: Page, nickname = 'E2EPlayer', avatar = 'flask') => {
  114 |   await page.goto('/#/login')
  115 |   await page.getByTestId('login-nickname-input').fill(nickname)
  116 |   await page.getByTestId(`avatar-option-${avatar}`).click()
  117 |   await page.getByTestId('login-submit-button').click()
> 118 |   await expect(page).toHaveURL(/#\/$/)
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  119 |   await expect(page.getByTestId('lobby-page')).toBeVisible()
  120 | }
  121 | 
  122 | const getTutorialOverlay = (page: Page) => page.locator('.tutorial-overlay')
  123 | 
  124 | export const dismissLobbyTutorialIfPresent = async (page: Page) => {
  125 |   const overlay = getTutorialOverlay(page)
  126 |   await page.waitForTimeout(1200)
  127 |   if (await overlay.isVisible().catch(() => false)) {
  128 |     await page.getByRole('button', { name: /skip tutorial/i }).click()
  129 |     await expect(overlay).toBeHidden()
  130 |   }
  131 | }
  132 | 
  133 | export const skipLobbyTutorial = async (page: Page) => {
  134 |   await page.evaluate(({ keys }) => {
  135 |     window.localStorage.setItem(keys.tutorialDone, 'true')
  136 |     window.localStorage.setItem(keys.tutorialSkipped, 'true')
  137 |   }, { keys: LOCAL_STORAGE_KEYS })
  138 |   await dismissLobbyTutorialIfPresent(page)
  139 |   await expect(page.getByTestId('lobby-page')).toBeVisible()
  140 | }
  141 | 
  142 | export const completeLobbyTutorial = async (page: Page) => {
  143 |   const overlay = getTutorialOverlay(page)
  144 |   await expect(overlay).toBeVisible()
  145 |   for (let index = 0; index < 4; index += 1) {
  146 |     await page.getByRole('button', { name: /next/i }).click()
  147 |   }
  148 |   await page.getByRole('button', { name: /get started/i }).click()
  149 |   await page.waitForTimeout(500)
  150 |   if (!/#\/room\//.test(page.url())) {
  151 |     await page.getByTestId('lobby-tutorial-button').click()
  152 |   }
  153 | }
  154 | 
  155 | export const seedReplayHistory = async (page: Page, nickname = 'ReplayUser') => {
  156 |   await page.evaluate(({ stateKey, replayKey, userName }) => {
  157 |     const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter(Boolean) as string[]
  158 |     const resolvedStateKey = (keys.find((key) => key === stateKey || key.endsWith(`:${stateKey}`)) || stateKey)
  159 |     const raw = window.localStorage.getItem(resolvedStateKey)
  160 |     if (!raw) return
  161 |     const state = JSON.parse(raw)
  162 |     const now = new Date().toISOString()
  163 |     const replayHistory = {
  164 |       id: 999,
  165 |       room_id: 'replay-room-999',
  166 |       winner_uid: 1,
  167 |       winner_name: userName,
  168 |       is_invalid: false,
  169 |       invalid_reason: '',
  170 |       has_replay: true,
  171 |       replay_events: [],
  172 |       replay_permanent: true,
  173 |       replay_expires_at: null,
  174 |       replay_cleared_at: null,
  175 |       cheat_detected: false,
  176 |       cheat_uids: [],
  177 |       players: [1, -1],
  178 |       original_player_count: 2,
  179 |       quitted_count: 0,
  180 |       finished_players: [1, -1],
  181 |       started_at: now,
  182 |       finished_at: now,
  183 |       created_at: now,
  184 |       player_profiles: [
  185 |         { uid: 1, username: 'local-player', nickname: userName, avatar: 'flask', is_ai: false },
  186 |         { uid: -1, username: 'ai-player', nickname: 'Offline AI', avatar: 'flask', is_ai: true },
  187 |       ],
  188 |       replay: {
  189 |         events: [],
  190 |       },
  191 |     }
  192 |     state.histories = [replayHistory, ...(state.histories || []).filter((item: any) => item.id !== replayHistory.id)]
  193 |     window.localStorage.setItem(resolvedStateKey, JSON.stringify(state))
  194 |     window.localStorage.removeItem(replayKey)
  195 |   }, { stateKey: LOCAL_STORAGE_KEYS.offlineState, replayKey: LOCAL_STORAGE_KEYS.tutorialMode, userName: nickname })
  196 | }
  197 | 
  198 | export const setCurrentUserRole = async (page: Page, role: 'user' | 'co_worker' | 'admin') => {
  199 |   return page.evaluate(({ stateKey, targetRole }) => {
  200 |     const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter(Boolean) as string[]
  201 |     const resolvedStateKey = (keys.find((key) => key === stateKey || key.endsWith(`:${stateKey}`)) || stateKey)
  202 |     const rawState = window.localStorage.getItem(resolvedStateKey)
  203 |     if (!rawState) return false
  204 | 
  205 |     const state = JSON.parse(rawState)
  206 |     const sessionUid = state.session_uid
  207 |     if (!sessionUid || !Array.isArray(state.users)) return false
  208 | 
  209 |     const currentUser = state.users.find((user: any) => Number(user.uid) === Number(sessionUid))
  210 |     if (!currentUser) return false
  211 | 
  212 |     currentUser.role = targetRole
  213 |     currentUser.is_admin = targetRole === 'admin'
  214 |     window.localStorage.setItem(resolvedStateKey, JSON.stringify(state))
  215 | 
  216 |     const userStorageKeys = keys.filter((key) => key === 'user' || key.endsWith(':user'))
  217 |     userStorageKeys.forEach((key) => {
  218 |       const rawUser = window.localStorage.getItem(key)
```