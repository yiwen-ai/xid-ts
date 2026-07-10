// Smoke tests for the built package: both the CJS and the ESM entry must
// load, export Xid, and agree on the wire format.
import assert from 'node:assert'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const cjs = require('../dist/cjs/index.js')
const esm = await import('../dist/esm/index.js')

assert.equal(typeof cjs.Xid, 'function', 'CJS build does not export Xid')
assert.equal(typeof esm.Xid, 'function', 'ESM build does not export Xid')

const id = new cjs.Xid()
assert.equal(esm.Xid.parse(id.toString()).toString(), id.toString())
assert.equal(esm.Xid.fromValue(id.toBytes()).toString(), id.toString())
console.log('dist ok:', id.toString())
