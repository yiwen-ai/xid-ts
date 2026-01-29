// (c) 2023-present, Yiwen AI Limited. All rights reserved.
// See the file LICENSE for licensing terms.

const encodedLen = 20 // string encoded len
const rawLen = 12 // binary raw len
const errInvalidID = 'xid: invalid ID'
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const encoding = textEncoder.encode('0123456789abcdefghijklmnopqrstuv')
const dec = new Uint8Array(256).fill(0xff)
for (let i = 0; i < encoding.length; i++) {
  dec[encoding[i]] = i
}

const crypto_0 =
  typeof globalThis === 'object' && 'crypto' in globalThis
    ? globalThis.crypto
    : typeof crypto === 'object' && 'getRandomValues' in crypto // cloudflare workers
      ? crypto
      : undefined

/**
 * XidState holds the state required for generating new XIDs.
 */
export interface XidState {
  /**
   * A 3-byte machine identifier.
   */
  machineId: Uint8Array // 3 bytes
  /**
   * A 2-byte process identifier.
   */
  pid: number
  /**
   * A 3-byte counter, initialized to a random value.
   */
  counter: number
}

/**
 * Creates a new XidState.
 * @returns A new XidState.
 */
export function newState(): XidState {
  const machineId = getRandom3Bytes()
  return {
    machineId,
    pid: getPid(),
    counter: machineId[2]
  }
}

let defaultState: XidState

try {
  // can not get random values in cloudflare workers during module initialization
  defaultState = newState()
} catch {
  defaultState = {
    machineId: new Uint8Array(3),
    pid: 0,
    counter: 0
  }
}

/**
 * Xid is a globally unique sortable ID.
 * It is a Typescript port of https://github.com/rs/xid.
 * The binary representation is compatible with the Mongo DB 12-byte ObjectId.
 * The value consists of:
 * - a 4-byte timestamp value in seconds since the Unix epoch
 * - a 3-byte value based on the machine identifier
 * - a 2-byte value based on the process id
 * - a 3-byte incrementing counter, initialized to a random value
 *
 * The string representation is 20 bytes, using a base32 hex variant with characters `[0-9a-v]`
 * to retain the sortable property of the id.
 */
export class Xid extends Uint8Array {
  /**
   * Creates a new Xid.
   * If `id` is not provided, a new ID is generated.
   * @param id - An optional 12-byte Uint8Array to use as the ID.
   * @param state - The optional state to use for generating a new ID. In most cases, the default state is sufficient.
   * But for Cloudflare Workers, you may want to create and manage your own state using `newState()` and hold it with DurableObject.
   */
  constructor(id?: Uint8Array, state: XidState = defaultState) {
    super(rawLen)

    if (id == null) {
      const view = new DataView(this.buffer)
      const timestamp = Math.floor(Date.now() / 1000)
      view.setUint32(0, timestamp)

      this[4] = state.machineId[0]
      this[5] = state.machineId[1]
      this[6] = state.machineId[2]
      this[7] = state.pid >> 8
      this[8] = state.pid & 0x00ff
      state.counter += 1
      if (state.counter > 0xffffff) {
        state.counter = 0
      }

      this[9] = state.counter >> 16
      this[10] = (state.counter >> 8) & 0xff
      this[11] = state.counter & 0x0000ff
    } else if (!(id instanceof Uint8Array) || id.length !== rawLen) {
      throw new Error(errInvalidID)
    } else {
      this.set(id)
    }
  }

  /**
   * Returns a zero (nil) Xid.
   * A zero Xid is not valid.
   * @returns A zero Xid.
   */
  static default(): Xid {
    return new Xid(new Uint8Array(rawLen).fill(0))
  }

  /**
   * Creates an Xid from a value.
   * The value can be an Xid, a string, an ArrayBuffer, a Uint8Array, or an array of numbers.
   * @param v - The value to create the Xid from.
   * @returns A new Xid.
   * @throws If the value is invalid.
   */
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

    if (
      Array.isArray(v) &&
      v.length === rawLen &&
      v.every((byte) => typeof byte === 'number' && byte >= 0 && byte <= 255)
    ) {
      return new Xid(new Uint8Array(v))
    }

