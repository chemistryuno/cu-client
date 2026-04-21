## 1. Runtime foundation

- [ ] 1.1 Inventory `frontend/src/utils/api.ts` endpoints and map them into auth, data, game, and admin client runtime modules
- [ ] 1.2 Create a shared client runtime service layer and keep `api.ts` as a compatibility facade during migration
- [ ] 1.3 Define shared domain models, command/result types, and error contracts used by runtime services and UI callers

## 2. Local persistence and migration

- [ ] 2.1 Implement a storage abstraction that supports browser, Electron, and Capacitor environments behind one repository contract
- [ ] 2.2 Add repositories for users, sessions, decks, feedback, announcements, reactions, substances, configs, leaderboard data, and game history
- [ ] 2.3 Implement local data import/export so existing installs can migrate persisted data between environments

## 3. Authentication and session runtime

- [ ] 3.1 Implement client-side registration, login, logout, identity restore, and auth cache invalidation flows
- [ ] 3.2 Implement local session listing, revocation, and expiry handling with persisted session metadata
- [ ] 3.3 Gate WebAuthn, 2FA, email recovery, and similar security-sensitive flows by host trust requirements and surface runtime limitations in the UI

## 4. Game engine migration

- [ ] 4.1 Port room lifecycle and matchmaking actions into a frontend game runtime module
- [ ] 4.2 Port turn progression, play validation, double-play handling, draw actions, scoring, and game completion logic into the client engine
- [ ] 4.3 Port chemistry reaction validation, available substance queries, and replay history reconstruction into local runtime services

## 5. Admin and privileged workflows

- [ ] 5.1 Implement frontend role/capability gates for admin and co-worker operations
- [ ] 5.2 Port feedback moderation, announcement management, reaction review, substance review, and configuration editing to client-managed persistence
- [ ] 5.3 Add trust-boundary disclosures for privileged workflows in untrusted frontend-only runtimes

## 6. Integration and rollout

- [ ] 6.1 Rewire existing pages to consume client runtime services without requiring remote backend availability
- [ ] 6.2 Validate browser, Electron, and Capacitor startup, persistence, room flow, replay flow, and admin flow in frontend-only mode
- [ ] 6.3 Remove or disable remaining frontend runtime dependencies on Go backend endpoints once core workflows are covered
