# Scenarios pre-installed in the bundle

Each subfolder of this folder is an "official" scenario that gets
included in the tool's installer package (`.deb` / AppImage / `.msi` / `.dmg`)
and automatically installed into the user's data folder on first launch.

## How to add a factory scenario

1. Create or edit a scenario with the tool as usual (`Selection → New scenario`).
2. Locate the generated folder (the full path is visible in the Control
   window's header, under the name of the open scenario).
3. Copy the entire folder into `scenari-bundled/`, keeping the same
   name (e.g. `scenari-bundled/Treno deragliato/`).
4. Check that the structure is:
   - `ambientazione.json` (manifest)
   - `personaggi/<uuid>.<ext>` (character images)
   - `oggetti/<uuid>.<ext>` (object images)
   - `mappa-<uuid>.<ext>` (map image, if present)
5. `git add scenari-bundled/<ScenarioName>/` + commit.
6. `npm run tauri build` produces a binary that includes it.

## What NOT to do

- Do not manually edit the paths in `ambientazione.json` (they are relative to the folder).
- Do not move files outside the expected subdirectories.
- Do not use folder names with special characters (`/`, `\`, `:`, etc.).

## Behavior on startup

On first launch, the binary:
- Reads the list of subfolders in this folder (via the bundle's resource
  directory).
- Copies them into `<appDataDir>/Scenari/<ScenarioName>/` if not already present.
- Adds each one to the tool's "recent scenarios" list.
- Keeps a tracking file `<appDataDir>/factory-installed.json` with the names
  installed.

Subsequent launches do NOT recopy scenarios already tracked. The user can therefore:
- Modify a factory scenario (autosave saves to THEIR copy, leaving
  the bundle untouched).
- Delete a factory scenario (it is NOT restored on restart).
- Click "Restore pre-installed scenarios" on the selection screen
  to force an overwrite with the bundle's version.

## Updates between tool versions

If you release a new version of the tool with a modified factory scenario,
users who already installed the previous version do NOT receive
the update automatically. They must use "Restore pre-installed scenarios"
manually (this overwrites their changes).
