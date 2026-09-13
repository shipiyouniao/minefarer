import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { readyChapterTwo } from '../../.native/tests/tests/recollection-helpers.js'
import { MemoryStorage, FakeRuntime } from '../../.native/tests/tests/helpers.js'
import { VariantRepository } from '../../.native/tests/src/persistence/variant-repository.js'
import { ExpeditionSession } from '../../.native/tests/src/application/expedition-session.js'
import { StorySession } from '../../.native/tests/src/application/story-session.js'
import { milestoneProgress } from '../../.native/tests/src/game/milestones.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/minefarer/'
const key = 'minesweeper.variants.v1.expedition'
const storage = new MemoryStorage(),
  repository = new VariantRepository(storage)
const camp = readyChapterTwo(repository),
  story = new StorySession(camp)
assert.ok(story.travelNorthwest())
assert.ok(story.completeRegionalScene('reed-arrival'))
assert.ok(story.completeRegionalScene('ferry-lead'))
assert.ok(story.moveCamp(49))
assert.ok(story.completeRegionalScene('recollection-light'))
const old = new ExpeditionSession(repository, new FakeRuntime())
assert.ok(old.dispatch({ type: 'retreat' }))
assert.ok(old.returnToCamp())
camp.completeStageScene('tower-galleries', 'quarry-rumor')
const save = repository.expedition()
repository.saveExpedition({
  ...save,
  camp: {
    ...save.camp,
    upgrades: [...save.camp.upgrades, 'workshop', 'medical-kit', 'steel-blade'],
    milestones: {
      ...milestoneProgress(save.camp),
      travel: 9999,
      floors: 100,
      skills: 500,
      chests: 500,
    },
  },
})

const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      hasTouch: width === 390,
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript(
      ({ key, value }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value)
      },
      { key, value: storage.getItem(key) },
    )
    await page.goto(base + '?page=story&lang=zh')
    await page.locator('[data-story-cell="19"]').click()
    await page.locator('.loadout-layout').waitFor()
    await page.locator('[data-control="equipment-item:medical-kit"]').click()
    assert.equal(await page.locator('.loadout-detail li').count(), 2)
    assert.doesNotMatch(await page.locator('.loadout-detail').innerText(), /装备预算/)
    await page.locator('[data-control="equipment:medical-kit"]').click()
    assert.equal(
      await page.locator('[data-control="equipment:medical-kit"]').innerText(),
      '取消装备',
    )
    await page.locator('[data-control="equipment:medical-kit"]').click()
    assert.equal(await page.locator('[data-control="equipment:medical-kit"]').innerText(), '装备')
    assert.ok(
      await page.locator('.camp-content').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    )
    await page.screenshot({ path: '.native/loadout-' + width + '.png' })
    await page.locator('.facility-close').click()
    await page.locator('[data-story-action="map"]').click()
    await page.locator('.atlas-level').click()
    await page.locator('.atlas-camp-card').waitFor()
    assert.equal(await page.locator('[data-atlas-route="reed-camp:old-ferry"]').count(), 0)
    await page.locator('.atlas-zoom input').fill('500')
    await page.locator('.atlas-zoom input').dispatchEvent('input')
    assert.ok(await page.locator('.atlas-camp-card').isVisible())

    await page.screenshot({ path: '.native/atlas-camp-' + width + '.png' })
    await page.locator('.atlas-node[data-story-action="map-region"]').click()
    assert.doesNotMatch(await page.locator('.atlas-scene').innerText(), /芦湾营地|旧渡口/)
    assert.match(await page.locator('.atlas-camp-card').innerText(), /灯栖营地/)
    await page.locator('[data-story-action="map-travel"]').click()
    assert.equal(await page.locator('.story-map').count(), 0)
    await page.reload()
    await page.locator('[data-story-scene="camp"]').waitFor()
    await page.locator('[data-story-cell="13"]').click()
    await page.locator('[data-story-scene="north-road"]').waitFor()
    await page.waitForTimeout(1200)
    await page.locator('.story-cell.is-open:not([data-number="0"]):not(.is-site)').first().click()
    await page.locator('.story-cell.is-scope').first().waitFor()
    await page.locator('[data-story-action="flag"]').click()
    assert.equal(
      await page.locator('[data-story-action="flag"]').getAttribute('aria-pressed'),
      'true',
    )
    await page.locator('[data-story-action="map"]').click()
    await page.locator('.atlas-level').click()
    await page.locator('[data-story-action="map-travel"]').click()
    await page.locator('[data-story-scene="camp"]').waitFor()
    assert.equal(await page.locator('.story-cell.is-scope').count(), 0)
    await page.locator('[data-story-cell="13"]').click()
    await page.locator('[data-story-scene="north-road"]').waitFor()
    assert.equal(
      await page.locator('[data-story-action="explore"]').getAttribute('aria-pressed'),
      'true',
    )
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('Loadout inspect/equip/unequip and camp travel passed at 390/1440')
} finally {
  await browser.close()
}
