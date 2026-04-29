## ADDED Requirements

### Requirement: Client runtime gates privileged management capabilities by local role model
The system SHALL evaluate administrator and co-worker capabilities in the frontend runtime and gate management actions according to locally available role or host trust context.

#### Scenario: Non-privileged user opens an admin screen
- **WHEN** a user without the required local role reaches an administrative workflow
- **THEN** the system blocks the action and does not expose privileged mutations through the UI path

#### Scenario: Privileged user performs moderation
- **WHEN** a locally privileged user updates moderation state for feedback, reactions, substances, or announcements
- **THEN** the change is applied through client-managed persistence and becomes immediately visible in administrative views

### Requirement: Client runtime manages system configuration locally
The system SHALL allow privileged users to read and update deck configuration, gameplay settings, and application configuration from client-managed storage.

#### Scenario: Admin updates a local configuration value
- **WHEN** an administrator changes a supported configuration value in frontend-only mode
- **THEN** the updated value is persisted locally and used by subsequent runtime operations that depend on that configuration

### Requirement: Client runtime discloses limitations of frontend-only privilege enforcement
The system SHALL disclose that privileged capabilities in a frontend-only deployment rely on local trust assumptions rather than server-enforced isolation.

#### Scenario: Admin tools are shown in untrusted runtime
- **WHEN** the application exposes privileged tools in a runtime where local files and code are user-controllable
- **THEN** the system presents the trust limitation before or alongside the privileged workflow
