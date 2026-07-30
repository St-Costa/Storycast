# DECISIONS.md — project decision log

This document tracks architectural decisions, assumptions made (CLAUDE.md §10), and deviations from the spec. It is updated at the end of every milestone. The authorial spec remains `CLAUDE.md` in the repo root; this file sits alongside it and follows its concrete evolution.

Format: one section per milestone, decisions numbered and dated. Superseded decisions are struck through (`~~text~~`) with a reference to the decision that replaces them, not deleted.

---

## M1 + M2 — Scaffold and cross-window communication proof (2026-05-27)

### D-001 — Stack: Tauri v2 + React + TS + Vite + Zustand
Confirmed by spec §1. Toolchain installed: Rust 1.95.0, Node 24.15.0, Tauri 2.11.2, plugin-fs 2.5.1, plugin-dialog 2.7.1. Webkit2gtk-4.1 on Ubuntu 24.04.

### D-002 — Two Tauri windows with separate HTML entry points
Spec §2 calls for two windows (`control` Control, `stage` Stage). Chose **two distinct HTML entry points** (`control.html`, `stage.html`) with Vite multi-page instead of a single `index.html` with internal routing. Reason: each window loads only the code it needs, so the Stage can't accidentally import Control components (more robust with respect to spec §2's "no controls on the Stage" rule).

### D-003 — Cross-window communication via Tauri `emit`/`listen` (NOT BroadcastChannel)
Risk §9.1 verified end-to-end with a synchronized counter Control → Stage: emit/listen propagates between the two Tauri WebViews in real time. Implemented in `src/lib/events.ts` with a typed wrapper (`EVT.<name>` + an `EventPayloads` map).

### D-004 — Styling with CSS modules (no Tailwind)
Confirmed by the user in plan mode. Reason: functional UI for a non-technical user, not a design showcase; less tooling = less error surface. Convention: `Component.module.css` co-located with the component, plus global CSS for reset/typography per window (`control.css`, `stage.css`).

### D-005 — Tauri plugins enabled: `fs` + `dialog`. Removed `opener`
`tauri-plugin-opener` (part of the default scaffold) is not needed by this tool and introduces a useless dependency, removed from `Cargo.toml` and `package.json`. Added `tauri-plugin-fs` and `tauri-plugin-dialog` (needed from M3 onward for scenario folder management).

### D-006 — Capabilities shared between control and stage
`src-tauri/capabilities/default.json` applies `core:default` + `core:event:default` + `core:window:default` + `dialog:default` + `fs:default` to **both** windows. Rationale: the Stage has no buttons but must receive events; the Stage might in the future need window control (fullscreen). If the need to restrict this emerges later, we'll split into per-window capability files.

### D-007 — Language: Italian in UI + commit messages in Italian-ish
UI in Italian (spec §6). Commit messages remain technical (mixed it/en), since they are read mainly by me and by Claude. Code and identifiers in English (international convention).

### D-008 — App identifier: `com.teambuilding.gdr`
Chosen at scaffold time. Changeable before the first release if needed.

### Open assumptions from CLAUDE.md §10
None touched in M1+M2. Will be addressed when relevant:
- §10.1 (rendering of the "bonus slice"): from M6 (wheel).
- §10.2 (multi-object layout around the portrait): from M5 (objects).
- §10.3 (autosave vs. manual): **autosave** confirmed. Will be implemented in M3.
- §10.4 (conflict outcome history): from M6.
- §10.5 (deleting a character mid-conflict): from M6.

### Verified
- `npm run build` + `cargo check` clean.
- `tauri dev` opens 2 windows, counter Control → Stage syncs in real time (confirmed visually by the user).

---

## M3 — Scenario selection/creation + autosave (2026-05-27)

### D-009 — Manifest schema with `schemaVersion: 1`
`ambientazione.json` starts from an explicit version 1, with lightweight manual validation in `src/lib/ambientazione.ts` (`validaAmbientazione`). No Zod or other libs: the manifest's surface is small and the check is explicit. Version mismatch → typed exception `AmbientazioneCorrotta`, handled in the UI with an Italian message. The structure for future migrations exists (a switch on `schemaVersion`) but is not implemented until we have a real v2.

### D-010 — Atomic write for `ambientazione.json` and `recents.json`
All manifest writes go through `<file>.tmp` + atomic `rename`. Reason: if the app crashes mid-write, the final file stays consistent with the previous version. Negligible cost (one extra syscall). Also applied to the recents file.

### D-011 — Dynamic filesystem scope via a custom Rust command
Implemented `#[tauri::command] allow_ambientazione_folder(path)` in `src-tauri/src/lib.rs`. JS invokes it right after every folder picker dialog and, on startup, for every entry in recents. The scope is in-memory (lost on restart), re-authorized lazily. Alternatives discarded:
- Broad static scope (`$HOME/**`): too permissive, and scenario paths can be anywhere (e.g. cloud drive, USB).
- `tauri-plugin-fs` auto-scope from dialog: not documented as stable in 2.x.

Added granular permissions `fs:allow-{read-text-file,write-text-file,mkdir,exists,read-dir,rename,remove}` + `fs:allow-appconfig-{read,write}-recursive` in `capabilities/default.json`, for the recents file. **Note**: the correct names are `appconfig` (no hyphen), not `app-config` — the first attempt failed on `fs:allow-app-config-read-recursive` and had to be corrected.

### D-012 — Recents in `appConfigDir/recents.json`, max 10 entries
Cross-launch persistence via plugin-fs with `BaseDirectory.AppConfig` (managed by the OS). Max 10 entries, order: most recent first. Missing folders stay in the list with status `esiste: false`, giving the facilitator the option to "remove from list" (not delete from disk — an important distinction for non-technical users).

### D-013 — Singleton Zustand store + autosave hook
`useAmbientazioneStore` as the single source of truth on the Control side. `modifica(fn)` uses clone-then-apply (JSON.parse/stringify) instead of immer, to avoid adding a dependency. Triggers the `dirty` → `saving` → `saved` transition via `useAutosave` (subscribe-based, **500ms** debounce, with a stale-flag for changes made during an in-flight save).

### D-014 — Conditional routing, no react-router
`src/control/App.tsx` picks between `SelezioneAmbientazione` and `AmbientazioneAperta` based on `current === null`. Only two views, a simple condition — a router would be overhead.

### D-015 — Italian-language UI text, confirmations on semi-destructive actions
- "Open existing" / "New scenario" / "Close scenario".
- Closing with `saveStatus !== 'saved'` asks for confirmation.
- Creating over an existing folder asks for confirmation before overwriting the manifest.
- Errors translated into Italian with a message understandable to a non-technical user (e.g. "The scenario is corrupted: …" instead of a stack trace).

### D-016 — Temporary "Rename (M3 test)" button
`AmbientazioneAperta.tsx` has a dashed test button to try out autosave without waiting for M4 (map/characters). **Remove** it once the first real change arrives (M4).

