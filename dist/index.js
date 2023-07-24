// src/index.ts
var encodedLen = 20;
var rawLen = 12;
var errInvalidID = "xid: invalid ID";
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
var encoding = textEncoder.encode("0123456789abcdefghijklmnopqrstuv");
var dec = new Uint8Array(256).fill(255);
for (let i = 0; i < encoding.length; i++) {
  dec[encoding[i]] = i;
}
var cry;
if (typeof crypto === "object" && crypto.getRandomValues != null) {
  cry = crypto;
} else {
  cry = await import("crypto");
}
var start = getRandom3Bytes();
var Xid = class _Xid extends Uint8Array {
  static machineId = getRandom3Bytes();
  static pid = getPid();
  static counter = start[0] << 16 | start[1] << 8 | start[2];
  constructor(id) {
    super(rawLen);
    if (id == null) {
      const view = new DataView(this.buffer);
      const timestamp = Math.floor(Date.now() / 1e3);
      view.setUint32(0, timestamp);
      this[4] = _Xid.machineId[0];
      this[5] = _Xid.machineId[1];
      this[6] = _Xid.machineId[2];
      this[7] = _Xid.pid >> 8;
      this[8] = _Xid.pid & 255;
      _Xid.counter += 1;
      if (_Xid.counter > 16777215) {
        _Xid.counter = 0;
      }
      this[9] = _Xid.counter >> 16;
      this[10] = _Xid.counter & 65535 >> 8;
      this[11] = _Xid.counter & 255;
    } else if (!(id instanceof Uint8Array) || id.length !== rawLen) {
      throw new Error(errInvalidID);
    } else {
      this.set(id);
    }
  }
  static default() {
    return new _Xid(new Uint8Array(rawLen).fill(0));
  }
  static fromValue(v) {
    if (v instanceof _Xid) {
      return v;
    }
    if (typeof v === "string") {
      return _Xid.parse(v);
    }
    if (v instanceof Uint8Array && v.length === rawLen) {
      return new _Xid(v);
    }
    if (v instanceof ArrayBuffer && v.byteLength === rawLen) {
      return new _Xid(new Uint8Array(v));
    }
    if (Array.isArray(v) && v.length === rawLen && v.every((byte) => typeof byte === "number" && byte >= 0 && byte <= 255)) {
      return new _Xid(new Uint8Array(v));
    }
    throw new Error(errInvalidID);
  }
  static parse(id) {
    if (id.length !== encodedLen) {
      throw new Error(errInvalidID);
    }
    const xid = new _Xid();
    xid.decode(id);
    return xid;
  }
  decode(str) {
    const src = textEncoder.encode(str);
    if (src.length !== encodedLen) {
      throw new Error(errInvalidID);
    }
    for (const c of src) {
      if (dec[c] == 255) {
        throw new Error(errInvalidID);
      }
    }
    this[11] = dec[src[17]] << 6 | dec[src[18]] << 1 | dec[src[19]] >> 4;
    if (encoding[this[11] << 4 & 31] != src[19]) {
      throw new Error(errInvalidID);
    }
    this[10] = dec[src[16]] << 3 | dec[src[17]] >> 2;
    this[9] = dec[src[14]] << 5 | dec[src[15]];
    this[8] = dec[src[12]] << 7 | dec[src[13]] << 2 | dec[src[14]] >> 3;
    this[7] = dec[src[11]] << 4 | dec[src[12]] >> 1;
    this[6] = dec[src[9]] << 6 | dec[src[10]] << 1 | dec[src[11]] >> 4;
    this[5] = dec[src[8]] << 3 | dec[src[9]] >> 2;
    this[4] = dec[src[6]] << 5 | dec[src[7]];
    this[3] = dec[src[4]] << 7 | dec[src[5]] << 2 | dec[src[6]] >> 3;
    this[2] = dec[src[3]] << 4 | dec[src[4]] >> 1;
    this[1] = dec[src[1]] << 6 | dec[src[2]] << 1 | dec[src[3]] >> 4;
    this[0] = dec[src[0]] << 3 | dec[src[1]] >> 2;
  }
  encode() {
    const dst = new Uint8Array(encodedLen);
    dst[19] = encoding[this[11] << 4 & 31];
    dst[18] = encoding[this[11] >> 1 & 31];
    dst[17] = encoding[this[11] >> 6 | this[10] << 2 & 31];
    dst[16] = encoding[this[10] >> 3];
    dst[15] = encoding[this[9] & 31];
    dst[14] = encoding[this[9] >> 5 | this[8] << 3 & 31];
    dst[13] = encoding[this[8] >> 2 & 31];
    dst[12] = encoding[this[8] >> 7 | this[7] << 1 & 31];
    dst[11] = encoding[this[7] >> 4 | this[6] << 4 & 31];
    dst[10] = encoding[this[6] >> 1 & 31];
    dst[9] = encoding[this[6] >> 6 | this[5] << 2 & 31];
    dst[8] = encoding[this[5] >> 3];
    dst[7] = encoding[this[4] & 31];
    dst[6] = encoding[this[4] >> 5 | this[3] << 3 & 31];
    dst[5] = encoding[this[3] >> 2 & 31];
    dst[4] = encoding[this[3] >> 7 | this[2] << 1 & 31];
    dst[3] = encoding[this[2] >> 4 | this[1] << 4 & 31];
    dst[2] = encoding[this[1] >> 1 & 31];
    dst[1] = encoding[this[1] >> 6 | this[0] << 2 & 31];
    dst[0] = encoding[this[0] >> 3];
    return textDecoder.decode(dst);
  }
  timestamp() {
    return new DataView(this.buffer).getUint32(0);
  }
  machine() {
    return new Uint8Array(this.buffer, 4, 3);
  }
  pid() {
    return this[7] << 8 | this[8];
  }
  counter() {
    return this[9] << 16 | this[10] << 8 | this[11];
  }
  isZero() {
    return super.every((byte) => byte === 0);
  }
  toString() {
    return this.encode();
  }
  toBytes() {
    return new Uint8Array(this.buffer, 0, rawLen);
  }
  toJSON() {
    return this.encode();
  }
  equals(xid) {
    for (let i = 0; i < rawLen; i++) {
      if (this[i] !== xid[i]) {
        return false;
      }
    }
    return true;
  }
};
function getRandom3Bytes() {
  return cry.getRandomValues(new Uint8Array(3));
}
function getPid() {
  if (typeof process === "object" && process.pid > 0) {
    return process.pid & 65535;
  }
  const buf = cry.getRandomValues(new Uint8Array(2));
  return buf[0] << 8 | buf[1];
}
export {
  Xid
};
//# sourceMappingURL=index.js.map