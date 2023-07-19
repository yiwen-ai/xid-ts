declare class Xid {
    private static machineId;
    private static pid;
    private static counter;
    private id;
    constructor(id?: Uint8Array);
    static default(): Xid;
    static from(v: Xid | string | ArrayBuffer | Uint8Array | number[]): Xid;
    static parse(id: string): Xid;
    private decode;
    encode(): string;
    timestamp(): number;
    machine(): Uint8Array;
    pid(): number;
    counter(): number;
    isZero(): boolean;
    toString(): string;
    toBytes(): Uint8Array;
    equals(xid: Xid): boolean;
}

export { Xid };
