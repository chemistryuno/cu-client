# Chemistry UNO

Chemistry UNO is now a frontend-only card game. All gameplay, AI turns, chemistry reaction lookup, data management, auth-like local profiles, replays, and admin-style tools run inside the client runtime.

No Go backend, database server, Redis, or WebSocket server is required.

---

## 🎮 新增功能：游戏日志 & AI 顾问系统 (v1.0.0)

✨ **刚刚发布！** 为单人游戏模式集成了完整的游戏追踪和 AI 决策分析系统。

**📖 查看完整文档:**
- 🏠 [主页与快速开始](./INDEX.md)
- 📊 [实现报告](./IMPLEMENTATION_REPORT.md)
- 🔧 [集成指南](./GAME_LOG_AI_INTEGRATION_GUIDE.md)
- ✅ [完成总结](./PROJECT_COMPLETION_SUMMARY.md)

**主要功能:**
- 📋 实时游戏事件日志
- 🤖 AI 决策分析
- 💬 实时 AI 对话
- 📱 响应式 UI
- 🌍 双语支持
- ✅ 生产就绪

---

## Quick Start

```bash
pnpm run init
pnpm start
```

Open `http://localhost:5000`.

## Scripts

- `pnpm start`: start the Vite development server.
- `pnpm build`: build the Electron release output into `build/release`.
- `pnpm build:dev`: build the unpacked Electron output into `build/dev`.
- `pnpm clean`: remove build outputs and temporary renderer assets.
- `pnpm -C frontend type-check`: run TypeScript checks.
- `pnpm electron:dev`: run the Electron shell against the Vite dev server.
- `pnpm electron:run`: build the unpacked Electron output.
- `pnpm electron:pack:win`: build the Electron release output.
- `pnpm -C frontend android:sync`: build and sync Capacitor assets.
- `pnpm -C frontend android:build:debug`: build an Android debug APK.
- `pnpm -C frontend android:build:release`: build an Android release APK.

## Runtime

The app uses a local Axios adapter and an in-browser event bus:

- API compatibility facade: `frontend/src/utils/api.ts`
- Local runtime adapter: `frontend/src/utils/clientRuntimeService.ts`
- Local request dispatcher and game engine: `frontend/src/utils/localRuntimeAdapter.ts`
- Frontend SQLite database: `frontend/src/utils/clientRuntimeDatabase.ts`
- Local persistence repositories: `frontend/src/utils/clientRepositories.ts`
- Runtime storage abstraction: `frontend/src/utils/clientRuntimeStorage.ts`
- WebSocket compatibility shim: `frontend/src/utils/websocket.ts`

Data records such as reactions, substances, announcements, configs, and leaderboards are queried through SQLite.js in the frontend. The SQLite image is persisted by the client runtime storage layer. Use the in-app import/export actions when moving data between environments.

## Project Structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── composables/
│   │   └── utils/
│   ├── electron/
│   └── scripts/
├── scripts/
├── openspec/
├── build.js
├── init.js
├── start.js
└── package.json
```

## Verification

```bash
pnpm -C frontend type-check
pnpm build:dev
```

## Notes

Privileged workflows are local capability gates in frontend-only mode. They are useful for single-device play, testing, and packaged local apps, but they are not server-enforced security boundaries.
