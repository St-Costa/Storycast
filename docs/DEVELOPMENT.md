# Development guide

How to set up, run, and build the GDR Teambuilding Tool from source.

---

## Prerequisites

- **Node.js** (≥ 20; tested on 24) and **npm**
- **Rust** (stable toolchain; tested on 1.95) → [rustup](https://rustup.rs/)
- **Tauri v2 system dependencies** — see the [official guide](https://tauri.app/start/prerequisites/).
  - **Ubuntu/Debian** specifically needs WebKitGTK 4.1 and ALSA (for native audio):
    ```bash
    sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
      libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
      libasound2-dev
    ```
    > `libasound2-dev` (ALSA) is **required** to compile `rodio` (native wheel ticks).
  - **Runtime audio (Ubuntu/Debian)** — playing sounds inside the webview
    (background music, soundboard, timer beeps) needs the GStreamer plugins:
    ```bash
    sudo apt install gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-libav
    ```
    > **Important:** without `gstreamer1.0-plugins-bad`, the `fakevideosink`
    > element that WebKitGTK uses for **audio-only** media is missing. In that
    > case, playing **more than one sound at once** (e.g. soundboard +
    > background music) **crashes the entire app** (WebKit's WebProcess dies
    > outright). `libav` is needed to decode MP3. The `.deb` packages produced
    > by `tauri build` already declare these dependencies and install them
    > automatically.

---

## Running in development

```bash
# Install frontend dependencies
npm install

# Start the app in dev mode (opens Control + Stage)
npm run tauri dev
```

Other scripts:

```bash
npm run dev       # frontend only, Vite (no Tauri shell)
npm run build     # type-check (tsc) + frontend build (vite)
```

### Code quality

```bash
npm test           # tests (Vitest) for pure logic: wheel, scene, validation, timer
npm run coverage   # same, with a coverage report
npm run lint       # ESLint (flat config, TS/React)
npm run format     # Prettier: rewrites files in place
npm run format:check  # Prettier: check only (used in CI)
```

For the Rust backend, from the `src-tauri/` folder:

```bash
cargo fmt --all                 # format
cargo clippy --all-targets -- -D warnings   # lint
cargo test                      # Rust tests (if any)
```

The same checks run in **CI** (GitHub Actions, `.github/workflows/ci.yml`)
on every push and PR to `main`: lint, formatting, type-check, tests, and build
for both the frontend and the Rust backend.

---

## Production build

```bash
npm run tauri build
```

Produces native packages in `src-tauri/target/release/bundle/` (format depends on the platform: `.deb`/AppImage on Linux, `.msi`/`.exe` on Windows, `.dmg`/`.app` on macOS). Scenarios in `scenari-bundled/` are included as bundle resources.

### Regenerating timer sounds

Timer beeps are MP3s synthesized offline and versioned in the repo. Regenerating them requires `ffmpeg`:

```bash
python3 scripts/gen_suoni.py
```

---

## Project structure

```
src/
  control/          # Control-window UI (App, views, wizards, panels)
    views/          #   panels/wizards, grouped by feature:
                    #     scenario/ mappa/ personaggi/ conflitto/ timer/
                    #     leaderboard/ voti/ presentazione/ soundboard/
    components/     #   circular-mask crop editor, save indicator
  stage/            # Stage-window UI (read-only)
  components/       # shared display components: Cerchietto (portrait), Quadratino (object tile), Ruota (wheel), Annotazione, podium, victory animation…
  state/            # Zustand stores: scenario, conflict, timer, leaderboard, victory + autosave hook
  lib/              # pure logic and utilities: wheel-math, storage, events, scene, colors, audio, recents…
  assets/suoni/     # timer beeps (MP3s synthesized offline, versioned)
src-tauri/          # Rust core, window config, capabilities, native audio ticks
scenari-bundled/    # "factory" scenarios pre-installed in the bundle (e.g. "Treno deragliato")
scripts/gen_suoni.py # regenerates the timer beep MP3s
docs/DECISIONS.md   # architectural decision log and deviations from spec
CLAUDE.md           # the project's authorial specification
```

### On-disk scenario format

```
ScenarioName/
  ambientazione.json     # manifest: all serializable state (schemaVersion 1)
  mappa-<uuid>.<ext>     # map image
  personaggi/<uuid>.<ext>  # characters
  oggetti/<uuid>.<ext>     # objects
  audio/                 # optional soundboard / background-music clips
```

Selected images are **copied** into the scenario folder (not merely referenced), so each scenario stays self-contained. Character positions are normalized to `0..1` relative to the map.

---

## Internal documentation

- **[`CLAUDE.md`](../CLAUDE.md)** — the full authorial specification (requirements, constraints, UX).
- **[`docs/DECISIONS.md`](DECISIONS.md)** — a dated log of architectural decisions, assumptions, and deviations from spec, milestone by milestone. The reference for understanding *why* things are built the way they are.
- **[`docs/USAGE.md`](USAGE.md)** — how a facilitator runs a live session with the tool.