### D-017 — Stage: scenario name + auto-fit font
The Stage shows the scenario name (or "—") with `font-size: clamp(3rem, min(12vw, 60vh), 18rem)` and `word-break`. The first attempt with `clamp(8rem, 30vw, 40rem)` was designed for short content (counter digits) and clipped long names like "Treno deragliato" — direct feedback from the user. The current formula scales with the smaller of the display's width/height and has a safety word-break.

### Open assumptions from §10 (update)
- §10.3 autosave: **resolved** in M3, implemented per the confirmed preference.
- Other points unchanged from M2.

### Verified
- `npx tsc --noEmit` + `npx vite build` clean.
- `cargo check` clean (after fixing the `appconfig` capability name).
- `tauri dev`: landing OK, folder + manifest creation on disk OK, autosave with `dirty → saving → saved` indicator OK, recents persistent cross-restart, corrupted-manifest error shown in Italian. Confirmed visually by the user.

---

## M4 — Map + characters (pan/zoom + drag&drop + Stage sync) (2026-05-27)

### D-018 — Extended Character schema, field-by-field validated
`Personaggio` (Character) is now `{id, nome, colore, imgPath, crop, posizione}` with field-by-field validation (including a hex check `^#[0-9A-Fa-f]{6}$` on the color). Positions are **normalized 0..1 relative to the map**, so they survive a map change or windows/stages of different sizes. The validator is strict: scenarios with malformed characters (e.g. the M3 stubs with only `{id}`) would be rejected, but the real M3 scenarios had `personaggi: []`, so they are compatible.

### D-019 — Tauri asset protocol enabled, dynamic scope via custom command
`tauri.conf.json` enables `app.security.assetProtocol = { enable: true, scope: [] }`; the `protocol-asset` feature is on in `Cargo.toml`. The scope is extended at runtime: `allow_ambientazione_folder` (Rust) now extends both `fs_scope` and `asset_protocol_scope` for the chosen folder. Without the feature, `convertFileSrc` would return URLs the WebView can't navigate to, and images would be silently invisible.

### D-020 — Copy image files into the scenario folder
Images selected via dialog are not merely *referenced*: they are **copied** into `<scenario>/personaggi/<uuid>.<ext>` (for characters) or `<scenario>/<map-uuid>.<ext>` (for maps). Reason: the scenario is self-contained — the facilitator can copy it to a USB drive and bring it elsewhere without missing files. `copyFile` from `plugin-fs`; the dialog plugin already auto-authorizes the chosen file for both fs and the asset protocol, so the copy works without extra manual scoping. `fs:allow-copy-file` added to capabilities.

### D-021 — Curated palette of 12 colors (no free picker)
Choice confirmed by the user in plan mode. Implemented in `src/lib/colori.ts`. The wizard UI shows the 12 colors; ones already used by other characters are `disabled` with a "(already used)" tooltip. Default = first free one. Color-uniqueness constraint guaranteed structurally, no extra runtime validation needed (impossible to select a duplicate).

### D-022 — Portrait = `object-fit: contain` + transform, NOT `cover`
**Big bug discovered by the user in M4**: with `object-fit: cover` on the img inside the mask, pixels outside the central portion were *already* cropped before the transform → impossible to recover them with drag/pan. Changed to `contain` everywhere (Cerchietto [Portrait], MaschereCircolare [circular mask], wizard preview). Initial default crop when the image loads: zoom auto-computed as `max(W,H)/min(W,H)` (clamped to `[ZOOM_MIN, ZOOM_MAX]`) — so the user sees the face filling the mask "like an Instagram crop" right away, but with the freedom to zoom out to recover the edges.

### D-023 — Dynamic pan limit as a function of zoom
The initial pan limit of `±1.5` was too restrictive at high zoom (couldn't reach the edges). Implemented `maxOffset(zoom) = max(1, (zoom-1)/2 + 0.5)`: at zoom 5x it allows ±2.5, at zoom 10x ±5.0. On zoom change (slider or wheel) offsets are re-clamped. Zoom range: **0.5x – 10x** (raised from 4x → 5x → 10x at the user's request over two iterations: some avatars have an aspect ratio > 4:1).

### D-024 — `scena:update` event with rAF throttling
`EVT.ambientazioneLoaded` removed; replaced by `EVT.scenaUpdate` with payload `{folderPath, mappaPath, personaggi, nome}` — the Stage has everything it needs. The emit from the store is **rAF-throttled** (`requestAnimationFrame`): smooth dragging generates ~60 updates/s in Control, but at most 1 emit/frame to the Stage, avoiding flooding the event bus. On receiving a new `folderPath`, the stage re-authorizes the folder before rendering images (necessary on the first open after a restart, since the scope is in-memory).

### D-025 — CONTROL layout: toolbar + character sidebar + scrollable map area
`AmbientazioneAperta` rebuilt from scratch: toolbar at the top with the name + "Set map…" + "Fullscreen projection" + save indicator + "Close", sidebar `PannelloPersonaggi` (Character panel) on the left (a list with a mini-portrait, a ⋯ menu with rename/edit crop/change color/delete), a scrollable `overflow: auto` map area in the center with the map at real size. The "Rename (M3 test)" button was removed (no longer needed, now there are real changes to make).

### D-026 — Stage: manual `object-fit: contain` math
The Stage shows the map with `object-fit: contain` (no cropping, ever), but the portraits must be positioned in the map's coordinate space, not the whole window's. A `rettangoloContain` (containRectangle) helper in `src/lib/scena.ts` computes the actual contained rectangle of the map; portraits are `position: absolute` with `left/top` derived from `posizione.{x,y}` × the rectangle. A ResizeObserver updates the rectangle if the window changes size (e.g. fullscreen toggle).

### D-027 — Stage fullscreen: button in Control + ESC on the Stage
Implemented per the user's request, "like F11 in a browser". Tauri v2: `WebviewWindow.getByLabel("stage").setFullscreen(bool)`. Toggle button in the Control toolbar ("Fullscreen projection" / "Exit fullscreen"). A `keydown` listener on the Stage exits with ESC. Permissions added: `core:window:allow-set-fullscreen`, `core:window:allow-is-fullscreen`. The button's state is synced on mount via `isFullscreen()`.

### D-028 — Portrait sizes: 68 (Control map), 77 (Stage)
Initial 56/64; bumped by +20% at the user's request (better visibility for the audience). Portrait border: `max(3, round(dim*0.14))` (doubled from 0.07 → 0.14, again at the user's request). Numbers not configurable from the UI, to be revisited if the need for bigger/smaller portraits per scenario emerges in the future.

### D-029 — Post-creation crop editor (edit)
New `EditorRitaglioPersonaggio` (Character Crop Editor) modal opened from the ⋯ menu ("Edit crop…"). Reopens `MaschereCircolare` (Circular Mask) on the image already copied into the folder, saves the new `crop` to the manifest. The source image is not recopied (the file stays the same). Changing the source image of an existing character is NOT yet supported (would need another UI; possibly in a later milestone if needed).

