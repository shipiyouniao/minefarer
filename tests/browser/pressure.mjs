import { exploreOldFerry } from '../../.native/tests/tests/old-ferry-helpers.js'
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
for (const action of exploreOldFerry(world.run).actions) assert.ok(world.dispatch(action))
const entry = storage.getItem(key)
const pressure = new ExpeditionSession(repo.forCampaign('pressure-cove'), new FakeRuntime())
assert.ok(pressure.start('explorer', []))
pressure.completeCampaignScene('pressure-entry')
const first = storage.getItem(key)
const plan = solvePressureFloor(1).actions
const voyageIndex = plan.findIndex((action, index) => index > 0 && action.type === 'move')
for (const action of plan.slice(0, voyageIndex)) assert.ok(pressure.dispatch(action))
const ready = storage.getItem(key)
const voyage = plan[voyageIndex]
assert.ok(pressure.dispatch(voyage))
const sailed = pressure.run
for (const action of plan.slice(voyageIndex + 1)) {
  if (action.type === 'interact') break
  assert.ok(pressure.dispatch(action))
}
const mooringSave = storage.getItem(key)
const mooring = plan.find((action) => action.type === 'interact')
const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const [width, language] of [
    [320, 'zh'],
    [390, 'zh'],
    [390, 'en'],
    [390, 'ja'],
    [1440, 'zh'],
    [1440, 'en'],
    [1440, 'ja'],
    [3840, 'zh'],
  ]) {
    const reduced = width < 1000
    const page = await browser.newPage({
      viewport: { width, height: width === 3840 ? 2160 : width >= 1000 ? 1400 : 1050 },
      hasTouch: reduced,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    })
    /** Exercise real touch taps on phones and mouse clicks on desktop. */
    const press = async (locator) => (reduced ? locator.tap() : locator.click())
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(
      ({ key }) => {
        const value = sessionStorage.getItem('test.next-save')
        if (value) {
          localStorage.setItem(key, value)
          sessionStorage.removeItem('test.next-save')
        }
      },
      { key },
    )
    await page.goto(base)
    const load = async (value, route = '?page=campaign&stage=pressure-cove') => {
      await page.evaluate((value) => sessionStorage.setItem('test.next-save', value), value)
      await page.goto(base + route + '&lang=' + language)
    }
    await load(entry, '?page=story')
    await page.locator('[data-story-campaign][href*="pressure-cove"]').waitFor()
    assert.equal(await page.locator('[data-story-cell="85"] img[src*="river-boat"]').count(), 1)
    await load(first)
    await page.locator('.pressure-objective').waitFor()
    assert.equal(await page.locator('.river-lesson').count(), 1)
    assert.ok(await page.locator('.river-empty-boat').isVisible())
    const boatCell = plan[0].index
    await press(page.locator(`[data-side="a"] [data-cell="${boatCell}"]`))
    await page.locator('.river-passenger').waitFor()
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.id !== 'river-voyage'),
    )
    assert.equal(await page.locator('.river-passenger > .dungeon-sprite').count(), 1)
    assert.equal(await page.locator('.river-empty-boat').count(), 0)
    await press(page.locator('.pressure-objective [data-control="help"]'))
    assert.equal(await page.locator('dialog[open] .pressure-help section').count(), 4)
    assert.equal(
      await page.locator('dialog[open] .river-diagram-boat img[src*="river-boat"]').count(),
      4,
    )
    await page.screenshot({ path: `.native/river-help-${width}-${language}.png` })
    await page.keyboard.press('Escape')
    await load(ready)
    await page.locator('.river-passenger').waitFor()
    if (!reduced)
      await page.evaluate(() => {
        const animate = Element.prototype.animate
        Element.prototype.animate = function (frames, options) {
          const result = animate.call(this, frames, options)
          result.pause()
          return result
        }
      })
    await press(page.locator(`[data-side="a"] [data-cell="${voyage.index}"]`))
    if (!reduced) {
      await page.waitForFunction(() =>
        document.getAnimations().some((animation) => animation.id === 'river-voyage'),
      )
      const geometry = await page.evaluate(() => {
        const animation = document.getAnimations().find((entry) => entry.id === 'river-voyage')
        animation.currentTime = Number(animation.effect.getTiming().duration) / 2
        const passenger = document.querySelector('.river-passenger')
        return {
          target: animation.effect.target === passenger,
          hull: getComputedStyle(passenger.querySelector('.river-hull')).zIndex,
          hero: getComputedStyle(passenger.querySelector(':scope > .dungeon-sprite')).zIndex,
        }
      })
      assert.ok(geometry.target, 'hull and single passenger share the same moving element')
      assert.ok(Number(geometry.hero) > Number(geometry.hull), 'passenger stays above the boat')
      const committed = await page.evaluate((key) => localStorage.getItem(key), key)
      await page.locator('.river-controls [data-control="moor"]').dispatchEvent('click')
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        committed,
        'inputs stay locked during a voyage',
      )
      await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()))
    }
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.id !== 'river-voyage'),
    )
    const currentStorage = new MemoryStorage()
    currentStorage.setItem(key, await page.evaluate((key) => localStorage.getItem(key), key))
    assert.deepEqual(
      new ExpeditionSession(
        new VariantRepository(currentStorage).forCampaign('pressure-cove'),
        new FakeRuntime(),
      ).run,
      sailed,
    )
    await press(page.locator('.river-controls [data-control="moor"]'))
    if (!reduced) {
      await page.waitForFunction(() =>
        document.getAnimations().some((animation) => animation.id === 'river-anchor'),
      )
      await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()))
    }
    await page.locator('.river-dropped-anchor').waitFor()
    await page.evaluate(() => {
      document.querySelector('.ruleset-host').scrollTop = 0
    })
    await page.screenshot({ path: `.native/river-crossing-${width}-${language}.png` })
    const buttons = await page.locator('.river-controls button').evaluateAll((nodes) =>
      nodes.map((node) => ({
        width: node.getBoundingClientRect().width,
        top: node.getBoundingClientRect().top,
      })),
    )
    assert.ok(
      buttons.every((button) => button.width >= 80 && Math.abs(button.top - buttons[0].top) < 1),
      'the three sailing controls share one usable row',
    )
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      'page never overflows horizontally',
    )
    assert.ok(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('.river-controls img,.river-passenger img')).every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      ),
    )
    await load(mooringSave)
    await press(page.locator(`[data-side="a"] [data-cell="${mooring.index}"]`))
    await page.locator('.river-secured').waitFor()
    assert.equal(await page.locator('.river-lesson').count(), 0)
    assert.deepEqual(errors, [])
    await page.close()
    console.log(
      `River boarding, soundings guide, sailing, anchoring and mooring: ${width}px ${language}`,
    )
  }
} finally {
  await browser.close()
}
