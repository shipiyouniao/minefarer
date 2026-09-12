import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/minefarer/'
const browser = await chromium.launch({ channel: 'msedge' })
mkdirSync('.native/dialogue-bar', { recursive: true })
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 950 },
      hasTouch: width === 390,
    })
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.evaluate(async () => {
      const { SignalPerformance } = await import('./.native/app/ui/signal-performance.js')
      const root = document.createElement('div')
      root.id = 'dialogue-control-test'
      document.body.append(root)
      const sound = {
        play() {},
        unlock() {},
        stop() {},
        dispose() {},
        setEnabled() {},
        enabled: true,
      }
      const performance = new SignalPerformance(sound)
      performance.present(
        root,
        'zh',
        'tower-response',
        [
          { speaker: 'player', text: '让我听听塔里的声音。'.repeat(30) },
          { speaker: 'nia', text: '这里有人，我在上面。'.repeat(30) },
        ],
        'explorer',
        () => {
          root.dataset.completed = 'true'
        },
      )
    })
    const dialog = page.locator('#dialogue-control-test dialog')
    const bounds = await dialog.boundingBox()
    assert.ok(Math.abs(bounds.x) < 1 && Math.abs(bounds.width - width) < 1)
    assert.ok(
      Math.abs(bounds.y + bounds.height - 950) < 1,
      'dialogue attaches to the viewport edge',
    )
    assert.equal(
      await dialog.evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor),
      'rgba(0, 0, 0, 0)',
    )
    assert.equal(
      await dialog.evaluate((el) => getComputedStyle(el, '::backdrop').backdropFilter),
      'none',
    )
    const line = dialog.locator('[data-signal-line]')
    const next = dialog.locator('[data-signal-next]')
    assert.match(await next.innerText(), /显示整句/)
    const first = await line.getAttribute('aria-label')
    if (width === 390) await line.tap()
    else await line.click()
    assert.equal(await line.locator('[data-dialogue-text]').innerText(), first)
    assert.match(await next.innerText(), /继续/)
    assert.equal(
      await next.evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(54, 89, 71)',
    )
    await next.click()
    assert.notEqual(await line.getAttribute('aria-label'), first)
    assert.match(await next.innerText(), /显示整句/)
    await next.click()
    assert.equal(await dialog.count(), 1, 'finishing text does not skip its beat')
    assert.match(await next.innerText(), /继续/)
    await page.screenshot({ path: `.native/dialogue-bar/signal-${width}.png` })
    await next.click()
    assert.equal(await dialog.count(), 0)
    assert.equal(
      await page.locator('#dialogue-control-test').getAttribute('data-completed'),
      'true',
    )
    await page.goto(base + '?page=story&lang=zh', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-story-action="wake"]').click()
    const opening = page.locator('dialog.story-dialogue[open]')
    await opening.waitFor()
    const openingLine = opening.locator('[data-story-dialogue-line]')
    await openingLine.click()
    assert.equal(
      await openingLine.locator('[data-dialogue-text]').innerText(),
      await openingLine.getAttribute('aria-label'),
    )
    assert.equal(await opening.getAttribute('class'), 'dialogue-bar story-dialogue')
    const openingBounds = await opening.boundingBox()
    assert.ok(Math.abs(openingBounds.y + openingBounds.height - 950) < 1)
    assert.equal(
      await opening.evaluate((el) => getComputedStyle(el, '::backdrop').backdropFilter),
      'none',
    )
    assert.equal(
      await opening.locator('[data-active="true"]').evaluate((el) => getComputedStyle(el).opacity),
      '1',
    )
    await page.screenshot({ path: `.native/dialogue-bar/opening-${width}.png` })
    const handover = await page.evaluate(async () => {
      const { StoryPerformance } = await import('./.native/app/ui/story-performance.js')
      const root = document.querySelector('dialog.story-dialogue')
      for (const animation of root.getAnimations({ subtree: true })) animation.finish()
      const performance = new StoryPerformance(root, { unlock() {}, play() {} }, false)
      performance.offerBag()
      const bag = root.querySelector('.story-handover')
      const animation = bag.getAnimations()[0]
      animation.pause()
      const player = root.querySelector('[data-story-speaker="player"]').getBoundingClientRect()
      const partner = root.querySelector('[data-story-speaker="lumi"]').getBoundingClientRect()
      animation.currentTime = 0
      const start = bag.getBoundingClientRect()
      animation.currentTime = 950
      const end = bag.getBoundingClientRect()
      const result = {
        startX: start.x + start.width / 2 - player.x - player.width / 2,
        startY: start.y + start.height / 2 - player.y - player.height / 2,
        endX: end.x + end.width / 2 - partner.x - partner.width / 2,
        endY: end.y + end.height / 2 - partner.y - partner.height / 2,
      }
      performance.dispose()
      return result
    })
    for (const offset of Object.values(handover))
      assert.ok(Math.abs(offset) < 2, JSON.stringify(handover))
    await page.close()
    console.log(`${width}px: tap-to-reveal, two-step advance and shared button styling passed`)
  }
} finally {
  await browser.close()
}
