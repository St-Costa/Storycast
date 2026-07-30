# Facilitator usage guide

How to run a live session with Storycast, from first launch to closing the game.

---

## 1. Starting up

On launch, you land on the **scenario selection** screen: a list of recent and pre-installed scenarios, plus:

- **Create** — start a brand new scenario from an empty folder.
- **Choose folder…** — open a scenario that isn't in the recent list (e.g. from a USB drive).
- **Restore pre-installed scenarios** — re-copies the factory scenarios bundled with the app, overwriting any local edits to them.

Each scenario in the list opens with two buttons:

- **Edit** — build or update the scenario. Every change is **autosaved**.
- **Open (play mode)** — run a live session. Nothing you do here is saved; closing and reopening always resets to the last edited setup.

> Use **Edit** beforehand to prepare everything, and switch to **play mode** only once you're ready to run the session in front of a group — that way nobody can accidentally overwrite your setup mid-game.

---

## 2. Preparing a scenario (Edit mode)

Inside an open scenario, the toolbar at the top holds the main actions; the sidebar on the left lists characters and objects; the map fills the center.

1. **Set the map** — click *Set map…* and pick an image. It becomes the background both in the control window and on the projection.
2. **Create a character** — the character wizard walks through three steps:
   - Pick an image.
   - Center the face inside the circular mask (zoom with the slider/scroll wheel, drag to reposition), then confirm.
   - Name the character and pick a color. Each character needs a distinct color — already-used colors are disabled in the picker.
   - Optionally mark the character as an **NPC** (dashed border on the map; excluded from the leaderboard, but still selectable in conflicts).
3. **Create an object** — same idea, a shorter two-step wizard (image, then crop + name).
4. **Position everyone** — drag characters (and objects, which follow the character they're attached to) to where you want them on the map.
5. **Assign an object to a character** — open a character's **⋯** menu → *Object* → pick one from the list. Assigning an already-assigned object moves it from its previous owner.
6. **Save the starting layout** — once positions look right, use *Save/restore starting positions* in the toolbar to lock them in as the session's starting point. Every time you (re)open the scenario, characters snap back to these saved positions — whatever happened in the last live session is discarded.
7. Everything above is **autosaved** — watch the save indicator in the toolbar (dirty → saving → saved) rather than looking for a "Save" button.

---

## 3. Running the session (play mode)

1. Open the scenario in **play mode**.
2. Drag the **Stage** window onto the projector/second screen, then click **Fullscreen projection** in the toolbar. Press `Esc` on the Stage window to exit fullscreen later. The mouse cursor auto-hides over the Stage after a few seconds of inactivity.
3. From here, everything happens from the Control window while the audience only ever sees the Stage:
   - **Move characters** — drag and drop on the map; objects move with their owner.
   - **Reassign objects** — same **⋯** menu as in edit mode.
   - **Annotate the map** — add emoji symbols or text labels (e.g. to mark a blocked area); drag to reposition, use the corner handles to resize, `Delete`/`Backspace` to remove a selected one.
4. **Nothing done in play mode is saved.** Reopening the scenario always resets to the setup you locked in during Edit mode.

---

## 4. Resolving a conflict with the fortune wheel

1. Click **Conflict** in the toolbar (needs at least 2 characters).
2. Select which characters are involved. By default each gets an equal-size slice.
3. Optionally give someone a modifier: **+1** or **+2**, sourced either from an object they're carrying or from a short typed justification (e.g. "numerical advantage"). The bonus shows up as a distinct portion of their slice.
4. Click **Spin the wheel** — the wheel appears on the Stage, spins with a natural deceleration, and lands on a winner consistent with the weighted odds. A synced tick sound plays from the Control window as the pointer crosses each region.
5. **Close and return to the map** to dismiss the wheel and go back to the live scene.

---

## 5. Timer

- Set a duration, then **Start**. **Pause**/**Resume** and **Reset** are available; the duration itself can only be changed while idle or after it ends (use *Reset* first to change it mid-session).
- Shown on the Stage as a countdown banner — hidden automatically during a conflict, so the wheel isn't distracting.
- A short "Go!" sound plays on start, a warning beep at the 1-minute mark, and an intermittent alarm once it hits zero.

---

## 6. Leaderboard

- Define up to three objectives from the leaderboard panel. The third objective is a **penalty** (marked in red): reaching it *subtracts* a point instead of adding one.
- Click a character's row to toggle each objective for them (*click to add* / *click to remove*).
- A podium view ranks characters by total score; whoever's in the lead (ties included) gets a crown and a golden glow.
- Leaderboard state is **ephemeral**, like the wheel — it resets when you close it, nothing is written to the scenario file.

---

## 7. Soundboard and extras

- **Soundboard** — quick buttons to play short sound effects you've loaded into the scenario.
- **Background music** — start/stop a looping track, with its own volume control.
- Both are muted by default when the app starts; the OS's own volume mixer controls overall output. The tool never touches audio routing or output-device selection.

---

## Troubleshooting / things to know

- **Accidentally closed the Stage window?** Reopen it from the Control window's *Fullscreen projection* control — it re-fullscreens on trigger.
- **Made changes you didn't mean to keep during a live session?** Nothing in play mode is saved — just close and reopen the scenario to reset to the last edited setup.
- **Need to change something structural mid-session** (add a character, fix a color)? Close the session, switch to **Edit**, make the change, save, then reopen in play mode — edits made live in play mode don't persist.
- **A character got deleted while set up in an active conflict?** The conflict recalculates automatically rather than referencing a character that no longer exists.

---

See the [main README](../README.md) for a feature overview, and [`DEVELOPMENT.md`](DEVELOPMENT.md) for how to build and run the tool from source.
