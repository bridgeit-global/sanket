import type { AddressMasterAddressParts } from '@/lib/letters/format-address-master';

/**
 * RFC 1321 MD5 (hex), Edge/browser-safe — must match Postgres `md5(...)`
 * and Node `createHash('md5')` for the same UTF-8 payload.
 */
function md5Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const n = bytes.length;
  const words: number[] = [];
  for (let i = 0; i < n; i += 1) {
    words[i >> 2] = (words[i >> 2] || 0) | (bytes[i]! << ((i % 4) * 8));
  }
  words[n >> 2] = (words[n >> 2] || 0) | (0x80 << ((n % 4) * 8));
  const bitLen = n * 8;
  const size = (((n + 8) >> 6) + 1) * 16;
  while (words.length < size) words.push(0);
  words[size - 2] = bitLen & 0xffffffff;
  words[size - 1] = (bitLen / 0x100000000) | 0;

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < size; i += 16) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    const w = words;

    a = ff(a, b, c, d, w[i]! , 7, 0xd76aa478);
    d = ff(d, a, b, c, w[i + 1]! , 12, 0xe8c7b756);
    c = ff(c, d, a, b, w[i + 2]! , 17, 0x242070db);
    b = ff(b, c, d, a, w[i + 3]! , 22, 0xc1bdceee);
    a = ff(a, b, c, d, w[i + 4]! , 7, 0xf57c0faf);
    d = ff(d, a, b, c, w[i + 5]! , 12, 0x4787c62a);
    c = ff(c, d, a, b, w[i + 6]! , 17, 0xa8304613);
    b = ff(b, c, d, a, w[i + 7]! , 22, 0xfd469501);
    a = ff(a, b, c, d, w[i + 8]! , 7, 0x698098d8);
    d = ff(d, a, b, c, w[i + 9]! , 12, 0x8b44f7af);
    c = ff(c, d, a, b, w[i + 10]! , 17, 0xffff5bb1);
    b = ff(b, c, d, a, w[i + 11]! , 22, 0x895cd7be);
    a = ff(a, b, c, d, w[i + 12]! , 7, 0x6b901122);
    d = ff(d, a, b, c, w[i + 13]! , 12, 0xfd987193);
    c = ff(c, d, a, b, w[i + 14]! , 17, 0xa679438e);
    b = ff(b, c, d, a, w[i + 15]! , 22, 0x49b40821);

    a = gg(a, b, c, d, w[i + 1]! , 5, 0xf61e2562);
    d = gg(d, a, b, c, w[i + 6]! , 9, 0xc040b340);
    c = gg(c, d, a, b, w[i + 11]! , 14, 0x265e5a51);
    b = gg(b, c, d, a, w[i]! , 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, w[i + 5]! , 5, 0xd62f105d);
    d = gg(d, a, b, c, w[i + 10]! , 9, 0x02441453);
    c = gg(c, d, a, b, w[i + 15]! , 14, 0xd8a1e681);
    b = gg(b, c, d, a, w[i + 4]! , 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, w[i + 9]! , 5, 0x21e1cde6);
    d = gg(d, a, b, c, w[i + 14]! , 9, 0xc33707d6);
    c = gg(c, d, a, b, w[i + 3]! , 14, 0xf4d50d87);
    b = gg(b, c, d, a, w[i + 8]! , 20, 0x455a14ed);
    a = gg(a, b, c, d, w[i + 13]! , 5, 0xa9e3e905);
    d = gg(d, a, b, c, w[i + 2]! , 9, 0xfcefa3f8);
    c = gg(c, d, a, b, w[i + 7]! , 14, 0x676f02d9);
    b = gg(b, c, d, a, w[i + 12]! , 20, 0x8d2a4c8a);

    a = hh(a, b, c, d, w[i + 5]! , 4, 0xfffa3942);
    d = hh(d, a, b, c, w[i + 8]! , 11, 0x8771f681);
    c = hh(c, d, a, b, w[i + 11]! , 16, 0x6d9d6122);
    b = hh(b, c, d, a, w[i + 14]! , 23, 0xfde5380c);
    a = hh(a, b, c, d, w[i + 1]! , 4, 0xa4beea44);
    d = hh(d, a, b, c, w[i + 4]! , 11, 0x4bdecfa9);
    c = hh(c, d, a, b, w[i + 7]! , 16, 0xf6bb4b60);
    b = hh(b, c, d, a, w[i + 10]! , 23, 0xbebfbc70);
    a = hh(a, b, c, d, w[i + 13]! , 4, 0x289b7ec6);
    d = hh(d, a, b, c, w[i]! , 11, 0xeaa127fa);
    c = hh(c, d, a, b, w[i + 3]! , 16, 0xd4ef3085);
    b = hh(b, c, d, a, w[i + 6]! , 23, 0x04881d05);
    a = hh(a, b, c, d, w[i + 9]! , 4, 0xd9d4d039);
    d = hh(d, a, b, c, w[i + 12]! , 11, 0xe6db99e5);
    c = hh(c, d, a, b, w[i + 15]! , 16, 0x1fa27cf8);
    b = hh(b, c, d, a, w[i + 2]! , 23, 0xc4ac5665);

    a = ii(a, b, c, d, w[i]! , 6, 0xf4292244);
    d = ii(d, a, b, c, w[i + 7]! , 10, 0x432aff97);
    c = ii(c, d, a, b, w[i + 14]! , 15, 0xab9423a7);
    b = ii(b, c, d, a, w[i + 5]! , 21, 0xfc93a039);
    a = ii(a, b, c, d, w[i + 12]! , 6, 0x655b59c3);
    d = ii(d, a, b, c, w[i + 3]! , 10, 0x8f0ccc92);
    c = ii(c, d, a, b, w[i + 10]! , 15, 0xffeff47d);
    b = ii(b, c, d, a, w[i + 1]! , 21, 0x85845dd1);
    a = ii(a, b, c, d, w[i + 8]! , 6, 0x6fa87e4f);
    d = ii(d, a, b, c, w[i + 15]! , 10, 0xfe2ce6e0);
    c = ii(c, d, a, b, w[i + 6]! , 15, 0xa3014314);
    b = ii(b, c, d, a, w[i + 13]! , 21, 0x4e0811a1);
    a = ii(a, b, c, d, w[i + 4]! , 6, 0xf7537e82);
    d = ii(d, a, b, c, w[i + 11]! , 10, 0xbd3af235);
    c = ii(c, d, a, b, w[i + 2]! , 15, 0x2ad7d2bb);
    b = ii(b, c, d, a, w[i + 9]! , 21, 0xeb86d391);

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  const toHex = (n: number) => {
    let out = '';
    for (let i = 0; i < 4; i += 1) {
      out += ((n >> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return out;
  };
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

/** Stable dedupe key for physical AddressBlock rows (must match SQL md5 payload). */
export function addressBlockContentKey(parts: AddressMasterAddressParts): string {
  const payload = [
    parts.line1En ?? '',
    parts.line1Mr ?? '',
    parts.line2En ?? '',
    parts.line2Mr ?? '',
    parts.line3En ?? '',
    parts.line3Mr ?? '',
    parts.cityEn ?? '',
    parts.cityMr ?? '',
    parts.stateEn ?? '',
    parts.stateMr ?? '',
    parts.pincode ?? '',
  ].join('\n');
  return md5Hex(payload);
}
