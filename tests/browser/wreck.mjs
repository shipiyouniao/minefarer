import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { readyWreck } from '../../.native/tests/tests/wreck-helpers.js'
import { solveConvoy } from '../../.native/tests/tests/convoy-helpers.js'
import { solveKeelcrab, surveyKeelcrab } from '../../.native/tests/tests/keelcrab-helpers.js'
import { exploreOldFerry } from '../../.native/tests/tests/old-ferry-helpers.js'
import { MemoryStorage, FakeRuntime } from '../../.native/tests/tests/helpers.js'
import { VariantRepository } from '../../.native/tests/src/persistence/variant-repository.js'
import { StorySession } from '../../.native/tests/src/application/story-session.js'
import { ExpeditionSession } from '../../.native/tests/src/application/expedition-session.js'
import { riverRoutes } from '../../.native/tests/src/game/pressure.js'
import { actExpedition } from '../../.native/tests/src/game/expedition.js'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const base = process.env.GAME_URL || 'http://127.0.0.1:4175/minefarer/'
const key = 'minesweeper.variants.v1.expedition'
const storage = new MemoryStorage(),
  repo = new VariantRepository(storage),
  camp = readyWreck(repo)
const invitation = storage.getItem(key)
camp.acceptWreckRumor()
const story = new StorySession(camp)
for (const action of exploreOldFerry(story.run, 76).actions) assert.ok(story.dispatch(action))
assert.ok(story.travelNorthwest())
for (const action of exploreOldFerry(story.run, 118).actions) assert.ok(story.dispatch(action))
const entrance = storage.getItem(key)
writeFileSync('.native/wreck-side-entry.json', invitation)
writeFileSync('.native/wreck-side-gate.json', entrance)
const expected = new ExpeditionSession(repo.forCampaign('wreck-harbor'), new FakeRuntime())
assert.ok(expected.start('explorer', []))
const plans = []
let bossEntry
for (let floor = 1; floor <= 5; floor++) {
  if (floor === 3) writeFileSync('.native/wreck-fleet-entry.json', storage.getItem(key))
  if (floor === 5) bossEntry = storage.getItem(key)
  const actions = floor < 5 ? solveConvoy(expected.run) : solveKeelcrab(expected.run)
  assert.ok(actions)
  plans.push(actions)
  for (const action of actions) assert.ok(expected.dispatch(action))
  if (floor < 5) assert.ok(expected.dispatch({ type: 'descend' }))
}
const lossStorage = new MemoryStorage()
lossStorage.setItem(key, bossEntry)
const losing = new ExpeditionSession(
  new VariantRepository(lossStorage).forCampaign('wreck-harbor'),
  new FakeRuntime(),
)
losing.completeCampaignScene('wreck-crab')
let lossFixture, lossAction
for (let turn = 0; turn < 40 && losing.run?.phase === 'boss'; turn++) {
  for (const sounding of surveyKeelcrab(losing.run).actions) assert.ok(losing.dispatch(sounding))
  const routes = riverRoutes(losing.run)
  const route =
    routes.find((r) => r.path.some((i) => losing.run.encounter.intent.targets.includes(i))) ??
    routes[0]
  const action = { type: 'sail', index: route.launch }
  if (actExpedition(losing.run, action).phase === 'lost') {
    lossFixture = lossStorage.getItem(key)
    lossAction = action
    break
  }
  assert.ok(losing.dispatch(action))
}
assert.ok(lossFixture && lossAction, 'A lethal voyage must be tested through the real journal')
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' })
try {
  for (const [width, lang] of [
    [320, 'zh'],
    [390, 'en'],
    [390, 'ja'],
    [1440, 'zh'],
    [3840, 'zh'],
  ]) {
    if (process.env.WRECK_WIDTH && width !== Number(process.env.WRECK_WIDTH)) continue
    const touch = width < 1000
    const page = await browser.newPage({
      viewport: { width, height: width === 3840 ? 2160 : 1000 },
      hasTouch: touch,
      reducedMotion: touch ? 'reduce' : 'no-preference',
    })
    const errors = []
    page.on('pageerror', (e) => {
      errors.push(e.message)
      console.error(e.message)
    })
    const press = async (locator) => (touch ? locator.tap() : locator.click())
    const read = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)
    const dismiss = async () => {
      for (let i = 0; i < 20 && (await page.locator('[data-signal-next]').count()); i++)
        await press(page.locator('[data-signal-next]'))
      assert.equal(await page.locator('dialog.signal-dialogue[open]').count(), 0)
    }
    await page.goto(base)
    await page.evaluate(({ key, invitation }) => localStorage.setItem(key, invitation), {
      key,
      invitation,
    })
    await page.goto(base + '?page=story&lang=' + lang)
    await page.locator('[data-signal-scene="wreck-rumor"]').waitFor()
    await dismiss()
    assert.ok(
      (await read()).campaign.stages
        .find((s) => s.id === 'pressure-cove')
        .scenes.includes('wreck-rumor'),
    )
    await page.reload()
    assert.equal(await page.locator('[data-signal-scene="wreck-rumor"]').count(), 0)
    await page.evaluate(({ key, entrance }) => localStorage.setItem(key, entrance), {
      key,
      entrance,
    })
    await page.goto(base + '?page=story&lang=' + lang)
    await press(page.locator('[data-story-campaign][href*="wreck-harbor"]'))
    await page.locator('[data-signal-scene="wreck-entry"]').waitFor()
    await dismiss()
    await page.locator('.convoy-controls').waitFor()
    assert.equal(await page.locator('[data-control="skill"]').count(), 0)
    await press(page.locator('.convoy-lesson button'))
    const saved = JSON.stringify(await read())
    await press(page.locator('[data-control="convoy-a:97"]'))
    await press(page.locator('[data-control="convoy-b:97"]'))
    assert.equal(await page.locator('[data-control="convoy"]').isEnabled(), false)
    assert.equal(await page.locator('.convoy-collision').count(), 1)
    assert.equal(JSON.stringify(await read()), saved)
    await press(page.locator('.pressure-objective [data-control="help"]'))
    assert.equal(await page.locator('dialog[open] .convoy-guide section').count(), 6)
    await press(page.locator('dialog[open] [data-control="cancel"]'))
    await page.screenshot({ path: `.native/wreck-convoy-${width}-${lang}.png` })
    if (!touch)
      assert.ok(
        await page
          .locator('.convoy-board')
          .evaluate(
            (board) =>
              board.getBoundingClientRect().bottom <=
              document.querySelector('.action-dock').getBoundingClientRect().top,
          ),
        'All rescue berths fit above the desktop dock',
      )
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelector('.ruleset-host').getBoundingClientRect().bottom <=
          document.querySelector('.action-dock').getBoundingClientRect().top + 1,
      ),
    )
    for (let floor = 1; floor <= 5; floor++) {
      console.log(`wreck ${width}/${lang}: floor ${floor}`)
      if (floor > 1) await dismiss()
      if (await page.locator('.convoy-lesson button').count())
        await press(page.locator('.convoy-lesson button'))
      if (floor === 3 || floor === 4)
        await page.screenshot({ path: `.native/wreck-fleet-${floor}-${width}-${lang}.png` })
      if (floor === 4) {
        assert.equal(await page.locator('.convoy-port').count(), 24)
        assert.equal(await page.locator('.convoy-budget').count(), 0)
      }
      if (floor === 5) {
        await page.locator('.keelcrab-board').waitFor()
        assert.ok(
          await page
            .locator('.boss-cell')
            .evaluate(
              (cell) =>
                cell.querySelector('img').getBoundingClientRect().width > cell.clientWidth * 4,
            ),
          'crab fills its island rather than inheriting the generic one-cell sprite size',
        )
        await page.screenshot({ path: `.native/wreck-boss-${width}-${lang}.png` })
        if (!touch)
          assert.ok(
            await page
              .locator('.keelcrab-board')
              .evaluate(
                (board) =>
                  board.getBoundingClientRect().bottom <=
                  document.querySelector('.action-dock').getBoundingClientRect().top,
              ),
            'The complete naval battle fits above the desktop dock',
          )
      }
      for (const action of plans[floor - 1]) {
        if (action.type === 'convoy') {
          for (const [i, to] of action.orders.entries()) {
            const boat = String.fromCharCode(97 + i)
            await press(page.locator(`[data-control="convoy-pick:${i}"]`))
            const button = page.locator(`[data-control="convoy-${boat}:${to}"]`)
            if (await button.count()) await press(button)
          }
          assert.equal(await page.locator('[data-control="convoy"]').isEnabled(), true)
          await press(page.locator('[data-control="convoy"]'))
        } else if (action.type === 'flag' || action.type === 'reveal') {
          const mode = page.locator('[data-control="cycle-mode"]')
          while ((await mode.getAttribute('data-mode')) !== action.type) await press(mode)
          await press(page.locator(`[data-side="a"] [data-cell="${action.index}"]`))
        } else {
          await press(page.locator(`[data-control="river-plan:${action.index}"]`))
          assert.equal(
            await page.locator('[data-control="sail"]').isEnabled(),
            true,
            `sail plan ${action.index}: ${await page.locator('.river-controls').innerText()}`,
          )
          await press(page.locator('[data-control="sail"]'))
        }
        await page.waitForFunction(
          () =>
            !document.querySelector('.keelcrab-fx') &&
            document
              .getAnimations()
              .every((a) => !['convoy-voyage', 'river-voyage', 'keelcrab-fx'].includes(a.id)),
        )
        // Await completion's final render; CSS pulse animations are intentionally excluded.
        await page.waitForTimeout(
          action.type === 'sail' || action.type === 'convoy' ? (touch ? 30 : 700) : 30,
        )
      }
      await dismiss()
      if (floor < 5) {
        const settled = await page.locator('.convoy-board').evaluate((board) => {
          const cells = [...board.querySelectorAll('.cell')]
          const size = cells[0].getBoundingClientRect()
          return {
            rows: board.style.getPropertyValue('--naval-rows'),
            cellWidth: size.width,
            cellHeight: size.height,
            width: board.getBoundingClientRect().width,
            viewport: board.closest('.board-viewport').clientWidth,
          }
        })
        assert.ok(
          Number(settled.rows) >= 13,
          'Settlement retains the chart row count after the dock disappears',
        )
        assert.ok(
          settled.cellWidth > 5 && settled.cellWidth < 100 && settled.cellHeight < 100,
          JSON.stringify(settled),
        )
        assert.ok(settled.width <= settled.viewport + 2, JSON.stringify(settled))
        await page.locator('dialog[open] [data-control="descend"]').waitFor()
        await press(page.locator('dialog[open] [data-control="descend"]'))
        if (floor === 1) {
          await dismiss()
          await page.reload()
        }
      }
    }
    const finished = await read()
    assert.equal(await page.locator('dialog[open] .wreck-unlock').count(), 2)
    assert.deepEqual(finished.camp.storyEquipment, ['pilot-bell'])
    const record = finished.campaign.stages.find((s) => s.id === 'wreck-harbor')
    assert.equal(record.cleared, true)
    assert.ok(record.scenes.includes('wreck-end'))
    await page.goto(base + '?page=story&lang=' + lang)
    assert.equal(await page.locator('[data-signal-scene="wreck-end"]').count(), 0)
    assert.equal(await page.locator('[data-story-cell="118"] img[src*="river-dock"]').count(), 1)
    assert.equal(await page.locator('[data-story-campaign][href*="wreck-harbor"]').count(), 0)
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key,
      value: lossFixture,
    })
    await page.goto(base + '?page=campaign&stage=wreck-harbor&lang=' + lang)
    await press(page.locator(`[data-control="river-plan:${lossAction.index}"]`))
    await press(page.locator('[data-control="sail"]'))
    await page.locator('dialog.expedition-result-dialog[open]').waitFor()
    assert.deepEqual(errors, [])
    console.log(`wreck flow ${width}/${lang}: invitation, convoy, crab, ending passed`)
    await page.close()
  }
} finally {
  await browser.close()
}