### Resolved / open points of attention
- **§9.2 (smooth dragging on WebKitGTK Ubuntu)**: drag throttled via rAF, excellent performance on the Ubuntu 24.04 dev machine. No choppiness detected. For now no need to switch to `requestAnimationFrame` with manual rotation as the fallback plan suggested.
- **§9.4 (second-monitor fullscreen)**: the Stage window is positioned manually by the user on the second monitor, then made fullscreen via the button in Control. Works without a programmatic positioning API.
- StrictMode in dev: the first wizard had a `useEffect` that opened the file picker on-mount, but StrictMode ran it 2x → the file picker opened twice. Removed the auto-open: now step 1 shows a "Choose image…" button the user clicks explicitly. Clearer UX, no bug.

### Verified
- `npx tsc --noEmit` + `npx vite build` clean.
- `cargo check` clean (with the `protocol-asset` feature).
- `tauri dev`: map load OK (with copy into folder), 3-step wizard OK with palette + 10x pan/zoom crop, smooth character dragging with real-time Stage sync, crop editing OK, fullscreen toggle OK (Control button + Stage ESC), persistence OK cross-restart. Confirmed visually by the user over 5+ feedback cycles.

---

## M5 — Objects + 1-to-1 assignment (2026-05-27)

### D-030 — 1-to-1 constraint: a character has at most one object
Explicit choice by the user during planning, stricter than spec §4.3 (which allowed "multiple attached objects"). `Personaggio.oggettoId: string | null` instead of an array. Advantages: much simpler UI (no layout needed for multiple objects around the circle, §10.2 moot), no ambiguity about which object acts as the modifier in the M6 wheel. Also limits interactions to the cases the facilitator will actually manage live. If multi-object support is needed in the future, we go back to an array with a schema migration.

### D-031 — Inverse constraint too: an object belongs to only one character
`assegnaOggettoAPersonaggio(persId, oggId)` (assignObjectToCharacter) automatically frees any previous owner of the object. Reassignment = transfer (no cloning). Makes the object a "physical" entity of the world, not just a stat. UX: in the "Object" section of the target character's ⋯ menu, an object already assigned to someone else is shown with a "(Anna's)" label — reassigning does not require explicit confirmation (it's a conscious choice by the facilitator).

### D-032 — Referential validation is "self-healing", not rejecting
`Personaggio.oggettoId` pointing to a nonexistent id (e.g. object deleted outside the app, file hand-edited) is cleaned up to `null` during manifest validation, **without an error**. Reason: better to open a slightly "amnesiac" scenario than to block the facilitator with a crash. Compat: a `Personaggio` without `oggettoId` (M4 manifest) is read as `oggettoId: null` — no schema migration needed.

