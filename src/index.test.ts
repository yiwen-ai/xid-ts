import { assert, describe, it } from 'vitest'
import { Xid } from './index'

describe('xid', () => {
  it('new', () => {
    const xid = new Xid()
    assert.equal(xid.isZero(), true)
    assert.equal(xid.toString(), '00000000000000000000')
    assert.equal(xid.timestamp(), 0)
    assert.equal(xid.pid(), 0)
    assert.equal(xid.counter(), 0)
    assert.equal(xid.machine().toString(), '0,0,0')
    assert.equal(xid.equals(Xid.parse('00000000000000000000')), true)
  })

  it('next', () => {
    const now = Math.floor(Date.now() / 1000)
    const id1 = Xid.next()
    const id2 = Xid.next()
    assert.isFalse(id1.isZero())
    assert.isFalse(id2.isZero())
    assert.isFalse(id1.equals(id2))
    assert.isTrue(id1.timestamp() >= now)
    assert.isTrue(id2.timestamp() >= now)
    assert.isTrue(id1.pid() > 0)
    assert.isTrue(id1.counter() > 0)
    assert.equal(id2.pid(), id1.pid())
    assert.equal(id2.machine().toString(), id1.machine().toString())
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
      const xid = Xid.from(Buffer.from(v[0], 'hex'))
      assert.isTrue(xid.equals(Xid.parse(v[1])))
    }
  })

  it('from', () => {
    const xid = Xid.from('9m4e2mr0ui3e8a215n4g');
    assert.equal(xid.toString(), '9m4e2mr0ui3e8a215n4g')
    console.log(xid.toBytes())
    console.log(xid.timestamp())
    console.log(xid.counter())
    assert.isTrue(xid == Xid.from(xid))
    assert.isTrue(xid.equals(Xid.from(xid)))
    assert.isTrue(xid.equals(Xid.from([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9])))
    assert.isTrue(xid.equals(Xid.from(new Uint8Array([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9]))))
    assert.isTrue(xid.equals(Xid.from(Buffer.from([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9]))))

    assert.throws(() => Xid.from(''))
    assert.throws(() => Xid.from('00000000000000jarvis'))
    assert.throws(() => Xid.from('0000000000000000000000000000'))
    assert.throws(() => Xid.from([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 1999]))
    assert.throws(() => Xid.from(new Uint8Array([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d])))
  })
})
