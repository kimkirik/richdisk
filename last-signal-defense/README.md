# LAST SIGNAL — 20 SECTOR CAMPAIGN

A dependency-free tactical tower defense game, hosted independently on Sites and Vercel. GitHub is a source backup only.

## Play

- 20 distinct maps across five regions: flooded city, polar facilities, molten industry, biohazard zone and orbital void.
- Each stage contains three continuous waves. After initial deployment, waves 2 and 3 begin automatically after a two-second game-time supply break. Every wave includes a scaled Titan; stages 4, 8, 12 and 16 end with a full commander, and stage 20 ends with the Void Sovereign.
- Eight defense machines: Gatling, Cryo, Tesla, Missile, Railgun, Plasma, Siege Cannon and Nova Core. Later machines unlock as stages advance.
- Twelve enemy types include fast swarms, shield walkers, phasing specters, repair drones and armored siege units.
- Select a machine, then tap a `+` pad. Select a built machine to upgrade or recover 70% of invested energy.
- The `1×`, `2×` and `3×` controls change the whole simulation: movement, firing, projectile flight, damage over time and tactical cooldowns. Keyboard shortcuts: `1`, `2`, `3`; Space pauses when the page body has focus.
- Clear all three waves to unlock the next sector. Stars and the highest unlocked stage are saved locally in the browser. A new stage starts with fresh units, core health, resources and 1× speed.
- The map selector offers practice mode for all 20 maps. Practice does not change campaign progress.
- Music begins on the first deliberate interaction. Reduced-motion preferences suppress debris and screen shake. Hidden tabs temporarily suspend game time and audio; returning automatically resumes the operation, while a manual pause or open stage-selection dialog remains paused.

## Architecture

The current entry point is `src/app.js`; it is readable source and requires no build step.

- `src/data.js`: maps, routes, pads, machine/enemy attributes and wave composition.
- `src/engine.js`: deterministic fixed-step simulation, economy, combat and skills.
- `src/renderer.js`: cached procedural maps, sprite rendering and bounded battle effects.
- `assets/campaign.css`: responsive HUD with a full portrait 9:16 battlefield, upright sprites, readable compact controls and the desktop 16:9 board.

All runtime assets use relative URLs. No CDN, external font, authentication or API is required. Earlier production bundles remain as historical assets but are not loaded by `index.html`.

## Local run

From this folder:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173/`. Relative assets also support deployments under `/richdisk/last-signal-defense/`.

## Verification

```sh
node --test tests/*.test.mjs
node tests/balance-pilot.mjs
```

43 regression tests cover all 20 maps and 60 waves, stage unlocks, speed equivalence, pause guards, delayed missile damage, armor penetration, distinct tower effects, skill conditions, rewards, restart, endings, visibility recovery, automatic wave timing and pause guards. The balance pilot uses the same engine and resource constraints as a player; it is evidence that every stage is clearable, not a replacement for human difficulty testing.

Responsive browser checks: 1363×936, 390×844, 320×568 and 844×390. Campaign stage completion, next-stage unlock and persistence after reload were also exercised through the actual UI.

## Mobile view and orchestral score

Portrait phones display the entire battlefield with a 90-degree camera turn. Roads and placement points keep their geometry; buildings, units and labels remain upright. At 390×844 the map occupies about three quarters of the viewport area, with 12–19px primary labels and compact icons. Landscape phones use a 124px control sidebar and the full remaining rectangle for the battlefield (about 85% of an 844×390 viewport). Units stay proportional, towers are larger, regular enemies are about 1.5× larger, and bosses have a readable health HUD. Announcements no longer cover the middle of combat.

Music begins on the first deliberate interaction. The ♪ button toggles music and effects. Three synchronized 48-second orchestral stems blend between preparation, battle and boss encounters. Music keeps its original tempo at 1×/2×/3×, pauses with the game or hidden tab, and resumes without stacking players. Audio downloads only after interaction (about 1.73 MB total). Instrument credits are in `assets/music/CREDITS.md`.
