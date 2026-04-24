## 1. Notification architecture

- [x] 1.1 Audit existing in-room notification sources in `GameRoom.vue` and related UI helpers, then map them into status, event, and assistive tiers
- [x] 1.2 Define the shared notification container API, priority rules, safe-area anchors, and dismissal behavior for room usage
- [x] 1.3 Add or wire a lightweight third-party animation/notification helper to reduce custom transition code in the shared container

## 2. Room UI refactor

- [x] 2.1 Replace blocking or scattered room toasts with the new fixed status area and transient event stack
- [x] 2.2 Update tutorial hints, room-state prompts, and PvE or replay feedback to use the new non-blocking notification patterns
- [x] 2.3 Remove redundant wrappers, repeated labels, and low-value decorative elements that increase the room's vertical footprint

## 3. Shared visual style alignment

- [x] 3.1 Extract or update shared visual tokens for console-style spacing, borders, colors, and restrained motion
- [x] 3.2 Apply the refreshed notification-adjacent style language to the login and main interfaces so they match the new room presentation
- [x] 3.3 Tune entrance and exit motion timings to keep transitions smooth, continuous, and non-fatiguing across major surfaces

## 4. Verification

- [ ] 4.1 Verify key room events such as turn changes, reaction results, draw penalties, and room-state updates remain visible without blocking actions
- [ ] 4.2 Verify concurrent notifications stay within the defined safe areas on common desktop and narrow-height layouts
- [ ] 4.3 Capture any implementation notes about the chosen third-party library, fallback behavior, and follow-up cleanups

Implementation note: reused the existing `gsap` dependency as the lightweight third-party animation helper for notification stack entrance choreography, avoiding an extra toast library while still reducing custom transition code.
