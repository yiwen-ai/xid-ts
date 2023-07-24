// (c) 2023-present, Yiwen AI Limited. All rights reserved.
// See the file LICENSE for licensing terms.

const encodedLen = 20 // string encoded len
const rawLen = 12 // binary raw len
const errInvalidID = "xid: invalid ID"
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const encoding = textEncoder.encode('0123456789abcdefghijklmnopqrstuv')
const dec = new Uint8Array(256).fill(0xFF)
for (let i = 0; i < encoding.length; i++) {
  dec[encoding[i]] = i
}

let cry: Crypto
if (typeof crypto === 'object' && crypto.getRandomValues != null) {
  cry = crypto
} else {
  cry = await import('node:crypto') as Crypto
}

const start = getRandom3Bytes()

export class Xid extends Uint8Array {
  private static machineId = getRandom3Bytes()
  private static pid = getPid()
  private static counter = start[0] << 16 | start[1] << 8 | start[2]

  constructor(id?: Uint8Array) {
    super(rawLen)

    if (id == null) {
      const view = new DataView(this.buffer)
      const timestamp = Math.floor(Date.now() / 1000)
      view.setUint32(0, timestamp)

      this[4] = Xid.machineId[0]
      this[5] = Xid.machineId[1]
      this[6] = Xid.machineId[2]
      this[7] = Xid.pid >> 8
      this[8] = Xid.pid & 0x00FF

      Xid.counter += 1
      if (Xid.counter > 0xFFFFFF) {
        Xid.counter = 0
      }

      this[9] = Xid.counter >> 16
      this[10] = Xid.counter & 0x00FFFF >> 8
      this[11] = Xid.counter & 0x0000FF

    } else if (!(id instanceof Uint8Array) || id.length !== rawLen) {
      throw new Error(errInvalidID)
    } else {
      this.set(id)
    }
  }

  static default(): Xid {
    return new Xid(new Uint8Array(rawLen).fill(0))
  }

  static fromValue(v: Xid | string | ArrayBuffer | Uint8Array | number[]): Xid {
    if (v instanceof Xid) {
      return v
    }

    if (typeof v === 'string') {
      return Xid.parse(v)
    }

    if (v instanceof Uint8Array && v.length === rawLen) {
      return new Xid(v)
    }

    if (v instanceof ArrayBuffer && v.byteLength === rawLen) {
      return new Xid(new Uint8Array(v))
    }

    if (Array.isArray(v) && v.length === rawLen && v.every(byte => typeof byte === 'number' && byte >= 0 && byte <= 255)) {
      return new Xid(new Uint8Array(v))
    }

    throw new Error(errInvalidID)
  }

  static parse(id: string): Xid {
    if (id.length !== encodedLen) {
      throw new Error(errInvalidID)
    }

    const xid = new Xid()
    xid.decode(id)
    return xid
  }

  private decode(str: string) {
    const src = textEncoder.encode(str)
    if (src.length !== encodedLen) {
      throw new Error(errInvalidID)
    }

    for (const c of src) {
      if (dec[c] == 0xFF) {
        throw new Error(errInvalidID)
      }
    }

    this[11] = dec[src[17]] << 6 | dec[src[18]] << 1 | dec[src[19]] >> 4
    if (encoding[(this[11] << 4) & 0x1F] != src[19]) {
      throw new Error(errInvalidID)
    }

    this[10] = dec[src[16]] << 3 | dec[src[17]] >> 2
    this[9] = dec[src[14]] << 5 | dec[src[15]]
    this[8] = dec[src[12]] << 7 | dec[src[13]] << 2 | dec[src[14]] >> 3
    this[7] = dec[src[11]] << 4 | dec[src[12]] >> 1
    this[6] = dec[src[9]] << 6 | dec[src[10]] << 1 | dec[src[11]] >> 4
    this[5] = dec[src[8]] << 3 | dec[src[9]] >> 2
    this[4] = dec[src[6]] << 5 | dec[src[7]]
    this[3] = dec[src[4]] << 7 | dec[src[5]] << 2 | dec[src[6]] >> 3
    this[2] = dec[src[3]] << 4 | dec[src[4]] >> 1
    this[1] = dec[src[1]] << 6 | dec[src[2]] << 1 | dec[src[3]] >> 4
    this[0] = dec[src[0]] << 3 | dec[src[1]] >> 2
  }

  encode(): string {
    const dst = new Uint8Array(encodedLen)

    dst[19] = encoding[(this[11] << 4) & 0x1F]
    dst[18] = encoding[(this[11] >> 1) & 0x1F]
    dst[17] = encoding[(this[11] >> 6) | (this[10] << 2) & 0x1F]
    dst[16] = encoding[this[10] >> 3]
    dst[15] = encoding[this[9] & 0x1F]
    dst[14] = encoding[(this[9] >> 5) | (this[8] << 3) & 0x1F]
    dst[13] = encoding[(this[8] >> 2) & 0x1F]
    dst[12] = encoding[this[8] >> 7 | (this[7] << 1) & 0x1F]
    dst[11] = encoding[(this[7] >> 4) | (this[6] << 4) & 0x1F]
    dst[10] = encoding[(this[6] >> 1) & 0x1F]
    dst[9] = encoding[(this[6] >> 6) | (this[5] << 2) & 0x1F]
    dst[8] = encoding[this[5] >> 3]
    dst[7] = encoding[this[4] & 0x1F]
    dst[6] = encoding[this[4] >> 5 | (this[3] << 3) & 0x1F]
    dst[5] = encoding[(this[3] >> 2) & 0x1F]
    dst[4] = encoding[this[3] >> 7 | (this[2] << 1) & 0x1F]
    dst[3] = encoding[(this[2] >> 4) | (this[1] << 4) & 0x1F]
    dst[2] = encoding[(this[1] >> 1) & 0x1F]
    dst[1] = encoding[(this[1] >> 6) | (this[0] << 2) & 0x1F]
    dst[0] = encoding[this[0] >> 3]

    return textDecoder.decode(dst)
  }

  timestamp(): number {
    return new DataView(this.buffer).getUint32(0)
  }

  machine(): Uint8Array {
    return new Uint8Array(this.buffer, 4, 3)
  }

  pid(): number {
    return this[7] << 8 | this[8]
  }

  counter(): number {
    return this[9] << 16 | this[10] << 8 | this[11]
  }

  isZero(): boolean {
    return super.every(byte => byte === 0)
  }

  toString(): string {
    return this.encode()
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer, 0, rawLen)
  }

  toJSON(): string {
    return this.encode()
  }

  equals(xid: Xid): boolean {
    for (let i = 0; i < rawLen; i++) {
      if (this[i] !== xid[i]) {
        return false
      }
    }
    return true
  }
}

function getRandom3Bytes(): Uint8Array {
  return cry.getRandomValues(new Uint8Array(3))
}

function getPid(): number {
  if (typeof process === 'object' && process.pid > 0) {
    return process.pid & 0xFFFF
  }

  const buf = cry.getRandomValues(new Uint8Array(2))
  return buf[0] << 8 | buf[1]
}