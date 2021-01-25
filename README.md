# @amoutonbrady/lz-string

This is a modern port of the original [lz-string](https://github.com/pieroxy/lz-string).

## What does modern means?

The project was not really supported and maintained anymore.

I rewrote it in modern javascript syntax, typescript, compiled it with [esbuild](https://esbuild.github.io/) and wrote tests with [uvu](https://github.com/lukeed/uvu).

The size is much smaller and it play nicer with modern bundlers.

## Install

```bash
$ npm install @amoutonbrady/lz-string
```

## Example

```js
import { compress, decompress } from '@amoutonbrady/lz-string'

const compressed = compress('hello world')
const decompressed = decompress(compressed)
```

## API

The API is the same as [lz-string](https://github.com/pieroxy/lz-string), minus a few methods that needs re-implementations:

* compressToUTF16(input: string): string;
* decompressFromUTF16(compressed: string): string;
* compressToUint8Array(uncompressed: string): Uint8Array;
* decompressFromUint8Array(compressed: Uint8Array): string;

### compressToBase64(input: string): string;

### decompressFromBase64(input: string): string | null;

### compressToURL(input: string): string;

### decompressFromURL(input: string): string | null;

### compress(uncompressed: string): string;

### decompress(compressed: null | string): string | null;
