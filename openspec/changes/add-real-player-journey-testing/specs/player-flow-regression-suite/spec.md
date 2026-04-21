## ADDED Requirements

### Requirement: Regression suite covers related player-facing features beyond the main game path
The system SHALL include browser-driven regression tests for related player-facing features that are adjacent to the main gameplay journey, including profile or settings flows, history or replay flows, and key data views used by players.

#### Scenario: Player opens profile-related functionality
- **WHEN** the simulated player navigates from the lobby or game-adjacent UI into profile-related functionality
- **THEN** the regression suite validates that the page loads and the relevant player-facing controls are usable

#### Scenario: Player opens replay or history functionality
- **WHEN** the simulated player navigates to game history or replay after completing or preparing a match flow
- **THEN** the regression suite validates that replay-adjacent screens render and show expected player-visible content

### Requirement: Regression suite covers chemistry-related supporting views
The system SHALL include regression tests for supporting chemistry-related features that players may access outside the active match flow.

#### Scenario: Player opens reaction or substance views
- **WHEN** the simulated player navigates to reaction or substance-related pages from the application shell
- **THEN** the regression suite validates that those pages load and display expected interactive content without blocking errors
