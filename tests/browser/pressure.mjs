import { solvePressureFloor } from '../../.native/tests/tests/pressure-helpers.js'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readyChapterTwo } from '../../.native/tests/tests/recollection-helpers.js'
import { solveFerry } from '../../.native/tests/tests/ferry-helpers.js'
import { MemoryStorage, FakeRuntime } from '../../.native/tests/tests/helpers.js'
import { VariantRepository } from '../../.native/tests/src/persistence/variant-repository.js'
import { StorySession } from '../../.native/tests/src/application/story-session.js'
import { ExpeditionSession } from '../../.native/tests/src/application/expedition-session.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/minefarer/'
const key = 'minesweeper.variants.v1.expedition'
const storage = new MemoryStorage(),
  repo = new VariantRepository(storage)
const camp = readyChapterTwo(repo),
  story = new StorySession(camp)
story.travelNorthwest()
story.completeRegionalScene('reed-arrival')
story.completeRegionalScene('ferry-lead')
story.moveCamp(50)
const stage = new ExpeditionSession(repo.forCampaign('reed-channels'), new FakeRuntime())
assert.ok(stage.start('explorer', []))
stage.completeCampaignScene('ferry-entry')
for (const action of solveFerry().actions) assert.ok(stage.dispatch(action))
stage.completeCampaignScene('ferry-end')
assert.ok(stage.returnToCamp())
const world = new StorySession(camp)
assert.ok(world.travelNorthwest())
assert.ok(world.dispatch({ type: 'visit', index: 85 }))
const entry = storage.getItem(key)
const pressure = new ExpeditionSession(repo.forCampaign('pressure-cove'), new FakeRuntime())
assert.ok(pressure.start('explorer', []))
pressure.completeCampaignScene('pressure-entry')
const first = storage.getItem(key)
for (const action of solvePressureFloor(1).actions) assert.ok(pressure.dispatch(action))
assert.ok(
  pressure.dispatch({
    type: 'relic',
    relic: pressure.run.offers.find((x) => x === 'purse') ?? pressure.run.offers[0],
  }),
)
pressure.completeCampaignScene('pressure-basin')
const second = storage.getItem(key)
const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const width of [390, 1440])
    for (const language of ['zh', 'en', 'ja']) {
      const page = await browser.newPage({
        viewport: { width, height: 1050 },
        hasTouch: width === 390,
        reducedMotion: 'reduce',
      })
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(base)
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
        key,
        value: entry,
      })
      await page.goto(base + '?page=story&lang=' + language)
      await page.locator('[data-story-campaign][href*="pressure-cove"]').waitFor()
      assert.ok(await page.locator('[data-story-cell="85"] .ridge-instrument').count())
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
        key,
        value: first,
      })
      await page.goto(base + '?page=campaign&stage=pressure-cove&lang=' + language)
      await page.locator('.pressure-coach').waitFor()
      assert.equal(await page.locator('[data-pressure-area="a"]').count(), 4)
      assert.equal(await page.locator('[data-pressure-area="b"]').count(), 4)
      const coach = await page.locator('.pressure-coach').boundingBox()
      assert.ok(coach.x >= 0 && coach.x + coach.width <= width, 'coach fits narrow viewport')
      await page.screenshot({ path: '.native/pressure-' + width + '-' + language + '.png' })
      await page.locator('[data-side="a"] [data-cell="38"]').click()
      await page.locator('.pressure-coach').waitFor({ state: 'detached' })
      await page.reload()
      assert.equal(await page.locator('.pressure-coach').count(), 0)
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
        key,
        value: second,
      })
      await page.goto(base)
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
        key,
        value: second,
      })
      await page.goto(base + '?page=campaign&stage=pressure-cove&lang=' + language)
      await page.locator('[data-pressure-pair="1"]').click()
      assert.equal(
        await page.locator('[data-pressure-pair="1"]').getAttribute('aria-pressed'),
        'true',
      )
      assert.equal(await page.locator('[data-pressure-area="a"]').count(), 4)
      assert.deepEqual(errors, [])
      await page.close()
    }
  console.log(
    'Pressure entry, action-based coach, reload and touch comparisons passed in three languages',
  )
} finally {
  await browser.close()
}
