## ADDED Requirements

### Requirement: System can execute a real player journey through browser interactions
The system SHALL provide browser-driven end-to-end tests that interact with the application through visible UI elements and cover the primary player journey from onboarding into active gameplay.

#### Scenario: Player completes onboarding and enters a tutorial match
- **WHEN** the test starts from a clean local state and the simulated player opens the app, creates a local identity, and proceeds through the tutorial flow
- **THEN** the system reaches a tutorial-backed room through real page clicks and route transitions without direct API shortcuts

#### Scenario: Player enters a real playable match
- **WHEN** the simulated player continues from onboarding into lobby actions and starts or joins a non-tutorial playable match
- **THEN** the system reaches an active game room and exposes the core gameplay controls needed for further interaction

### Requirement: End-to-end tests assert user-visible state transitions
The system SHALL validate player-visible outcomes such as screen transitions, dialog visibility, room state changes, and gameplay UI updates rather than only asserting internal service calls.

#### Scenario: Player starts a room from the lobby
- **WHEN** the simulated player creates or starts a room from the lobby page
- **THEN** the test asserts visible success conditions such as route change, room content, or game action controls becoming available
