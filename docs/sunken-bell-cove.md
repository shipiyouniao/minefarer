# Side story: A Bell on the Water

This optional Chapter Two story starts after Pressure Cove. Returning to Old Ferry gives Nia a once-only invitation to investigate a bell from the eastern branch. It does not block the main route or expose the boss before meeting it.

## Complete route

1. **Old Ferry:** finish the invitation to accept the side quest and open the physical eastern path.
2. **Driftwood Bank:** explore a new persistent shoreline, find the stranded convoy and reach its pier. The return path and the lower bridge remain mine-free; mines occupy optional banks, not the through road. The regional map, local map and quest location all point to this scene.
3. **Passing Bays:** direct two boats that need to exchange shores through one junction. Each boat can wait or sail to one adjacent berth. Choose both orders, inspect the forecast, then launch them together. A side bay lets one boat yield while the other crosses.
4. **Narrow Channel:** the unchanged second puzzle has two junctions and offset refuge bays. The orange supply boat moves at half speed. Both boats run on the same clock, including occupied waiting berths and opposite-direction edge crossings. Reaching a destination docks the boat outside the lane.
5. **Three-way Junction:** a third boat joins, with three competing destinations, one central junction and side refuges. All three orders must leave space for subsequent trips. A shortest solution takes six dispatches, with no hard limit.
6. **The Tangled Harbor:** a 29×23 chart has 24 berths linked by long, winding channels, branching junctions and dead-end passing bays. Two local loops offer alternatives, while narrow connecting reaches still require boats to yield. Every channel is reversible and there is no dispatch limit, timed gate or extra pickup order: the objective remains bringing each boat to its home dock. Bends are part of a continuous voyage, so players plan between real berths rather than click every corner. Undo and reset preserve travelled-cell accounting. After all four arrive, the convoy returns home and the protagonists investigate the inner cove.
7. **Wreckback Crab:** floor five combines Minesweeper deductions with whole-voyage combat. Victory awards 800 supplies, the permanent **Pilot Bell** equipment license and its Recollection entry. The bell costs two loadout points and starts an expedition with one extra scan (cap four) and one extra shield (cap two). The world pier permanently changes to a restored dock. This is the side story's end, not a gateway blocking the main campaign.

The first two puzzles are a distinct dispatch minigame, not another sluice room. Their water is already charted. Previewing or rejecting a collision never spends a resource, moves a boat or changes a save. A shortest solution takes four dispatches in the introduction and five in the second chart; players can use longer schedules. Every reachable accepted dispatch state has a completion route, so a bad but legal choice cannot softlock the puzzle.

## Boss rules

Four berths surround the crab's island. Each has two directed routes: an inner reach and a longer outer reach. Departing or hauling back commits a whole voyage and advances one round. A berth being safe does not make the route safe: every intermediate square is checked against the frozen attack forecast.

The long outer route winds the boat's harpoon. On a later charged trip, crossing a gold flank automatically fires. The shot consumes the charge and moves the vulnerability to the opposite shore. Claw sweeps rotate independently of the boat. Below half health, the sweep covers both lanes on one shore and the previous trip leaves dangerous backwash. Baseline explorers have a damage-free solution at every difficulty and starting berth; armor, attack equipment and survival relics retain their relevant effects. Opening-strike and safe-turn relic charges cannot be farmed by previewing or repeated voyages.

Ordinary attacks, walking and manual end-turn actions cannot bypass naval turns. The channels begin covered, with real floating mines on every reach and revealed bank clues. A berth permits soundings along its two outgoing routes. Players must reveal safe route cells and flag the mine; the boat can tow at most one flagged cell per voyage. Filling a route with flags cannot authorize departure. The committed voyage removes the towed mine and recomputes surrounding clues. Surveying, marking and using tools keep the announced attack frozen. Public-clue solvers can clear the channels without guessing or spending equipment. Recollection reuses this encounter independently of the rescue puzzles and omits story dialogue. It only enters the player's selectable pool after a recorded victory. Adding it does not alter the legacy default boss roster or its seeded ordering.

## Presentation and persistence

Gray water outside the current sounding range still accepts reversible flags and safe notes. Only revealing, probing and sonar require sounding range; notes neither move the boat nor advance combat, and survive save replay.

- Shared dialogue bar, portraits, voiced typewriter, reveal-skip and semantic person/place styling; completed scenes never replay on return.
- Board-attached tutorials on floors one, three and four, illustrated help, blue/orange/green/violet boat identities, destination markers, route previews and collision locations. Larger fleets show compact orders with a selected boat's controls.
- Simultaneous boat animations share the simulation clock, including the slower boat. The crab performs a sweep, a hit flash and a returning harpoon; reduced motion retains brief feedback.
- Input stays locked during committed motion. Navigation, pause or disposal cancels owned animations and releases dock/geometry observers.
- The default naval and dispatch views fit their complete chart above the measured action dock; settlement continues measuring the chart independently after that dock is removed. A CSS fallback also keeps the row count valid before measurements mount. The shared zoom button still offers larger cells. A lethal voyage opens defeat settlement after its feedback finishes.
- The quest advances through finding the convoy, rescuing it and investigating the bell. The final unlock appears in the reward panel, not inside dialogue.
- `wreck-harbor-v3` uses one independent campaign journal containing five floors. The first three charts are unchanged. Orders persist as two to four berth IDs; undo/reset and soundings are explicit journal actions. Geometry and timing are reconstructed from the catalog. A rejected preview writes nothing.
- `wreck-rumor`, `wreck-crew-found`, `wreck-convoy-home` and `wreck-silenced` record durable world outcomes. Currency and boss ownership settle once at victory; closing dialogue grants neither. An interrupted ending is recovered in the world.
- Other campaign IDs and rules revision 16 remain valid. An unfinished trial of this side story's older topology is retired at the persistence boundary with its bounded return checkpoint; its uncompleted dialogue ledger resets. Completed side stories retain their rewards, including the new equipment license. Browser fixtures use isolated saves; private preview pages are not shipped.

## Verification

`tests/convoy.test.ts` enumerates reachable puzzle states, timings, collisions and stage transitions. `tests/wreck-story.test.ts` follows the physical world route, reloads accepted actions, checks retreat/reward isolation and verifies the restored bidirectional path. `tests/keelcrab.test.ts` covers whole-path hits, one-shot charging, five difficulties and four starting berths, relic consumption and shared progress. `tests/keelcrab-replay.test.ts` reloads each accepted Recollection voyage at all five difficulties, including coordinates beyond the ordinary arena envelope. `tests/browser/wreck.mjs` drives the complete invitation, dispatch, boss, ending and defeat settlement through the production UI on desktop/touch in Chinese, English and Japanese.

[Boss artwork provenance](keelcrab-artwork.md) and [Pilot Bell artwork provenance](pilot-bell-artwork.md). Human playtest acceptance of this expanded side story is pending.
