import assert from 'node:assert/strict'
import { resolveConfig } from 'vite'

for (const base of ['/minefarer/', '/minefarer/dev/']) {
  const config = await resolveConfig({ base, logLevel: 'silent' }, 'build')
  assert.equal(config.base, base)
}
for (const base of ['/', '/dev/', '/another-project/', './']) {
  await assert.rejects(
    resolveConfig({ base, logLevel: 'silent' }, 'build'),
    /Minefarer builds must stay under/,
  )
}
console.log('Minefarer cannot build an account-root or unrelated project deployment.')
