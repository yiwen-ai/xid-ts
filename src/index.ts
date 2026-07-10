// (c) 2023-present, Yiwen AI Limited. All rights reserved.
// See the file LICENSE for licensing terms.

const encodedLen = 20 // string encoded len
const rawLen = 12 // binary raw len
const errInvalidID = 'xid: invalid ID'
const encoding = '0123456789abcdefghijklmnopqrstuv'
const enc = new Uint8Array(encoding.length) // char codes of the encoding alphabet
const dec = new Uint8Array(256).fill(0xff) // char code -> 5-bit value, 0xff for invalid
for (let i = 0; i < encoding.length; i++) {
  enc[i] = encoding.charCodeAt(i)
  dec[enc[i]] = i
}

const zeroID = new Uint8Array(rawLen)

// Web Crypto is available in all supported runtimes: modern browsers,
// Node.js >= 19, Deno, Bun and Cloudflare Workers.
const crypto_0 =
  typeof globalThis === 'object' &&
  typeof globalThis.crypto?.getRandomValues === 'function'
    ? globalThis.crypto
    : undefined

// instanceof-free checks that also work for values from another realm
// (e.g. node:vm contexts, iframes, worker RPC boundaries)
function isUint8Array(v: unknown): v is Uint8Array {
  return (
    v instanceof Uint8Array ||
    Object.prototype.toString.call(v) === '[object Uint8Array]'
  )
}

function isArrayBuffer(v: unknown): v is ArrayBuffer {
  return (
    v instanceof ArrayBuffer ||
    Object.prototype.toString.call(v) === '[object ArrayBuffer]'
  )
}

/**
 * XidState holds the state required for generating new XIDs.
 */
export interface XidState {
  /**
   * A 3-byte machine identifier.
   *
   * Unlike the Go implementation (which derives it from the platform machine
   * id or hostname, so all processes on one machine share the same value),
   * `newState()` fills it with random bytes. JavaScript runtimes often host
   * many isolates, worker threads or bundled copies of this module within
   * one machine and even one process; a per-state random value keeps ids
   * from those instances from colliding, at the cost of not being able to
   * group ids by machine.
   */
  machineId: Uint8Array // 3 bytes
  /**
   * A 2-byte process identifier.
   */
  pid: number
  /**
   * A 3-byte counter (0 to 0xffffff), initialized to a random value.
   */
  counter: number
}

/**
 * Creates a new XidState.
 * @returns A new XidState.
 */
export function newState(): XidState {
  const seed = getRandomBytes(6)
  return {
    machineId: seed.slice(0, 3),
    pid: getPid(),
    counter: (seed[3] << 16) | (seed[4] << 8) | seed[5]
  }
}

let defaultState: XidState | undefined

