# @amoutonbrady/lz-string

Modern TypeScript port of [lz-string](https://github.com/pieroxy/lz-string), the LZ-based
compression algorithm for JavaScript strings.

- Wire-compatible with lz-string 1.x: anything compressed by one decompresses with the other
  (verified against the reference implementation in the test suite).
- Same API, fully typed, ESM and CommonJS builds, zero dependencies, tree-shakeable.
- About half the source of the original: the bit reader/writer is shared instead of copy-pasted.

## Install

```bash
pnpm add @amoutonbrady/lz-string
```

## Usage

```ts
import { compressToURL, decompressFromURL } from '@amoutonbrady/lz-string';

const compressed = compressToURL('hello world'); // safe to put in a query string as-is
const original = decompressFromURL(compressed); // 'hello world'
```

## API

Every `compress*` function returns `''` for `null`/`undefined`. Every `decompress*` function
returns `''` for `null`/`undefined`, `null` for an empty or corrupt input.

| Compress                                          | Decompress                                                    | Output                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| `compress(input: string): string`                 | `decompress(input: string): string \| null`                   | Raw UTF-16 code units, smallest but not safe to store as text |
| `compressToUTF16(input: string): string`          | `decompressFromUTF16(input: string): string \| null`          | Valid UTF-16, safe for `localStorage`                         |
| `compressToBase64(input: string): string`         | `decompressFromBase64(input: string): string \| null`         | Standard Base64                                               |
| `compressToURL(input: string): string`            | `decompressFromURL(input: string): string \| null`            | URL-safe alphabet (`+-$`), no padding, no encoding needed     |
| `compressToUint8Array(input: string): Uint8Array` | `decompressFromUint8Array(input: Uint8Array): string \| null` | Binary                                                        |

`compressToURL` was named `compressToEncodedURIComponent` in the original library.

## Development

```bash
pnpm install
pnpm test       # node:test, runs the TypeScript sources directly
pnpm typecheck
pnpm build      # tsdown: ESM + CJS + .d.ts, then publint + arethetypeswrong
```

Releases: bump the version, push a `v*` tag. The `release.yml` workflow builds, tests and
publishes to npm with provenance through npm trusted publishing (no token to manage).

## License

MIT
