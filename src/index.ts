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

const start = getRandom3Bytes()

export class Xid {
  private static machineId = getRandom3Bytes()
  private static pid = getPid()
  private static counter = start[0] << 16 | start[1] << 8 | start[2]

  constructor(private id = new Uint8Array(rawLen).fill(0)) {
  }

  static next(): Xid {
    const xid = new Xid()
    const view = new DataView(xid.id.buffer)
    const timestamp = Math.floor(Date.now() / 1000)
    view.setUint32(0, timestamp)

    xid.id[4] = Xid.machineId[0]
    xid.id[5] = Xid.machineId[1]
    xid.id[6] = Xid.machineId[2]
    xid.id[7] = Xid.pid >> 8
    xid.id[8] = Xid.pid & 0x00FF

    Xid.counter += 1
    if (Xid.counter > 0xFFFFFF) {
      Xid.counter = 0
    }

    xid.id[9] = Xid.counter >> 16
    xid.id[10] = Xid.counter & 0x00FFFF >> 8
    xid.id[11] = Xid.counter & 0x0000FF
    return xid
  }

  static from(v: Xid | string | ArrayBuffer | Uint8Array | number[]): Xid {
    if (v instanceof Xid) {
      return v
    }

    if (typeof v === 'string') {
      return Xid.parse(v)
    }

    if (v instanceof Uint8Array && v.length === rawLen) {
      return new Xid(new Uint8Array(v))
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

    this.id[11] = dec[src[17]] << 6 | dec[src[18]] << 1 | dec[src[19]] >> 4
    if (encoding[(this.id[11] << 4) & 0x1F] != src[19]) {
      throw new Error(errInvalidID)
    }

    this.id[10] = dec[src[16]] << 3 | dec[src[17]] >> 2
    this.id[9] = dec[src[14]] << 5 | dec[src[15]]
    this.id[8] = dec[src[12]] << 7 | dec[src[13]] << 2 | dec[src[14]] >> 3
    this.id[7] = dec[src[11]] << 4 | dec[src[12]] >> 1
    this.id[6] = dec[src[9]] << 6 | dec[src[10]] << 1 | dec[src[11]] >> 4
    this.id[5] = dec[src[8]] << 3 | dec[src[9]] >> 2
    this.id[4] = dec[src[6]] << 5 | dec[src[7]]
    this.id[3] = dec[src[4]] << 7 | dec[src[5]] << 2 | dec[src[6]] >> 3
    this.id[2] = dec[src[3]] << 4 | dec[src[4]] >> 1
    this.id[1] = dec[src[1]] << 6 | dec[src[2]] << 1 | dec[src[3]] >> 4
    this.id[0] = dec[src[0]] << 3 | dec[src[1]] >> 2
  }

  encode(): string {
    const dst = new Uint8Array(encodedLen)

    dst[19] = encoding[(this.id[11] << 4) & 0x1F]
    dst[18] = encoding[(this.id[11] >> 1) & 0x1F]
    dst[17] = encoding[(this.id[11] >> 6) | (this.id[10] << 2) & 0x1F]
    dst[16] = encoding[this.id[10] >> 3]
    dst[15] = encoding[this.id[9] & 0x1F]
    dst[14] = encoding[(this.id[9] >> 5) | (this.id[8] << 3) & 0x1F]
    dst[13] = encoding[(this.id[8] >> 2) & 0x1F]
    dst[12] = encoding[this.id[8] >> 7 | (this.id[7] << 1) & 0x1F]
    dst[11] = encoding[(this.id[7] >> 4) | (this.id[6] << 4) & 0x1F]
    dst[10] = encoding[(this.id[6] >> 1) & 0x1F]
    dst[9] = encoding[(this.id[6] >> 6) | (this.id[5] << 2) & 0x1F]
    dst[8] = encoding[this.id[5] >> 3]
    dst[7] = encoding[this.id[4] & 0x1F]
    dst[6] = encoding[this.id[4] >> 5 | (this.id[3] << 3) & 0x1F]
    dst[5] = encoding[(this.id[3] >> 2) & 0x1F]
    dst[4] = encoding[this.id[3] >> 7 | (this.id[2] << 1) & 0x1F]
    dst[3] = encoding[(this.id[2] >> 4) | (this.id[1] << 4) & 0x1F]
    dst[2] = encoding[(this.id[1] >> 1) & 0x1F]
    dst[1] = encoding[(this.id[1] >> 6) | (this.id[0] << 2) & 0x1F]
    dst[0] = encoding[this.id[0] >> 3]

    return textDecoder.decode(dst)
  }

  timestamp(): number {
    return new DataView(this.id.buffer).getUint32(0)
  }

  machine(): Uint8Array {
    return this.id.slice(4, 7)
  }

  pid(): number {
    return this.id[7] << 8 | this.id[8]
  }

  counter(): number {
    return this.id[9] << 16 | this.id[10] << 8 | this.id[11]
  }

  isZero(): boolean {
    return this.id.every(byte => byte === 0)
  }

  toString(): string {
    return this.encode()
  }

  toBytes(): Uint8Array {
    return this.id
  }

  equals(xid: Xid): boolean {
    for (let i = 0; i < rawLen; i++) {
      if (this.id[i] !== xid.id[i]) {
        return false
      }
    }
    return true
  }
}

function getRandom3Bytes(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(3))
}

function getPid(): number {
  if (typeof process === 'object' && process.pid > 0) {
    return process.pid & 0xFFFF
  }

  const buf = crypto.getRandomValues(new Uint8Array(2))
  return buf[0] << 8 | buf[1]
}