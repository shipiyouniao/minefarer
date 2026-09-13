import assert from 'node:assert/strict'
import { actStory, storyPath } from '../src/game/story.js'
import { deduceMines } from '../src/game/mine-deduction.js'
import type { StoryAction, StoryRun } from '../src/types/story.js'
/** Walk the shoreline using only revealed numbers and logically established flags. */
export function exploreOldFerry(
  initial: StoryRun,
  destination = 85,
): { run: StoryRun; actions: StoryAction[] } {
  let run = initial
  const actions: StoryAction[] = []
  /** Collect only accepted public actions so sessions can replay the same exploration. */
  const apply = (action: StoryAction): boolean => {
    const next = actStory(run, action)
    if (next === run) return false
    run = next
    actions.push(action)
    return true
  }
  for (let pass = 0; pass < 100; pass++) {
    let changed = false
    const clues = deduceMines(run.board.game, run.board.walls)
    for (const index of clues.mines)
      if (run.board.game.cells[index]?.visibility === 'hidden')
        changed = apply({ type: 'flag', index }) || changed
    for (const index of clues.safe)
      if (
        run.board.game.cells[index]?.visibility === 'hidden' &&
        storyPath(run.board, run.player, index)
      )
        changed = apply({ type: 'visit', index }) || changed
    if (!changed) break
  }
  assert.ok(
    storyPath(run.board, run.player, destination),
    'shoreline must be solvable without guessing',
  )
  apply({ type: 'visit', index: destination })
  assert.equal(run.health, initial.health)
  return { run, actions }
}
