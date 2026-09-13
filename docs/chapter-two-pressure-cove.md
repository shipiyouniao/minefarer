# Chapter Two, stage two: Pressure Cove

Status: the paired-reading prototype was rejected in playtesting. This revision replaces it with physical raft crossings and is awaiting fresh player acceptance. Earlier solver results did not prove that players needed the comparison mechanic.

## What the player does

The bridge is broken. A raft drifts between safe landings. Find a route through the shore's minefield, step aboard the raft, wait for the tide, and step off at the landing that leads to the next anchor. The world entry stays at Old Ferry; already earned supplies and completed quests are preserved.

Mines and numbers stay fixed. Waiting moves only the raft and a passenger standing on it. It never reveals shore cells, rotates flags or supplies new information about land hazards. The former comparison instruments, readings, arithmetic help and deduction engine are removed.

## Three crossings

1. **A ride across:** one river and two stops teach boarding, riding and disembarking.
2. **Choose your landing:** the far bank is split. Ride around its broken section to reach both anchors, then return to the exit.
3. **Around the broken bank:** both banks have gaps. Use the four-stop circuit to visit the far-bank anchors and reach the exit on the opposite part of the home bank.

The departure corners and final destinations differ. The raft follows a visible fixed route; its next stop is marked. Existing profession tools and equipment remain available for shore exploration.

## Presentation

The camp-style help button opens the shared information dialog with three illustrated steps. Short dialogue explains the broken bridge and the immediate crossing. The first board attaches prompts to the raft, changing from boarding to riding and disembarking as the player acts. Raft and passenger animate together; reduced motion is supported.

## Save compatibility and validation

`pressure-cove-v2` retires unfinished prototype journals without replaying them under new rules. The envelope recognizes v1 as retired content rather than marking the entire save read-only. Completed v1 outcomes and rewards remain settled, and first-clear rewards cannot be earned twice.

Validation covers public-clue shore exploration, actual boarding and visits to each anchor, per-action replay, old-journal writeability, and abandonment. A repeated-wait test verifies that even 200 tides from shore do not reveal land, visit anchors or complete a floor. Finite walkthroughs are not a substitute for human attempts to bypass or trivialize the mechanic; this redesign requires renewed playtesting.

## Overworld access

Old Ferry's two bridges and connecting shore road remain safe and revealed, including the eastern approach pads reserved for future scene exits. Mines live off this main route. Clearing a road must preserve prior exploration, flags elsewhere, health, campaign progress and rewards.
