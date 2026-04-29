# Test Environment Notes

## Test Suite Overview

The player journey e2e test suite uses Playwright to simulate real player interactions with the Chemistry Uno frontend application in offline mode.

## Environment Setup

- **Framework**: Playwright 1.54.2
- **Browser**: Chromium (Desktop Chrome)
- **Base URL**: http://127.0.0.1:5000
- **Dev Server**: Vite (started automatically by Playwright)
- **Test Timeout**: 60 seconds per test
- **Expect Timeout**: 10 seconds per assertion

## Test Configuration

Located in `frontend/playwright.config.ts`:
- Tests run sequentially (fullyParallel: false)
- No retries on failure
- Screenshots captured on failure
- Videos retained on failure
- Traces enabled on first retry
- Test ID attribute: `data-testid`

## Running Tests

```bash
# Run all e2e tests
cd frontend && pnpm test:e2e

# Run tests in headed mode (visible browser)
cd frontend && pnpm test:e2e:headed
```

## Test Structure

### Test Helpers (`frontend/tests/e2e/helpers/playerJourney.ts`)

Key helper functions for test setup and assertions:

- `resetRuntimeState()` - Clears localStorage and sessionStorage before each test
- `seedLocalIdentity()` - Creates a local player identity through the login UI
- `completeLobbyTutorial()` - Completes the lobby tutorial flow
- `skipLobbyTutorial()` - Skips the tutorial and marks it as done
- `openAiArenaAndStart()` - Opens AI arena and starts a match
- `waitForGameRoomReady()` - Waits for game room UI to be ready
- `callOfflineApi()` - Calls the offline backend API directly
- `waitForOfflineRoomState()` - Polls room state until a condition is met
- `seedReplayHistory()` - Seeds replay history for testing

### Test Scenarios (`frontend/tests/e2e/player-journey.spec.ts`)

1. **Onboarding**: Creates local identity through login UI
2. **Tutorial Flow**: Completes tutorial and enters tutorial-backed room
3. **Tutorial AI Behavior**: Validates scripted AI follows HCl, Br2, draw sequence
4. **Real Match**: Starts playable match from lobby and validates core controls
5. **Generic AI**: Verifies non-tutorial AI flow works correctly
6. **Regression Suite**: Tests profile, replay, reactions, and substances flows

## Known Issues and Observations

### Test Timeout Issues

Some tests are experiencing timeout failures (60s limit exceeded). This appears to be related to:
- Dev server startup time
- UI element visibility delays
- Async state transitions in the offline runtime

### Recommendations

1. **Increase timeout for CI environments**: Consider increasing the 60s timeout for CI/CD pipelines where startup may be slower
2. **Add retry logic**: For flaky tests, consider adding retry configuration
3. **Improve wait conditions**: Some tests may benefit from more explicit wait conditions instead of fixed delays
4. **Monitor performance**: Track test execution times to identify performance regressions

## Local Runtime Assumptions

The test suite assumes:
- Offline mode is enabled (`OFFLINE_MODE` environment variable or detection)
- Local storage is available for state persistence
- Vite dev server runs on port 5000
- No external backend connectivity required
- Browser automation via Playwright is supported

## Test Data

Tests use deterministic test data:
- Player nicknames: `JourneyLogin`, `JourneyTutorial`, `JourneyArena`, etc.
- Avatar: `flask` (default)
- Room names: `Journey Arena`, `Generic AI Arena`, `Regression Arena`
- Replay ID: `999` (hardcoded for regression tests)

## Stability Considerations

### Stable Selectors

Tests rely on `data-testid` attributes for element selection:
- `lobby-page`
- `game-players-toggle`
- `game-substance-input`
- `game-draw-button`
- `game-hints-toggle`
- `profile-page`
- `match-history-panel`
- `data-config-page`
- `reactions-page`
- `substances-page`

### State Management

- Each test runs `resetRuntimeState()` in `beforeEach` hook
- Tests are isolated and can run in any order
- No shared state between tests
- Local storage is cleared before each test

## Performance Baseline

From initial test run:
- Onboarding test: ~55 seconds
- Tutorial flow test: ~60 seconds
- AI behavior test: ~60 seconds
- Real match test: ~78 seconds
- Generic AI test: ~120 seconds
- Regression suite test: ~120 seconds

## Future Enhancements

1. Add performance benchmarking
2. Implement visual regression testing
3. Add accessibility testing
4. Expand coverage to mobile viewports
5. Add load testing scenarios
6. Integrate with CI/CD pipeline
