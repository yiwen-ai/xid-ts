# xid-ts

Globally unique sortable id generator. A Typescript port of https://github.com/rs/xid.

The binary representation is compatible with the Mongo DB 12-byte [ObjectId][object-id].
The value consists of:

- a 4-byte timestamp value in seconds since the Unix epoch
- a 3-byte value based on the machine identifier
- a 2-byte value based on the process id
- a 3-byte incrementing counter, initialized to a random value

The string representation is 20 bytes, using a base32 hex variant with characters `[0-9a-v]`
to retain the sortable property of the id.

See the original [`xid`] project for more details.

## Usage

```sh
npm i xid-ts --save
```

## Examples

```js
import { Xid } from 'xid-ts'

const defaultXid = Xid.default()
assert.equal(defaultXid.isZero(), true)

const now = Math.floor(Date.now() / 1000)
const newXid = new Xid()
assert.equal(newXid.isZero(), false)
assert.isTrue(newXid.timestamp() >= now)

const xid = Xid.parse('9m4e2mr0ui3e8a215n4g')
assert.equal(xid.isZero(), false)
console.log(xid.toBytes()) // Uint8Array(12) [77, 136, 225, 91, 96, 244, 134, 228, 40, 65, 45, 201]
assert.equal(xid.toString(), '9m4e2mr0ui3e8a215n4g')
assert.equal(xid.timestamp(), 1300816219)
assert.equal(xid.counter(), 4271561)
assert.equal(xid.equals(newXid), false)
assert.equal(xid.equals(Xid.fromValue('9m4e2mr0ui3e8a215n4g')), true)
assert.equal(xid.equals(Xid.fromValue([77, 136, 225, 91, 96, 244, 134, 228, 40, 65, 45, 201])), true)
assert.equal(xid.equals(Xid.fromValue(Buffer.from([77, 136, 225, 91, 96, 244, 134, 228, 40, 65, 45, 201]))), true)
assert.equal(xid.equals(Xid.fromValue(new Uint8Array([77, 136, 225, 91, 96, 244, 134, 228, 40, 65, 45, 201]))), true)
```

[`xid`]:  https://github.com/rs/xid
[object-id]: https://docs.mongodb.org/manual/reference/object-id/

## License
Copyright © 2023-present [Yiwen AI](https://github.com/yiwen-ai).

ldclabs/cose is licensed under the MIT License. See [LICENSE](LICENSE) for the full license text.