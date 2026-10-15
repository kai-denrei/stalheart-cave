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
| WASD | Horizontal forward / back / strafe relative to heading |
| Mouse | Turn heading / orbit chase-camera elevation; click to capture the pointer |
| Arrow keys / drag | Alternative look controls |
| Space | Climb |
| Shift | Descend |
| Q | Activate LiDAR once processed; subsequent presses send a wide scan |
| 1 / 2 / 3 | LiDAR depth / phosphor / motion views |
| V | Optical view, including red-flare navigation after lamp failure |
| F | Drop one of six red flares |
| E, held for 3 seconds | Place the bomb close to the Queen while hovering |
| Esc / P | Pause / resume |
| M | Mute / unmute |

Flight uses a stabilized quadcopter controller with limited acceleration, momentum, hover, automatic braking, and visible pitch/roll from thrust. WASD keeps horizontal flight independent of camera elevation; Space climbs and Shift descends. The chase camera follows ISAO and shortens or shifts its boom near the cave walls. Drop the payload to fly and climb faster.

The descent is untimed. There is no waypoint or exact bomb socket: “Place the bomb close to the Queen.” Hold E while hovering anywhere in the broad region around her. The charge drops from the chosen position. Placement starts a 65-second fuse and removes the payload's weight. Return up the shaft and through the sinkhole to reach the surface.

There are no automatic breadcrumbs. Flares are physical, persistent, red lights with occlusion. ISAO initially carries a small forward work light: the first collision interrupts it for 3.5 seconds, the second permanently disables it. The optical camera keeps working so flares remain visible. In passages they eject a short distance and lodge in the wall, including inside the vertical shaft; in the chamber they fall to the floor. They reveal nearby rock even in LiDAR mode. You have six for the entire trip, replenished only on restart. Flares, enemy motion, and the fuse all pause with the game.

The fuse continues after ISAO reaches the surface or his signal is lost. At zero, a surface view shows the underground blast: the sinkhole and its rim tremble, a pressure ring and dust lift from the ground, and smoke rises from the opening. After this sequence, the result shows recovery of ISAO, successful delivery with ISAO lost, or loss before the charge was armed. ISAO has 12 HP; each wall, tentacle, creature, egg or Queen collision costs one HP, with 1.4 seconds between registered impacts. A sustained grab can cause further damage. There are no collision exemptions at low speed.

## Current prototype — 0.5

- Stalheart's actual irregular sinkhole rim, bowl, rubble, seven contours, and `tronColors` palette. The opaque bottom cap is opened into a navigable throat. Shared shape and look modules are frozen local copies.
- A widened cave with three branches: the main passage has a straight, 105 m drop; a second passage also reaches the 180 m Queen chamber; a third ends blindly. Rendered openings and collision use the same passage network.
- Third-person flight with the actual animated ISAO-Birudorōn model, rotating propellers, state-based faces, and quadcopter body tilt.
- Twelve regular Cutis-Soft Ivory creatures, five authentic Cutis-gorogoro casting appendages, and four animated Reed creatures.
- Sixty-four faster wall appendages with longer reaches across the passage and damage on contact.
- 1,600 eggs, plus a bounded pool of freshly laid eggs. Eggs visibly emerge beneath the Queen, fall, and settle; the cycle continues throughout the mission.
- The original Ovum mesh from Creature Lab at over twice its previous scale, with an enlarged abdomen, slow translation and turning, contractions, and an egg duct.
- Six player-deployed red flares, free placement close to the Queen, and extraction without a marked return trail.
- An explosive 3,200-puff smoke burst with 100× the prior minimum launch speed (1,400 m/s) and 100× shorter release window (0.09 seconds). A sustained jet connects the cloud to its source 15 m inside the sinkhole; stronger ground movement, a rapid pressure wave and fast camera retreat frame the eruption.
- A small work light, then six red flares after damage. Halfway down, ISAO processes LiDAR for four seconds and unlocks muted depth, phosphor, and motion views. All surveyed surfaces share a wave at 105 m/s from ISAO, with depth jitter, flicker and missing returns. 170 m LiDAR sweeps, restrained CRT effects, ISAO's comms face, captioned dialogue, flight ambience, and Stalheart's tremor/explosion sounds.
- ISAO’s original recorded “Strike inbound. Three. Two. One.” replaces the countdown beeps. The final numbers align with three, two and one seconds remaining; pause suspends both the recording and the fuse.
- Pause on focus loss, restart, mute, keyboard look fallback, and reduced camera motion when requested by the OS.

This is a separate project; it does not modify or integrate into the main Stalheart game. The sinkhole uses an extracted open-bowl adapter rather than the whole game's breach lifecycle. Its surrounding surface is a local patch. The proxy tank has been removed. ISAO uses his original GLB and animation clips. Ovum uses the original surface mesh with prototype deformation, not Creature Lab's full soft-body simulation. Dialogue is captioned; the final countdown uses ISAO’s existing recording. Scans do not provoke enemies or retain historical geometry. Desktop keyboard/mouse only.

## Verification

```sh
npm run check
npm test
npm run test:browser
```

The browser check uses the locally installed Google Chrome (`CHROME` can override its executable), owns and cleans up its server and browser, and captures visual stages. It tests the ISAO model and chase camera, real WASD/Shift/Space input, independent altitude, flare inventory/persistence/reset, multiple bomb positions, Queen movement and egg production, countdown continuity after rescue, ground motion/smoke, all endings, 12 HP and physical contact with all five hazard categories, progressive lamp failure and recovery, the recorded countdown and its pause state, all three LiDAR modes and frozen captures of the common reveal wave, physical flight through both Queen routes, and exploration of the blind branch. Captures and reports are written under ignored `artifacts/`.

## Structure

- `src/mission.js`: route, collision boundary, placement region, inventory, mission state.
- `src/world.js`: rendering, moving tentacles, and world composition; `src/cave.js`: branching cave mesh.
- `src/flight.js`: stabilized quadcopter physics; `src/isao.js`: actual model, animation, and chase camera.
- `src/creatures.js`: Ivory, Gorogoro, and Reed inhabitants; `src/fx/cutis-maku/` and `src/fx/gorogoro/`: frozen creature kits.
- `src/detonation.js`: surface tremor, pressure ring, dust, and smoke.
- `src/sinkhole.js`: Stalheart's open-bowl entrance adapter.
- `src/nursery.js`: chamber, eggs, Queen deformation and egg-laying cycle.
- `src/flares.js`: six physical route-marking flares and local illumination.
- `src/main.js`: flight, input, dialogue, HUD; `src/audio.js`: local audio.

Three.js r160 matches Stalheart. See `ASSETS.md` and `assets.lock.json` for source snapshots.

## Publishing

Push to `main` to check, build, and deploy the game through GitHub Actions. GitHub Pages serves `dist/`, containing the game and its local assets. `npm run build` creates the same static output locally.
