import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { readyWreck } from '../../.native/tests/tests/wreck-helpers.js'
import { exploreOldFerry } from '../../.native/tests/tests/old-ferry-helpers.js'
import { solveConvoy } from '../../.native/tests/tests/convoy-helpers.js'
import { MemoryStorage, FakeRuntime } from '../../.native/tests/tests/helpers.js'
import { VariantRepository } from '../../.native/tests/src/persistence/variant-repository.js'
import { ExpeditionSession } from '../../.native/tests/src/application/expedition-session.js'
import { StorySession } from '../../.native/tests/src/application/story-session.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const key = 'minesweeper.variants.v1.expedition',
  base = process.env.GAME_URL || 'http://127.0.0.1:4175/minefarer/'
const storage = new MemoryStorage(),
  repo = new VariantRepository(storage),
  camp = readyWreck(repo)
camp.acceptWreckRumor()
const world = new StorySession(camp)
for (const a of exploreOldFerry(world.run, 76).actions) assert.ok(world.dispatch(a))
assert.ok(world.travelNorthwest())
for (const a of exploreOldFerry(world.run, 118).actions) assert.ok(world.dispatch(a))
const stage = new ExpeditionSession(repo.forCampaign('wreck-harbor'), new FakeRuntime())
assert.ok(stage.start('explorer', []))
const fixtures = []
for (let floor = 1; floor <= 4; floor++) {
  if (floor === 4) writeFileSync('.native/wreck-harbor-entry.json', storage.getItem(key))
  const plan = solveConvoy(stage.run)
  for (const a of plan.slice(0, -1)) assert.ok(stage.dispatch(a))
  fixtures.push({ value: storage.getItem(key), action: plan.at(-1) })
  assert.ok(stage.dispatch(plan.at(-1)))
  assert.ok(stage.dispatch({ type: 'descend' }))
}
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' })
try {
  for (const [width, height] of [
    [390, 900],
    [1440, 1000],
    [3840, 2160],
  ])
    for (let floor = 1; floor <= 4; floor++) {
      const page = await browser.newPage({
        viewport: { width, height },
        hasTouch: width < 500,
        reducedMotion: 'reduce',
      })
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      const fixture = fixtures[floor - 1]
      await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
        key,
        value: fixture.value,
      })
      await page.goto(base + '?page=campaign&stage=wreck-harbor&lang=zh')
      for (let i = 0; i < 20 && (await page.locator('[data-signal-next]').count()); i++)
        await page.locator('[data-signal-next]').click()
      for (const [i, to] of fixture.action.orders.entries()) {
        await page.locator(`[data-control="convoy-pick:${i}"]`).click()
        const choice = page.locator(`[data-control="convoy-${String.fromCharCode(97 + i)}:${to}"]`)
        if (await choice.count()) await choice.click()
      }
      await page.locator('[data-control="convoy"]').click()
      for (let i = 0; i < 20 && (await page.locator('[data-signal-next]').count()); i++)
        await page.locator('[data-signal-next]').click()
      await page.locator('dialog[open] [data-control="descend"]').waitFor()
      assert.equal(await page.locator('.action-dock').count(), 0)
      for (const viewport of [
        { width, height },
        { width: Math.max(390, width - 50), height: height - 80 },
      ]) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(120)
        const size = await page.locator('.convoy-board').evaluate((board) => ({
          rows: Number(board.style.getPropertyValue('--naval-rows')),
          cell: board.querySelector('.cell').getBoundingClientRect().width,
          boat: board.querySelector('.convoy-boat').getBoundingClientRect().width,
          width: board.getBoundingClientRect().width,
          viewport: board.closest('.board-viewport').clientWidth,
        }))
        assert.equal(size.rows, floor === 4 ? 23 : floor === 3 ? 15 : 13)
        assert.ok(size.cell > 5 && size.cell < 100, JSON.stringify(size))
        assert.ok(size.boat <= size.cell + 1, JSON.stringify(size))
        assert.ok(size.width <= size.viewport + 2, JSON.stringify(size))
      }
      if (floor === 4) await page.screenshot({ path: `.native/harbor-settled-${width}.png` })
      assert.deepEqual(errors, [])
      await page.close()
      console.log(
        `convoy settlement floor ${floor} @ ${width}: bounded board/actors, resize passed`,
      )
    }
} finally {
  await browser.close()
}