// The default state is created lazily on first use: some runtimes
// (e.g. Cloudflare Workers) forbid crypto.getRandomValues during module
// initialization, and failing loudly at generation time is better than
// silently generating collision-prone ids from a zero state.
function getDefaultState(): XidState {
  if (defaultState === undefined) {
    defaultState = newState()
  }
  return defaultState
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
   * Ensures the array methods inherited from Uint8Array (slice, map, subarray, etc.)
   * produce plain Uint8Array results instead of trying to construct a new Xid.
   */
  static get [Symbol.species](): Uint8ArrayConstructor {
    return Uint8Array
  }

  /**
   * Creates a new Xid.
   * If `id` is not provided, a new ID is generated.
   * @param id - An optional 12-byte Uint8Array to use as the ID.
   * @param state - The optional state to use for generating a new ID. In most cases, the default state is sufficient.
   * But for Cloudflare Workers, you may want to create and manage your own state using `newState()` and hold it with DurableObject.
   */
  constructor(id?: Uint8Array, state?: XidState) {
    super(rawLen)

    if (id == null) {
      const st = state ?? getDefaultState()
      if (
        !isUint8Array(st.machineId) ||
        st.machineId.length < 3 ||
        !Number.isInteger(st.pid) ||
        !Number.isInteger(st.counter)
      ) {
        throw new Error('xid: invalid state')
      }

      const timestamp = Math.floor(Date.now() / 1000)
      this[0] = (timestamp >> 24) & 0xff
      this[1] = (timestamp >> 16) & 0xff
      this[2] = (timestamp >> 8) & 0xff
      this[3] = timestamp & 0xff

      this[4] = st.machineId[0]
      this[5] = st.machineId[1]
      this[6] = st.machineId[2]
      this[7] = (st.pid >> 8) & 0xff
      this[8] = st.pid & 0xff

      st.counter = (st.counter + 1) & 0xffffff
      this[9] = (st.counter >> 16) & 0xff
      this[10] = (st.counter >> 8) & 0xff
      this[11] = st.counter & 0xff
    } else if (!isUint8Array(id) || id.length !== rawLen) {
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
    return new Xid(zeroID)
  }

  /**
   * Generates a new Xid with the given time instead of the current time.
   * The rest of the id (machine id, pid, counter) is generated as usual.
   * This is the equivalent of Go's `NewWithTime`.
   * @param time - The time as seconds since the Unix epoch, or a Date.
   * @param state - The optional state, see the constructor.
   * @returns A new Xid.
   */
  static newWithTime(time: number | Date, state?: XidState): Xid {
    const ts = time instanceof Date ? time.getTime() / 1000 : time
    if (typeof ts !== 'number' || !Number.isFinite(ts)) {
      throw new Error('xid: invalid time')
    }

    const xid = new Xid(undefined, state)
    const t = Math.floor(ts)
    xid[0] = (t >> 24) & 0xff
    xid[1] = (t >> 16) & 0xff
    xid[2] = (t >> 8) & 0xff
    xid[3] = t & 0xff
    return xid
  }

  /**
   * Creates an Xid from a value.
   * The value can be an Xid, a string, an ArrayBuffer, a Uint8Array, or an array of numbers.
   * A nullish value produces a zero (nil) Xid, mirroring how the Go
   * implementation unmarshals JSON `null` and SQL `NULL`.
   * @param v - The value to create the Xid from.
   * @returns A new Xid. If `v` is already an Xid, it is returned as-is
   * (not copied); use `new Xid(v)` when a copy is needed.
   * @throws If the value is invalid.
   */
  static fromValue(
    v?: Xid | string | ArrayBuffer | Uint8Array | number[] | null
  ): Xid {
    if (v == null) {
      return new Xid(zeroID)
    }

    if (v instanceof Xid) {
      return v
    }

    if (typeof v === 'string') {
      return Xid.parse(v)
    }

    if (isUint8Array(v) && v.length === rawLen) {
      return new Xid(v)
    }

    if (isArrayBuffer(v) && v.byteLength === rawLen) {
      return new Xid(new Uint8Array(v))
    }

    if (
      Array.isArray(v) &&
      v.length === rawLen &&
      v.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
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
    const xid = new Xid(zeroID)
    xid.decode(id)
    return xid
  }

  private decode(str: string) {
    if (str.length !== encodedLen) {
      throw new Error(errInvalidID)
    }

    // decode each character to its 5-bit value first
    const vals = new Uint8Array(encodedLen)
    for (let i = 0; i < encodedLen; i++) {
      const v = dec[str.charCodeAt(i)] ?? 0xff
      if (v === 0xff) {
        throw new Error(errInvalidID)
      }
      vals[i] = v
    }

    // the last character only carries 1 bit of data,
    // its low 4 bits must be zero padding
    if ((vals[19] & 0x0f) !== 0) {
      throw new Error(errInvalidID)
    }

    this[0] = (vals[0] << 3) | (vals[1] >> 2)
    this[1] = (vals[1] << 6) | (vals[2] << 1) | (vals[3] >> 4)
    this[2] = (vals[3] << 4) | (vals[4] >> 1)
    this[3] = (vals[4] << 7) | (vals[5] << 2) | (vals[6] >> 3)
    this[4] = (vals[6] << 5) | vals[7]
    this[5] = (vals[8] << 3) | (vals[9] >> 2)
    this[6] = (vals[9] << 6) | (vals[10] << 1) | (vals[11] >> 4)
    this[7] = (vals[11] << 4) | (vals[12] >> 1)
    this[8] = (vals[12] << 7) | (vals[13] << 2) | (vals[14] >> 3)
    this[9] = (vals[14] << 5) | vals[15]
    this[10] = (vals[16] << 3) | (vals[17] >> 2)
    this[11] = (vals[17] << 6) | (vals[18] << 1) | (vals[19] >> 4)
  }

  /**
   * Encodes the Xid into a 20-byte string representation.
   * @returns The string representation of the Xid.
   */
  encode(): string {
    return String.fromCharCode(
      enc[this[0] >> 3],
      enc[(this[1] >> 6) | ((this[0] << 2) & 0x1f)],
      enc[(this[1] >> 1) & 0x1f],
      enc[(this[2] >> 4) | ((this[1] << 4) & 0x1f)],
      enc[(this[3] >> 7) | ((this[2] << 1) & 0x1f)],
      enc[(this[3] >> 2) & 0x1f],
      enc[(this[4] >> 5) | ((this[3] << 3) & 0x1f)],
      enc[this[4] & 0x1f],
      enc[this[5] >> 3],
      enc[(this[6] >> 6) | ((this[5] << 2) & 0x1f)],
      enc[(this[6] >> 1) & 0x1f],
      enc[(this[7] >> 4) | ((this[6] << 4) & 0x1f)],
      enc[(this[8] >> 7) | ((this[7] << 1) & 0x1f)],
      enc[(this[8] >> 2) & 0x1f],
      enc[(this[9] >> 5) | ((this[8] << 3) & 0x1f)],
      enc[this[9] & 0x1f],
      enc[this[10] >> 3],
      enc[(this[11] >> 6) | ((this[10] << 2) & 0x1f)],
      enc[(this[11] >> 1) & 0x1f],
      enc[(this[11] << 4) & 0x1f]
    )
  }

  /**
   * Returns the timestamp part of the Xid.
   * @returns The timestamp in seconds since the Unix epoch.
   */
  timestamp(): number {
    return (
      ((this[0] << 24) | (this[1] << 16) | (this[2] << 8) | this[3]) >>> 0
    )
  }

  /**
   * Returns the machine identifier part of the Xid.
   * @returns A copy of the 3-byte machine identifier as a Uint8Array.
   */
  machine(): Uint8Array {
    return this.slice(4, 7)
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
    return this.every((byte) => byte === 0)
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
   * @returns A copy of the underlying bytes as a 12-byte Uint8Array.
   */
  toBytes(): Uint8Array {
    return new Uint8Array(this)
  }

  /**
   * Returns the value of the Xid for JSON serialization.
   * A zero (nil) Xid serializes to `null`, mirroring the Go implementation's
   * `MarshalJSON`; any other Xid serializes to its string representation.
   * @returns The 20-byte string representation of the Xid, or null.
   */
  toJSON(): string | null {
    return this.isZero() ? null : this.encode()
  }

  /**
   * Compares this Xid with another one byte by byte.
   * Sorting by this order is equivalent to sorting by the string
   * representation, i.e. roughly by creation time.
   * @param xid - The Xid to compare with.
   * @returns 0 if they are equal, -1 if this Xid is less than the other,
   * and 1 if it is greater.
   */
  compare(xid: Xid): number {
    for (let i = 0; i < rawLen; i++) {
      if (this[i] !== xid[i]) {
        return this[i] < xid[i] ? -1 : 1
      }
    }
    return 0
  }

  /**
   * Checks if this Xid is equal to another Xid.
   * @param xid - The Xid to compare with.
   * @returns True if the Xids are equal, false otherwise.
   */
  equals(xid: Xid): boolean {
    return this.compare(xid) === 0
  }
}

function getRandomBytes(n: number): Uint8Array {
  if (crypto_0 === undefined) {
    throw new Error('xid: crypto.getRandomValues is not available')
  }
  return crypto_0.getRandomValues(new Uint8Array(n))
}

function getPid(): number {
  if (
    typeof globalThis === 'object' &&
    'process' in globalThis &&
    typeof ((globalThis as any).process as any)?.pid === 'number'
  ) {
    return ((globalThis as any).process as any).pid & 0xffff
  }

  const buf = getRandomBytes(2)
  return (buf[0] << 8) | buf[1]
}
