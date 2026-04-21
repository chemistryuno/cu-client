## ADDED Requirements

### Requirement: Client runtime authenticates users locally
The system SHALL provide a client-side authentication runtime that completes registration, login, logout, profile bootstrap, password change, session listing, and account lifecycle flows without requiring a remote backend process.

#### Scenario: User signs in from a fresh local install
- **WHEN** the user submits valid local credentials in a frontend-only deployment
- **THEN** the client runtime authenticates the user, persists the active identity, and restores that identity on the next application launch

#### Scenario: User signs out
- **WHEN** the user triggers logout from the client application
- **THEN** the client runtime clears active session state, removes cached identity data, and returns the UI to an unauthenticated state

### Requirement: Client runtime persists and manages local sessions
The system SHALL store session metadata in client-managed persistence and support listing, revoking, and expiring local sessions without server-side session storage.

#### Scenario: User views active sessions
- **WHEN** an authenticated user opens session management
- **THEN** the system shows sessions recorded in local persistence with enough metadata to distinguish device or runtime instances

#### Scenario: User revokes a session
- **WHEN** the user revokes a local session other than the current one
- **THEN** the revoked session is removed or marked invalid in client persistence and is not restorable afterward

### Requirement: Client runtime exposes explicit trust boundaries for security features
The system SHALL label security-sensitive authentication features according to whether they are fully local, host-assisted, or unavailable in untrusted browser-only environments.

#### Scenario: User opens security settings in browser-only mode
- **WHEN** a feature such as WebAuthn, 2FA reset, or email-based recovery depends on capabilities outside the pure frontend runtime
- **THEN** the system indicates the trust requirement or limitation before the user attempts the action
