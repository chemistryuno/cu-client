# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: player-journey.spec.ts >> tutorial room AI follows the scripted HCl, Br2, and draw sequence
- Location: tests\e2e\player-journey.spec.ts:102:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /next/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6]:
    - banner [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - img [ref=e11]
          - generic [ref=e13]:
            - heading "CHEMISTRY UNO / 化学 UNO" [level=1] [ref=e14]
            - paragraph [ref=e15]: LOCAL REACTION CONSOLE / 本地反应控制台
        - generic [ref=e16]:
          - generic [ref=e17] [cursor=pointer]:
            - img [ref=e19]
            - generic [ref=e21]:
              - generic [ref=e22]: JourneyScriptedAI
              - generic [ref=e23]: 本地资料 / Local Profile
          - generic [ref=e24]:
            - button "本地牌组 / Local Decks" [ref=e25]:
              - img [ref=e26]
            - button "外观偏好 / Appearance" [ref=e30]:
              - img [ref=e31]
            - button "AI Assistant" [ref=e34]:
              - img [ref=e35]
    - main [ref=e38]:
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e43]: 单机模式 / Local Mode
          - generic [ref=e45]: Reactor Ready / 反应器就绪
        - heading "本地 AI 对战大厅 / Local AI Battle Lobby" [level=2] [ref=e46]
        - paragraph [ref=e47]: 当前版本仅保留玩家 VS AI 模式。昵称、头像、战绩和设置都会保存在当前设备中。 / This build focuses on Player vs AI. Your nickname, avatar, records, and settings are saved on this device.
      - generic [ref=e48]:
        - generic [ref=e49]:
          - img [ref=e52]
          - generic [ref=e59]:
            - generic [ref=e60]:
              - generic [ref=e61]:
                - generic [ref=e62]:
                  - generic [ref=e63]: 单机模式 / Local Mode
                  - generic [ref=e64]: Compact Console / 紧凑控制台
                - heading "AI 竞技场 / AI Arena" [level=3] [ref=e65]
                - paragraph [ref=e66]: 本地 PvE 模式 / Local PvE Mode
              - img [ref=e68]
            - generic [ref=e71]:
              - generic [ref=e72]:
                - generic [ref=e73]: 牌组 / Deck
                - generic [ref=e74]: Offline Default Deck
              - generic [ref=e75]:
                - generic [ref=e76]: 燃素 / Points
                - generic [ref=e77]: "0"
              - generic [ref=e78]:
                - generic [ref=e79]: Protocol / 协议
                - generic [ref=e80]: 28 Elements / 元素
            - generic [ref=e81]:
              - generic [ref=e82]:
                - paragraph [ref=e83]: 当前玩家 / Current Player
                - generic [ref=e84]:
                  - img [ref=e86]
                  - generic [ref=e88]:
                    - paragraph [ref=e89]: JourneyScriptedAI
                    - paragraph [ref=e90]: 本机存档 / Local Save
              - generic [ref=e91]:
                - paragraph [ref=e92]: 牌组 / Deck
                - button "Offline Default Deck 查看当前 AI 对战使用的牌组配置 / View the deck used for the current AI match" [ref=e93]:
                  - paragraph [ref=e94]: Offline Default Deck
                  - paragraph [ref=e95]:
                    - img [ref=e96]
                    - text: 查看当前 AI 对战使用的牌组配置 / View the deck used for the current AI match
            - generic [ref=e98]:
              - button "AI 竞技场 / AI Arena" [ref=e99]:
                - img [ref=e100]
                - generic [ref=e102]: AI 竞技场 / AI Arena
              - button "教学关卡 / Tutorial Match" [ref=e103]:
                - img [ref=e104]
                - generic [ref=e106]: 教学关卡 / Tutorial Match
        - generic [ref=e107]:
          - generic [ref=e108]:
            - generic [ref=e110]:
              - paragraph [ref=e111]: Run Status / 运行状态
              - heading "Match Console / 对局控制台" [level=3] [ref=e112]
            - generic [ref=e113]:
              - generic [ref=e116]:
                - paragraph [ref=e117]: 当前玩家 / Current Player
                - paragraph [ref=e118]: JourneyScriptedAI
              - generic [ref=e121]:
                - paragraph [ref=e122]: 牌组 / Deck
                - paragraph [ref=e123]: Offline Default Deck
              - generic [ref=e126]:
                - paragraph [ref=e127]: 燃素 / Points
                - paragraph [ref=e128]: 0 / 28 Elements / 元素
          - generic [ref=e129]:
            - generic [ref=e131]:
              - paragraph [ref=e132]: Quick Access / 快速入口
              - heading "Control Deck / 控制台" [level=3] [ref=e133]
            - paragraph [ref=e134]: 进入资料、牌组和设置，维持本地实验环境整洁、快速、可控。 / Open profile, decks, and settings to keep the local lab environment clean, fast, and manageable.
            - generic [ref=e135]:
              - button "本地资料 / Local Profile" [ref=e136]:
                - img [ref=e137]
                - generic [ref=e140]: 本地资料 / Local Profile
              - button "本地牌组 / Local Decks" [ref=e141]:
                - img [ref=e142]
                - generic [ref=e146]: 本地牌组 / Local Decks
              - button "外观偏好 / Appearance" [ref=e147]:
                - img [ref=e148]
                - generic [ref=e151]: 外观偏好 / Appearance
              - button "重设本地资料 / Reset Local Profile" [ref=e152]:
                - img [ref=e153]
                - generic [ref=e156]: 重设本地资料 / Reset Local Profile
    - contentinfo [ref=e157]:
      - generic [ref=e158]:
        - generic [ref=e160]: Chemistry UNO / 化学 UNO · Mendeleef Protocol vChemistry UNO Offline Local Build
        - generic [ref=e161]: © 2026 MENDELEEF PROTOCOL. LOCAL EDITION. / 2026 MENDELEEF 协议，本地版本。
  - generic [ref=e164]:
    - generic [ref=e165]:
      - generic [ref=e166]:
        - img [ref=e168]
        - generic [ref=e171]:
          - paragraph [ref=e172]: Guide
          - heading "欢迎来到单机模式 / Welcome to Local Mode" [level=3] [ref=e173]
      - button "关闭引导" [ref=e174]:
        - img [ref=e175]
    - generic [ref=e179]:
      - generic [ref=e180]: STEP 1 / 5
      - generic [ref=e181]: 20%
    - paragraph [ref=e184]: 这里是本地单机版的化学 UNO。你可以直接挑战 AI，或先进入教学关卡熟悉出牌和反应规则。 / This is the local single-player edition of Chemistry UNO. You can challenge AI directly or start with the tutorial.
    - generic [ref=e185]:
      - generic [ref=e186]: 键盘：← / → 切换
      - generic [ref=e187]: Esc 跳过引导
    - generic [ref=e188]:
      - button "跳过引导" [ref=e189]
      - button "下一步" [ref=e190]:
        - generic [ref=e191]: 下一步
        - img [ref=e192]
