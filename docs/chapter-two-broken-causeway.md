# Chapter Two, stage three: Broken Causeway

Pressure Cove now opens a physical road from Old Ferry to Forked Bank. The next main task leads across a broken walkway to the Intake Steps, following the sound of the upstream backflow. The optional convoy rescue is not a prerequisite.

## Crossing and recovery

Water is public, mine-free terrain that cannot be walked over without a bridge. A short plank spans exactly two water cells; a long plank spans four. Both ends must rest on land. Choose a landing to preview a crossing, then explicitly lay the plank. The character walks from their actual position to the chosen bridgehead. Previews read only public geography, revealed terrain and flags; they do not inspect a covered landing's mine.

Bridge water becomes walkable and its ordinary eight-neighbor clues are visible. The landing remains covered until explored. Flags, safe notes, quick-open, equipment and professions retain their normal behavior. A possible landing is not a claim that it is safe.

Only one plank is carried at a time. The other can remain on shore or provide a crossing while being transported. Picking up a different plank leaves the carried one on that dry bridgehead. A laid plank can be recovered from either accessible end. There is no use or move limit. Help includes an explicit placement reset: the character and planks return to this floor's start, while knowledge, collected rewards, health, spent tools and distinct travel accounting remain intact. This also provides recovery after a movement skill leaves a needed plank across the water.

## Three authored reaches

| Reach              | Board   | Mines | Focus                                                                                       |
| ------------------ | ------- | ----: | ------------------------------------------------------------------------------------------- |
| The Broken Walkway | 17 × 17 |    26 | One reusable short plank, four river islets, alternative landings and ordinary deductions.  |
| The Wide Channel   | 19 × 21 |    36 | Six islets, both lengths, and carrying a plank across a bridge before recovering it.        |
| Between the Islets | 23 × 23 |    50 | Nine islets, interlocking narrow and wide channels, alternative shores and optional caches. |

The charts use explicit mine sets rather than runtime campaign generation. A small charted approach and scattered shore clues give the player a starting point. Later charts rotate the entire geography, including mines, clues, entrances and exits. Public-information walkthroughs finish all three without damage or consumable tools; knowing every mine still cannot connect the exit without bridges. Chests are optional.

The first two floors use board-attached guidance. An illustrated help button explains span length, landing deductions, transport and recovery. The bridge preview, carried/placed cards and accessible cell labels share the real rule state. The fixed dock is measured independently of its own reserved height so resizing cannot keep expanding it. Complete charts fit above it where the viewport permits; the shared larger-cell view remains available.

Browser verification: [desktop, 1440 × 1000](screenshots/broken-causeway-desktop.png) and [mobile, 390 × 844](screenshots/broken-causeway-mobile.png). These show the new stage; there is no previous version of this surface. The 3840 × 2160 layout was also checked.

## Story and saves

Four exchanges use the shared dialogue bar, semantic vocabulary, voices and reveal-skip behavior. Completed exchanges do not replay. Victory grants 220 shared supplies once, completes the main task and unlocks Island Bridges in Recollection. The stage marker at Forked Bank becomes the road to Intake Steps, with a real return path. A recovered ending does not pay again.

`broken-causeway-v1` is a new independent campaign slot. Existing scene IDs and their ordering remain unchanged; the two new scenes append to the world catalog. Prior stage attempts, completed outcomes and Recollection journals are preserved. Bridge placement, pickup and reset are explicit bounded intents rebuilt against the chart, never serialized hidden tile state. Travel, discoveries, chests, ordinary missions and achievements continue through the shared expedition session.

## Procedural Recollection

Clearing this stage unlocks the new family. Existing selected pools and active departures are preserved. The generator independently authors winding channels, bank widths, channel spans, start/exit rows, orientation, mines and caches from the departure seed. It does not shuffle the fixed campaign layouts. A reserved traversable crossing connects the banks, while both bridge lengths are supplied whenever a four-cell channel is present. Mine counts match the selected tier and floor exactly, and three caches lie on reachable dry routes.

Sampling across five difficulties checks deterministic reconstruction, geography and endpoint variety, exact budgets and physical completion. Campaign public-deduction completion and procedural physical reachability are different guarantees: arbitrary random boards are not promised to be solvable without guessing or tools. Accepted bridge intents also replay through all five Recollection save configurations. Entering a boss clears the bridge-specific terrain and inventory.

## Scope and pacing

This adds the third of five main exploration stages, not the chapter finale. Later stages can deepen tide and route planning or combine already taught mechanics; they do not each require a new system. The chapter boss, remaining two exploration stages and whole-chapter acceptance stay on Roadmap II. Human pacing and clarity acceptance of this new stage remain pending.
