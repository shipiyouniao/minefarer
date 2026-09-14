# Recollection generation and variety

Recollection does not load the authored campaign boards. Each departure stores its seed and selected families; each floor derives a new seed and generates its terrain and mechanisms. Reloading the same departure intentionally reproduces its original board.

## Exploration construction

All five families retain the ordinary dungeon's exact mine count, connected safe floor, varied entrance, distant exit and three treasure chests. Mechanisms do not remove mines or reveal safe rectangles. River navigation prunes safe water that cannot be reached through the generated currents; it preserves every mine. A displaced treasure is relocated instead of discarded.

- **Ordinary:** uses the existing dungeon generator directly.
- **Relays:** generates 2–3 controls on 9-wide boards, 2–4 on 11/13-wide boards and 3–5 on 15/17-wide boards. Every control has a nonzero, truthful neighborhood clue. All controls must be physically operated before the stairs open.
- **Power routing:** generates 2–4 selectors, with counts scaled by board size. The graph varies between cascades, branching trees and two circuits. At least one downstream dependency is present. Each A/B branch leads to another selector or a required console; there are no decorative dead branches. There are 3–6 terminal consoles, determined by the generated graph. Connections point to earlier nodes, making cycles impossible. After placement, these references become actual board positions.

Control locations spread across the reachable minefield instead of forming one cluster. Terrain generation accepts a room only when every required control has a legal numbered location. Its bounded fallback retains seed variation and must meet the same placement condition; it cannot silently drop objectives to make a room fit.

Switches change power, not physical access. Every terminal's ancestor selectors can therefore be configured in order, and recorded terminals remain complete after rerouting. The tests enumerate every selector state in representative layouts and complete the resulting room through the real interaction rules.

## Chapter Two families

Completion of Reed Channels unlocks **Tidal sluices**. A new generated routing graph controls disjoint horizontal or vertical strips of 2–5 cells. Strips contain both safe cells and mines, and their lengths, directions, count and controlling feeds vary. Removing all moving cells must leave a connected static shore; every moving position must touch that shore. Thus every safe tile stays reachable under any sequence of strip rotations. Selectors and consoles remain fixed. Flags and other tile-bound knowledge travel with their cells; ordinary numbers are recomputed.

Completion of Pressure Cove unlocks **River navigation**. A fresh dungeon seed generates the water minefield, then a spring or circulation field supplies public current directions independently of hidden mine truth. Downstream and cross-stream edges determine the reachable component. Unreachable safe cells become banks; the remaining component must retain at least 75% of the original safe floor. Endpoints, 1–3 moorings and three chests are selected within that component. Sounding requires an anchored boat; sailing requires discovered water. The recorded rope provides a return along the route actually sailed. This generator does not import authored campaign rows.

Both generators use bounded candidate retries with the same invariants. They cannot fall back to a campaign template, reduce the mine budget or discard required objectives. Chapter unlock tests reject premature departures; accepted-action tests cover new floors and exact reloads. Boss entry removes exploration-only water and current state.

## Existing bosses

All eight families still enter through their existing procedural generators. Recollection changes the eligible boss pool and removes arrival dialogue; it does not substitute a fixed campaign arena. Mirror retains two independently varied minefields. Clock keeps its established central boss/bypass geometry, and Echo retains the related entrance geometry, while their minefields and objective placements vary.

The existing bounded generation and verified tactical fallback rules remain in effect. Sampling checks variation rather than promising that random draws can never coincide or that every possible seed avoids a fallback. Ordinary Recollection also retains the dungeon's existing deduction guarantees; this change does not claim a complete no-guess solution for every generated exploration board.

## Boss draw bag and camp presentation

New departures snapshot the selected boss catalog and its remaining draw bag. Entering a boss arena removes that boss and commits the remaining IDs in the same save as the accepted action. Reloading replays from the departure snapshot without consuming another draw. Subsequent departures use the saved remainder. Exhaustion refills the selected catalog; pools larger than one also avoid repeating the last boss across a refill. Changing the selected boss catalog starts a fresh bag. Existing journals without a bag retain their original seeded order.

The lantern opens above the persistent camp board. Difficulty, floor families and boss families have separate configuration views reached from a compact summary. Shops, loadout facilities, missions and achievements also open as independent dialogs; changing facilities requires closing the dialog and walking to the other landmark. The former expedition preparation page and temporary story shortcut are no longer entry points.

New campaign departures without a boss snapshot an exploration-only reward policy. Their rewards exclude relics that only modify turn-based attacks, armor or action points, while retaining hybrid exploration/survival effects. Existing journals preserve their original offer pool so accepted relic choices still replay.

## Reproduce the audit

`tests/recollection-randomness.test.ts` runs under both compilers in the normal test suite. It samples every exploration family at every floor density of all five difficulties, plus every boss family at each difficulty. It checks exact mine counts and measures mine placement independently of character and objective positions. It checks both Mirror boards separately. At least 90% of the sampled minefields must differ; exploration entrances and exits must also vary. Structural tests separately require multiple relay counts, at least eight power graph shapes per board size, useful A/B branches and acyclic dependencies.

For the larger audit used for this change, compile the tests, then run with `RECOLLECTION_RANDOM_SEEDS=128`:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.test.json --outDir .native/tests
RECOLLECTION_RANDOM_SEEDS=128 node --test .native/tests/tests/recollection-randomness.test.js
```

PowerShell uses `$env:RECOLLECTION_RANDOM_SEEDS = '128'` before the test command. With all five exploration families, the expanded audit covers 23,040 exploration layouts and 5,120 boss entries, including 640 additional Mirror boards. The test output lists distinct minefields for every difficulty/family/floor group. These checks complement accepted-action completion and exact-save-replay tests.

The historical September 11, 2026 run, before the two Chapter Two families were added, on Node 22.18.0 with TypeScript 7.0.2 passed all 148 groups. Every group produced 128 distinct primary minefields; all five Mirror groups also produced 128 distinct secondary minefields. This is measured sample evidence, not a claim of uniqueness across the entire seed space.

The September 14, 2026 expanded run with the Chapter Two families passed all 220 groups: each produced 128 distinct primary minefields, and all five Mirror groups produced 128 distinct secondary minefields. Separate river/tide tests cover directed access, varied mechanisms, arbitrary switch sequences, chapter unlocks and accepted-action reloads.
