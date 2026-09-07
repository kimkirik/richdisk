# LAST SIGNAL — 20 SECTOR CAMPAIGN

A dependency-free tactical tower defense game for GitHub Pages.

## Play

- 20 distinct maps across five regions: flooded city, polar facilities, molten industry, biohazard zone and orbital void.
- Each stage contains three waves. Commanders appear in stages 4, 8, 12 and 16; the Void Sovereign appears in stage 20.
- Eight defense machines: Gatling, Cryo, Tesla, Missile, Railgun, Plasma, Siege Cannon and Nova Core. Later machines unlock as stages advance.
- Twelve enemy types include fast swarms, shield walkers, phasing specters, repair drones and armored siege units.
- Select a machine, then tap a `+` pad. Select a built machine to upgrade or recover 70% of invested energy.
- The `1×`, `2×` and `3×` controls change the whole simulation: movement, firing, projectile flight, damage over time and tactical cooldowns. Keyboard shortcuts: `1`, `2`, `3`; Space pauses when the page body has focus.
- Clear all three waves to unlock the next sector. Stars and the highest unlocked stage are saved locally in the browser. A new stage starts with fresh units, core health, resources and 1× speed.
- The map selector offers practice mode for all 20 maps. Practice does not change campaign progress.
- Sound is opt-in. Reduced-motion preferences suppress debris and screen shake. Changing browser tabs pauses the operation.

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

Open `http://localhost:4173/`. The same files also work under `/richdisk/last-signal-defense/` on GitHub Pages.

## Verification

```sh
node --test tests/*.test.mjs
node tests/balance-pilot.mjs
```

34 regression tests cover all 20 maps and 60 waves, stage unlocks, speed equivalence, pause guards, delayed missile damage, armor penetration, distinct tower effects, skill conditions, rewards and restart. The balance pilot uses the same engine and resource constraints as a player; it is evidence that every stage is clearable, not a replacement for human difficulty testing.

Responsive browser checks: 1363×936, 390×844, 320×568 and 844×390. Campaign stage completion, next-stage unlock and persistence after reload were also exercised through the actual UI.

## Mobile view and orchestral score

Portrait phones display the entire battlefield with a 90-degree camera turn. Roads and placement points keep their geometry; buildings, units and labels remain upright. At 390×844 the map occupies about three quarters of the viewport area, with 12–19px primary labels and compact icons. Landscape phones use a compact control sidebar.

Music begins on the first deliberate interaction. The ♪ button toggles music and effects. Three synchronized 48-second orchestral stems blend between preparation, battle and boss encounters. Music keeps its original tempo at 1×/2×/3×, pauses with the game or hidden tab, and resumes without stacking players. Audio downloads only after interaction (about 1.73 MB total). Instrument credits are in `assets/music/CREDITS.md`.
