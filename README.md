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
| F | Drop one of ten red flares |
| E, held for 3 seconds | Place the bomb close to the Queen while hovering |
| Esc / P | Pause / resume |
| M | Mute / unmute |

Flight uses a stabilized quadcopter controller with limited acceleration, momentum, hover, automatic braking, and visible pitch/roll from thrust. WASD keeps horizontal flight independent of camera elevation; Space climbs and Shift descends. The chase camera follows ISAO and shortens or shifts its boom near the cave walls. Drop the payload to fly and climb faster.

The descent is untimed. There is no waypoint or exact bomb socket: “Place the bomb close to the Queen.” Hold E while hovering anywhere in the broad region around her. The charge drops from the chosen position. Placement starts a 65-second fuse and removes the payload's weight. Return up the shaft and through the sinkhole to reach the surface.

There are no automatic breadcrumbs. Flares are physical, persistent, red lights with occlusion. ISAO initially carries a small forward work light: it survives the first collision, and the second permanently disables it. The optical camera keeps working so flares remain visible. Flares fall under gravity, bounce off cave surfaces, slide down steep walls and settle on floors. A flare dropped into the vertical shaft falls all the way to the chamber. They reveal nearby rock even in LiDAR mode. You have ten for the entire trip, replenished only on restart. Flares, enemy motion, and the fuse all pause with the game.

The fuse continues after ISAO reaches the surface or his signal is lost. At zero, a surface view shows the underground blast: the sinkhole and its rim tremble, a pressure ring and dust lift from the ground, and smoke rises from the opening. After this sequence, the result shows recovery of ISAO, successful delivery with ISAO lost, or loss before the charge was armed. ISAO has 12 HP; each wall, tentacle, creature, egg or Queen collision costs one HP, with 1.4 seconds between registered impacts. A sustained grab can cause further damage. There are no collision exemptions at low speed.

## Current prototype — 0.8

- Stalheart's actual irregular sinkhole rim, bowl, rubble, seven contours, and `tronColors` palette. The opaque bottom cap is opened into a navigable throat. Shared shape and look modules are frozen local copies.
- A widened cave with three branches: the main passage has a straight, 105 m drop; a second passage reaches the far wall of the 180 m Queen chamber, about 100 m from the shaft entrance; a third ends at a rough rock plug joined to the tunnel mesh, with the same stone shading. The early maze has 59 m of additional bends, making the ten flare markers more useful on the return. Rendered openings and collision use the same passage network; portal triangles are clipped at their shared boundaries and branch mouths have matching end planes. The surface ground and bowl share rim vertices.
- Exterior light remains through the whole sinkhole bowl. Daylight fades gradually below the 13.2 m-deep throat and along the first 65 m of passage, without resetting at the fork.
- Third-person flight with the actual animated ISAO-Birudorōn model, rotating propellers, state-based faces, and quadcopter body tilt.
- Twelve regular Cutis-Soft Ivory creatures, five authentic Cutis-gorogoro casting appendages, and four Reeds running Creature Lab’s actual soft-body reach, plant, pull and settle gait.
- A 48 m quiet approach, with the first creatures at 58 m. Life builds deeper in: 64 wall appendages grow more active and crowded. Selected bodies and nine appendages have faint green bioluminescent veins; most remain dark.
- 1,600 eggs, plus a bounded pool of freshly laid eggs. Eggs visibly emerge beneath the Queen, fall, and settle; the cycle continues throughout the mission.
- The original Ovum mesh from Creature Lab at over twice its previous scale, with an enlarged abdomen and Creature Lab’s native six-limb physical reach, plant and pull gait on a 0.2× clock. The abdomen follows the limbs, with slow translation, turning, contractions, moving root tethers and an egg duct. The LiDAR skin and limb collisions follow the deformation.
- Ten player-deployed red flares, free placement close to the Queen, and extraction without a marked return trail.
- Underground pressure and smoke originate at 25.2 m depth, twelve metres below the throat. Small puffs travel up the conduit for roughly 0.35 seconds before bursting outward at the mouth. Each billboard pixel clips against Stalheart’s irregular bowl, keeping smoke inside the opening until it emerges. The burst rapidly loses lift and accumulates as a dense ground-hugging cloud spreading outward; the camera follows the low surge. A sustained jet, ground tremor, pressure wave and delayed camera retreat frame the blast.
- The work light survives the first impact and fails permanently on the second, when a message prompts “Use the Flares (F) for temporary light.” Ten gravity-driven red flares provide temporary illumination. Halfway down, ISAO processes LiDAR for four seconds and unlocks muted depth, phosphor, and motion views. All surveyed surfaces share a wave at 105 m/s from ISAO, with depth jitter, flicker and missing returns. 170 m LiDAR sweeps, restrained CRT effects, ISAO's comms face, captioned dialogue, flight ambience, and Stalheart's tremor/explosion sounds.
- ISAO’s original recorded “Strike inbound. Three. Two. One.” replaces the countdown beeps. The final numbers align with three, two and one seconds remaining; pause suspends both the recording and the fuse.
- Each registered hit flashes a red halo around ISAO and plays the supplied rock, tentacle or slime impact. The Queen has a one-time entrance cue. Faint, low-pass-filtered alien calls alternate across the stereo field after the quiet approach, growing more frequent deeper in. Distant reverb fills long silences; dialogue and effects take priority.
- Pause on focus loss, restart, mute, keyboard look fallback, and reduced camera motion when requested by the OS.

