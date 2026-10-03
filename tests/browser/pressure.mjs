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
import { riverSoundingCells } from '../../.native/tests/src/game/pressure.js'
import { message } from '../../.native/tests/src/i18n.js'
import { deduceMines } from '../../.native/tests/src/game/mine-deduction.js'
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
const voyageIndex = plan.findIndex((action, index) => action.type === 'sail')
for (const action of plan.slice(0, voyageIndex)) assert.ok(pressure.dispatch(action))
const ready = storage.getItem(key)
const voyage = plan[voyageIndex]
assert.ok(pressure.dispatch(voyage))
const sailed = pressure.run
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
    assert.equal(await page.locator('[data-river-lesson="survey"]').count(), 1)
    const aboardStorage = new MemoryStorage()
    aboardStorage.setItem(key, await page.evaluate((key) => localStorage.getItem(key), key))
    const aboard = new ExpeditionSession(
      new VariantRepository(aboardStorage).forCampaign('pressure-cove'),
      new FakeRuntime(),
    ).run
    const inReach = [...riverSoundingCells(aboard)].filter(
      (index) => aboard.game.cells[index].visibility === 'hidden',
    )
    assert.deepEqual(
      (
        await page
          .locator('.river-surveyable')
          .evaluateAll((cells) => cells.map((cell) => Number(cell.dataset.cell)))
      ).sort((a, b) => a - b),
      inReach.sort((a, b) => a - b),
      'the visual survey area exactly matches legal water reveals, including banks',
    )
    const colors = await page.evaluate(() =>
      ['.river-surveyable', '.river-out-of-range', '.pressure-water.revealed'].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector))
        return style.backgroundColor + style.backgroundImage
      }),
    )
    assert.equal(
      new Set(colors).size,
      3,
      'unrevealed, revealed and unreachable water stay distinct',
    )
    assert.equal(await page.locator('.river-survey-key').count(), 1)
    const controlLayout = await page.locator('.river-controls').evaluate((node) => ({
      display: getComputedStyle(node).display,
      maxWidth: getComputedStyle(node).maxWidth,
    }))
    assert.equal(controlLayout.display, 'grid')
    if (width > 900)
      assert.equal(
        controlLayout.maxWidth,
        '760px',
        'desktop river controls retain their base layout',
      )
    const beforePreview = await page.evaluate((key) => localStorage.getItem(key), key)
    await press(page.locator('[data-control^="river-plan:"]').first())
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), beforePreview)
    assert.ok(await page.locator('.river-planned-line .is-unknown').count())
    assert.equal(await page.locator('[data-control="sail"]').isEnabled(), false)
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelector('.ruleset-host').getBoundingClientRect().bottom <=
          document.querySelector('.action-dock').getBoundingClientRect().top + 1,
      ),
      'the wrapped dock never overlaps the scrolling game surface',
    )
    await page.screenshot({ path: `.native/river-route-preview-${width}-${language}.png` })
    await press(page.locator('.pressure-objective [data-control="help"]'))
    assert.equal(await page.locator('dialog[open] .pressure-help section').count(), 4)
    assert.equal(
      await page.locator('dialog[open] .river-diagram-boat img[src*="river-boat"]').count(),
      4,
    )
    await page.screenshot({ path: `.native/river-help-${width}-${language}.png` })
    await page.keyboard.press('Escape')
    // Dismiss through the actual guide without changing the save.
    await press(page.locator('[data-river-lesson="survey"] button'))
    assert.equal(await page.locator('.river-lesson').count(), 0)
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), beforePreview)
    const beforeRejected = await page.evaluate((key) => localStorage.getItem(key), key)
    await press(page.locator('.river-out-of-range').first())
    assert.equal(
      await page.locator('.pressure-hint').textContent(),
      message(language, 'pressure.out-of-range'),
    )
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), beforeRejected)
    // A real accepted survey also finishes the guide; choosing a route alone does not.
    await load(beforePreview)
    await page.locator('[data-river-lesson="survey"]').waitFor()
    const safeCandidates = [...deduceMines(aboard.game, aboard.walls).safe].filter((index) =>
      inReach.includes(index),
    )
    const visibleSafe = await page.evaluate(
      (indices) =>
        indices.find((index) => {
          const cell = document.querySelector(`[data-cell="${index}"]`)
          const rect = cell.getBoundingClientRect()
          return cell.contains(
            document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
          )
        }),
      safeCandidates,
    )
    assert.notEqual(
      visibleSafe,
      undefined,
      'the teaching panel leaves a deducible survey cell available to click',
    )
    await press(page.locator(`[data-cell="${visibleSafe}"]`))
    assert.equal(await page.locator('.river-lesson').count(), 0)
    await page.reload()
    await page.locator('.river-passenger').waitFor()
    assert.equal(await page.locator('.river-lesson').count(), 0)
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
    const beforeSelection = await page.evaluate((key) => localStorage.getItem(key), key)
    await press(page.locator(`[data-control="river-plan:${voyage.index}"]`))
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), beforeSelection)
    assert.ok(await page.locator('.river-planned-line').count())
    assert.ok(await page.locator('[data-control="sail"]').isEnabled())
    await press(page.locator('[data-control="sail"]'))
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
      await page.locator('.river-controls [data-control="sail"]').dispatchEvent('click')
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
    assert.deepEqual(
      (
        await page
          .locator('.river-surveyable')
          .evaluateAll((cells) => cells.map((cell) => Number(cell.dataset.cell)))
      ).sort((a, b) => a - b),
      [...riverSoundingCells(sailed)]
        .filter((index) => sailed.game.cells[index].visibility === 'hidden')
        .sort((a, b) => a - b),
      'arriving at another berth updates the highlighted survey area',
    )
    assert.equal(
      await page
        .locator('[data-control="moor"],[data-control="end-turn"],.river-dropped-anchor')
        .count(),
      0,
    )
    await page.evaluate(() => {
      document.querySelector('.ruleset-host').scrollTop = 0
    })
    await page.screenshot({ path: `.native/river-crossing-${width}-${language}.png` })
    const buttons = await page.locator('.river-departure button').evaluateAll((nodes) =>
      nodes.map((node) => ({
        width: node.getBoundingClientRect().width,
        top: node.getBoundingClientRect().top,
      })),
    )
    assert.ok(
      buttons.every((button) => button.width >= 80 && Math.abs(button.top - buttons[0].top) < 1),
      'departure and return controls share one usable row',
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
    await press(page.locator('[data-control="haul"]'))
    if (!reduced)
      await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()))
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.id !== 'river-voyage'),
    )
    const afterReturn = new MemoryStorage()
    afterReturn.setItem(key, await page.evaluate((key) => localStorage.getItem(key), key))
    assert.equal(
      new ExpeditionSession(
        new VariantRepository(afterReturn).forCampaign('pressure-cove'),
        new FakeRuntime(),
      ).run.pressure.boat,
      pressure.run.pressure.line[0],
    )
    if (width === 1440 && language === 'zh') {
      await load(ready)
      await page.locator('.river-passenger').waitFor()
      await page.evaluate(() => {
        const animate = Element.prototype.animate
        Element.prototype.animate = function (frames, options) {
          const result = animate.call(this, frames, options)
          result.pause()
          return result
        }
      })
      await press(page.locator(`[data-control="river-plan:${voyage.index}"]`))
      await press(page.locator('[data-control="sail"]'))
      await page.waitForFunction(() =>
        document.getAnimations().some((entry) => entry.id === 'river-voyage'),
      )
      await press(page.locator('[data-campaign-return]'))
      await page.locator('.river-controls').waitFor({ state: 'detached' })
      assert.equal(
        await page.locator('#app').evaluate((app) => app.style.getPropertyValue('--dock-space')),
        '',
        'leaving mid-voyage releases the newly rendered dock mount',
      )
    }
    assert.deepEqual(errors, [])
    await page.close()
    console.log(
      `River route selection, whole voyages, return, guide and stacking: ${width}px ${language}`,
    )
  }
} finally {
  await browser.close()
}
