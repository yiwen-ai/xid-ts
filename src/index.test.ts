// (c) 2023-present, Yiwen AI Limited. All rights reserved.
// See the file LICENSE for licensing terms.

import { assert, describe, it } from 'vitest'
import { decode, encode } from 'cborg'
import { Xid } from './index'

describe('xid', () => {
  it('new', () => {
    const xid = new Xid(new Uint8Array(12).fill(0))
    assert.equal(xid.isZero(), true)
    assert.equal(xid.toString(), '00000000000000000000')
    assert.equal(xid.timestamp(), 0)
    assert.equal(xid.pid(), 0)
    assert.equal(xid.counter(), 0)
    assert.equal(xid.toBytes().every(v => v === 0), true)
    assert.equal(xid.machine().toString(), '0,0,0')
    assert.equal(xid.equals(Xid.parse('00000000000000000000')), true)
    assert.equal(xid.equals(Xid.default()), true)

    const now = Math.floor(Date.now() / 1000)
    const id1 = new Xid()
    const id2 = new Xid()
    assert.isFalse(id1.isZero())
    assert.isFalse(id2.isZero())
    assert.isFalse(id1.equals(id2))
    assert.isTrue(id1.timestamp() >= now)
    assert.isTrue(id2.timestamp() >= now)
    assert.equal(id1.pid(), process.pid)
    assert.equal(id2.pid(), process.pid)
    // assert.equal(id2.machine().toString(), id1.machine().toString())
  })

  it('parse', () => {
    const cases = [
      ['64b78f6e73ee26338715e112', 'cirourjjtoj371ols490'],
      ['64b78f6e73ee26338715e113', 'cirourjjtoj371ols49g'],
      ['64b78f6e73ee26338715e114', 'cirourjjtoj371ols4a0'],
      ['64b78f6e73ee26338715e115', 'cirourjjtoj371ols4ag'],
      ['64b78f6e73ee26338715e116', 'cirourjjtoj371ols4b0'],
      ['64b78f6e73ee26338715e117', 'cirourjjtoj371ols4bg']
    ]

    for (const v of cases) {
      const xid = Xid.fromValue(Buffer.from(v[0], 'hex'))
      assert.isTrue(xid.equals(Xid.parse(v[1])))
      assert.isTrue(xid.equals(new Xid(xid.toBytes())))
    }
  })

  it('fromValue', () => {
    const xid = Xid.fromValue('9m4e2mr0ui3e8a215n4g')
    assert.equal(xid.toString(), '9m4e2mr0ui3e8a215n4g')
    // console.log(xid.toBytes())
    // console.log(xid.timestamp())
    // console.log(xid.counter())
    assert.isTrue(xid == Xid.fromValue(xid))
    assert.isTrue(xid.equals(Xid.fromValue(xid)))
    assert.isTrue(xid.equals(Xid.fromValue([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9])))
    assert.isTrue(xid.equals(Xid.fromValue(new Uint8Array([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9]))))
    assert.isTrue(xid.equals(Xid.fromValue(Buffer.from([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9]))))

    assert.throws(() => Xid.fromValue(''))
    assert.throws(() => Xid.fromValue('00000000000000jarvis'))
    assert.throws(() => Xid.fromValue('0000000000000000000000000000'))
    assert.throws(() => Xid.fromValue([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 1999]))
    assert.throws(() => Xid.fromValue(new Uint8Array([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d])))
  })

  it('json and cbor', () => {
    const xid = Xid.fromValue('9m4e2mr0ui3e8a215n4g')
    const obj = {
      id: xid,
      name: 'yiwen'
    }
    const json = JSON.stringify(obj)
    assert.equal(json, '{"id":"9m4e2mr0ui3e8a215n4g","name":"yiwen"}')
    const obj1 = JSON.parse(json)
    assert.isTrue(xid.equals(Xid.fromValue(obj1.id)))

    const data = encode(obj)
    assert.equal(Buffer.from(data).toString('hex'), 'a26269644c4d88e15b60f486e428412dc9646e616d6565796977656e')
    // https://cbor.me/
    // {"id": h'4D88E15B60F486E428412DC9', "name": "yiwen"}

    const obj2 = decode(data)
    assert.isTrue(xid.equals(Xid.fromValue(obj2.id)))
  })
})