```

# Test source

```ts
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
  118 |   await expect(page).toHaveURL(/#\/$/)
  119 |   await expect(page.getByTestId('lobby-page')).toBeVisible()
  120 | }
  121 | 
  122 | const getTutorialOverlay = (page: Page) => page.locator('.tutorial-overlay')
  123 | 
  124 | export const dismissLobbyTutorialIfPresent = async (page: Page) => {
  125 |   const overlay = getTutorialOverlay(page)
  126 |   await page.waitForTimeout(1200)
  127 |   if (await overlay.isVisible().catch(() => false)) {
  128 |     await page.getByRole('button', { name: /skip tutorial|跳过引导/i }).click()
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
> 146 |     await page.getByRole('button', { name: /next/i }).click()
      |                                                       ^ Error: locator.click: Test timeout of 60000ms exceeded.
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
  219 |       if (!rawUser) return
  220 |       try {
  221 |         const parsed = JSON.parse(rawUser)
  222 |         parsed.role = targetRole
  223 |         parsed.is_admin = targetRole === 'admin'
  224 |         window.localStorage.setItem(key, JSON.stringify(parsed))
  225 |       } catch {
  226 |         // ignore malformed legacy user payloads
  227 |       }
  228 |     })
  229 | 
  230 |     return true
  231 |   }, { stateKey: LOCAL_STORAGE_KEYS.offlineState, targetRole: role })
  232 | }
  233 | 
  234 | export const openAiArenaAndStart = async (page: Page, roomName = 'E2E Arena') => {
  235 |   await dismissLobbyTutorialIfPresent(page)
  236 |   await page.getByTestId('lobby-ai-arena-button').click()
  237 |   await page.getByTestId('ai-room-name-input').fill(roomName)
  238 |   await page.getByTestId('ai-room-start-button').click()
  239 |   await expect(page).toHaveURL(/#\/room\//)
  240 | }
  241 | 
  242 | export const waitForGameRoomReady = async (page: Page) => {
  243 |   await expect(page.getByTestId('game-players-toggle')).toBeVisible()
  244 |   await expect(page.getByTestId('game-substance-input')).toBeVisible()
  245 | }
  246 | 
```