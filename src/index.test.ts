// (c) 2023-present, Yiwen AI Limited. All rights reserved.
// See the file LICENSE for licensing terms.

import { assert, describe, it } from 'vitest'
import { decode, encode } from 'cborg'
import { newState, Xid } from './index'

describe('xid', () => {
  it('new', () => {
    const xid = new Xid(new Uint8Array(12).fill(0))
    assert.equal(xid.isZero(), true)
    assert.equal(xid.toString(), '00000000000000000000')
    assert.equal(xid.timestamp(), 0)
    assert.equal(xid.pid(), 0)
    assert.equal(xid.counter(), 0)
    assert.equal(
      xid.toBytes().every((v) => v === 0),
      true
    )
    assert.equal(xid.machine().toString(), '0,0,0')
    assert.equal(xid.equals(Xid.parse('00000000000000000000')), true)
    assert.equal(xid.equals(Xid.default()), true)

    const now = Math.floor(Date.now() / 1000)
    const id1 = new Xid()
    console.log(id1.toString())
    const id2 = new Xid()
    console.log(id2.toString())
    assert.isFalse(id1.isZero())
    assert.isFalse(id2.isZero())
    assert.isFalse(id1.equals(id2))
    assert.isTrue(id1.timestamp() >= now)
    assert.isTrue(id2.timestamp() >= now)
    assert.equal(id1.pid(), globalThis.process.pid & 0xffff)
    assert.equal(id2.pid(), globalThis.process.pid & 0xffff)
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
    assert.isTrue(
      xid.equals(
        Xid.fromValue([
          0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9
        ])
      )
    )
    assert.isTrue(
      xid.equals(
        Xid.fromValue(
          new Uint8Array([
            0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d,
            0xc9
          ])
        )
      )
    )
    assert.isTrue(
      xid.equals(
        Xid.fromValue(
          Buffer.from([
            0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d,
            0xc9
          ])
        )
      )
    )

    assert.throws(() => Xid.fromValue(''))
    assert.throws(() => Xid.fromValue('00000000000000jarvis'))
    assert.throws(() => Xid.fromValue('0000000000000000000000000000'))
    assert.throws(() =>
      Xid.fromValue([
        0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 1999
      ])
    )
    assert.throws(() =>
      Xid.fromValue(
        new Uint8Array([
          0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d
        ])
      )
    )
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
    assert.equal(
      Buffer.from(data).toString('hex'),
      'a26269644c4d88e15b60f486e428412dc9646e616d6565796977656e'
    )
    // https://cbor.me/
    // {"id": h'4D88E15B60F486E428412DC9', "name": "yiwen"}

    const obj2 = decode(data)
    assert.isTrue(xid.equals(Xid.fromValue(obj2.id)))
  })

  it('rejects invalid strings', () => {
    // 'w' to 'z' are outside the base32 hex alphabet [0-9a-v]
    assert.throws(() => Xid.parse('xxxxxxxxxxxxxxxxxxxx'))
    // uppercase is invalid, same as the Go implementation
    assert.throws(() => Xid.parse('9M4E2MR0UI3E8A215N4G'))
    // non-ASCII characters
    assert.throws(() => Xid.parse('9m4e2mr0ui3e8a215n4中'))
    // the last character must have its low 4 bits set to zero:
    // 'g' (16) is valid padding, 'h' (17) is not
    assert.isTrue(Xid.parse('cirourjjtoj371ols49g').isZero() === false)
    assert.throws(() => Xid.parse('cirourjjtoj371ols49h'))
    // wrong length
    assert.throws(() => Xid.parse(''))
    assert.throws(() => Xid.parse('cirourjjtoj371ols49'))
    assert.throws(() => Xid.parse('cirourjjtoj371ols49g0'))
  })

  it('fromValue with ArrayBuffer and nullish values', () => {
    const bytes = new Uint8Array([
      0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9
    ])
    const xid = Xid.fromValue(bytes.slice().buffer)
    assert.equal(xid.toString(), '9m4e2mr0ui3e8a215n4g')
    assert.throws(() => Xid.fromValue(new ArrayBuffer(11)))

    // like the Go implementation, JSON null / SQL NULL means the nil ID
    assert.isTrue(Xid.fromValue(null).isZero())
    assert.isTrue(Xid.fromValue(undefined).isZero())
  })

  it('constructor validates the id', () => {
    assert.throws(() => new Xid(new Uint8Array(11)))
    assert.throws(() => new Xid(new Uint8Array(13)))
    assert.throws(() => new Xid([1, 2, 3] as unknown as Uint8Array))
  })

  it('constructor validates the state', () => {
    const state = newState()
    assert.isFalse(new Xid(undefined, state).isZero())
    assert.throws(
      () => new Xid(undefined, { ...state, machineId: new Uint8Array(2) })
    )
    assert.throws(() => new Xid(undefined, { ...state, pid: 1.5 }))
    assert.throws(() => new Xid(undefined, { ...state, counter: NaN }))
  })

  it('toJSON serializes the zero id to null like Go', () => {
    assert.isNull(Xid.default().toJSON())
    assert.equal(JSON.stringify({ id: Xid.default() }), '{"id":null}')

    const obj = JSON.parse(JSON.stringify({ id: Xid.default() }))
    assert.isTrue(Xid.fromValue(obj.id).isZero())

    const xid = Xid.parse('9m4e2mr0ui3e8a215n4g')
    assert.equal(xid.toJSON(), '9m4e2mr0ui3e8a215n4g')
  })

  it('compare', () => {
    const a = Xid.parse('cirourjjtoj371ols490')
    const b = Xid.parse('cirourjjtoj371ols49g')
    assert.equal(a.compare(b), -1)
    assert.equal(b.compare(a), 1)
    assert.equal(a.compare(Xid.parse(a.toString())), 0)

    // byte order and string order are equivalent
    const ids = [b, a, Xid.default(), new Xid()]
    const byBytes = ids
      .slice()
      .sort((x, y) => x.compare(y))
      .map((x) => x.toString())
    const byString = ids
      .map((x) => x.toString())
      .slice()
      .sort()
    assert.deepEqual(byBytes, byString)
  })

  it('newWithTime', () => {
    const ts = 1300816219
    const id1 = Xid.newWithTime(ts)
    assert.equal(id1.timestamp(), ts)
    const id2 = Xid.newWithTime(new Date(ts * 1000))
    assert.equal(id2.timestamp(), ts)
    assert.isFalse(id1.equals(id2))
    assert.equal(id1.pid(), id2.pid())
    assert.equal(id2.counter(), (id1.counter() + 1) & 0xffffff)

    // timestamps beyond 2038 (> 2^31) stay unsigned
    const id3 = Xid.newWithTime(0x90000000)
    assert.equal(id3.timestamp(), 0x90000000)

    assert.throws(() => Xid.newWithTime(NaN))
    assert.throws(() => Xid.newWithTime(new Date(NaN)))
  })

  it('returns copies, not views', () => {
    const xid = Xid.parse('9m4e2mr0ui3e8a215n4g')
    const machine = xid.machine()
    const bytes = xid.toBytes()
    machine[0] = 0xff
    bytes[0] = 0xff
    assert.equal(xid.toString(), '9m4e2mr0ui3e8a215n4g')

    // inherited array methods produce plain Uint8Array, not Xid
    const sliced = xid.slice(4, 7)
    assert.instanceOf(sliced, Uint8Array)
    assert.notInstanceOf(sliced, Xid)
    assert.deepEqual(Array.from(sliced), Array.from(xid.machine()))
  })

  it('generates unique ids', () => {
    const ids = new Array(10000)
      .fill(0)
      .map(() => new Xid().toString())
      .sort()

    let lastId = ''
    const duplicateFound = ids.some((id) => {
      if (lastId === id) return true
      lastId = id
      return false
    })

    assert.isFalse(duplicateFound, 'duplicate ids found in 10k ids generated')
  })
})
