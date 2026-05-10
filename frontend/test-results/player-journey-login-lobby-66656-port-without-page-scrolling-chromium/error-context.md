# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: player-journey.spec.ts >> login lobby and room stay inside the mobile viewport without page scrolling
- Location: tests\e2e\player-journey.spec.ts:24:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /#\/room\//
Received string:  "http://127.0.0.1:5000/#/"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    14 × unexpected value "http://127.0.0.1:5000/#/"

```

# Page snapshot

```yaml
- generic [ref=e6]:
  - banner [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - img [ref=e11]
        - generic [ref=e13]:
          - heading "CHEMISTRY UNO / 化学 UNO" [level=1] [ref=e14]
          - paragraph [ref=e15]: LOCAL REACTION CONSOLE / 本地反应控制台
      - img [ref=e19] [cursor=pointer]
  - main [ref=e21]:
    - generic [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e26]: 单机模式 / Local Mode
        - generic [ref=e28]: Reactor Ready / 反应器就绪
      - heading "本地 AI 对战大厅 / Local AI Battle Lobby" [level=2] [ref=e29]
      - paragraph [ref=e30]: 当前版本仅保留玩家 VS AI 模式。昵称、头像、战绩和设置都会保存在当前设备中。 / This build focuses on Player vs AI. Your nickname, avatar, records, and settings are saved on this device.
    - generic [ref=e31]:
      - generic [ref=e32]:
        - img [ref=e34]
        - generic [ref=e43]:
          - generic [ref=e44]: 继续本地对战 / Resume Local Match
          - heading "Viewport Lock Arena" [level=3] [ref=e45]
      - generic [ref=e46]:
        - button "结束 / End" [ref=e47]:
          - img [ref=e48]
          - text: 结束 / End
        - button "继续 / Continue" [ref=e51]:
          - img [ref=e52]
          - text: 继续 / Continue
    - generic [ref=e54]:
      - generic [ref=e55]:
        - img [ref=e58]
        - generic [ref=e65]:
          - generic [ref=e66]:
            - generic [ref=e67]:
              - generic [ref=e68]:
                - generic [ref=e69]: 单机模式 / Local Mode
                - generic [ref=e70]: Compact Console / 紧凑控制台
              - heading "AI 竞技场 / AI Arena" [level=3] [ref=e71]
              - paragraph [ref=e72]: 本地 PvE 模式 / Local PvE Mode
            - img [ref=e74]
          - generic [ref=e77]:
            - generic [ref=e78]:
              - generic [ref=e79]: 牌组 / Deck
              - generic [ref=e80]: Offline Default Deck
            - generic [ref=e81]:
              - generic [ref=e82]: 燃素 / Points
              - generic [ref=e83]: "0"
            - generic [ref=e84]:
              - generic [ref=e85]: Protocol / 协议
              - generic [ref=e86]: 28 Elements / 元素
          - generic [ref=e87]:
            - generic [ref=e88]:
              - paragraph [ref=e89]: 当前玩家 / Current Player
              - generic [ref=e90]:
                - img [ref=e92]
                - generic [ref=e94]:
                  - paragraph [ref=e95]: ViewportLock
                  - paragraph [ref=e96]: 本机存档 / Local Save
            - generic [ref=e97]:
              - paragraph [ref=e98]: 牌组 / Deck
              - button "Offline Default Deck 查看当前 AI 对战使用的牌组配置 / View the deck used for the current AI match" [ref=e99]:
                - paragraph [ref=e100]: Offline Default Deck
                - paragraph [ref=e101]:
                  - img [ref=e102]
                  - text: 查看当前 AI 对战使用的牌组配置 / View the deck used for the current AI match
          - generic [ref=e104]:
            - button "AI 竞技场 / AI Arena" [ref=e105]:
              - img [ref=e106]
              - generic [ref=e108]: AI 竞技场 / AI Arena
            - button "教学关卡 / Tutorial Match" [ref=e109]:
              - img [ref=e110]
              - generic [ref=e112]: 教学关卡 / Tutorial Match
      - generic [ref=e113]:
        - generic [ref=e114]:
          - generic [ref=e116]:
            - paragraph [ref=e117]: Run Status / 运行状态
            - heading "Match Console / 对局控制台" [level=3] [ref=e118]
          - generic [ref=e119]:
            - generic [ref=e122]:
              - paragraph [ref=e123]: 当前玩家 / Current Player
              - paragraph [ref=e124]: ViewportLock
            - generic [ref=e127]:
              - paragraph [ref=e128]: 牌组 / Deck
              - paragraph [ref=e129]: Offline Default Deck
            - generic [ref=e132]:
              - paragraph [ref=e133]: 燃素 / Points
              - paragraph [ref=e134]: 0 / 28 Elements / 元素
        - generic [ref=e135]:
          - generic [ref=e137]:
            - paragraph [ref=e138]: Quick Access / 快速入口
            - heading "Control Deck / 控制台" [level=3] [ref=e139]
          - paragraph [ref=e140]: 进入资料、牌组和设置，维持本地实验环境整洁、快速、可控。 / Open profile, decks, and settings to keep the local lab environment clean, fast, and manageable.
          - generic [ref=e141]:
            - button "本地资料 / Local Profile" [ref=e142]:
              - img [ref=e143]
              - generic [ref=e146]: 本地资料 / Local Profile
            - button "本地牌组 / Local Decks" [ref=e147]:
              - img [ref=e148]
              - generic [ref=e152]: 本地牌组 / Local Decks
            - button "外观偏好 / Appearance" [ref=e153]:
              - img [ref=e154]
              - generic [ref=e157]: 外观偏好 / Appearance
            - button "重设本地资料 / Reset Local Profile" [ref=e158]:
              - img [ref=e159]
              - generic [ref=e162]: 重设本地资料 / Reset Local Profile
  - contentinfo [ref=e163]:
    - generic [ref=e164]:
      - generic [ref=e166]: Chemistry UNO / 化学 UNO · Mendeleef Protocol vChemistry UNO Offline Local Build
      - generic [ref=e167]: © 2026 MENDELEEF PROTOCOL. LOCAL EDITION. / 2026 MENDELEEF 协议，本地版本。
```

# Test source

```ts
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
> 239 |   await expect(page).toHaveURL(/#\/room\//)
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  240 | }
  241 | 
  242 | export const waitForGameRoomReady = async (page: Page) => {
  243 |   await expect(page.getByTestId('game-players-toggle')).toBeVisible()
  244 |   await expect(page.getByTestId('game-substance-input')).toBeVisible()
  245 | }
  246 | 
```