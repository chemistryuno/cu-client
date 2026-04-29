## ADDED Requirements

### Requirement: Client runtime executes core game rules locally
The system SHALL execute room lifecycle, turn progression, card play validation, double-play handling, draw actions, chemistry reaction validation, scoring, and game completion logic inside the frontend runtime.

#### Scenario: Player completes a normal turn
- **WHEN** a player performs a valid local play action in a frontend-only deployment
- **THEN** the client game engine validates the move, updates room state, advances the turn when appropriate, and emits the next visible game state to the UI

#### Scenario: Player attempts an invalid chemistry action
- **WHEN** a submitted reaction or card combination violates game rules
- **THEN** the client game engine rejects the action and preserves the previous valid state

### Requirement: Client runtime manages room state without backend ownership
The system SHALL create, join, leave, start, and finish rooms using client-owned room state and SHALL support local player and spectator projections where the chosen host environment allows them.

#### Scenario: User creates and joins a room locally
- **WHEN** a user creates a room in frontend-only mode
- **THEN** the room becomes available from client-managed state and can be entered without a server round trip

#### Scenario: User opens an existing room after a reload
- **WHEN** the application restores persisted room or replay data after restart
- **THEN** the system reconstructs enough room state to show resumable or historical information according to room status

### Requirement: Client runtime records replayable history
The system SHALL store game history and event sequences needed to replay completed matches from client-managed persistence.

#### Scenario: User opens a completed replay
- **WHEN** the user selects a completed match from game history
- **THEN** the client runtime reconstructs the recorded event sequence and presents a replay without requesting remote history data