    throw new Error(errInvalidID)
  }

  /**
   * Parses a string representation of an Xid.
   * @param id - The 20-byte string representation of the Xid.
   * @returns A new Xid.
   * @throws If the string is not a valid Xid.
   */
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
      if (dec[c] == 0xff) {
        throw new Error(errInvalidID)
      }
    }

    this[11] = (dec[src[17]] << 6) | (dec[src[18]] << 1) | (dec[src[19]] >> 4)
    if (encoding[(this[11] << 4) & 0x1f] != src[19]) {
      throw new Error(errInvalidID)
    }

    this[10] = (dec[src[16]] << 3) | (dec[src[17]] >> 2)
    this[9] = (dec[src[14]] << 5) | dec[src[15]]
    this[8] = (dec[src[12]] << 7) | (dec[src[13]] << 2) | (dec[src[14]] >> 3)
    this[7] = (dec[src[11]] << 4) | (dec[src[12]] >> 1)
    this[6] = (dec[src[9]] << 6) | (dec[src[10]] << 1) | (dec[src[11]] >> 4)
    this[5] = (dec[src[8]] << 3) | (dec[src[9]] >> 2)
    this[4] = (dec[src[6]] << 5) | dec[src[7]]
    this[3] = (dec[src[4]] << 7) | (dec[src[5]] << 2) | (dec[src[6]] >> 3)
    this[2] = (dec[src[3]] << 4) | (dec[src[4]] >> 1)
    this[1] = (dec[src[1]] << 6) | (dec[src[2]] << 1) | (dec[src[3]] >> 4)
    this[0] = (dec[src[0]] << 3) | (dec[src[1]] >> 2)
  }

  /**
   * Encodes the Xid into a 20-byte string representation.
   * @returns The string representation of the Xid.
   */
  encode(): string {
    const dst = new Uint8Array(encodedLen)

    dst[19] = encoding[(this[11] << 4) & 0x1f]
    dst[18] = encoding[(this[11] >> 1) & 0x1f]
    dst[17] = encoding[(this[11] >> 6) | ((this[10] << 2) & 0x1f)]
    dst[16] = encoding[this[10] >> 3]
    dst[15] = encoding[this[9] & 0x1f]
    dst[14] = encoding[(this[9] >> 5) | ((this[8] << 3) & 0x1f)]
    dst[13] = encoding[(this[8] >> 2) & 0x1f]
    dst[12] = encoding[(this[8] >> 7) | ((this[7] << 1) & 0x1f)]
    dst[11] = encoding[(this[7] >> 4) | ((this[6] << 4) & 0x1f)]
    dst[10] = encoding[(this[6] >> 1) & 0x1f]
    dst[9] = encoding[(this[6] >> 6) | ((this[5] << 2) & 0x1f)]
    dst[8] = encoding[this[5] >> 3]
    dst[7] = encoding[this[4] & 0x1f]
    dst[6] = encoding[(this[4] >> 5) | ((this[3] << 3) & 0x1f)]
    dst[5] = encoding[(this[3] >> 2) & 0x1f]
    dst[4] = encoding[(this[3] >> 7) | ((this[2] << 1) & 0x1f)]
    dst[3] = encoding[(this[2] >> 4) | ((this[1] << 4) & 0x1f)]
    dst[2] = encoding[(this[1] >> 1) & 0x1f]
    dst[1] = encoding[(this[1] >> 6) | ((this[0] << 2) & 0x1f)]
    dst[0] = encoding[this[0] >> 3]

    return textDecoder.decode(dst)
  }

  /**
   * Returns the timestamp part of the Xid.
   * @returns The timestamp in seconds since the Unix epoch.
   */
  timestamp(): number {
    return new DataView(this.buffer).getUint32(0)
  }

  /**
   * Returns the machine identifier part of the Xid.
   * @returns A 3-byte Uint8Array representing the machine identifier.
   */
  machine(): Uint8Array {
    return new Uint8Array(this.buffer, 4, 3)
  }

  /**
   * Returns the process identifier part of the Xid.
   * @returns The 2-byte process identifier.
   */
  pid(): number {
    return (this[7] << 8) | this[8]
  }

  /**
   * Returns the counter part of the Xid.
   * @returns The 3-byte counter.
   */
  counter(): number {
    return (this[9] << 16) | (this[10] << 8) | this[11]
  }

  /**
   * Checks if the Xid is zero (nil).
   * @returns True if the Xid is zero, false otherwise.
   */
  isZero(): boolean {
    return super.every((byte) => byte === 0)
  }

  /**
   * Returns the string representation of the Xid.
   * This is an alias for `encode()`.
   * @returns The 20-byte string representation of the Xid.
   */
  toString(): string {
    return this.encode()
  }

  /**
   * Returns the raw byte representation of the Xid.
   * @returns A 12-byte Uint8Array.
   */
  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer, 0, rawLen)
  }

  /**
   * Returns the string representation of the Xid for JSON serialization.
   * This is an alias for `encode()`.
   * @returns The 20-byte string representation of the Xid.
   */
  toJSON(): string {
    return this.encode()
  }

  /**
   * Checks if this Xid is equal to another Xid.
   * @param xid - The Xid to compare with.
   * @returns True if the Xids are equal, false otherwise.
   */
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
  return crypto_0!.getRandomValues(new Uint8Array(3))
}

function getPid(): number {
  if (typeof globalThis === 'object' && 'process' in globalThis) {
    return ((globalThis as any).process as any).pid & 0xffff
  }

  const buf = crypto_0!.getRandomValues(new Uint8Array(2))
  return (buf[0] << 8) | buf[1]
}
