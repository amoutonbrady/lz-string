// Port of lz-string by pieroxy (MIT): https://github.com/pieroxy/lz-string
// Wire format is byte-for-byte compatible with lz-string 1.x.

const keyStrBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const keyStrUriSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
const reverseDictionaries = new Map<string, Map<string, number>>();

function getBaseValue(alphabet: string, character: string): number {
  let dictionary = reverseDictionaries.get(alphabet);

  if (!dictionary) {
    dictionary = new Map();
    for (let i = 0; i < alphabet.length; i++) dictionary.set(alphabet.charAt(i), i);
    reverseDictionaries.set(alphabet, dictionary);
  }

  return dictionary.get(character) ?? 0;
}

export function compressToBase64(input: string | null | undefined): string {
  if (input == null) return '';
  const res = compressWith(input, 6, (a) => keyStrBase64.charAt(a));

  // Pad to a multiple of 4 to produce valid Base64
  return res.padEnd(Math.ceil(res.length / 4) * 4, '=');
}

export function decompressFromBase64(input: string | null | undefined): string | null {
  if (input == null) return '';
  if (input === '') return null;
  return decompressWith(input.length, 32, (i) => getBaseValue(keyStrBase64, input.charAt(i)));
}

export function compressToUTF16(input: string | null | undefined): string {
  if (input == null) return '';
  return compressWith(input, 15, (a) => String.fromCharCode(a + 32)) + ' ';
}

export function decompressFromUTF16(compressed: string | null | undefined): string | null {
  if (compressed == null) return '';
  if (compressed === '') return null;
  return decompressWith(compressed.length, 16384, (i) => compressed.charCodeAt(i) - 32);
}

export function compressToUint8Array(uncompressed: string | null | undefined): Uint8Array {
  const compressed = compress(uncompressed);
  const buf = new Uint8Array(compressed.length * 2);

  for (let i = 0; i < compressed.length; i++) {
    const value = compressed.charCodeAt(i);
    buf[i * 2] = value >>> 8;
    buf[i * 2 + 1] = value & 0xff;
  }

  return buf;
}

export function decompressFromUint8Array(compressed: Uint8Array | null | undefined): string | null {
  if (compressed == null) return decompress(compressed);

  const chars: string[] = [];
  for (let i = 0; i < compressed.length >> 1; i++) {
    chars.push(String.fromCharCode(((compressed[i * 2] ?? 0) << 8) | (compressed[i * 2 + 1] ?? 0)));
  }

  return decompress(chars.join(''));
}

/** Compress into a string that is already URI encoded */
export function compressToURL(input: string | null | undefined): string {
  if (input == null) return '';
  return compressWith(input, 6, (a) => keyStrUriSafe.charAt(a));
}

/** Decompress the output of `compressToURL` */
export function decompressFromURL(input: string | null | undefined): string | null {
  if (input == null) return '';
  if (input === '') return null;
  const safe = input.replaceAll(' ', '+');
  return decompressWith(safe.length, 32, (i) => getBaseValue(keyStrUriSafe, safe.charAt(i)));
}

export function compress(uncompressed: string | null | undefined): string {
  if (uncompressed == null) return '';
  return compressWith(uncompressed, 16, (a) => String.fromCharCode(a));
}

export function decompress(compressed: string | null | undefined): string | null {
  if (compressed == null) return '';
  if (compressed === '') return null;
  return decompressWith(compressed.length, 32768, (i) => compressed.charCodeAt(i));
}

function compressWith(
  uncompressed: string,
  bitsPerChar: number,
  getCharFromInt: (int: number) => string,
): string {
  const dictionary = new Map<string, number>();
  const dictionaryToCreate = new Set<string>();
  const data: string[] = [];

  let dataVal = 0;
  let dataPosition = 0;
  // Compensate for the first entry which should not count
  let enlargeIn = 2;
  let dictSize = 3;
  let numBits = 2;

  // Emits `count` bits of `value`, least significant bit first
  const writeBits = (value: number, count: number): void => {
    for (let i = 0; i < count; i++) {
      dataVal = (dataVal << 1) | (value & 1);

      if (dataPosition === bitsPerChar - 1) {
        dataPosition = 0;
        data.push(getCharFromInt(dataVal));
        dataVal = 0;
      } else {
        dataPosition++;
      }

      value >>= 1;
    }
  };

  const growDictionary = (): void => {
    if (--enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits++;
    }
  };

  const writeEntry = (w: string): void => {
    if (dictionaryToCreate.has(w)) {
      // First occurrence of a character: emit it literally (8 or 16 bits)
      const code = w.charCodeAt(0);

      if (code < 256) {
        writeBits(0, numBits);
        writeBits(code, 8);
      } else {
        writeBits(1, numBits);
        writeBits(code, 16);
      }

      growDictionary();
      dictionaryToCreate.delete(w);
    } else {
      writeBits(dictionary.get(w)!, numBits);
    }

    growDictionary();
  };

  let w = '';

  for (let i = 0; i < uncompressed.length; i++) {
    const c = uncompressed.charAt(i);

    if (!dictionary.has(c)) {
      dictionary.set(c, dictSize++);
      dictionaryToCreate.add(c);
    }

    const wc = w + c;

    if (dictionary.has(wc)) {
      w = wc;
    } else {
      writeEntry(w);
      dictionary.set(wc, dictSize++);
      w = c;
    }
  }

  if (w !== '') writeEntry(w);

  // Mark the end of the stream
  writeBits(2, numBits);

  // Flush the last char
  while (true) {
    dataVal <<= 1;

    if (dataPosition === bitsPerChar - 1) {
      data.push(getCharFromInt(dataVal));
      break;
    }

    dataPosition++;
  }

  return data.join('');
}

function decompressWith(
  length: number,
  resetValue: number,
  getNextValue: (index: number) => number,
): string | null {
  // Indices 0-2 are control codes, never looked up
  const dictionary: string[] = ['', '', ''];
  const result: string[] = [];

  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let val = getNextValue(0);
  let position = resetValue;
  let index = 1;

  // Reads `count` bits, least significant bit first
  const readBits = (count: number): number => {
    let bits = 0;

    for (let i = 0; i < count; i++) {
      const resb = val & position;
      position >>= 1;

      if (position === 0) {
        position = resetValue;
        val = getNextValue(index++);
      }

      if (resb > 0) bits |= 1 << i;
    }

    return bits;
  };

  let w: string;

  switch (readBits(2)) {
    case 0:
      w = String.fromCharCode(readBits(8));
      break;
    case 1:
      w = String.fromCharCode(readBits(16));
      break;
    case 2:
      return '';
    default:
      return null;
  }

  dictionary[3] = w;
  result.push(w);

  while (true) {
    if (index > length) return '';

    let code = readBits(numBits);

    switch (code) {
      case 0:
        dictionary[dictSize++] = String.fromCharCode(readBits(8));
        code = dictSize - 1;
        enlargeIn--;
        break;
      case 1:
        dictionary[dictSize++] = String.fromCharCode(readBits(16));
        code = dictSize - 1;
        enlargeIn--;
        break;
      case 2:
        return result.join('');
    }

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits++;
    }

    let entry: string;
    const known = dictionary[code];

    if (known !== undefined) {
      entry = known;
    } else if (code === dictSize) {
      entry = w + w.charAt(0);
    } else {
      return null;
    }

    result.push(entry);

    // Add w+entry[0] to the dictionary.
    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;
    w = entry;

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits++;
    }
  }
}
