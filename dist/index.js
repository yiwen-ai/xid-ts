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
var start = getRandom3Bytes();
var Xid = class _Xid {
  constructor(id = new Uint8Array(rawLen).fill(0)) {
    this.id = id;
  }
  static machineId = getRandom3Bytes();
  static pid = getPid();
  static counter = start[0] << 16 | start[1] << 8 | start[2];
  static next() {
    const xid = new _Xid();
    const view = new DataView(xid.id.buffer);
    const timestamp = Math.floor(Date.now() / 1e3);
    view.setUint32(0, timestamp);
    xid.id[4] = _Xid.machineId[0];
    xid.id[5] = _Xid.machineId[1];
    xid.id[6] = _Xid.machineId[2];
    xid.id[7] = _Xid.pid >> 8;
    xid.id[8] = _Xid.pid & 255;
    _Xid.counter += 1;
    if (_Xid.counter > 16777215) {
      _Xid.counter = 0;
    }
    xid.id[9] = _Xid.counter >> 16;
    xid.id[10] = _Xid.counter & 65535 >> 8;
    xid.id[11] = _Xid.counter & 255;
    return xid;
  }
  static from(v) {
    if (v instanceof _Xid) {
      return v;
    }
    if (typeof v === "string") {
      return _Xid.parse(v);
    }
    if (v instanceof Uint8Array && v.length === rawLen) {
      return new _Xid(new Uint8Array(v));
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
    this.id[11] = dec[src[17]] << 6 | dec[src[18]] << 1 | dec[src[19]] >> 4;
    if (encoding[this.id[11] << 4 & 31] != src[19]) {
      throw new Error(errInvalidID);
    }
    this.id[10] = dec[src[16]] << 3 | dec[src[17]] >> 2;
    this.id[9] = dec[src[14]] << 5 | dec[src[15]];
    this.id[8] = dec[src[12]] << 7 | dec[src[13]] << 2 | dec[src[14]] >> 3;
    this.id[7] = dec[src[11]] << 4 | dec[src[12]] >> 1;
    this.id[6] = dec[src[9]] << 6 | dec[src[10]] << 1 | dec[src[11]] >> 4;
    this.id[5] = dec[src[8]] << 3 | dec[src[9]] >> 2;
    this.id[4] = dec[src[6]] << 5 | dec[src[7]];
    this.id[3] = dec[src[4]] << 7 | dec[src[5]] << 2 | dec[src[6]] >> 3;
    this.id[2] = dec[src[3]] << 4 | dec[src[4]] >> 1;
    this.id[1] = dec[src[1]] << 6 | dec[src[2]] << 1 | dec[src[3]] >> 4;
    this.id[0] = dec[src[0]] << 3 | dec[src[1]] >> 2;
  }
  encode() {
    const dst = new Uint8Array(encodedLen);
    dst[19] = encoding[this.id[11] << 4 & 31];
    dst[18] = encoding[this.id[11] >> 1 & 31];
    dst[17] = encoding[this.id[11] >> 6 | this.id[10] << 2 & 31];
    dst[16] = encoding[this.id[10] >> 3];
    dst[15] = encoding[this.id[9] & 31];
    dst[14] = encoding[this.id[9] >> 5 | this.id[8] << 3 & 31];
    dst[13] = encoding[this.id[8] >> 2 & 31];
    dst[12] = encoding[this.id[8] >> 7 | this.id[7] << 1 & 31];
    dst[11] = encoding[this.id[7] >> 4 | this.id[6] << 4 & 31];
    dst[10] = encoding[this.id[6] >> 1 & 31];
    dst[9] = encoding[this.id[6] >> 6 | this.id[5] << 2 & 31];
    dst[8] = encoding[this.id[5] >> 3];
    dst[7] = encoding[this.id[4] & 31];
    dst[6] = encoding[this.id[4] >> 5 | this.id[3] << 3 & 31];
    dst[5] = encoding[this.id[3] >> 2 & 31];
    dst[4] = encoding[this.id[3] >> 7 | this.id[2] << 1 & 31];
    dst[3] = encoding[this.id[2] >> 4 | this.id[1] << 4 & 31];
    dst[2] = encoding[this.id[1] >> 1 & 31];
    dst[1] = encoding[this.id[1] >> 6 | this.id[0] << 2 & 31];
    dst[0] = encoding[this.id[0] >> 3];
    return textDecoder.decode(dst);
  }
  timestamp() {
    return new DataView(this.id.buffer).getUint32(0);
  }
  machine() {
    return this.id.slice(4, 7);
  }
  pid() {
    return this.id[7] << 8 | this.id[8];
  }
  counter() {
    return this.id[9] << 16 | this.id[10] << 8 | this.id[11];
  }
  isZero() {
    return this.id.every((byte) => byte === 0);
  }
  toString() {
    return this.encode();
  }
  toBytes() {
    return this.id;
  }
  equals(xid) {
    for (let i = 0; i < rawLen; i++) {
      if (this.id[i] !== xid.id[i]) {
        return false;
      }
    }
    return true;
  }
};
function getRandom3Bytes() {
  return crypto.getRandomValues(new Uint8Array(3));
}
function getPid() {
  if (typeof process === "object" && process.pid > 0) {
    return process.pid & 65535;
  }
  const buf = crypto.getRandomValues(new Uint8Array(2));
  return buf[0] << 8 | buf[1];
}
export {
  Xid
};
//# sourceMappingURL=index.js.map