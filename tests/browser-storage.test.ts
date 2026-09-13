import test from 'node:test'
import assert from 'node:assert/strict'
import { BrowserStorage } from '../src/platform/browser.js'
import { MemoryStorage } from './helpers.js'

test('preview writes and deletion cannot migrate or remove stable saves on the same origin', () => {
  const backing = new MemoryStorage()
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: backing })
  try {
    const stable = new BrowserStorage(),
      preview = new BrowserStorage('minefarer.dev:')
    stable.setItem('save', 'stable progress')
    assert.equal(preview.getItem('save'), null)
    preview.setItem('save', 'preview progress')
    assert.equal(stable.getItem('save'), 'stable progress')
    assert.equal(preview.getItem('save'), 'preview progress')
    preview.removeItem('save')
    assert.equal(stable.getItem('save'), 'stable progress')
    stable.removeItem('save')
    assert.equal(stable.getItem('save'), null)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
