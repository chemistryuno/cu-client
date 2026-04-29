## ADDED Requirements

### Requirement: Game room notifications SHALL be presented by priority tiers
The system SHALL classify in-room notifications into stable status notifications, transient event notifications, and contextual assistive notifications so that each event type uses a display pattern matched to its urgency and duration.

#### Scenario: Turn ownership is shown as a stable status notification
- **WHEN** the active player changes or the local player's turn state updates
- **THEN** the room shows the current turn information in a fixed status area instead of a center-screen blocking toast

#### Scenario: Gameplay results use transient event notifications
- **WHEN** the room produces short-lived feedback such as draw penalties, reaction results, play confirmations, or settlement updates
- **THEN** the room shows those messages in a transient notification stack that auto-dismisses without covering the battlefield or hand area

#### Scenario: Tutorial guidance uses contextual assistive notifications
- **WHEN** the player enters a guided step that requires a reminder or hint
- **THEN** the room shows a contextual assistive notification near the relevant UI area with lower visual priority than urgent status messaging

### Requirement: Game room notifications SHALL avoid blocking core play surfaces
The system SHALL anchor in-room notification layouts to predefined safe areas and MUST avoid persistent overlap with the battlefield center, hand cards, and primary action controls.

#### Scenario: Multiple notifications appear during active gameplay
- **WHEN** two or more notifications are triggered within a short interval during a live room
- **THEN** the system stacks or queues them inside the designated notification areas without obscuring the main game board or confirmation controls

#### Scenario: A notification would otherwise exceed the safe area
- **WHEN** a low-priority notification would cause the room notification area to overflow
- **THEN** the system limits concurrent items by collapsing, replacing, or delaying lower-priority messages before they intrude into the core interaction area

### Requirement: Game room notifications SHALL use restrained motion and consistent visual language
The system SHALL render in-room notifications with the shared console-style design language and MUST use short, non-repetitive motion that communicates change without causing visual fatigue.

#### Scenario: A notification enters and exits the room view
- **WHEN** a status or event notification is mounted or dismissed
- **THEN** the transition uses a short fade or directional slide animation with no continuous flashing, bouncing, or looping emphasis

#### Scenario: Notifications appear across login, main, and room-related surfaces
- **WHEN** the application displays notification-adjacent UI in the login flow, main interface, or game room
- **THEN** those surfaces share compatible spacing, border, color, and motion tokens so the new style feels consistent across the product

### Requirement: Game room notifications SHALL remain concise and density-aware
The system SHALL reduce redundant labels, oversized wrappers, and unnecessary decorative elements around room notifications so that the vertical footprint remains compact.

#### Scenario: A room state message includes duplicated framing text
- **WHEN** a notification carries information already visible from surrounding UI context
- **THEN** the displayed notification removes redundant prefixes, extra containers, or decorative blocks while preserving the key player-facing message

#### Scenario: The room contains persistent status messaging and temporary events at the same time
- **WHEN** stable status content and transient event content coexist in the room
- **THEN** the layout preserves a compact vertical footprint by separating their zones and preventing duplicate headers or repeated explanatory text
