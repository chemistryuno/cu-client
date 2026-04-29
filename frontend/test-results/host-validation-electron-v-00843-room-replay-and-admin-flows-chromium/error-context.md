# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: host-validation.spec.ts >> electron validates startup persistence room replay and admin flows
- Location: tests\e2e\host-validation.spec.ts:19:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Tearing down "context" exceeded the test timeout of 60000ms.
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
              - generic [ref=e22]: Host_electron
              - generic [ref=e23]: 本地资料 / Local Profile
          - generic [ref=e24]:
            - button "本地牌组 / Local Decks" [ref=e25]:
              - img [ref=e26]
            - button "外观偏好 / Appearance" [ref=e30]:
              - img [ref=e31]
    - main [ref=e34]:
      - generic [ref=e36]:
        - generic [ref=e37]:
          - generic [ref=e39]: 单机模式 / Local Mode
          - generic [ref=e41]: Reactor Ready / 反应器就绪
        - heading "本地 AI 对战大厅 / Local AI Battle Lobby" [level=2] [ref=e42]
        - paragraph [ref=e43]: 当前版本仅保留玩家 VS AI 模式。昵称、头像、战绩和设置都会保存在当前设备中。 / This build focuses on Player vs AI. Your nickname, avatar, records, and settings are saved on this device.
      - generic [ref=e44]:
        - generic [ref=e45]:
          - img [ref=e48]
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
                    - paragraph [ref=e85]: Host_electron
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
                - paragraph [ref=e114]: Host_electron
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
    - generic [ref=e161]:
      - generic [ref=e162]:
        - img [ref=e164]
        - generic [ref=e167]:
          - paragraph [ref=e168]: Guide
          - heading "欢迎来到单机模式 / Welcome to Local Mode" [level=3] [ref=e169]
      - button "关闭引导" [ref=e170]:
        - img [ref=e171]
    - generic [ref=e175]:
      - generic [ref=e176]: STEP 1 / 5
      - generic [ref=e177]: 20%
    - paragraph [ref=e180]: 这里是本地单机版的化学 UNO。你可以直接挑战 AI，或先进入教学关卡熟悉出牌和反应规则。 / This is the local single-player edition of Chemistry UNO. You can challenge AI directly or start with the tutorial.
    - generic [ref=e181]:
      - generic [ref=e182]: 键盘：← / → 切换
      - generic [ref=e183]: Esc 跳过引导
    - generic [ref=e184]:
      - button "跳过引导" [ref=e185]
      - button "下一步" [ref=e186]:
        - generic [ref=e187]: 下一步
        - img [ref=e188]
```