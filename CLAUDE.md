# GDR Teambuilding Tool — Specification for Claude Code

> Starting document for building the tool from scratch. Read it in full before writing any code. The `## CONSTRAINTS` and `## TO VERIFY FIRST` sections contain the points that determine the architecture: respect them.

---

## 0. What this tool is

A tool for live-running a simplified tabletop role-playing game (RPG) session, used in a corporate teambuilding context. The facilitator (the "director") uses a laptop connected to a projector. The projector shows a **map** with **characters** (portraits with a face) that the director moves and to which they attach **objects**. Conflicts between characters are resolved with an animated **fortune wheel** that replaces dice.

**Who uses it**: a NON-technical person. The interface must be self-explanatory, forgiving of mistakes, with no developer terminology.

**Three main features**:
1. Map + character + object management
2. Fortune wheel (conflict resolution)
3. ~~Bluetooth speaker management~~ **REMOVED** (see below)

### Audio: OUT OF SCOPE
Audio routing has been removed from the requirements. The facilitator manages two speakers manually from two separate devices (laptop + phone). **The tool must NOT touch audio in any way.** Do not implement MP3 playback, output device selection, or any audio API. If you find leftovers of this requirement elsewhere, ignore them.

---

## 1. Tech stack (DECIDED — do not propose alternatives)

- **Desktop framework**: **Tauri v2** (stable, latest v2.x). Cross-platform desktop app for **Ubuntu, Windows, macOS**. Uses the OS's WebView, does not bundle a browser. Lightweight binary.
- **Frontend**: **React + TypeScript + Vite**.
- **State**: Zustand (simple, suited to state shared across windows). Avoid Redux (overkill).
- **Styling**: CSS modules or Tailwind, your choice. Priority: clear UI for non-technical users, not elaborate aesthetics.
- **Filesystem**: use the Tauri v2 **`@tauri-apps/plugin-fs`** and **`@tauri-apps/plugin-dialog`** plugins to read/write the scenario folders. Do NOT use the browser's File System Access API (not needed, you have native access).
- **Wheel animation**: CSS rotation with `transform: rotate()` + `transition` with a decelerating `cubic-bezier`. No heavy libraries.

### Why Tauri and not something else (context, not up for debate)
Electron is too heavy. A pure web app would break folder-saving on Firefox/Ubuntu (the File System Access API is Chromium-only). Tauri gives true cross-platform + native filesystem + an installed-app UX for a non-technical user. This choice has already been validated with the client.

---

## 2. Two-window architecture

Two distinct Tauri windows, managed by the Rust core:

- **CONTROL window** (`control`): on the laptop's display. Contains all the controls. This is where assets are loaded, characters are moved, objects are assigned, the wheel is launched.
- **STAGE window** (`stage`): dragged by the director onto the projector (extended screen) and set to fullscreen. Shows **only** the map with the characters, or the wheel when active. No buttons, no control UI.

### Communication between windows
**TO VERIFY FIRST** (see §9): in Tauri v2 use the **native event system** (`emit` / `listen` from `@tauri-apps/api/event`), NOT `BroadcastChannel`. `BroadcastChannel` is unreliable between separate Tauri WebViews. State lives in the Control window (source of truth); every change is emitted as an event and the Stage reflects it read-only.

Flow: CONTROL modifies state → `emit('stage:update', payload)` → STAGE receives via `listen` → redraws.

### Stage window behavior
- Default: shows the fullscreen map with the characters.
- The **mouse cursor disappears after a few seconds of inactivity** over the Stage window (e.g. 3s), reappears on movement. Implement with a timer + `cursor: none`.
- When the director launches a conflict, the Stage switches to the **wheel view**; once the conflict is resolved, it returns to the map.
- No control element must ever appear here.

---

## 3. SCENARIOS (saved to a folder)

A **scenario** is a complete package: map + characters + objects + positions + assignments. We will build several different scenarios over time.

- On startup, the tool shows a **scenario selection** screen: a list of existing scenarios + a "New scenario" button.
- Each scenario is a **folder on disk** chosen/created by the user via a native dialog.
- Proposed folder structure (adapt it if you have better reasons, but document it):

```
ScenarioName/
  ambientazione.json        # manifest: all serializable state
  mappa.<ext>               # map image
  personaggi/
    <id>.<ext>              # original uploaded image for each character
  oggetti/
    <id>.<ext>              # image for each object
```