### D-033 — Visual shape of objects: rounded-corner square tile
`Quadratino` (Tile) component (`src/components/`), a mirror of `Cerchietto` (Portrait) but with `border-radius: 22%`. Same crop model (object-fit: contain + transform), same proportional border. **No own color**: neutral gray border (`#3a3a3c`). Objects are distinguished from characters by shape, not color. Position in the scene: bottom-right of the portrait, at a 45° diagonal, with slight overlap (the tile's top-left corner sits inside the portrait at 10% of the radius, then shifted by -10px on both axes for visual fine-tuning requested by the user).

### D-034 — Reuse `MaschereCircolare` (Circular Mask) for object cropping
Even though the final object is a tile, the crop UI in the wizard uses the same circular mask as characters. The visual difference between rounded corners vs. a circle during pan/zoom is negligible, and duplicating the component would add no value. The "final" preview of the object (e.g. in the sidebar after creation) uses the real tile.

### D-035 — Generalized (renamed) `EditorRitaglio` (Crop Editor)
`EditorRitaglioPersonaggio` → `EditorRitaglio` with props `{nome, imgPath, cropIniziale, colore?, folderPath, callbacks}`. Works for both characters (with border color) and objects (neutral color). No unnecessary specialization.

### D-036 — Object wizard: 2 steps (vs. 3 for characters)
`WizardOggetto.tsx` has "Image" + "Crop and name". Name inline in the crop step since there's no color palette to show separately. Same initial auto-zoom on load (cover-like) and same dynamic pan clamp.

### D-037 — Sidebar with two sections: Characters + Objects
`PannelloPersonaggi` (Character Panel) is now a thin container of `SezionePersonaggi` (Characters Section) and `SezioneOggetti` (Objects Section), each `flex: 1` with a sticky header and an independent scrollable list. Sidebar width bumped from 260 to 280px to accommodate the slightly denser content. Kept the filename `PannelloPersonaggi.tsx` to avoid an invasive cross-file rename.

### D-038 — Object assignment from the character's ⋯ menu
The assignment action lives on the character, not on the object. User's reasoning: "it's an action I'd take in the window that's NOT projected" — conceptually the director gives the object to the character, not the object looking for an owner. Character ⋯ menu, after the other entries: an "Object" section with a list of all objects (mini-tiles), a "(Anna's)" label for ones already assigned, a "None (remove object)" entry if the character has one. No drag-and-drop object → portrait (explicitly rejected by the user).

### D-039 — Portraits +50%, tile position refined over iterations
Control portrait: 68 → 102px. Stage portrait: 77 → 116px. Tile: 80% of the portrait (82/93px). Borders remain doubled at `dim * 0.14`. The tile is positioned along the portrait's bottom-right diagonal: the initial formula had the tile's center right on the portrait's edge → half of it covered the face. Refactored over two iterations: first a geometric formula (the tile's top-left corner at 90% of the radius from the portrait's center), then a manual `-10, -10` offset for aesthetic fine-tuning. Final result: a slight corner overlap perceived by the user as "right".

### Verified
- `npx tsc --noEmit` + `npx vite build` clean.
- `tauri dev`: object creation OK, assignment/reassignment/detachment from the ⋯ menu OK, tile rendered bottom-right of the portrait with minimal overlap both in Control and in Stage, dragging the character carries the tile along with no glitches, deleting object/character auto-detaches, cross-restart persistence OK (including M4 scenarios without `oggettoId`).

---

## M6 — Fortune wheel (2026-05-27)

### D-040 — `+1`/`+2` modifier rule: ABSOLUTE increment, not proportional
CLAUDE.md §5.2 specified "+20% of the original slice". During testing the user clarified they wanted the absolute increment: **+1 = +0.20 (20 percentage points) added to the baseFraction, +2 = +0.40**. So for 2 characters at 50/50, a +1 gives raw 0.7/0.5 → normalized 58.3%/41.7% (and not 54.5%/45.5% as the "+20% of 50%" interpretation would give). Explicit deviation from the spec, documented in `src/lib/ruota.ts`.

### D-041 — Isolated math as pure functions in `src/lib/ruota.ts`
`calcolaFette` (computeSlices), `scegliVincitorePesato` (pickWeightedWinner), `angoloDiArresto` (stopAngle) are pure functions, no DOM, testable from the devtools console. Angle convention: 0° = top, clockwise (consistent with CSS rotate). `angoloDiArresto` adds `K × 360°` of "full spin" to visualize the rotation (K=6 default). The 10% margin from the winning slice's edge avoids stopping right on the boundaries.

### D-042 — Conflict as a separate store + provider pattern for emit
`conflittoStore` (conflict store) independent from `ambientazioneStore` (scenario store): the conflict is ephemeral, it doesn't touch the manifest. To avoid circular imports in the emit toward the Stage, `ambientazioneStore.payloadCorrente()` (currentPayload) calls a provider registered by `conflittoStore` at module load (`registraConflittoSnapshotProvider`). The Stage decides what to show based on `payload.conflitto !== null`.

### D-043 — "Ready" phase for the wheel sitting still on the Stage
Spec §5 wanted the wheel to appear "when launched", but the user asked to see it even before the spin (with the scoreboard) to build anticipation for the audience. Added a `fase "pronto"` (ready phase, separate from `"setup"`) entered when the director clicks "Next" from Step 2: the Stage shows the static wheel + scoreboard. Click "Spin" → spinning phase. `tornaSetup()` (returnToSetup) to go Back and change modifiers (clears the wheel from the Stage).

### D-044 — Immutable snapshot in `snapshotPartecipanti` (participants snapshot) for consistency during the spin
When the conflict enters ready/spinning, participant info (name, color, imgPath, crop) is copied into `ConflittoSnapshot.partecipanti`. If the director renames/recolors/deletes a character during the animation, the wheel still shows the state consistent as of the spin's start. CLAUDE.md §10.5 "recalculate" applied only during the setup phase.

### D-045 — Wheel rendering: SVG + user-space clipPath for faces, gradient pointer
- Slices: `<path>` with `arcPath` computed at runtime (no SVG libraries).
- Character faces: `<image>` with `preserveAspectRatio="xMidYMid meet"` (NOT `slice` — otherwise the crop computed for `contain` would double the zoom), user-space `clipPath` with a `<circle>` at the face's absolute position. One clipPath per slice (defined inside the rotating `<g>` in `<defs>` so it rotates with the wheel).
- Object bonus: same pattern with `<rect rx=22%>`.
- **Pointer**: white→silver linear gradient, SVG drop-shadow via `<filter>` with `<feGaussianBlur>` + `<feOffset>`. Slim teardrop shape.
- Winner: drop-shadow filter via CSS (white + yellow) for the glow.

### D-046 — Spin animation: CSS transition + double rAF
To trigger the CSS transition on first render, a double `requestAnimationFrame` between mounting with `angoloFinale=0` (finalAngle) and then setting the real `angoloFinale`. Without it, the browser commits the final state immediately and no transition fires. Total 5s, `cubic-bezier(0.17, 0.67, 0.32, 1)` (slight acceleration, long smooth deceleration). `onTransitionEnd` filtered by `propertyName === "transform"` (SVG can propagate other events).

### D-047 — Bonus shown as an "extension", not a separate slice
Per user feedback: the total slice (base + bonus) rendered as **a single path**, no internal white separator. A thin, semi-transparent line `rgba(255,255,255,0.55)` strokeWidth `0.35` marks the base/bonus boundary without visually breaking the slice. The bonus appears as an "addition" to half the wheel, not as a third slice.

### D-048 — Radial, adaptive bonus text
Text along the radius (rotated `midAngolo - 90`, flipped 180° for the left half). `textLength` + `lengthAdjust="spacingAndGlyphs"` forces a fit within the available space (rStart=12, rEnd=R-3). Font size computed (~length/0.55 × N chars), clamped to [2.5, 9]. Truncated with `…` past 28 chars.

### D-049 — Modifier source: manual choice + filtered to the attached object
For each participant:
- Radio `None / +1 / +2`.
- If mod ≠ None: radio `Object / Free text`. The "Object" radio directly shows the name of the object attached to the character (single selection, no dropdown), disabled if the character has no objects. "Free text" = a text input, max 40 chars.
- In ready/spin, the user can see the source rendered in the sub-slice (object icon or radial text).

### D-050 — Audio exception: spin tick sound (exception to CLAUDE.md §0)
**§0 explicitly forbids audio.** The user confirmed in M6 that they wanted a tick when crossing sub-region boundaries. Implemented with the **Web Audio API** synthesized in-process (no MP3 files, no custom routing — the volume goes to the OS mixer): triangle wave 950Hz, 4ms attack, 40ms release, amplitude 0.22. Played **only from Control** (`suonaTick={true}` in `PannelloConflitto` [Conflict Panel], `false` on the Stage) for autoplay purposes: the user clicked "Spin" → valid user gesture to activate an AudioContext. The Stage receives no user input → its AudioContext would be suspended. Documented here as a conscious exception.

### D-051 — Pointer wobble: keyed remount + CSS animation (NOT the Web Animations API)
Pattern used: `<g key={wobbleCount}>` with class `puntaWobble` (CSS @keyframes 150ms ease-out, 0° → -11° → 0°). On every tick, `setWobbleCount(c+1)` changes the key → React remounts the g → the CSS animation restarts from scratch. WAAPI with `element.animate()` on an SVG path did NOT work reliably on WebKitGTK (`transform-box: fill-box` was not respected). `transform-origin` in user-space SVG coords `50px 1.5px` directly on the element. Wobble active on BOTH windows (Control + Stage) — separate from the sound, which stays Control-only.

### D-052 — Scoreboard on the Stage
Above the wheel in the Stage layout: a row of cards for each participant with a face portrait (~110px), name (1.5rem), large percentage (~2.2rem bold) in the character's color. The winning card gets the character's border + a yellow glow after the spin. Layout: centered flex row, gap 2rem. The wheel below is scaled to `min(0.72*innerWidth, 0.7*innerHeight)` to make room.

### D-053 — Scene always mounted + Wheel as an overlay (Stage)
First version: `if (conflict) return <Wheel>; else return <Scene>;`. Problem: `<Scene>` unmounted/remounted, losing `imgDim` → characters disappeared from the map on return (fix #3, last round). Solution: **Scene always mounted**, Wheel in a `<div position:fixed inset:0>` overlay when the conflict is active. Extra safety: an additional `useEffect` in Scene/AreaMappa (Map Area) that derives `imgDim` from `img.complete + naturalWidth` if for some reason it's still null (cache, fullscreen-toggle race).

### §10 spec, final status
- §10.1 (bonus-slice rendering): resolved with an inline sub-slice (D-047) + visual tick (D-051).
- §10.2 (multi-object): superseded by M5 (1-to-1 constraint).
- §10.3 (autosave): resolved in M3.
- §10.4 (outcome history): no history, manual confirmation. Explicitly documented here.
- §10.5 (deleting a character mid-conflict): automatic cleanup during setup (subscribe in conflittoStore), snapshot freeze during ready/spinning/result (D-044).

### Verified
- `npx tsc --noEmit` + `npx vite build` clean.
- `tauri dev`: wheel in Control sitting still + scoreboard, click "Spin" → 5s animation with natural deceleration, tick sound at sub-regions, pointer wobble in sync, winner highlighted with glow + scoreboard card highlighted. Stage shows everything synchronized. "Close and return to map" returns to the map with characters visible (no flicker). Confirmed visually by the user over 8+ iterative feedback cycles.

---

## M8.1 — Timer on the Stage, controlled from Control (2026-05-27)

### D-054 — Ephemeral timer (not persisted)
The timer is not saved in the `ambientazione.json` manifest. It lives only in memory in `timerStore`. It survives a scenario/map change (the store is top-level) but dies when the app closes. Choice: the configured duration and the running state are "live state" of a session, not part of the scenario itself.

### D-055 — "Epoch ms" model to avoid drift
`timerStore` holds `targetEndAt: number | null` (epoch ms when running) and `pausedRemainingMs: number` (ms remaining, frozen while paused). The display computes `remainingMs = targetEndAt - Date.now()` in real time, no `setInterval` decrementing a counter — zero drift even across the laptop sleeping/waking. Provider pattern toward `ambientazioneStore.payloadCorrente` just like `conflittoStore` (no circular imports).

### D-056 — States: idle / running / paused / ended
Four clean-cut states. `start()` from idle → running; from paused → resume (alias). `pause()` from running → paused. `reset()` returns to idle, keeping `durationSec`. `markEnded()` called by the display in Control when `remaining ≤ 0` while running. Changes to `durationSec` allowed only in idle/ended (the UI disables the inputs while running/paused).

### D-057 — Banner on the Stage, hidden in idle, hidden during a conflict
- `idle`: banner hidden → the Stage stays clean until the director touches the timer.
- `running/paused/ended`: banner visible top-center, `position: fixed; z-index: 1500` (above the wheel overlay's z-index 1000 — but see below).
- **During a conflict**: banner **hidden** by user choice (explicit M8.1 request). The wheel scene is a "special sequence" that must not be distracted by the timer. The timer keeps counting in the background (audio included) — only its visibility on the Stage changes. Implemented as `{!mostraRuota && <DisplayTimer …>}`.

### D-058 — Compact Control panel in the toolbar
Widget integrated in the `AmbientazioneAperta` toolbar between "Conflict" and `IndicatoreSalvataggio` (Save Indicator). Horizontal layout: mm:ss display + Start/Pause/Resume (toggle that changes label and color) + Reset + two `number` inputs for min/sec. Inputs disabled while running/paused (visually grayed out + tooltip). `setInterval(200ms)` for the local display in Control (faster than the DisplayTimer's 100ms since the user watches the widget directly and perceives smoothness).

### D-059 — Audio: 1-min warning + intermittent expiry alarm (extended §0 exception)
Explicit extension of the audio exception (D-050 / M6) confirmed by the user:
- **1-min warning**: a long beep (~500ms, 620Hz sine, gain 0.3) ONCE when `running` drops below 60s. Tracked via a `useRef` reset on every transition out of `running`.
- **Expiry**: a short beep (~180ms, 820Hz square, gain 0.32) immediately at `stato === "ended"`, then every 2s via `setInterval(2000)` as long as `ended` persists. Cleaned up on state transition.

Both played **ONLY from Control** (`PannelloTimer` [Timer Panel] is Control-only). Web Audio API synthesis in-process, no files. The director clicked "Start" → valid user gesture to activate the AudioContext.

### Verified
- `npx tsc --noEmit` clean.
- `tauri dev`: start/pause/resume/reset OK, duration change OK with disable while running, banner visible on the Stage except in idle and during a conflict, long beep at 60s, intermittent beep from 00:00. Confirmed visually by the user.

---

## M8.2 — Initial character positions (2026-05-27)

### D-060 — `posizioneIniziale` (initial position) optional field in the manifest
Added `Personaggio.posizioneIniziale: Posizione | null` (default null). Validator accepts `undefined` or `null` on read → existing M5/M6 manifests remain valid (natural compat, no schema bump).

### D-061 — Only a global control, no per-character one
Per user feedback (the first M8.2 iteration had both): removed the entries from the character's ⋯ menu. **The only control is in the toolbar**: a "Positions ▾" dropdown with "Save all as initial" and "Restore all to initial". The per-character store actions (`salvaPosizioneInizialePersonaggio` etc.) stay in the store but are no longer exposed in the UI.

### D-062 — Opening the scenario automatically resets to initial positions
Per user feedback: opening the scenario must return ALL characters to their initial positions (if they have one). Implemented in `apri()` (open): after loading the manifest, in-memory mutation of `posizione = posizioneIniziale` for anyone who has one. `saveStatus` stays `"saved"` → no forced autosave, the on-disk file remains untouched with the "last positions" until the user actually moves someone. Idempotent: if nobody touches anything, the on-disk file never changes. If the user moves something, autosave saves the new positions as the "latest" — replaced again on the next open.

Practical effect: every "session" of the game always starts from the setup situation, regardless of where the characters ended up at the end of the previous session.

### Verified
- Compat: opened an M6 scenario (without `posizioneIniziale`) → read as null, no error.
- Save all → autosave writes the field to the manifest. Close/reopen → characters at their initial positions.
- Move + close + reopen → characters return to initial (not to "last"). Confirmed by the user.

---

## M8.3 — Final leaderboard with 3 objectives + podium (2026-05-27)

### D-063 — `obiettivi: [string, string, string]` (objectives) in the manifest
Added to the Scenario manifest. Default `["", "", ""]`. Natural compat (M5-M8.2 manifests without the field → read as default). Editable from Control via the leaderboard panel's objectives section; persisted with standard autosave.

### D-064 — Third objective as a PENALTY (−1 on the total)
Per user request in a UX iteration: the 3rd objective doesn't add, it **subtracts** from the total. Math: `total = (t[0] ? 1 : 0) + (t[1] ? 1 : 0) - (t[2] ? 1 : 0)`. Possible range: −1..+2. Visually:
- Label "Malus" (Penalty) (no "−1" badge — it clutters the visual clarity, the color is enough).
- Column header in red.
- Active cell: red background + red **✗** symbol (not ✓).
- Total number in red if < 0.

### D-065 — Ephemeral leaderboard (like the wheel)
`leaderboardStore` with a snapshot of the characters at the moment of `apri()` (open) (consistency if the user modifies the manifest while the leaderboard is open). `tick: Record<id, [bool, bool, bool]>` mutable, NOT persisted. On `chiudi()` (close) everything is cleared. Provider pattern toward `ambientazioneStore.payloadCorrente` just like `conflittoSnapshotProvider`.

### D-066 — Mutual exclusion with the conflict
Leaderboard and Wheel are both fullscreen overlays on the Stage (z-index 1000). Mutual exclusion handled by the Control buttons: "Conflict" disabled if the leaderboard is open and vice versa. The timer banner is hidden on the Stage during both overlay cases (`!mostraRuota && !mostraLeaderboard`).

### D-067 — Table in Control with fixed order + sorted Podium below
Per user feedback during iteration: the table shows rows in creation order (stable, avoids jumps during ticking). **Below** the table, on both screens, a new `ClassificaPodio` (Leaderboard Podium) component shows a horizontal row of portraits sorted by total descending. Tie-break by insertion order (stable sort).

### D-068 — Winners (including ties): crown + golden glow
On the podium, characters with `totale === maxTotale` receive:
- A 👑 emoji above the portrait (CSS "coronaIn" animation, 400ms ease-out on entry).
- A three-level golden-yellow drop-shadow on the portrait itself (`drop-shadow(0 0 10px) (0 0 22px) (0 0 36px)`).
- `translateY(-4px)` to slightly "raise" the winner.

Multiple winners tied → all get the treatment.

### D-069 — Font sizes proportional to the portrait
`ClassificaPodio` is reused in Control (64px portrait) and Stage (140px portrait). Fonts (name, score, crown) are computed inline as fractions of `dimensioneCerchietto` (portrait size) → identical look, scaled sizes. Avoids complex media queries.

### Verified
- `npx tsc --noEmit` clean.
- `tauri dev`: "Leaderboard" button in the Control toolbar, fullscreen modal with editable objectives section (autosave) + tick table + podium. Stage shows the synchronized table + podium. Click on a penalty cell → red ✗, total updated (-1). Podium reorders in real time, winner with crown + golden glow (including ties). Mutual exclusion with the conflict verified. Confirmed by the user.

---

## M12 — Fixes after testing on a real projector (2026-05-31)

Issues found while trying the build on a ~100" screen: elements
too small, "choppy" timer, game sounds muted in the build (but present in dev).

### D-070 — Scaled dimensions, not fixed pixels
Portraits, timer, and leaderboard used fixed px values (or `clamp()` with
too-low `max`): on a high-resolution projector they came out tiny.
- **Stage portraits** (`Scena.tsx`): diameter = `FRAZIONE_CERCHIETTO`
  (portrait fraction, 0.085) × the longer side of the rendered map. Scale with
  the map/screen. The object tile's "inset", previously a fixed `-10px`, is now
  proportional.
  Control (`AreaMappa`) stays in px: it's only the control preview, positions
  are relative, so the size mismatch doesn't break anything.
- **Timer** (`DisplayTimer.module.css`): `clamp(3rem, 11vmin, 22rem)` (was
  `clamp(3rem, 8vw, 6rem)` → the 6rem max blocked growth).
- **Leaderboard** (`ScenaLeaderboard`): portraits = a fraction of `vmin` via
  a new `useViewport` hook; font/box in CSS switched to `vmin` with higher maxes.

### D-071 — Audio unlocked on the first gesture (fix for muted sounds in the build)
The synthesized sounds (wheel tick, timer bell/alarm) were muted in the build
but worked in dev. Cause: in the production WebView the `AudioContext` is born
`suspended`, and calling `resume()` from a timer/effect (outside a user
gesture's call stack) is ignored by the autoplay policy. Web Audio synthesis
does NOT use codecs/GStreamer, so it wasn't a format issue.
Fix: a single `lib/audio.ts` module with one shared `AudioContext`, unlocked
on the first `pointerdown`/`keydown` in Control (`abilitaAudioAlPrimoGesto`
[enableAudioOnFirstGesture], hooked in `control/App.tsx`). `Ruota` (Wheel) and
`PannelloTimer` (Timer Panel) now import from here.

### D-072 — "Go!" sound at timer start
New `playInizioTimer` (playTimerStart) (two ascending notes). Plays when the
timer enters `running` (from idle or resume), to signal to everyone that time
is now running.

### D-073 — Smooth timer on the Stage (no more "stutters")
The Stage window has no focus → WebKitGTK throttles its
`setInterval` calls (the cause of the stutter every ~few seconds). Combined fix:
- `DisplayTimer` uses `requestAnimationFrame` to drive redraws and
  recomputes the remaining time from `Date.now()` on every render (not from a
  potentially stale `now` state).
- Control (in focus, not throttled) re-emits state 1x/sec while the
  timer runs (`PannelloTimer`), ensuring updates even if the Stage's rAF
  were to be slowed down. The `stage` re-authorizes the folder only on path
  change, so as not to fire a Tauri invoke every second.

### Verified
- `npx tsc --noEmit` clean; `npm run build` ok.
- To be validated on a real projector on the user's next test.

## M13 — Final audio + wheel/leaderboard polish (2026-05-31)

Iteration after testing on a real PC. The M12 audio approach (synthesized Web Audio API)
is SUPERSEDED: in production (WebKitGTK) Web Audio output is silent.

### D-074 — Timer beeps as MP3 via blob (not Web Audio)
Web Audio = silent in the build; only media file playback works, and in
particular from an in-memory `blob:` (the app's protocol doesn't respond to
media elements' Range requests → playback fails). The timer beeps (start/1-min/
expiry) are offline-synthesized MP3s (`scripts/gen_suoni.py`, in
`src/assets/suoni/`, versioned via a `.gitignore` exception), loaded with
`fetch → Blob → objectURL`, and unlocked on the first user gesture
(`lib/audio.ts::abilitaAudioAlPrimoGesto`). New "Go!" sound at timer start.

### D-075 — Wheel tick: NATIVE audio (Rust/rodio), not the webview
Webview audio has high and VARIABLE latency → the ticks kept drifting out of
sync (tried: tick-per-crossing, a pre-rendered WAV train, gating on the
'playing' event, measured-latency compensation — all unsatisfactory).
Solution: ticks go through the backend. A Rust thread owns the `OutputStream`
from `rodio` and plays a synthesized click on every `play_tick` command (a
Tauri command; the sender is an `mpsc` in a `Mutex` in state). The frontend
calls `play_tick` on the REAL on-screen crossing detected (`Ruota.tsx`, rAF on
`getComputedStyle.transform`) → low, constant latency, click in sync with the
pointer's crossing. Linux build dependency: `libasound2-dev` (ALSA).
`rodio` with `default-features = false` (we synthesize the samples, no decoder needed).

### D-076 — Smooth timer on the Stage
`DisplayTimer` recomputes the remaining time from `Date.now()` on every render (rAF)
and Control re-emits state at ~4 Hz while it runs (the unfocused Stage window
suffers local-timer throttling from WebKitGTK).

### D-077 — Portraits: same relative size on Control and Stage
Shared fraction `FRAZIONE_CERCHIETTO = 0.072` of the longer side of the rendered
map (`lib/scena.ts`), used identically by `AreaMappa` (Control) and `Scena`
(Stage). Timer and leaderboard scaled in `vmin` with high caps (previously the
`max` values in the `clamp()`s kept them small on large screens). Leaderboard
podium: removed the names below the portraits (they remain in the table).

### Verified
- `npx tsc --noEmit` clean; `npm run tauri build` ok (rodio/cpal compiled).
- On PC: wheel tick in sync and reliable (confirmed by the user). Timer beeps
  audible in the build. Dynamic sizing ok.

---

## M13 — Map annotations (emoji symbols + text) (2026-06-01)

### D-078 — Annotations: emoji symbols + text labels, positionable and resizable
User request: during a live session there was a need to mark
a zone made inaccessible by a game choice on the map, but there was no way to do it.
New type `Annotazione { id, tipo: "simbolo"|"testo", contenuto, posizione,
dimensione, colore }` (Annotation { id, type: "symbol"|"text", content, position,
size, color }) in `lib/ambientazione.ts`. **Symbols are emoji**
(no image file: they scale like text, same approach as the soundboard);
a list in `lib/scena.ts::EMOJI_ANNOTAZIONI` (~15: 🚫 ⛔ ⚠️ ❌ ✅ arrows 🔥 💀 🚩 ⭐ 🔒 ❓).
`dimensione` (size) is a **fraction of the longer side** of the rendered map (like
`FRAZIONE_CERCHIETTO`), so `font-size = dimensione × latoMaggiore` is identical in
Control and Stage (D-077). Available **both in edit and in play mode** (the button
in the toolbar is gated only on `mappaPath`), because the need arises live.

### D-079 — Interaction: reuse the character-drag pattern + uniform center-out resize
Drag with PointerEvents + `setPointerCapture` + `requestAnimationFrame` batching,
the same pattern as `AreaMappa` for characters. Selection kept **separate** from
that of characters (`annotazioneSelezionataId`): selecting one deselects
the other, so as not to have two active handles at once. Resizing via 4 corner
handles: **uniform** resizing (a single scalar `dimensione`, no asymmetric
deformation — suited to emoji/text), computed from the ratio between the
current pointer↔center distance and the initial one. Pure display component,
shared, `components/Annotazione.tsx` (like `Cerchietto`/`Quadratino`), used
read-only in `Scena` (Stage) and with a handle overlay in `AreaMappa` (Control).

### D-080 — Persisted in the manifest, backward-compatible with no schemaVersion bump
`annotazioni: Annotazione[]` added to `Ambientazione` and to `ScenaPayload`
(sync). Read as an **optional array** in `validaAmbientazione` (default `[]`):
previous scenarios open with no errors — same criterion used for
`obiettivi`/`soundboard`, so `schemaVersion` stays at 1. Annotations
persist (they are not temporary) and are removed by hand; resetting to initial
positions does not touch them.

> NOTE: D-080 has been **superseded** by D-085 (ephemeral gameplay): annotations
> added in "play" mode are no longer saved; only ones made in "edit" mode persist.
> See M14.

### Verified
- `npx tsc --noEmit` clean; `npm run build` ok.

---

## M14 — Annotation polish, ephemeral gameplay, NPCs (2026-06-01)

### D-081 — Text annotations: double-click to edit in place, multiline
The text is edited by **double-clicking directly on the map** (an inline
textarea in `AreaMappa`, state `annotazioneInModificaId` in the store), not from
an external toolbar. Enter = newline (`white-space: pre`, multiline e.g. "Cabin
locked\nneeds a key"); Esc/blur confirms. The draft is local and is committed only
on exit: empty text deletes the annotation (an empty `contenuto` is not
savable — `validaAnnotazione` would reject it on load).

### D-082 — Fixed red text with white outline; delete with Del key
Text color is **not editable**: bright red (`#ff2222`) with a 2px white outline
(`-webkit-text-stroke` + `paint-order: stroke fill`). Removal of a selected
symbol/text with the **Del/Backspace** key (a global listener in
`AreaMappa`, disabled while editing text or when focus is in a field) —
no more trash-can button. Icon-only toolbar buttons: "T" for text, an image
icon for the symbols menu; the "Soundboard:" label replaced by a volume icon.

### D-085 — EPHEMERAL GAMEPLAY: nothing is saved in "play" mode
Client decision: a game session must never alter the saved scenario.
`modifica()` (modify) marks "dirty" (→ autosave) **only in "edit" mode**;
in "play" mode it updates in-memory state + the Stage but does NOT write to
disk. So live movements, objects, and annotations are ephemeral: reopening
returns the scenario to its setup state. Supersedes D-080. The permanent
scenario is built only in "edit" mode. (Root cause of the original bug: autosave
was global, and positions returned to setup only if a saved `posizioneIniziale`
existed.)

### D-086 — Robust autosave + flush on close
`useAutosave` now reschedules the debounced save on EVERY "dirty" state
(not only on the saved→dirty edge) and self-recovers if it mounts with pending
changes → the indicator no longer gets stuck on "pending". `chiudi()` (close)
**flushes** any pending save before discarding the state (no lost
changes when closing the session).

### D-087 — NPC character
New `npc: boolean` flag on `Personaggio` (optional, defaults to `false` for
previous scenarios). NPCs are **excluded from the leaderboard**
(`leaderboardStore.apri` filters `!p.npc`) but remain **selectable in
conflicts** (the wheel, no filter). On the map they have a **dashed border**:
drawn as an SVG ring with controlled `stroke-dasharray` (the CSS `border: dashed`
gave huge dashes ~ as thick as the border itself). `Cerchietto` (Portrait) restructured
into an uncropped wrapper (ring + selection glow) + an inner cropped circle
(the image). NPC checkbox in the creation wizard and in the character's ⋯ menu.

### Verified
- `npx tsc --noEmit` clean; `npm run build` ok. Tried live by the user.

---

## Quality — tests, tooling, hardening (2026-06-05)

Cross-cutting quality work on the repository, with **no functional changes**.
Areas agreed with the user: automated tests, tooling & CI, security/robustness,
refactor & performance (moderate refactors, behavior unchanged).

### D-088 — Automated tests with Vitest on the pure logic
Introduced **Vitest** (dedicated config `vitest.config.ts`, `node` environment) with
53 tests, no mocks and no Tauri/DOM dependencies, on pure logic:
- `lib/ruota.ts` (wheel-math): slice renormalization, `+1`/`+2` absolute
  increments **before** renormalization, weighted winner at the boundaries and
  across the distribution, stop angle inside the winning slice. Coverage ~97%.
- `lib/scena.ts`, `lib/ambientazione.ts` (validation + backward-compat D-032),
  `state/timerStore.ts` (`remainingMs`, `formatMmSs`).
The functions already accepted an injectable `rand` / were deterministic: no
change to production code was needed to make them testable. Scripts: `npm test`,
`npm run coverage`.

### D-089 — ESLint (flat config) + Prettier
Added ESLint 9 (flat config: `typescript-eslint`, `react-hooks`,
`react-refresh`, `eslint-config-prettier`) and Prettier (`.prettierrc.json`).
The **"React Compiler"** rules introduced by `eslint-plugin-react-hooks` v7
(`purity` / `set-state-in-effect` / `refs`) are downgraded to **warnings**:
they flag patterns that work fine in this codebase, and promoting them to
errors would require rendering refactors out of scope. `npm run lint` exits clean
(0 errors, some informational warnings). Low-risk fixes applied:
`no-useless-escape` (removed a redundant `\/` in character classes) and a
dead assignment in `recents.ts`. Scripts: `lint`, `format`, `format:check`.

### D-090 — GitHub Actions CI
`.github/workflows/ci.yml`: a **frontend** job (lint, format:check, tsc, test,
build) and a **Rust** job (`cargo fmt --check`, `clippy -D warnings`, build) with
the WebKitGTK/ALSA system dependencies and cargo/target cache. Triggered on push and
PR to `main`.

### D-091 — Rust hardening (startup + folder authorization)
- `allow_ambientazione_folder`: now **validates** the path with
  `fs::canonicalize` (resolves symlinks, normalizes, fails if nonexistent) and
  requires it to be a directory **before** extending the fs/asset scope. To
  avoid breaking the frontend's scope matching (which uses the original path),
  both the original path and the canonical one are authorized.
- `copia_dir_ricorsiva` (recursive-copy-dir): documented that `DirEntry::file_type()` does not follow
  symlinks → no cyclic recursion.
- `run()`: no `expect()`/silent panic in release — on a startup error it
  logs to stderr and exits with code 1.

### D-092 — CSP: left as `null`, hardening deferred to GUI verification
The risk spec (CLAUDE.md §9) and the initial idea called for a restrictive
Content Security Policy. **Decision: for now `security.csp` stays `null`.**
Reasons:
1. The **pdf.js** worker is loaded as a bundled asset, and
   [Presentazione.tsx](../src/components/Presentazione.tsx) explicitly notes
   that it works *because of* `csp:null`; an incorrect CSP could break PDF
   rendering. Images (asset protocol), audio (blob), and PDF pages
   (canvas→blob) also depend on specific schemes.
2. The app is **local**: it loads only local files and bundled assets, no
   remote content; text annotations are rendered by React (already escaped).
   The XSS surface is therefore minimal and the marginal gain small.
3. A CSP touching these paths must be **verified live on Ubuntu**
   (Stage + PDF + audio), which is not possible in headless CI.
Candidate to test once the GUI can be tried:
`default-src 'self'; img-src 'self' asset: http://asset.localhost data: blob:;
media-src 'self' asset: http://asset.localhost blob:; script-src 'self' blob:;
worker-src 'self' blob:; style-src 'self' 'unsafe-inline';
connect-src 'self' ipc: http://ipc.localhost asset: http://asset.localhost`.
If pdf.js requires `'unsafe-eval'`, evaluate whether the remaining benefit
justifies the exception or whether to stay with `null`.

### D-093 — Readable error messages when opening a scenario
`stringifyErr` in `SelezioneAmbientazione` recognizes `CartellaNonValida`
(InvalidFolder), `AmbientazioneCorrotta` (CorruptedScenario), and `IOError`, and shows a clear message in
Italian (technical detail in parentheses). The UI already caught and displayed
errors without breaking: this only improves comprehensibility for the facilitator.

### D-094 — DOMMatrix for the spin angle
In `Ruota.tsx` the regex-based parsing of `getComputedStyle().transform` is replaced
by `DOMMatrix` (handles `matrix`/`matrix3d`/`none`). The 2D angle remains
`atan2(b, a)`: pointer wobble and audio tick unchanged.

### D-095 — Extracted the snapshot-provider registry; split of PannelloConflitto NOT done
The cross-store wiring (provider for conflict/timer/leaderboard/victory/
presentation + `leggiSnapshot` [readSnapshot]) is extracted from `ambientazioneStore.ts` to
`state/snapshotProviders.ts`, separating the wiring from the store's logic; the
`registra*` (register*) functions are re-exported from `ambientazioneStore` (API unchanged). `PannelloConflitto.tsx`
(456 lines) was **not** split: splitting a stateful component (a 3-step
wizard) can't be verified without a GUI and the gain is only in line
count — disproportionate risk for a tool used live. Possible
follow-up once the GUI can be tried.

### D-096 — Crash with multiple simultaneous sounds on WebKitGTK: GStreamer dependency + element reuse
**Symptom:** starting several sounds together (2 soundboard clips + background
music) caused the **entire app to close abruptly** on Ubuntu. **Cause:** missing
`gstreamer1.0-plugins-bad`, which provides the `fakevideosink` element used by
WebKitGTK for **audio-only** media; without it, the GStreamer pipeline fails and
the webview's WebProcess crashes, taking down the Tauri process with it. It was NOT a
codec problem (`avdec_mp3`/`libav` were present) nor an application-code problem.
**Interventions (risk reduction at multiple levels):**
1. Documented the runtime dependency in the **README prerequisites**
   (`gstreamer1.0-plugins-good/-bad`, `gstreamer1.0-libav`) with an explanation
   of the symptom.
2. Declared it as a **package dependency** of the `.deb` in `tauri.conf.json`
   (`bundle.linux.deb.depends`): final installs pull it in automatically,
   so the non-technical user never hits the crash.
3. **Hardened the soundboard code**
   ([PannelloSoundboard.tsx](../src/control/views/PannelloSoundboard.tsx)): reuses
   a single `HTMLAudioElement` per slot instead of creating a new one on every click,
   avoiding the accumulation of GStreamer pipelines (defense-in-depth, in addition to
   the package fix). The timer beeps ([audio.ts](../src/lib/audio.ts)) already reused
   their elements.

### Verified (quality effort)
- `npm test` (53 passed), `npm run coverage` (ruota.ts ~97%).
- `npm run lint` (0 errors), `npm run format:check` clean, `npx tsc --noEmit` ok,
  `npm run build` ok.
- `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo build` ok.
- NOT verified live via GUI (headless environment): the behavior-unchanged
  changes need to be retried by the user in a real session (opening a scenario,
  the wheel with `+1`/`+2`, PDF, audio, timer, leaderboard).

### D-097 — Asset/image robustness and micro-optimizations (post-M14)
Polish work, behavior unchanged.
**Bugs fixed:**
1. The `resize` fallback in [Scena.tsx](../src/components/Scena.tsx) and
   [AreaMappa.tsx](../src/control/views/AreaMappa.tsx) registered and removed two
   different arrow functions → the listener was never actually removed. Now uses the same
   reference. (Rare path: in the Tauri WebView `ResizeObserver` always exists.)
**Robustness:**
2. `onError` on the map image (Scena/AreaMappa) → an explicit placeholder
   "map not found" instead of a silently empty scene if the file is missing.
3. `onError`/`onLoad` on [Cerchietto](../src/components/Cerchietto.tsx) and
   [Quadratino](../src/components/Quadratino.tsx): missing asset → hides
   the "broken image" icon, leaving the colored border as a neutral fill.
4. New helper [lib/immagine.ts](../src/lib/immagine.ts)
   (`cropDiPartenzaDaImmagine` [startingCropFromImage]) with a timeout (5s): a locked/unreadable
   file no longer hangs the wizard. Centralizes logic duplicated across the two wizards.
**Performance:**
5. The `imgDim` "safety net" effect in Scena constrained to its real dependencies
   (`imgDim`, `mappaPath`, container dimensions): no longer re-runs on every render.
6. O(1) object→character lookup (a memoized Map) instead of a linear `find()`
   for every character on every emit.

### Verified (D-097)
- `npm run lint` (0 errors), `npm test` (53 passed), `npm run build` ok.
- NOT verified live (headless environment): to be retried in a real session
  (opening a scenario, moving characters, Stage fullscreen, the wheel,
  and the missing map/asset case that now shows the placeholder).
