declare class Xid extends Uint8Array {
    private static machineId;
    private static pid;
    private static counter;
    constructor(id?: Uint8Array);
    static default(): Xid;
    static fromValue(v: Xid | string | ArrayBuffer | Uint8Array | number[]): Xid;
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
    toJSON(): string;
    equals(xid: Xid): boolean;
}

export { Xid };