- `ambientazione.json` contains: references to image files, for each character (name, color, face crop/centering parameters: zoom + x/y offset, position on the map x/y, assigned objects), for each object (name, optional default modifier value), and any other state.
- **Saving**: on reopening the scenario, everything must return exactly as it was (cropped characters, colors, positions, attached objects). Save on change (autosave) or with an explicit, clearly visible "Save" button — your choice, but the non-technical user must not lose work. Recommendation: autosave + a "saved" indicator.

---

## 4. MAP + CHARACTER + OBJECT MANAGEMENT

### 4.1 Map
- The user loads an image (native dialog). It becomes the scene background, both in Control (at reduced/scrollable scale) and in Stage (fullscreen).
- The map is the main element of the Stage: it must fill the window sensibly (configurable contain/cover; default `contain` so as not to crop content).

### 4.2 Character creation
When creating a character, in CONTROL:
1. **Load an image** of the character (native dialog).
2. **Center the face in the circle**: the image is shown inside a circular mask; the user adjusts **zoom** (slider or scroll) and **position** (drag the image inside the mask) until the face is centered. **This is manual pan/zoom, NOT automatic face detection.** Save the parameters (zoom, offsetX, offsetY) in the manifest so the crop is reconstructible.
3. **Assign a name**.
4. **Assign a color** (color picker). Constraint: **different characters must have different colors** — validate and prevent/warn on duplicates. This color is:
   - the **border of the portrait** on the map,
   - the color of the character's **slice** in the fortune wheel.

The resulting portrait = image cropped to a circle + colored border ring.

### 4.3 Objects
- Object images are loaded (during scenario setup). Each object has an image and a name.
- **Assignment**: happens ONLY in the CONTROL window. The director assigns an object to a character → the object appears **attached to the portrait** (e.g. a small icon beside/above the circle) both in Control and in Stage, and stays there until the director removes it.
- A character can have multiple objects attached. Decide on a clean layout for multiple objects around the circle (e.g. in a row below/beside it). Document the choice.
- Objects can act as **modifiers** in the wheel (see §5).

### 4.4 Movement
- Portraits are moved with free **drag and drop** on the map.
- Dragging happens in CONTROL; the position is reflected in real time on STAGE via events.
- Attached objects move together with the portrait.

---

## 5. FORTUNE WHEEL

Replaces dice. Resolves a **conflict** (dispute) between 2 or more characters.

### 5.1 Creating the conflict
1. The director opens the wheel and **selects which characters** are in conflict (2 or more).
2. By default, each selected character has an **equal probability** → equally-sized slices. E.g. 2 characters = 50%/50%; 3 = 33.3% each; etc.
3. Each slice shows **the character's face inside it** (the cropped portrait) and is colored with the **character's color**.

### 5.2 Modifiers
Probabilities can be altered with modifiers. **Only two types**: `+1` and `+2`.

**Calculation rule (CRITICAL, read carefully):**
- `+1` = increases the character's **original slice by 20%**.
- `+2` = increases the character's **original slice by 40%**.
- "Original slice" = the base share given by the equal split, BEFORE modifiers.
- Examples:
  - 2 characters (base 50% each). `+1` on one = +20% of 50% = +10 points → that character goes up, and **the probabilities are then renormalized** so the total stays at 100%.
  - 3 characters (base 33.3% each). `+1` = +20% of 33.3% ≈ +6.67 points on that slice, then renormalize.
  - `+2` with 3 characters = +40% of 33.3% ≈ +13.3 points, then renormalize.

> **IMPLEMENTATION NOTE**: the "+20%/+40% of the original slice" defines by how much the modified character's slice grows. After applying the increments, **renormalize all slices so the sum is 100%** (the wheel is a full circle). Make explicit in the code, with a comment, how you handle the renormalization, because this is the easiest point to get wrong. If several characters have modifiers, apply all the absolute increments first and then renormalize just once.

**Modifier origin** — two cases:
- **Modifier from an OBJECT**: the director drags/assigns an object as the source of the bonus. The **bonus slice shows the object's image** inside it.
- **Modifier NOT from an object**: the director enters **text** justifying the bonus (e.g. "numerical superiority"). That **text is shown inside the bonus slice**.

> Interpretation to be confirmed (see §10): the "bonus slice" is a visually distinct portion of the character's slice (e.g. an adjacent sub-slice, in the character's color but marked with the object icon or the text), so the advantage's source is clear at a glance. If you have a better idea for making this readable on the wheel, propose it before implementing.