This is a separate project; it does not modify or integrate into the main Stalheart game. The sinkhole uses an extracted open-bowl adapter rather than the whole game's breach lifecycle. Its surrounding surface is a local patch. The proxy tank has been removed. ISAO uses his original GLB and animation clips. Ovum uses Creature Lab’s original cage and soft-body solver, with a cave adapter for slow motion, an enlarged render abdomen and egg laying. Dialogue is captioned; the final countdown uses ISAO’s existing recording. Scans do not provoke enemies or retain historical geometry. Desktop keyboard/mouse only.

## Verification

```sh
npm run check
npm test
npm run test:browser
npm run test:refinements
npm run test:hive
```

The browser check uses the locally installed Google Chrome (`CHROME` can override its executable), owns and cleans up its server and browser, and captures visual stages. It tests the ISAO model and chase camera, real WASD/Shift/Space input, independent altitude, flare inventory/persistence/reset, multiple bomb positions, Queen movement and egg production, countdown continuity after rescue, ground motion/smoke, all endings, 12 HP and physical contact with all five hazard categories, second-hit lamp failure, the recorded countdown and its pause state, all three LiDAR modes and frozen captures of the common reveal wave, physical flight through both Queen routes, and exploration of the blind branch. The focused refinement check covers gradual daylight, the quiet approach, the rock closure, supplied sound playback, hit halo lifetime, native Reed motion and the smoke’s passage through the throat. The hive check captures the longer maze, far wall portal, native Queen deformation and low smoke. Ray tests check the junction surfaces against their flight boundaries. Captures and reports are written under ignored `artifacts/`.

## Structure

- `src/mission.js`: route, collision boundary, placement region, inventory, mission state.
- `src/world.js`: rendering, moving tentacles, and world composition; `src/cave.js`: branching cave mesh; `src/surface-clip.js`: shared portal boundaries.
- `src/flight.js`: stabilized quadcopter physics; `src/isao.js`: actual model, animation, and chase camera.
- `src/creatures.js`: scene integration; `src/reed.js`: native Reed actor adapter; `src/fx/`: frozen creature runtime snapshots.
- `src/detonation.js`: blast rendering, bowl clipping and camera data; `src/smoke.js`: renderer-independent emission and motion.
- `src/sinkhole.js`: Stalheart's open-bowl entrance adapter.
- `src/nursery.js`: chamber, eggs, Queen scene and egg-laying cycle; `src/queen-motion.js`: native Ovum actor adapter.
- `src/flares.js`: ten physical route-marking flares and local illumination.
- `src/main.js`: flight, input, dialogue, HUD; `src/audio.js`: local audio and owned playback; `src/audio-cues.js`: contact mapping and quiet-time policy.

Three.js r160 matches Stalheart. See `ASSETS.md` and `assets.lock.json` for source snapshots.

## Publishing

Push to `main` to check, build, and deploy the game through GitHub Actions. GitHub Pages serves `dist/`, containing the game and its local assets. `npm run build` creates the same static output locally.

## Main-game integration boundary

The PoC still owns its own scene and loop. Its host adapters now keep portable behavior separate: `createReedActor(buffer, manifest)` exposes native physics, `smokeParticle(seed, age, out)` supplies smoke motion, `exteriorExposure(y)` uses the shared throat height, and `impactCue(kind)` plus `createQuietWindow()` own audio policy. `createIsao().flashHit(time)` provides body feedback. All use simulation time; pause freezes motion, effects and sound scheduling. Frozen creature source, original solver C, local assets and hashes ship with this repository. The main game will still need to provide its surface frames, scene lifecycle and asset loader.
