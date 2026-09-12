import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readyChapterTwo } from '../../.native/tests/tests/recollection-helpers.js'
import { MemoryStorage } from '../../.native/tests/tests/helpers.js'
import { VariantRepository } from '../../.native/tests/src/persistence/variant-repository.js'
import { StorySession } from '../../.native/tests/src/application/story-session.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/minefarer/'
const key = 'minesweeper.variants.v1.expedition'
const storage = new MemoryStorage(),
  repo = new VariantRepository(storage)
const camp = readyChapterTwo(repo),
  story = new StorySession(camp)
assert.ok(story.travelNorthwest())
assert.ok(story.completeRegionalScene('reed-arrival'))
const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 950 },
      reducedMotion: 'reduce',
      hasTouch: width === 390,
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(
      ({ key, value }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value)
      },
      { key, value: storage.getItem(key) },
    )
    await page.goto(`${base}?page=story&lang=zh`)
    const lead = page.locator('[data-signal-scene="ferry-lead"][open]')
    await lead.waitFor()
    assert.ok(await lead.locator('[data-dialogue-kind="place"]').count())
    for (let i = 0; i < 4 && (await lead.count()); i++)
      await lead.locator('[data-signal-next]').click()
    assert.equal(await lead.count(), 0)
    await page.reload()
    await page.locator('[data-story-cell="50"]').click()
    await page.locator('[data-story-campaign][href*="reed-channels"]').waitFor()
    await page.locator('[data-story-campaign][href*="reed-channels"]').click()
    await page.locator('[data-signal-scene="ferry-entry"][open]').waitFor()
    await page.screenshot({ path: `.native/ferry-entry-${width}.png` })
    assert.equal(await page.locator('[data-signal-scene="ferry-lead"]').count(), 0)
    const styled = await page.evaluate(async () => {
      const { DialogueReveal } = await import('./.native/app/ui/dialogue-reveal.js')
      const p = document.createElement('p')
      document.body.append(p)
      const text = '妮娅在采石场发现行囊，危险。<b>原文</b>'
      const reveal = new DialogueReveal({ play() {}, unlock() {} })
      reveal.start(p, text, 'dialogue-player', 'zh')
      reveal.finish()
      const result = {
        text: p.textContent,
        colors: [...p.querySelectorAll('[data-dialogue-kind]')].map(
          (span) => getComputedStyle(span).color,
        ),
        html: p.querySelector('b'),
      }
      p.remove()
      return result
    })
    assert.equal(styled.text, '妮娅在采石场发现行囊，危险。<b>原文</b>')
    assert.equal(new Set(styled.colors).size, 4)
    assert.equal(styled.html, null)
    for (let beat = 0; beat < 3; beat++) await page.locator('[data-signal-next]').click()
    assert.match(await page.locator('.power-objective').innerText(), /水位记录/)
    assert.doesNotMatch(await page.locator('.power-objective').innerText(), /水泵|排水/)
    const labels = await page
      .locator('[data-power-kind="receiver"]')
      .evaluateAll((cells) => cells.map((cell) => cell.title))
    assert.ok(labels.every((label) => label.includes('水位尺')))
    await page.locator('.power-help').click()
    await page.locator('.power-guide').waitFor()
    assert.match(await page.locator('.power-guide').innerText(), /水闸/)
    assert.doesNotMatch(await page.locator('.power-guide').innerText(), /水泵|排水/)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log('Ferry lead, persisted handoff, pier entry and styled dialogue passed at 390/1440px')
} finally {
  await browser.close()
}