### 5.3 Animation and resolution
- The wheel **spins with animation**: it accelerates, then **slows down and stops** on a winner (natural deceleration, `cubic-bezier`). This moment of tension is the heart of the mechanic in front of the audience, take care over it.
- Winner extraction must be **consistent with the probabilities** (the point where it stops truly corresponds to the weighted slices). Implement by first choosing the weighted winner, then computing the stopping angle inside their slice (so the animation doesn't "cheat").
- At the end of the spin, clearly highlight the winner.
- The wheel appears on **STAGE** when launched; the controls (character selection, modifiers, "Spin" button) stay in **CONTROL**.

---

## 6. UX and interface principles

- **Italian language**, simple, zero technical jargon (no "JSON", "asset", "render"; use "ambientazione" [scenario], "personaggio" [character], "salva" [save]).
- Tolerance for mistakes: confirmations before destructive actions (deleting a character, overwriting). No silent irreversible action.
- Constant visual feedback: what is selected, what is saved, which window is the Stage.
- The CONTROL window can be dense with controls; the STAGE must remain very clean.
- A visible button to **open/position the Stage window** and set it to fullscreen on the second monitor.

---

## 7. Suggested project structure

```
src/
  windows/
    control/        # Control UI
    stage/        # Stage UI (read-only)
  components/
    Map/            # map + portraits + attached objects
    CharacterCreator/  # image loading, pan/zoom circular mask, color, name
    ObjectManager/
    Wheel/          # wheel: slice geometry, modifiers, animation, weighted extraction
  state/            # Zustand store (source of truth in Control)
  lib/
    events.ts       # wrapper around Tauri emit/listen
    storage.ts      # load/save scenario (plugin-fs + plugin-dialog)
    wheel-math.ts   # slice calculation, modifiers, renormalization, weighted winner
src-tauri/          # Rust core, window config, plugins
```

---

## 8. Recommended build order

1. Scaffold Tauri v2 + React + Vite. Verify the build on at least one platform.
2. Two windows (Control + Stage) + working event-based communication (a synchronized counter as proof).
3. Scenario selection/creation + save/load to folder (filesystem).
4. Map + character creation (pan/zoom circular mask, color, name) + drag and drop + sync to Stage.
5. Objects + assignment/attachment to the portrait.
6. Wheel: weighted slice geometry → modifiers + renormalization → decelerating animation → consistent weighted extraction → Stage view.
7. UX polish: disappearing cursor, Stage fullscreen, confirmations, autosave.

Proceed by verifiable milestones; do not write everything in one go.

---

## 9. TO VERIFY FIRST (known technical risks)

1. **Events between Tauri v2 windows**: confirm that `emit`/`listen` propagate state between the Control window and the Stage window. Build a minimal proof (a counter) before proceeding. Do NOT rely on `BroadcastChannel`.
2. **Wheel rendering on WebKitGTK (Ubuntu)**: the Linux WebView may have micro-differences in CSS animation smoothness compared to Windows/Mac. Test the wheel animation on Ubuntu early. If it's choppy, consider `requestAnimationFrame` with manual rotation instead of a pure CSS `transition`.
3. **plugin-fs permissions in Tauri v2**: v2 uses a capabilities/permissions system for filesystem access. Configure permissions correctly for reading/writing to folders chosen by the user, otherwise saving fails silently.
4. **Second monitor / fullscreen**: verify the Tauri API for moving and fullscreening the Stage window on the extended display. If there is no reliable programmatic positioning control, have the user drag the window manually and offer only the fullscreen toggle.

---

## 10. POINTS TO CONFIRM WITH THE CLIENT (ask before assuming)

1. **Visual rendering of the "bonus slice"** in the wheel (§5.2): how should the bonus portion be shown visually, with an object icon or text? Propose a mockup before implementing it.
2. **Multiple objects attached to a character** (§4.3): preferred layout around the portrait.
3. **Autosave vs. manual save** (§3): proposed default is autosave; confirm.
4. **After conflict resolution**: is the wheel discarded, or is a history of outcomes kept? (Assumption: no history, return to the map.)
5. **Deleting a character already set up in a conflict**: expected behavior (assumption: the conflict is recalculated).

> If a point remains ambiguous during coding, choose the simplest, most reversible option, and flag the assumption made.
