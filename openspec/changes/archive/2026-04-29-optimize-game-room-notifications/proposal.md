## Why

当前游戏房间内的通知承担了提示玩家重要状态变化的职责，但其展示方式仍然偏分散、偏临时，容易出现“看不见关键信息”或“提示挡住操作区域”的两种极端。随着大厅与房间界面整体设计风格切换到更紧凑的控制台风格，现在需要同步重构房间内通知体验，确保提示真正起到告知作用，同时不打断玩家观察战场与执行操作。

## What Changes

- 重构游戏房间内通知的展示分层，区分高优先级状态提示、短时反馈提示和非阻断辅助提示。
- 引入统一的房间内通知布局规范，限制通知出现位置、尺寸、停留时间和同时显示数量。
- 为玩家回合切换、反应结果、惩罚摸牌、教学提示、房间状态变化等关键事件定义更稳定的提示方式。
- 减少遮挡中央战场、手牌区和输入区的通知样式，避免通知与核心操作区域竞争注意力。
- 将房间通知样式纳入新的控制台设计语言，并允许后续实现复用共享 UI 组件或轻量第三方通知/动画库。

## Capabilities

### New Capabilities
- `game-room-notifications`: 定义游戏房间内通知的优先级、布局、生命周期与非阻断展示要求。

### Modified Capabilities
- None.

## Impact

- Affected code: `frontend/src/pages/GameRoom.vue`, room-related floating panels/toasts/tutorial hints, shared frontend styling, and notification-related UI utilities/components.
- Affected systems: in-room status messaging, tutorial guidance display, PvE toast display, replay/room state feedback.
- Dependencies: may introduce or expand usage of a lightweight notification/UI utility library to reduce duplicated presentation code.
