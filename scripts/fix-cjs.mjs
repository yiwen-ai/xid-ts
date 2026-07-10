// The root package.json declares "type": "module", so Node would treat
// dist/cjs/*.js as ESM. This nested package.json marks the CommonJS build
// output as CommonJS, keeping `require('xid-ts')` working.
import { writeFileSync } from 'node:fs'

writeFileSync(
  new URL('../dist/cjs/package.json', import.meta.url),
  JSON.stringify({ type: 'commonjs' }) + '\n'
)
