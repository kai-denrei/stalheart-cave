# STÅLHEART / BELOW

A standalone, playable endgame experiment for Stalheart. MÖRK cannot enter the sinkhole. The player remotely pilots ISAO, an unarmed fabricator carrying the colony's payload, into the living passages beneath the surface.

[Play BELOW](https://kai-denrei.github.io/stalheart-cave/) · [Source on GitHub](https://github.com/kai-denrei/stalheart-cave)

## Play locally

Requires Node 22+ and a desktop browser with WebGL. No install step, account, or network assets.

```sh
npm start
# http://localhost:5186
```

Use `PORT=5187 npm start` to choose another port. The server binds to localhost only.

| Control | Action |
| --- | --- |
| WASD | Forward / back / strafe |
| Mouse | Look; click the feed to capture the pointer |
| Arrow keys / drag | Alternative look controls |
| Space / C (or left Ctrl) | Ascend / descend, including straight down the shaft |
| Shift | Boost |
| Q | Activate LiDAR after lamp failure; subsequent presses send a wide scan |
| F | Drop one of six flares |
| E, held for 3 seconds | Place the bomb close to the Queen while hovering |
| Esc / P | Pause / resume |
| M | Mute / unmute |

Flight is stabilized, with inertia and automatic braking. Release movement keys to hover. Look down into the sinkhole and descend through its narrow throat. Follow the upper passage to the long vertical drop. Use C to descend and Space to climb, or look straight down/up and fly forward.

The descent is untimed. There is no waypoint or exact bomb socket: “Place the bomb close to the Queen.” Hold E while hovering anywhere in the broad region around her. The charge drops from the chosen position. Placement starts a 105-second fuse and removes the payload's weight. Return up the shaft and through the sinkhole to reach the surface.

There are no automatic breadcrumbs. Flares are physical, persistent, orange lights with occlusion. In passages they eject a short distance and lodge in the wall, including inside the vertical shaft; in the chamber they fall to the floor. They reveal nearby rock even in LiDAR mode. You have six for the entire trip, replenished only on restart. Flares, enemy motion, and the fuse all pause with the game.

The three outcomes are recovery of ISAO, successful delivery with ISAO lost, and loss before the charge is armed.

## Current prototype — 0.2

- Stalheart's actual irregular sinkhole rim, bowl, rubble, seven contours, and `tronColors` palette. The opaque bottom cap is opened into a navigable throat. Shared shape and look modules are frozen local copies.
- An upper passage followed by one straight, 105 m vertical shaft, opening into the ceiling of a 152 m chamber. The geometry and collision system share the same route.
- Fourteen slow wall appendages with longer reaches across the passage and damage on contact.
- 1,600 eggs, plus a bounded pool of freshly laid eggs. Eggs visibly emerge beneath the Queen, fall, and settle; the cycle continues throughout the mission.
- The original Ovum mesh from Creature Lab at over twice its previous scale, with an enlarged abdomen, contractions, and an egg duct.
- Six player-deployed flares, free placement close to the Queen, and extraction without a marked return trail.
- Narrow optical lighting, lamp failure, 170 m depth-colored LiDAR sweeps, restrained CRT effects, ISAO's comms face, captioned dialogue, flight ambience, and Stalheart's tremor/explosion sounds.
- Pause on focus loss, restart, mute, keyboard look fallback, and reduced camera motion when requested by the OS.

This is a separate project; it does not modify or integrate into the main Stalheart game. The sinkhole uses an extracted open-bowl adapter rather than the whole game's breach lifecycle. Its surrounding surface is a local patch. MÖRK and the fabrication tool are proxy geometry. Ovum uses the original surface mesh with prototype deformation, not Creature Lab's full soft-body simulation. Dialogue is captioned, not voiced. Scans do not provoke enemies or retain historical geometry. Desktop keyboard/mouse only.

## Verification

```sh
npm run check
npm test
npm run test:browser
```

The browser check uses the locally installed Google Chrome (`CHROME` can override its executable), owns and cleans up its server and browser, and captures visual stages. It tests real keyboard input, flare inventory/persistence/reset, multiple bomb positions, continuing egg production, all endings, and a complete physical descent and ascent through both elbows and the shaft. Captures and reports are written under ignored `artifacts/`.

## Structure

- `src/mission.js`: route, collision boundary, placement region, inventory, mission state.
- `src/world.js`: rendering, cave mesh, moving tentacles, flight-view attachments.
- `src/sinkhole.js`: Stalheart's open-bowl entrance adapter.
- `src/nursery.js`: chamber, eggs, Queen deformation and egg-laying cycle.
- `src/flares.js`: six physical route-marking flares and local illumination.
- `src/main.js`: flight, input, dialogue, HUD; `src/audio.js`: local audio.

Three.js r160 matches Stalheart. See `ASSETS.md` and `assets.lock.json` for source snapshots.

## Publishing

Push to `main` to check, build, and deploy the game through GitHub Actions. GitHub Pages serves `dist/`, containing the game and its local assets. `npm run build` creates the same static output locally.
