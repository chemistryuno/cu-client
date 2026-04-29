## Why

当前教学关卡已经通过 `tutorialScript` 明确定义了 AI 在每一步应当执行的动作与向玩家展示的文案，但离线运行时中的 AI 仍按通用对局逻辑自动选择可打出的牌或摸牌，导致教学提示、AI 实际行为和玩家观察到的结果不一致。既然教学关卡的核心价值就是“按描述演示规则”，这个问题会直接破坏新手理解流程，因此需要优先修正。

## What Changes

- 让教学关卡中的 AI 回合优先遵循脚本定义，而不是沿用普通 PvE 的自由出牌策略。
- 明确教学脚本中“AI 出牌”“AI 摸牌”“跳过 AI”这几类行为在运行时中的执行规则与提示输出。
- 保证教学步骤推进、AI 提示文案、当前反应展示和实际牌面变化保持一致。
- 为教学脚本与离线后端之间补充更稳定的联动约束，避免后续修改通用 AI 逻辑时再次破坏教学关卡。

## Capabilities

### New Capabilities
- `tutorial-scripted-ai`: 定义教学关卡中 AI 必须按脚本执行指定动作、指定出牌和指定摸牌结果的行为要求。

### Modified Capabilities
- None.

## Impact

- Affected code: `frontend/src/utils/offlineBackend.ts`, `frontend/src/utils/tutorialScript.ts`, `frontend/src/pages/GameRoom.vue`, and tutorial-related runtime state handling.
- Affected systems: offline tutorial match execution, tutorial hint display, AI turn scheduling, and scripted room progression.
- Dependencies: no new external dependency is expected; this change should reuse the current offline runtime and tutorial script data.
