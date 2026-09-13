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
const firstTide = plan.findIndex((a) => a.type === 'end-turn')
for (const action of plan.slice(0, firstTide)) assert.ok(pressure.dispatch(action))
const boarded = storage.getItem(key)
const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const width of [390, 1440])
    for (const language of ['zh', 'en', 'ja']) {
      const page = await browser.newPage({
        viewport: { width, height: 1050 },
        hasTouch: width === 390,
        reducedMotion: width === 390 ? 'reduce' : 'no-preference',
      })
      console.log('Checking raft UI', width, language)
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
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
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.evaluate(({ value }) => sessionStorage.setItem('test.next-save', value), {
        key,
        value: entry,
      })
      await page.goto(base + '?page=story&lang=' + language, { waitUntil: 'domcontentloaded' })
      await page.locator('[data-story-campaign][href*="pressure-cove"]').waitFor()
      assert.ok(await page.locator('[data-story-cell="85"] svg').count())
      await page.evaluate(({ value }) => sessionStorage.setItem('test.next-save', value), {
        key,
        value: first,
      })
      await page.goto(base + '?page=campaign&stage=pressure-cove&lang=' + language, {
        waitUntil: 'domcontentloaded',
      })
      await page.locator('.pressure-objective').waitFor()
      assert.equal(await page.locator('[data-pressure-pair]').count(), 0)
      await page.locator('.pressure-objective [data-control="help"]').click()
      assert.equal(await page.locator('dialog[open] .pressure-help svg').count(), 3)
      await page.screenshot({ path: '.native/raft-help-' + width + '-' + language + '.png' })
      await page.keyboard.press('Escape')
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.evaluate(({ value }) => sessionStorage.setItem('test.next-save', value), {
        key,
        value: boarded,
      })
      await page.goto(base + '?page=campaign&stage=pressure-cove&lang=' + language, {
        waitUntil: 'domcontentloaded',
      })
      await page.locator('.dungeon-player').waitFor()
      assert.equal(await page.locator('.dungeon-player .dungeon-sprite').count(), 1)
      assert.equal(await page.locator('.pressure-water > .dungeon-sprite').count(), 0)
      const start = await page.evaluate(() => ({
        raft: document.querySelector('.pressure-raft').getBoundingClientRect().x,
        player: document.querySelector('.dungeon-player').getBoundingClientRect().x,
      }))
      if (width === 1440)
        await page.evaluate(() => {
          const animate = Element.prototype.animate
          Element.prototype.animate = function (frames, options) {
            const result = animate.call(this, frames, options)
            if (this.matches('.pressure-raft,.dungeon-player')) result.pause()
            return result
          }
        })
      await page.locator('.pressure-actions [data-control="end-turn"]').click()
      if (width === 1440) {
        const midpoint = await page.evaluate(() => {
          const animations = document.getAnimations().filter((a) => a.id === 'ferry-crossing')
          animations.forEach((a) => (a.currentTime = 325))
          return {
            count: animations.length,
            targets: animations.map((a) => a.effect.target.className),
            raft: document.querySelector('.pressure-raft').getBoundingClientRect().x,
            player: document.querySelector('.dungeon-player').getBoundingClientRect().x,
          }
        })
        assert.equal(
          midpoint.count,
          2,
          'the real wait button must animate raft and single passenger',
        )
        assert.ok(midpoint.targets.includes('dungeon-player'))
        assert.ok(Math.abs(midpoint.raft - start.raft) > 1, 'raft must move across the river')
        assert.ok(
          Math.abs(midpoint.raft - start.raft - (midpoint.player - start.player)) < 1,
          'passenger and raft must move together',
        )
        const committed = await page.evaluate((key) => localStorage.getItem(key), key)
        await page.locator('.pressure-actions [data-control="end-turn"]').dispatchEvent('click')
        assert.equal(
          await page.evaluate((key) => localStorage.getItem(key), key),
          committed,
          'duplicate tide input is blocked during the crossing',
        )
        await page.evaluate(async () => {
          const animations = document.getAnimations().filter((a) => a.id === 'ferry-crossing')
          animations.forEach((a) => a.finish())
          await Promise.allSettled(animations.map((a) => a.finished))
        })
      } else
        assert.equal(
          await page.evaluate(
            () => document.getAnimations().filter((a) => a.id === 'ferry-crossing').length,
          ),
          0,
        )

      await page.waitForTimeout(900)
      await page.screenshot({ path: '.native/raft-crossing-' + width + '-' + language + '.png' })
      const save = await page.evaluate((key) => localStorage.getItem(key), key)
      await page.reload({ waitUntil: 'domcontentloaded' })
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), save)
      assert.equal(await page.locator('.pressure-water > .dungeon-sprite').count(), 0)
      assert.equal(await page.locator('.dungeon-player .dungeon-sprite').count(), 1)
      assert.deepEqual(errors, [])
      await page.close()
    }
  console.log('Raft entry, illustrated help, boarding tide and reload passed in three languages')
} finally {
  await browser.close()
}
