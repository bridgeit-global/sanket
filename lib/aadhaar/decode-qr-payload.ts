import { inflate, inflateRaw, ungzip } from 'pako';

export type AadhaarQrData = {
  name: string;
  dateOfBirth: string;
  gender: string;
  careOf: string;
  district: string;
  landmark: string;
  house: string;
  location: string;
  pincode: string;
  postOffice: string;
  state: string;
  street: string;
  subDistrict: string;
  vtc: string;
  last4Digits: string;
};

const FIELD_SEPARATOR = 255;
const DOB_PATTERN = /^(\d{2}-\d{2}-\d{4}|\d{4})$/;
const GENDER_PATTERN = /^[MFT]$/i;
const VERSION_PATTERN = /^V\d+$/i;
const EMAIL_MOBILE_INDICATOR_PATTERN = /^[0-3]$/;
const REFERENCE_ID_PATTERN = /^\d{10,}$/;

function splitDelimitedFields(buffer: Uint8Array): string[] {
  const segments: string[] = [];
  let start = 0;

  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === FIELD_SEPARATOR) {
      segments.push(new TextDecoder('utf-8').decode(buffer.slice(start, i)));
      start = i + 1;
    }
  }

  segments.push(new TextDecoder('utf-8').decode(buffer.slice(start)));
  return segments;
}

function isLikelyDob(value: string): boolean {
  return DOB_PATTERN.test(value.trim());
}

function isLikelyGender(value: string): boolean {
  return GENDER_PATTERN.test(value.trim());
}

function findDemographicFieldIndices(fields: string[]): {
  nameIndex: number;
  dateOfBirthIndex: number;
  genderIndex: number;
} {
  const dateOfBirthIndex = fields.findIndex((field) => isLikelyDob(field));
  if (dateOfBirthIndex < 0) {
    return { nameIndex: -1, dateOfBirthIndex: -1, genderIndex: -1 };
  }

  let nameIndex = dateOfBirthIndex - 1;
  while (nameIndex >= 0) {
    const candidate = fields[nameIndex]?.trim() ?? '';
    if (
      candidate &&
      !isLikelyDob(candidate) &&
      !isLikelyGender(candidate) &&
      !EMAIL_MOBILE_INDICATOR_PATTERN.test(candidate) &&
      !VERSION_PATTERN.test(candidate) &&
      !REFERENCE_ID_PATTERN.test(candidate)
    ) {
      break;
    }
    nameIndex -= 1;
  }

  let genderIndex = dateOfBirthIndex + 1;
  while (genderIndex < fields.length && !isLikelyGender(fields[genderIndex] ?? '')) {
    genderIndex += 1;
  }
  if (genderIndex >= fields.length) {
    genderIndex = -1;
  }

  return { nameIndex, dateOfBirthIndex, genderIndex };
}

function bigIntToUint8Array(value: bigint): Uint8Array {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function decompressBuffer(buf: Uint8Array): Uint8Array {
  const attempts: Array<{ name: string; fn: () => Uint8Array }> = [
    { name: 'inflate', fn: () => inflate(buf) },
    { name: 'inflateRaw', fn: () => inflateRaw(buf) },
    { name: 'ungzip', fn: () => ungzip(buf) },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return attempt.fn();
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown decompression error';
  throw new Error(`Unable to decompress Aadhaar QR payload (${message})`);
}

function parseSecureQrBuffer(buffer: Uint8Array): AadhaarQrData {
  const fields = splitDelimitedFields(buffer);
  const { nameIndex, dateOfBirthIndex, genderIndex } = findDemographicFieldIndices(fields);

  const name = nameIndex >= 0 ? fields[nameIndex].trim() : '';
  const dateOfBirth = dateOfBirthIndex >= 0 ? fields[dateOfBirthIndex].trim() : '';
  const gender = genderIndex >= 0 ? fields[genderIndex].trim() : '';

  const addressStart = genderIndex >= 0 ? genderIndex + 1 : dateOfBirthIndex >= 0 ? dateOfBirthIndex + 1 : -1;
  const addressFields =
    addressStart >= 0
      ? fields.slice(addressStart, addressStart + 11).map((field) => field.trim())
      : [];

  return {
    name,
    dateOfBirth,
    gender,
    careOf: addressFields[0] ?? '',
    district: addressFields[1] ?? '',
    landmark: addressFields[2] ?? '',
    house: addressFields[3] ?? '',
    location: addressFields[4] ?? '',
    pincode: addressFields[5] ?? '',
    postOffice: addressFields[6] ?? '',
    state: addressFields[7] ?? '',
    street: addressFields[8] ?? '',
    subDistrict: addressFields[9] ?? '',
    vtc: addressFields[10] ?? '',
    last4Digits: addressFields[10]?.match(/\d{4}$/)?.[0] ?? '',
  };
}

function parseLegacyXmlPayload(payload: string): AadhaarQrData | null {
  if (!payload.includes('<PrintLetterBarcodeData')) {
    return null;
  }

  const readAttr = (attr: string) => {
    const match = payload.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
    return match?.[1]?.trim() ?? '';
  };

  const name = readAttr('name');
  if (!name) {
    return null;
  }

  return {
    name,
    dateOfBirth: readAttr('dob') || readAttr('yob'),
    gender: readAttr('gender'),
    careOf: readAttr('co') || readAttr('careof'),
    district: readAttr('dist') || readAttr('district'),
    landmark: readAttr('lm') || readAttr('landmark'),
    house: readAttr('house'),
    location: readAttr('loc') || readAttr('location'),
    pincode: readAttr('pc') || readAttr('pincode'),
    postOffice: readAttr('po') || readAttr('postoffice'),
    state: readAttr('state'),
    street: readAttr('street'),
    subDistrict: readAttr('subdist') || readAttr('subdistrict'),
    vtc: readAttr('vtc'),
    last4Digits: readAttr('uid')?.slice(-4) ?? '',
  };
}

export function ageFromAadhaarDob(dob: string): number | undefined {
  const trimmed = dob.trim();
  if (!trimmed) {
    return undefined;
  }

  const ddMmYyyy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyy) {
    const [, day, month, year] = ddMmYyyy;
    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(birthDate.getTime())) {
      return undefined;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age > 0 && age <= 150 ? age : undefined;
  }

  const yyyy = trimmed.match(/^(\d{4})$/);
  if (yyyy) {
    const age = new Date().getFullYear() - Number(yyyy[1]);
    return age > 0 && age <= 150 ? age : undefined;
  }

  return undefined;
}

export function mapAadhaarGenderToSearchValue(gender: string): 'M' | 'F' | '' {
  const normalized = gender.trim().toUpperCase();
  if (normalized === 'M' || normalized === 'MALE') {
    return 'M';
  }
  if (normalized === 'F' || normalized === 'FEMALE') {
    return 'F';
  }
  return '';
}

export function decodeAadhaarQrPayload(rawPayload: string): AadhaarQrData {
  const payload = rawPayload.trim();
  if (!payload) {
    throw new Error('Empty QR payload');
  }

  const legacy = parseLegacyXmlPayload(payload);
  if (legacy) {
    return legacy;
  }

  if (!/^\d+$/.test(payload)) {
    throw new Error('Unsupported Aadhaar QR format');
  }

  const compressed = bigIntToUint8Array(BigInt(payload));
  const decompressed = decompressBuffer(compressed);
  const parsed = parseSecureQrBuffer(decompressed);

  if (!parsed.name.trim()) {
    throw new Error('No name found in Aadhaar QR code');
  }

  return parsed;
}
