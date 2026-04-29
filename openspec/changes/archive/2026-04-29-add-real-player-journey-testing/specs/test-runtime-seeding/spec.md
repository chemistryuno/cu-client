## ADDED Requirements

### Requirement: Test runtime can start from a deterministic local state
The system SHALL provide a repeatable way to reset local runtime state before each player journey test so prior runs do not affect the next execution.

#### Scenario: Test run begins after previous local activity
- **WHEN** a new browser-driven test session starts on a machine with leftover local state
- **THEN** the test runtime clears or replaces prior local data before executing the next player flow

### Requirement: Test runtime can seed required player-flow data
The system SHALL provide data seeding or setup helpers for the test environment so player journeys can reach tutorial, lobby, room, and related flows without brittle manual preconditions.

#### Scenario: Test requires deck and room prerequisites
- **WHEN** a player-flow test depends on valid local runtime data such as decks, room availability, or tutorial-ready state
- **THEN** the test runtime prepares those prerequisites through supported setup hooks before the browser steps begin

### Requirement: Test runtime exposes stable waiting conditions for end-to-end tests
The system SHALL provide stable observability points such as deterministic selectors, route checks, or explicit ready states so end-to-end tests do not rely on arbitrary fixed delays.

#### Scenario: Test waits for tutorial or room readiness
- **WHEN** a player journey test needs to proceed after asynchronous rendering or local game-state initialization
- **THEN** the test waits on explicit visible or runtime-backed readiness conditions instead of hard-coded sleep intervals
