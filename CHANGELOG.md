# Changelog

A condensed, milestone-by-milestone summary of what was built and when. For the
full reasoning behind each decision (tradeoffs considered, bugs found, why a
choice deviated from spec), see [`docs/DECISIONS.md`](docs/DECISIONS.md) — this
file is the short version.

---

## Quality pass — tests, tooling, hardening (2026-06-05)

Added Vitest (57 tests on pure logic: wheel math, scene, validation, timer),
ESLint + Prettier, GitHub Actions CI (frontend + Rust), and a round of
robustness fixes: safer folder-scope validation, no silent panics on startup,
reused GStreamer audio elements to fix a multi-sound crash on Linux.

## M14 — Annotation polish, ephemeral gameplay, NPCs (2026-06-01)

Map annotations became editable in place (double-click to edit text) with a
fixed red/white style. **Play mode became fully ephemeral**: nothing done
during a live session is saved, so scenarios always reopen at their prepared
setup. Added NPC characters (dashed border, excluded from the leaderboard,
still usable in conflicts).

## M13 — Map annotations (2026-06-01)

Added emoji symbols and text labels that can be placed, dragged, and resized
on the map, usable both while preparing a scenario and live during a session.

## M13 — Final audio + wheel/leaderboard polish (2026-05-31)

Replaced in-webview synthesized audio (unreliable on Linux) with pre-rendered
MP3s for the timer and native Rust audio (`rodio`) for the wheel's tick sound,
fixing sync and playback issues found during real-projector testing.

## M12 — Fixes after testing on a real projector (2026-05-31)

Switched fixed-pixel UI elements (portraits, timer, leaderboard) to
viewport-relative sizing after testing on a ~100" screen showed everything
too small. Fixed muted sounds in production builds caused by the browser's
autoplay policy.

## M8.3 — Final leaderboard (2026-05-27)

Added a 3-objective leaderboard (the third objective is a penalty) with a
podium view; winners (including ties) get a crown and golden glow.

## M8.2 — Initial character positions (2026-05-27)

Characters can have a saved "starting position," restored automatically every
time a scenario is opened — so a session always begins from the prepared
setup regardless of where things ended up last time.

## M8.1 — Timer (2026-05-27)

Added a facilitator-controlled countdown, shown on the Stage, with start/
1-minute-warning/expiry sounds. Uses wall-clock time internally to avoid
drift.

## M6 — Fortune wheel (2026-05-27)

The core conflict-resolution mechanic: weighted slices per character, `+1`/
`+2` modifiers (from an object or free text), a naturally decelerating spin,
and a winner chosen consistently with the underlying probabilities.

## M5 — Objects (2026-05-27)

Objects can be assigned to characters one-to-one (an object has one owner at
a time) and shown attached to their portrait; they can act as wheel
modifiers.

## M4 — Map + characters (2026-05-27)

Character portraits with manual pan/zoom face cropping, colored borders,
free drag-and-drop positioning on the map, synced in real time to the Stage
window.

## M3 — Scenarios + autosave (2026-05-27)

Scenario selection/creation, on-disk manifest format, and autosave with a
save-status indicator.

## M1 + M2 — Scaffold (2026-05-27)

Tauri v2 + React + TypeScript scaffold with two windows (Control, Stage)
communicating over Tauri's native event system.
