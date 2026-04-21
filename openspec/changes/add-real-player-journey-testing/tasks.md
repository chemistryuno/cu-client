## 1. Testing foundation

- [x] 1.1 Choose and add the browser-driven end-to-end testing framework and related frontend scripts
- [x] 1.2 Create the base e2e project structure, runner configuration, and local app startup flow for tests
- [x] 1.3 Document or encode the default local runtime assumptions used during player journey testing

## 2. Runtime reset and seeding

- [x] 2.1 Implement a deterministic test reset path that clears local runtime state before each scenario
- [x] 2.2 Add test seeding helpers for onboarding, lobby, room, and replay-related prerequisites
- [x] 2.3 Add stable readiness signals or selectors so tests can wait for tutorial, lobby, and room states without fixed sleeps

## 3. Main player journey tests

- [x] 3.1 Add an onboarding test that creates a local identity through the real login UI
- [ ] 3.2 Add a tutorial journey test that completes the tutorial flow and reaches the tutorial-backed room through player clicks
- [ ] 3.3 Add a real match journey test that starts or joins a playable non-tutorial match and validates core in-room controls
- [ ] 3.4 Add gameplay interaction assertions for representative in-room actions such as ready, start, draw, play, or hint-related operations

## 4. Related feature regression tests

- [ ] 4.1 Add regression tests for profile or settings-related player flows
- [ ] 4.2 Add regression tests for history or replay-related flows
- [ ] 4.3 Add regression tests for reaction and substance-related pages or views

## 5. Stability and execution

- [x] 5.1 Add stable test selectors or observability hooks to the key pages and components used by the suite
- [x] 5.2 Make the full player-flow regression suite runnable from a repeatable local command
- [ ] 5.3 Verify the suite against the local runtime and capture any required test environment notes
