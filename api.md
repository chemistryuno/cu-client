# Frontend Runtime API Notes

There is no backend service in this project.

The public API surface is kept as a compatibility facade in `frontend/src/utils/api.ts`. Calls are handled by the local Axios adapter from `frontend/src/utils/clientRuntimeService.ts`, which dispatches to the local runtime in `frontend/src/utils/localRuntimeAdapter.ts`.

## Main Runtime Areas

- Auth and profile flows: local profile/session data.
- Rooms and game actions: local room lifecycle, turn progression, AI, replay history.
- Reactions and substances: SQLite.js-backed local tables plus in-memory indexes for fast game checks.
- Admin-style tools: local capability checks and local persistence updates.
- Chat and room events: local event bus through `frontend/src/utils/websocket.ts`.

## Storage

Client data is stored through `frontend/src/utils/clientRuntimeStorage.ts`, the SQLite.js database wrapper in `frontend/src/utils/clientRuntimeDatabase.ts`, and repository helpers in `frontend/src/utils/clientRepositories.ts`.

Use the runtime import/export APIs exposed through `commonAPI.exportLocalRuntimeData()` and `commonAPI.importLocalRuntimeData()` to move data between installs. Exports include the persisted SQLite image.
