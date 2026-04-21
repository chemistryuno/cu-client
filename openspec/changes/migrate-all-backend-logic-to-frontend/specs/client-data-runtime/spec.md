## ADDED Requirements

### Requirement: Client runtime persists application domain data locally
The system SHALL persist user profiles, deck definitions, feedback records, announcements, reaction data, substance data, leaderboard snapshots, configuration values, and game history in client-managed storage.

#### Scenario: Application reloads after local writes
- **WHEN** a user creates or updates domain data and restarts the application
- **THEN** the previously saved data remains available without contacting a remote backend

#### Scenario: Storage adapter changes by host environment
- **WHEN** the application runs in browser, Electron, or Capacitor environments
- **THEN** the client runtime uses the appropriate local storage adapter while preserving a consistent data access contract to the rest of the frontend

### Requirement: Client runtime offers a backend-independent data access contract
The system SHALL expose data operations through frontend services or repositories rather than requiring UI components to construct remote HTTP requests.

#### Scenario: Existing page requests deck data
- **WHEN** a page requests decks, announcements, or user-owned records through the frontend API layer
- **THEN** the request is fulfilled by client runtime services backed by local persistence instead of a remote network call

### Requirement: Client runtime supports data import and export for migration
The system SHALL support importing previously exported application data and exporting current local data so users can migrate between installs or recover from storage loss.

#### Scenario: User migrates to a new device
- **WHEN** the user exports local data from one install and imports it into another install of the application
- **THEN** the destination install restores supported profiles, domain records, and history needed for continued use
