# Chapter Two, stage two: Pressure Cove

Status: implementation specification, not playable content. Follows the combined Reed Channels stage. Track delivery under R2-10.2-03 in #55; none of the later exploration-stage boxes can be completed by this document alone.

## Question and consequence

At Old Ferry the boat is still tied up, but its landing moves relative to the bank with each backflow. Nia wants to reach the boat without stranding the traveler on a drifting patch. The traveler notices paired instruments disagreeing in a repeatable way. Their investigation should establish that the pulse reaches the outer bank before the inner basin, giving a concrete upstream lead rather than another report at camp.

The physical entrance belongs to the far-bank landing of Old Ferry, not another camp facility. Clearing the stage secures the crossing and replaces that entrance with the next real scene connection when that destination is implemented. Do not draw a fake onward doorway to an unimplemented location. The return to Reedbank Camp stays available throughout.

## New inference mechanic: paired pressure readings

An authored pair compares two visible, non-overlapping footprints A and B. Its signed value is the true hazard count in A minus the true hazard count in B. The player sees the two outlined areas and the difference together: `A +2 B` means A contains two more hazards than B, not that A contains exactly two. Zero means equal counts, not safe ground. Chinese, English and Japanese explanations must distinguish these meanings.

This is a new relational clue family, not a renamed supply switch. It is implemented independently of the power network and can later be composed with other board mechanics.

- First-floor footprints are 2×2; later ones can be 3×3. Explicit coordinates and pair IDs belong to authored content.
- Readings are public observations calculated from the actual board. Player flags remain hypotheses and never alter a reading.
- Players cannot move the observation footprints or query arbitrary cell pairs; unlimited arbitrary queries could disclose the entire field by subtraction.
- Ordinary visible clues and a known-safe calibration footprint establish the first absolute count. Later pairs form a small connected inference chain. Never require an unconstrained chain of differences with no known bound.
- All footprints are outlined on hover/focus; touch toggles the overlay with one tap. Show a small signed badge and short explanation beside the selected instrument instead of opening a separate board or a page of equations.
- Tide movement carries tile knowledge as in stage one. Fixed observation footprints stay in world coordinates, so readings recalculate after each tide. Animate changed readings and remove any obsolete report; do not silently keep old values.

## Three authored floors

| Floor             | Inference purpose                                                                         | Tide interaction                                                         | Completion condition                                        |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Calibration bank  | One safe footprint and one paired difference teach a bounded hazard count.                | A single forecast lane changes one footprint; compare before and after.  | Deduce and reach the marked safe landing.                   |
| Divided basin     | Two comparisons share one footprint, so knowledge transfers between banks.                | Opposite tide directions change which clues are adjacent.                | Locate both safe mooring positions and secure the crossing. |
| The boat's shadow | Combine a bounded comparison chain with ordinary numbers; no new rule on the last screen. | Hold one bank while moving the other, preserving useful reference clues. | Reach the boat and record the timing of the upstream pulse. |

Target footprint: approximately 17×17, 19×17 and 19×19, with hazard density comparable to the established introductory expedition difficulty. These are authoring targets, not approved layouts. Author different topology from Reed Channels; do not copy its two-bank power graph. Keep any existing sluice at the minimum needed to choose a useful tide, rather than multiplying relay chains.

A mooring is a physical safe landing reached by movement after deduction. A mistaken attempt follows ordinary reveal/damage rules; it cannot grant credit merely because a flag was placed. No hidden-truth solver, forced expendable-item purchase or mandatory guessing is allowed.

## Delivery and acceptance

1. Implement a reusable paired-reading state and renderer with exact signed semantics. Cover zero, positive/negative values, clipped/invalid footprints, mistaken flags and reading changes after tide.
2. Author and validate each layout with a solver using only published ordinary and paired clues. At least one required inference on each floor must use the new reading; an ordinary-clue-only solver should not complete the intended route unaided.
3. Teach the first useful inference in a board-anchored coach, highlighting the actual footprint and the next actionable cell. The player performs the action; clicking Continue alone must not complete the lesson.
4. Integrate physical entry, independent replay journal, intermediate dialogue checkpoints, once-only rewards, ordinary missions/achievements and the resulting world outcome. Test failure, departure, resume and already-cleared saves.
5. Verify narrow touch, keyboard and desktop interaction, three languages, reduced motion, clue badge visibility and no overlay on covered-cell backgrounds.
6. Human playtesting decides clarity and pacing before accepting the stage. Do not claim a measured duration or Chapter Two completion from solver results.

## Side-story boundary

No side story is bundled into this stage specification. A later river-side story must introduce its own special gameplay, potentially a minigame; reskinning pressure comparisons does not qualify. It can span multiple stages and include a dedicated boss and a complete character outcome. Keep reward reveals inside the story's appropriate resolution rather than advertising exclusive rewards in the initial task.
