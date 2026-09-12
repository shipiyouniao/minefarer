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
const save = repository.expedition()
repository.saveExpedition({
  ...save,
  camp: {
    ...save.camp,
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
mkdirSync('.native/camp-polish', { recursive: true })
try {
  for (const [width, language] of [
    [320, 'zh'],
    [390, 'zh'],
    [320, 'en'],
    [390, 'en'],
    [320, 'ja'],
    [390, 'ja'],
    [1000, 'en'],
    [1440, 'zh'],
    [3840, 'ja'],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 3840 ? 2160 : 950 },
      hasTouch: width === 390,
    })
    await page.addInitScript(
      ({ key, value }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value)
      },
      { key, value: storage.getItem(key) },
    )
    await page.goto(`${base}?page=story&lang=${language}`)
    await page.locator('[data-story-scene="reed-camp"]').waitFor()
    await page.locator('[data-story-cell="45"]').click()
    await page.locator('[data-camp-page="achievements"]').waitFor()
    const headerFits = await page.locator('.camp-header').evaluate((header) => {
      const close = document.querySelector('.facility-close').getBoundingClientRect()
      const box = header.getBoundingClientRect()
      return [...header.querySelectorAll('h1, .camp-wallet')].every((child) => {
        const rect = child.getBoundingClientRect()
        return (
          child.scrollWidth <= child.clientWidth + 1 &&
          rect.right <= box.right + 1 &&
          (rect.right <= close.left || rect.top >= close.bottom || rect.bottom <= close.top)
        )
      })
    })
    assert.ok(
      headerFits,
      `${width}px ${language}: header text and wallet remain clear of the close button`,
    )
    const geometry = await page.evaluate(() => {
      const d = document.querySelector('.camp-facility'),
        s = document.querySelector('.camp-content'),
        h = document.querySelector('.camp-header')
      const y = h.getBoundingClientRect().y
      s.scrollTop = 200
      return {
        outer: getComputedStyle(d).overflowY,
        scroll: s.scrollTop,
        header: h.getBoundingClientRect().y - y,
        overflow: d.scrollHeight - d.clientHeight,
        panelMargin: getComputedStyle(document.querySelector('.camp-panel')).margin,
        serviceHeight: document.querySelector('.story-service').getBoundingClientRect().height,
        panelHeight: document.querySelector('.camp-panel').getBoundingClientRect().height,
        dialogHeight: d.clientHeight,
      }
    })
    assert.equal(geometry.outer, 'hidden')
    assert.equal(geometry.header, 0)
    assert.ok(geometry.scroll > 0)
    assert.ok(geometry.overflow <= 2, JSON.stringify(geometry))
    assert.ok(
      await page
        .locator('.milestone-card')
        .first()
        .evaluate((e) => e.classList.contains('is-ready')),
    )
    const claim = page.locator('.is-ready button').nth(2)
    await claim.scrollIntoViewIfNeeded()
    const before = await page.locator('.camp-content').evaluate((e) => e.scrollTop)
    await claim.click()
    assert.equal(await page.locator('.camp-content').evaluate((e) => e.scrollTop), before)
    await page.locator('.camp-reward-spark').first().waitFor()
    await page.waitForFunction(() => !document.querySelector('.camp-reward-spark'))
    await page.screenshot({ path: `.native/camp-polish/achievements-${width}-${language}.png` })
    await page.locator('.facility-close').click()
    await page.locator('[data-story-cell="15"]').click()
    await page.locator('[data-control="shop-category:equipment"]').click()
    const rects = await page.locator('.shop-tile').evaluateAll((es) =>
      es.map((e) => ({
        top: e.getBoundingClientRect().top,
        bottom: e.getBoundingClientRect().bottom,
      })),
    )
    if (width > 1200)
      assert.ok(Math.abs(rects[6].top - rects[0].bottom - 12) < 2, JSON.stringify(rects))
    await page.screenshot({ path: `.native/camp-polish/shop-${width}-${language}.png` })
    await page.locator('.facility-close').click()
    for (const cell of [69, 41, 19]) {
      await page.locator(`[data-story-cell="${cell}"]`).click()
      await page.locator('.camp-content').waitFor()
      assert.ok(
        await page.locator('.camp-facility').evaluate((d) => d.scrollHeight - d.clientHeight <= 2),
      )
      await page.locator('.facility-close').click()
    }
    await page.locator('[data-story-cell="49"]').click()
    await page.locator('[data-recollection-section="bosses"]').click()
    assert.ok(
      await page.locator('.camp-facility').evaluate((d) => d.scrollHeight - d.clientHeight <= 2),
    )
    await page.close()
    console.log('camp polish passed', width, language)
  }
} finally {
  await browser.close()
}
