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
let beforeSwitch
for (const action of solveFerry().actions) {
  if (!beforeSwitch && action.type === 'interact') beforeSwitch = storage.getItem(key)
  assert.ok(stage.dispatch(action))
}
for (const scene of ['ferry-entry', 'ferry-banks', 'ferry-gate', 'ferry-end'])
  camp.completeStageScene('reed-channels', scene)
const cleared = storage.getItem(key).replaceAll('reed-channels-v3', 'reed-channels-v1')
const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      hasTouch: width === 390,
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(base)
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key,
      value: beforeSwitch,
    })
    await page.goto(`${base}?page=campaign&stage=reed-channels&lang=zh`)
    assert.ok((await page.locator('[data-current-cell]').count()) > 180)
    await page.locator('[data-power-cell="174"]').click()
    await page.waitForTimeout(1200)
    assert.ok((await page.locator('.current-held').count()) > 80)
    assert.ok((await page.locator('.current-moving').count()) > 80)
    assert.match(await page.locator('.current-guide summary').innerText(), /1$/)
    await page.screenshot({ path: `.native/current-${width}.png` })
    await page.reload()
    assert.match(await page.locator('.current-guide summary').innerText(), /1$/)
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key,
      value: cleared,
    })
    await page.goto(`${base}?page=story&lang=zh`)
    assert.equal(await page.locator('[data-story-campaign]').count(), 0)
    assert.match(await page.locator('[data-story-cell="50"]').getAttribute('aria-label'), /旧渡口/)
    assert.equal(await page.locator('[data-story-cell="50"] .drainage-pump').count(), 0)
    await page.locator('[data-story-cell="50"]').click()
    await page.locator('[data-story-scene="old-ferry"]').waitFor()
    await page.waitForTimeout(1200)
    assert.equal(await page.locator('[data-story-cell="29"] .story-site-label').count(), 0)
    assert.doesNotMatch(
      await page.locator('[data-story-cell="29"]').getAttribute('aria-label'),
      /矿道/,
    )
    await page.locator('[data-story-cell="29"]').click()
    await page.waitForTimeout(1200)
    await page.locator('[data-story-cell="28"]').click()
    await page.locator('[data-story-scene="reed-camp"]').waitFor()
    await page.reload()
    assert.equal(await page.locator('[data-story-campaign]').count(), 0)
    await page.locator('[data-story-action="map"]').click()
    await page.locator('.atlas-level').click()
    const ferryRoad = page.locator('[data-atlas-route="reed-camp:old-ferry"]')
    assert.equal(await ferryRoad.count(), 1)
    assert.equal(await ferryRoad.getAttribute('data-one-way'), 'false')
    assert.ok(await ferryRoad.locator('.atlas-route-line').isVisible())
    assert.equal(await page.locator('[data-map-name="旧渡口"]').count(), 1)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('Tide switch, reload, replaced entrance and two-way road passed at 390/1440px')
} finally {
  await browser.close()
}
