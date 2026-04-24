## 1. Tutorial AI execution

- [x] 1.1 Audit the current tutorial-script AI steps and map each one to an explicit runtime action type in the offline backend
- [x] 1.2 Add a tutorial-only AI execution branch that reads the current scripted step before falling back to generic PvE AI behavior
- [x] 1.3 Implement scripted AI play handling so tutorial AI turns can force the exact configured substance
- [x] 1.4 Implement scripted AI draw-or-no-response handling for tutorial steps that are meant to draw instead of play

## 2. Step synchronization

- [x] 2.1 Bind tutorial step advancement to successful completion of the current scripted human action
- [x] 2.2 Bind tutorial step advancement to successful completion of the current scripted AI action
- [x] 2.3 Ensure tutorial step state, current reaction state, and current player transitions stay synchronized after scripted actions

## 3. Player-facing consistency

- [x] 3.1 Align tutorial AI toast or message output with the scripted action that was actually executed
- [x] 3.2 Verify the room tutorial hint display updates to the correct next step after each scripted action
- [x] 3.3 Preserve non-tutorial PvE AI behavior by keeping scripted handling gated to tutorial rooms only

## 4. Verification

- [ ] 4.1 Verify the tutorial sequence reproduces the documented AI steps such as HCl play, Br2 play, and the scripted draw step
- [ ] 4.2 Verify the visible reaction state and top-card results match the scripted AI actions throughout the tutorial
- [ ] 4.3 Verify a normal offline PvE match still uses the existing generic AI logic without tutorial constraints
