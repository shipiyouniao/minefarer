import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE)
const root = resolve('.native/deploy-site')
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(
      /^\/minefarer\//,
      '',
    )
    const file = resolve(root, !path || path.endsWith('/') ? `${path}index.html` : path)
    assert.ok(file.startsWith(root + sep))
    const data = await readFile(file)
    res.setHeader(
      'content-type',
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
      }[extname(file)] || 'application/octet-stream',
    )
    res.end(data)
  } catch {
    res.statusCode = 404
    res.end()
  }
})
await new Promise((resolve) => server.listen(4184, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: 'msedge' })
try {
  const page = await browser.newPage()
  const failures = []
  page.on('pageerror', (e) => failures.push(e.message))
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`)
  })
  const base = 'http://127.0.0.1:4184/minefarer/'
  const key = 'minesweeper.variants.v1.expedition'
  await page.goto(base + '?page=story&lang=zh')
  await page.locator('.story-board').waitFor()
  const stable = await page.evaluate((key) => localStorage.getItem(key), key)
  assert.ok(stable)
  await page.goto(base + 'dev/?page=story&lang=zh')
  await page.locator('.story-board').waitFor()
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), stable)
  assert.ok(await page.evaluate((key) => localStorage.getItem('minefarer.dev:' + key), key))
  assert.ok(
    await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((links) => links.every((l) => l.href.includes('/minefarer/dev/'))),
  )
  assert.deepEqual(failures, [])
  console.log('Production root and /dev/ load with independent saves and no missing assets')
} finally {
  await browser.close()
  server.close()
}
