import { writeFileSync } from 'node:fs'
import { currentArrow } from '../../.native/tests/src/ui/current-view.js'
import { feedPowered } from '../../.native/tests/src/game/floor-power.js'
import { solveRiver } from '../../.native/tests/tests/pressure-helpers.js'
import { actExpedition } from '../../.native/tests/src/game/expedition.js'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readyChapterTwo } from '../../.native/tests/tests/recollection-helpers.js'
import { MemoryStorage, FakeRuntime } from '../../.native/tests/tests/helpers.js'
import { VariantRepository } from '../../.native/tests/src/persistence/variant-repository.js'
import { StorySession } from '../../.native/tests/src/application/story-session.js'
import { ExpeditionSession } from '../../.native/tests/src/application/expedition-session.js'
import { campaignProgress, updateCampaign } from '../../.native/tests/src/game/campaign-catalog.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const base = process.env.GAME_URL ?? 'http://127.0.0.1:4826/minefarer/'
const key = 'minesweeper.variants.v1.expedition'
const storage = new MemoryStorage(),
  repository = new VariantRepository(storage)
const camp = readyChapterTwo(repository),
  story = new StorySession(camp)
assert.ok(story.travelNorthwest())
assert.ok(story.completeRegionalScene('reed-arrival'))
assert.ok(story.moveCamp(49))
assert.ok(story.completeRegionalScene('recollection-light'))
const old = new ExpeditionSession(repository, new FakeRuntime())
assert.ok(old.dispatch({ type: 'retreat' }))
assert.ok(old.returnToCamp())
let save = repository.expedition()
for (const id of ['reed-channels', 'pressure-cove'])
  save = {
    ...save,
    campaign: updateCampaign(save.campaign, {
      ...campaignProgress(save.campaign, id),
      cleared: true,
    }),
  }
repository.saveExpedition(save)
const value = storage.getItem(key)
// A generated pontoon must remain selectable after it has been secured.
const runtime = new FakeRuntime()
runtime.seed = 7
const crossing = new ExpeditionSession(repository, runtime)
assert.ok(crossing.start('explorer', [], 'relaxed', { floors: ['river'], bosses: ['bastion'] }))
let pontoonSave, destination, expected
for (const action of solveRiver(crossing.run).actions) {
  const mooring = crossing.run.pressure.moorings.find(
    (entry) =>
      entry.secured &&
      actExpedition(crossing.run, { type: 'move', index: entry.index }) !== crossing.run,
  )
  if (mooring) {
    destination = mooring.index
    pontoonSave = storage.getItem(key)
    expected = actExpedition(crossing.run, { type: 'move', index: destination })
    break
  }
  assert.ok(crossing.dispatch(action))
}
assert.ok(pontoonSave)
const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const language of ['zh', 'en', 'ja'])
    for (const kind of ['tidal', 'river']) {
      const page = await browser.newPage({
        viewport: { width: language === 'zh' ? 1440 : 390, height: 1050 },
        reducedMotion: 'reduce',
      })
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(
        ({ key, value }) => {
          if (!localStorage.getItem(key)) localStorage.setItem(key, value)
        },
        { key, value },
      )
      await page.goto(base + '?page=recollection&lang=' + language)
      await page.locator('[data-recollection-section="floors"]').click()
      assert.equal(await page.locator('[data-floor]:enabled').count(), 5)
      for (const other of ['ordinary', 'relay', 'routing', 'tidal', 'river'])
        if (other !== kind) await page.locator(`[data-floor="${other}"]`).uncheck()
      await page.locator(`[data-floor="${kind}"]`).check()
      await page.locator('[data-recollection-start]').click()
      await page.locator(kind === 'river' ? '.river-controls' : '.current-guide').waitFor()
      const departure = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).journal.departure,
        key,
      )
      assert.deepEqual(departure.recollection.floors, [kind])
      assert.equal(departure.campaign, undefined)
      if (kind === 'tidal') {
        const actual = new MemoryStorage()
        actual.setItem(key, await page.evaluate((key) => localStorage.getItem(key), key))
        const run = new ExpeditionSession(new VariantRepository(actual), new FakeRuntime()).run
        for (const lane of run.current.lanes) {
          const arrow = feedPowered(run.power, lane.hold)
            ? '⌁'
            : currentArrow(lane, run.game.config.width)
          assert.equal(
            await page.locator(`[data-cell="${lane.cells[0]}"] .current-arrow`).textContent(),
            `${lane.hold.branch === 0 ? 'A' : 'B'} ${arrow}`,
          )
        }
      }

      assert.equal(await page.locator('[data-signal-scene]').count(), 0)
      console.log('Reloading', kind, language, departure.seed, page.url())
      await page.reload()
      await page
        .locator(kind === 'river' ? '.river-controls' : '.current-guide')
        .waitFor()
        .catch(async (error) => {
          writeFileSync(
            '.native/recollection-reload-failure.json',
            await page.evaluate((key) => localStorage.getItem(key), key),
          )
          await page.screenshot({ path: '.native/recollection-reload-failure.png' })
          console.error(
            'Reload failure',
            page.url(),
            errors,
            await page.locator('body').innerText(),
          )
          throw error
        })
      assert.deepEqual(
        await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).journal.departure, key),
        departure,
      )
      await page.screenshot({ path: `.native/recollection-${kind}-${language}.png` })
      assert.deepEqual(errors, [])
      await page.close()
      console.log(`Chapter-unlocked ${kind} selection, departure and reload: ${language}`)
    }
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1100 },
      hasTouch: width === 390,
      reducedMotion: 'reduce',
    })
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key,
      value: pontoonSave,
    })
    await page.goto(base + '?ruleset=expedition&lang=zh')
    const tile = page.locator(`[data-side="a"] [data-cell="${destination}"]`)
    assert.equal(await tile.getAttribute('aria-disabled'), 'false')
    if (width === 390) await tile.tap()
    else await tile.click()
    await page.waitForFunction(
      (index) => document.querySelector(`[data-cell="${index}"].player-cell`),
      destination,
    )
    const actual = new MemoryStorage()
    actual.setItem(key, await page.evaluate((key) => localStorage.getItem(key), key))
    assert.deepEqual(new ExpeditionSession(new VariantRepository(actual), runtime).run, expected)
    await page.close()
    console.log(
      `Secured pontoon remains navigable through ${width === 390 ? 'touch' : 'mouse'} input`,
    )
  }
} finally {
  await browser.close()
}
