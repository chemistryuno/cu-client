## ADDED Requirements

### Requirement: Tutorial AI SHALL follow scripted actions instead of generic AI selection
The system SHALL execute tutorial-match AI turns according to the current tutorial script step so that the AI performs the exact scripted action and substance rather than selecting a generic playable move.

#### Scenario: Scripted AI step requires a specific play
- **WHEN** the tutorial match reaches an AI step whose script specifies a concrete substance such as `HCl` or `Br2`
- **THEN** the offline runtime makes the AI perform that scripted play and updates the room state to reflect that exact substance

#### Scenario: Generic AI logic remains outside tutorial matches
- **WHEN** an offline PvE room is not running in tutorial-script mode
- **THEN** the AI continues using the existing generic playable-or-draw behavior instead of the scripted tutorial branch

### Requirement: Tutorial AI SHALL support scripted draw-or-no-response steps
The system SHALL support tutorial AI steps that intentionally draw cards or fail to respond, and MUST present the scripted outcome instead of forcing a normal playable action.

#### Scenario: Scripted AI step requires drawing instead of playing
- **WHEN** the tutorial match reaches a scripted AI step that represents “AI cannot respond and draws”
- **THEN** the runtime makes the AI draw the scripted fallback cards, emits the matching tutorial-facing message, and advances the tutorial flow without producing an unrelated card play

### Requirement: Tutorial step progression SHALL stay synchronized with executed actions
The system SHALL advance `tutorial_current_step` only after the current scripted human or AI action completes successfully so that tutorial hints, room state, and executed actions stay aligned.

#### Scenario: Human completes the expected scripted move
- **WHEN** the player successfully performs the exact action required by the current human tutorial step
- **THEN** the runtime advances the tutorial step to the next scripted step and the next tutorial hint reflects the updated step

#### Scenario: AI completes the expected scripted move
- **WHEN** the runtime finishes the scripted AI action for the current tutorial step
- **THEN** the runtime advances the tutorial step before the next player-facing hint is generated

### Requirement: Tutorial-facing messaging SHALL match the actual AI behavior
The system SHALL keep tutorial hints, AI action toasts, and room reaction displays consistent with the scripted AI action that was actually executed.

#### Scenario: AI message describes a specific tutorial play
- **WHEN** a scripted AI step includes a descriptive tutorial message for its action
- **THEN** the player sees messaging that matches the actual card or draw result performed in that step

#### Scenario: Scripted AI action updates room reaction state
- **WHEN** the tutorial AI performs a scripted action that changes the top card or reaction
- **THEN** the room's visible reaction state matches the scripted action rather than a different generic AI result
