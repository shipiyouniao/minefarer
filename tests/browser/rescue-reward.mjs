import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { readyRescue, solveRescue } from '../../.native/tests/tests/rail-helpers.js'
import { MemoryStorage, FakeRuntime } from '../../.native/tests/tests/helpers.js'
import { VariantRepository } from '../../.native/tests/src/persistence/variant-repository.js'
import { ExpeditionSession } from '../../.native/tests/src/application/expedition-session.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const storage = new MemoryStorage()
const repository = new VariantRepository(storage)
readyRescue(repository)
const session = new ExpeditionSession(repository.forCampaign('quarry-rescue'), new FakeRuntime())
assert.ok(session.start('explorer', []))
for (const action of solveRescue()) assert.ok(session.dispatch(action))
for (const scene of ['rail-entry', 'rail-brakes', 'rail-rescue'])
  session.completeCampaignScene(scene)
const key = 'minesweeper.variants.v1.expedition'
mkdirSync('.native/dialogue-bar', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge' })
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 950 },
      reducedMotion: 'reduce',
    })
    await page.addInitScript(
      ({ key, value }) => localStorage.getItem(key) || localStorage.setItem(key, value),
      { key, value: storage.getItem(key) },
    )
    await page.goto('http://127.0.0.1:5173/minefarer/?page=story&lang=zh')
    for (let i = 0; i < 30 && (await page.locator('.story-dialogue[open]').count()); i++)
      await page.locator('[data-story-action="dialogue"]').click()
    const dialog = page.locator('[data-signal-scene="rail-home"]')
    await dialog.waitFor()
    await page
      .locator('img')
      .evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
    assert.doesNotMatch(await dialog.innerText(), /救援员已可在营地选择/)
    while (await page.locator('[data-signal-next]').count())
      await page.locator('[data-signal-next]').click()
    await page.locator('.rescue-reward[open]').waitFor()
    assert.match(await page.locator('.rescue-reward').innerText(), /救援员已可在营地选择/)
    const buttonStyle = await page.locator('[data-rescue-reward-close]').evaluate((button) => {
      const style = getComputedStyle(button)
      return {
        background: style.backgroundColor,
        color: style.color,
        padding: parseFloat(style.paddingTop),
      }
    })
    assert.notEqual(buttonStyle.background, 'rgba(0, 0, 0, 0)')
    assert.equal(buttonStyle.color, 'rgb(255, 255, 255)')
    assert.ok(buttonStyle.padding >= 12)
    await page.screenshot({ path: `.native/dialogue-bar/rail-home-${width}.png` })
    await page.locator('[data-rescue-reward-close]').click()
    await page.reload()
    assert.equal(
      await page.locator('.rescue-reward[open], [data-signal-scene="rail-home"]').count(),
      0,
    )
    console.log('rescue popup passed', width)
    await page.close()
  }
} finally {
  await browser.close()
}
