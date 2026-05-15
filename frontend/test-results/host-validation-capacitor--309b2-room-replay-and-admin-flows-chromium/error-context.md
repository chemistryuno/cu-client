# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: host-validation.spec.ts >> capacitor validates startup persistence room replay and admin flows
- Location: tests\e2e\host-validation.spec.ts:19:3

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
              - generic [ref=e22]: Host_capacitor
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
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e58]:
                  - generic [ref=e59]: 单机模式 / Local Mode
                  - generic [ref=e60]: Compact Console / 紧凑控制台
                - heading "AI 竞技场 / AI Arena" [level=3] [ref=e61]
                - paragraph [ref=e62]: 本地 PvE 模式 / Local PvE Mode
              - img [ref=e64]
            - generic [ref=e67]:
              - generic [ref=e68]:
                - generic [ref=e69]: 牌组 / Deck
                - generic [ref=e70]: Offline Default Deck
              - generic [ref=e71]:
                - generic [ref=e72]: 燃素 / Points
                - generic [ref=e73]: "0"
              - generic [ref=e74]:
                - generic [ref=e75]: Protocol / 协议
                - generic [ref=e76]: 28 Elements / 元素
            - generic [ref=e77]:
              - generic [ref=e78]:
                - paragraph [ref=e79]: 当前玩家 / Current Player
                - generic [ref=e80]:
                  - img [ref=e82]
                  - generic [ref=e84]:
                    - paragraph [ref=e85]: Host_capacitor
                    - paragraph [ref=e86]: 本机存档 / Local Save
              - generic [ref=e87]:
                - paragraph [ref=e88]: 牌组 / Deck
                - button "Offline Default Deck 查看当前 AI 对战使用的牌组配置 / View the deck used for the current AI match" [ref=e89]:
                  - paragraph [ref=e90]: Offline Default Deck
                  - paragraph [ref=e91]:
                    - img [ref=e92]
                    - text: 查看当前 AI 对战使用的牌组配置 / View the deck used for the current AI match
            - generic [ref=e94]:
              - button "AI 竞技场 / AI Arena" [ref=e95]:
                - img [ref=e96]
                - generic [ref=e98]: AI 竞技场 / AI Arena
              - button "教学关卡 / Tutorial Match" [ref=e99]:
                - img [ref=e100]
                - generic [ref=e102]: 教学关卡 / Tutorial Match
        - generic [ref=e103]:
          - generic [ref=e104]:
            - generic [ref=e106]:
              - paragraph [ref=e107]: Run Status / 运行状态
              - heading "Match Console / 对局控制台" [level=3] [ref=e108]
            - generic [ref=e109]:
              - generic [ref=e112]:
                - paragraph [ref=e113]: 当前玩家 / Current Player
                - paragraph [ref=e114]: Host_capacitor
              - generic [ref=e117]:
                - paragraph [ref=e118]: 牌组 / Deck
                - paragraph [ref=e119]: Offline Default Deck
              - generic [ref=e122]:
                - paragraph [ref=e123]: 燃素 / Points
                - paragraph [ref=e124]: 0 / 28 Elements / 元素
          - generic [ref=e125]:
            - generic [ref=e127]:
              - paragraph [ref=e128]: Quick Access / 快速入口
              - heading "Control Deck / 控制台" [level=3] [ref=e129]
            - paragraph [ref=e130]: 进入资料、牌组和设置，维持本地实验环境整洁、快速、可控。 / Open profile, decks, and settings to keep the local lab environment clean, fast, and manageable.
            - generic [ref=e131]:
              - button "本地资料 / Local Profile" [ref=e132]:
                - img [ref=e133]
                - generic [ref=e136]: 本地资料 / Local Profile
              - button "本地牌组 / Local Decks" [ref=e137]:
                - img [ref=e138]
                - generic [ref=e142]: 本地牌组 / Local Decks
              - button "外观偏好 / Appearance" [ref=e143]:
                - img [ref=e144]
                - generic [ref=e147]: 外观偏好 / Appearance
              - button "重设本地资料 / Reset Local Profile" [ref=e148]:
                - img [ref=e149]
                - generic [ref=e152]: 重设本地资料 / Reset Local Profile
    - contentinfo [ref=e153]:
      - generic [ref=e154]:
        - generic [ref=e156]: Chemistry UNO / 化学 UNO · Mendeleef Protocol vChemistry UNO Offline Local Build
        - generic [ref=e157]: © 2026 MENDELEEF PROTOCOL. LOCAL EDITION. / 2026 MENDELEEF 协议，本地版本。
  - generic [ref=e160]:
    - generic [ref=e161]: "[plugin:vite:vue] Attribute name cannot contain U+0022 (\"), U+0027 ('), and U+003C (<)."
    - generic [ref=e162]: D:/SystemFolders/Desktop/projects/cu-client/frontend/src/pages/GameRoom.vue:2503:144
    - generic [ref=e163]: 2501| 2502| <div class="flex items-center gap-2"> 2503| <span class="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300"><BilingualText zh="鍊嶉€? en="Speed" /></span> | ^ 2504| <div class="inline-flex items-center gap-1 p-1 rounded-lg border border-amber-500/20 bg-white/60 dark:bg-white/5"> 2505| <button
    - generic [ref=e164]: at createCompilerError (D:\SystemFolders\Desktop\projects\cu-client\frontend\node_modules\.pnpm\@vue+compiler-core@3.5.27\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:1378:17) at Object.emitError [as onerr] (D:\SystemFolders\Desktop\projects\cu-client\frontend\node_modules\.pnpm\@vue+compiler-core@3.5.27\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:3014:5) at Tokenizer.stateInAttrName (D:\SystemFolders\Desktop\projects\cu-client\frontend\node_modules\.pnpm\@vue+compiler-core@3.5.27\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:868:16) at Tokenizer.parse (D:\SystemFolders\Desktop\projects\cu-client\frontend\node_modules\.pnpm\@vue+compiler-core@3.5.27\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:1117:16) at Object.baseParse (D:\SystemFolders\Desktop\projects\cu-client\frontend\node_modules\.pnpm\@vue+compiler-core@3.5.27\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:3053:13) at Object.parse (D:\SystemFolders\Desktop\projects\cu-client\frontend\node_modules\.pnpm\@vue+compiler-dom@3.5.27\node_modules\@vue\compiler-dom\dist\compiler-dom.cjs.js:910:23) at Object.parse$1 [as parse] (D:\SystemFolders\Desktop\projects\cu-client\frontend\node_modules\.pnpm\@vue+compiler-sfc@3.5.27\node_modules\@vue\compiler-sfc\dist\compiler-sfc.cjs.js:1824:24) at createDescriptor (file:///D:/SystemFolders/Desktop/projects/cu-client/frontend/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vi_b63e7d7be5344b893cf40fe93a459103/node_modules/@vitejs/plugin-vue/dist/index.mjs:71:43) at transformMain (file:///D:/SystemFolders/Desktop/projects/cu-client/frontend/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vi_b63e7d7be5344b893cf40fe93a459103/node_modules/@vitejs/plugin-vue/dist/index.mjs:2421:34) at TransformPluginContext.transform (file:///D:/SystemFolders/Desktop/projects/cu-client/frontend/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vi_b63e7d7be5344b893cf40fe93a459103/node_modules/@vitejs/plugin-vue/dist/index.mjs:3053:16
    - generic [ref=e165]:
      - text: Click outside, press Esc key, or fix the code to dismiss.
      - text: You can also disable this overlay by setting
      - code [ref=e166]: server.hmr.overlay
      - text: to
      - code [ref=e167]: "false"
      - text: in
      - code [ref=e168]: vite.config.ts
      - text: .
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