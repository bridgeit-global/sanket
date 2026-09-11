import 'server-only';

import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHmac,
  createPublicKey,
  publicEncrypt,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { ANUSHAKTI_NAGAR_AC_NUMBER } from '@/lib/eci/ac-constants';

export { ANUSHAKTI_NAGAR_AC_NUMBER };
export const MAHARASHTRA_STATE_CD = 'S13';
export const EPIC_NUMBER_PATTERN = /^[A-Z]{3}[0-9]{7}$/;

const ECI_GATEWAY = 'https://gateway-voters.eci.gov.in/api/v1';
const ECI_SEARCH_URL = `${ECI_GATEWAY}/elastic/search-by-epic-from-national-display-v1`;
const ECI_CAPTCHA_URL = `${ECI_GATEWAY}/captcha-service/getCaptcha/sir`;
const ECI_ORIGIN = 'https://electoralsearch.eci.gov.in';
const SEARCH_APP_MARKER = '1021';
const TICKET_TTL_MS = 10 * 60 * 1000;

/**
 * RSA public wrapping key published by the ECI electoral-search portal.
 * Override with ECI_SEARCH_RSA_PUBLIC_KEY (SPKI base64, no PEM headers) if ECI rotates it.
 */
const DEFAULT_ECI_RSA_PUBLIC_KEY_B64 =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArb7++BxL/YN8OIln+6FL9Gnw5DNmQ/VFZXss+J+TuQyJc891JbqbijxYQNEin2c2u+CnpXpoGQ/1gUSzDMJeNS3sNSlIUykp2dt7xIm/cmV4sZ/c769vCxVRosMfRaZJnBAah+m1X26lEhnOo0wpAB9Txr8RIyBe6h7PiQWykeJeh6UacOBBX28kgkq7+vJhW8HgB38lt32XRocznRYwS9LqR7ZweFmQhTr1+EGrqiEKCOCxMYgHR2SQckb96hZ9kWzfzeun4bUO5oXKJciLkiS1IgKieADEvYLgu129ZIpn1H+8H+8ikNNVETqEDDMtqcQcQmWppJvcWHaXAs+f8QIDAQAB';

/** AES-256-GCM key used by electoral-search to wrap captcha JSON (`getCaptcha/sir`). */
const ECI_RESPONSE_AES_KEY_B64 = 'e855n97lc4tcPkj7WWsi38yNWpalLBLZzQdkqHWYbZ0=';

const RELATION_TYPE_LABELS: Record<string, string> = {
  HSBN: 'Husband',
  FTHR: 'Father',
  MTHR: 'Mother',
  WIFE: 'Wife',
  OTHR: 'Other',
};

export type EciNationalDisplayContent = {
  epicNumber?: string | null;
  applicantFirstName?: string | null;
  fullName?: string | null;
  applicantFirstNameL1?: string | null;
  fullNameL1?: string | null;
  relationName?: string | null;
  relativeFullName?: string | null;
  relationType?: string | null;
  age?: number | null;
  gender?: string | null;
  partNumber?: string | number | null;
  partSerialNumber?: string | number | null;
  partName?: string | null;
  asmblyName?: string | null;
  acNumber?: string | number | null;
  districtValue?: string | null;
  stateName?: string | null;
  stateCd?: string | null;
  psbuildingName?: string | null;
  buildingAddress?: string | null;
  psRoomDetails?: string | null;
  isActive?: boolean | null;
};

export type EciCaptcha = {
  id: string;
  captcha: string;
};

export type MappedEciVoter = {
  epicNumber: string;
  fullName: string;
  fullNameL1: string | null;
  relationType: string | null;
  relationName: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  pincode: string | null;
  localityStreet: string | null;
  townVillage: string | null;
  partNo: string | null;
  srNo: string | null;
  boothName: string | null;
  boothAddress: string | null;
  acNumber: number | null;
  assemblyName: string | null;
  districtName: string | null;
  stateName: string | null;
  isActive: boolean | null;
};

export type AddVoterTicketPayload = {
  epicNumber: string;
  acNumber: number;
  voter: MappedEciVoter;
  exp: number;
};

export class EciSearchError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'captcha_failed'
      | 'not_found'
      | 'upstream'
      | 'invalid_response',
  ) {
    super(message);
    this.name = 'EciSearchError';
  }
}

function eciHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    applicationName: 'ELECTORAL-SEARCH',
    appName: 'ELECTORAL-SEARCH',
    channelidobo: 'ELECTORAL-SEARCH',
    Origin: ECI_ORIGIN,
    Referer: `${ECI_ORIGIN}/`,
  };
}

function rsaPublicKey() {
  const b64 =
    process.env.ECI_SEARCH_RSA_PUBLIC_KEY?.replace(/\s+/g, '') ||
    DEFAULT_ECI_RSA_PUBLIC_KEY_B64;
  return createPublicKey({
    key: Buffer.from(b64, 'base64'),
    format: 'der',
    type: 'spki',
  });
}

function encryptSearchPayload(payload: Record<string, unknown>): {
  encryptedPayload: string;
  encryptedKey: string;
  iv: string;
} {
  const aesKey = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const encryptedKey = publicEncrypt(
    {
      key: rsaPublicKey(),
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey,
  );

  return {
    encryptedPayload: encrypted.toString('base64'),
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
  };
}

function ticketSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required to sign add-voter tickets');
  }
  return secret;
}

export function cleanEciText(value: unknown): string | null {
  if (value == null) return null;
  const cleaned = String(value)
    .replaceAll('\u0000', '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

export function parseAcNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractPincode(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/\b(\d{6})\b/);
  return match?.[1] ?? null;
}

function mapRelationType(code: string | null): string | null {
  if (!code) return null;
  return RELATION_TYPE_LABELS[code.toUpperCase()] ?? code;
}

export function isAllowedAssembly(acNumber: number | null): boolean {
  return acNumber === ANUSHAKTI_NAGAR_AC_NUMBER;
}

export function mapEciContentToVoter(
  content: EciNationalDisplayContent,
): MappedEciVoter | null {
  const epicNumber = cleanEciText(content.epicNumber)?.toUpperCase();
  if (!epicNumber || !EPIC_NUMBER_PATTERN.test(epicNumber)) {
    return null;
  }

  const fullName =
    cleanEciText(content.applicantFirstName) ||
    cleanEciText(content.fullName);
  if (!fullName) {
    return null;
  }

  const boothAddress = cleanEciText(content.buildingAddress);
  const partName = cleanEciText(content.partName);

  return {
    epicNumber,
    fullName,
    fullNameL1:
      cleanEciText(content.applicantFirstNameL1) ||
      cleanEciText(content.fullNameL1),
    relationType: mapRelationType(cleanEciText(content.relationType)),
    relationName:
      cleanEciText(content.relationName) ||
      cleanEciText(content.relativeFullName),
    age:
      typeof content.age === 'number' && Number.isFinite(content.age)
        ? content.age
        : null,
    gender: cleanEciText(content.gender),
    address: boothAddress,
    pincode: extractPincode(boothAddress),
    localityStreet: boothAddress,
    townVillage: partName || cleanEciText(content.districtValue),
    partNo: cleanEciText(content.partNumber),
    srNo: cleanEciText(content.partSerialNumber),
    boothName:
      cleanEciText(content.psbuildingName) || partName,
    boothAddress,
    acNumber: parseAcNumber(content.acNumber),
    assemblyName: cleanEciText(content.asmblyName),
    districtName: cleanEciText(content.districtValue),
    stateName: cleanEciText(content.stateName),
    isActive: typeof content.isActive === 'boolean' ? content.isActive : null,
  };
}

export function signAddVoterTicket(voter: MappedEciVoter): string {
  if (voter.acNumber == null) {
    throw new EciSearchError('Missing assembly number', 'invalid_response');
  }
  const payload: AddVoterTicketPayload = {
    epicNumber: voter.epicNumber,
    acNumber: voter.acNumber,
    voter,
    exp: Date.now() + TICKET_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  const sig = createHmac('sha256', ticketSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyAddVoterTicket(ticket: string): AddVoterTicketPayload {
  const [body, sig] = ticket.split('.');
  if (!body || !sig) {
    throw new EciSearchError('Invalid add-voter ticket', 'invalid_response');
  }
  const expected = createHmac('sha256', ticketSecret())
    .update(body)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    throw new EciSearchError('Invalid add-voter ticket', 'invalid_response');
  }

  let payload: AddVoterTicketPayload;
  try {
    payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as AddVoterTicketPayload;
  } catch {
    throw new EciSearchError('Invalid add-voter ticket', 'invalid_response');
  }

  if (!payload?.voter?.epicNumber || payload.acNumber == null) {
    throw new EciSearchError('Invalid add-voter ticket', 'invalid_response');
  }
  if (payload.exp < Date.now()) {
    throw new EciSearchError(
      'Search result expired. Please search again.',
      'invalid_response',
    );
  }
  return payload;
}

function unwrapJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) {
    return row.data as Record<string, unknown>;
  }
  return row;
}

function decryptEciWrappedPayload(encryptedB64: string): unknown {
  try {
    const blob = Buffer.from(encryptedB64, 'base64');
    if (blob.length < 28) {
      throw new Error('ciphertext too short');
    }
    const iv = blob.subarray(0, 12);
    const rest = blob.subarray(12);
    const tag = rest.subarray(rest.length - 16);
    const ciphertext = rest.subarray(0, rest.length - 16);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(ECI_RESPONSE_AES_KEY_B64, 'base64'),
      iv,
    );
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as unknown;
  } catch (error) {
    if (error instanceof EciSearchError) throw error;
    throw new EciSearchError(
      'Captcha response was incomplete',
      'invalid_response',
    );
  }
}

function parseCaptchaPayload(value: unknown): EciCaptcha {
  const data = unwrapJsonObject(value);
  const statusCode = data?.statusCode;
  const id = data?.id ?? data?.captchaId;
  const captcha = data?.captcha;
  const okStatus =
    statusCode == null ||
    statusCode === 200 ||
    statusCode === '200';

  if (!okStatus || id == null || captcha == null || String(captcha).length === 0) {
    const message =
      typeof data?.message === 'string' && data.message.trim()
        ? data.message.trim()
        : 'Could not load captcha from voter services';
    throw new EciSearchError(message, 'upstream');
  }

  return { id: String(id), captcha: String(captcha) };
}

export async function fetchEciCaptcha(): Promise<EciCaptcha> {
  const response = await fetch(ECI_CAPTCHA_URL, {
    method: 'GET',
    headers: eciHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new EciSearchError(
      'Could not load captcha from voter services',
      'upstream',
    );
  }

  const json: unknown = await response.json();
  const wrapped =
    json &&
    typeof json === 'object' &&
    typeof (json as { data?: unknown }).data === 'string'
      ? decryptEciWrappedPayload((json as { data: string }).data)
      : json;

  return parseCaptchaPayload(wrapped);
}

function parseSearchHits(data: unknown): EciNationalDisplayContent[] {
  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { data?: unknown }).data)
      ? ((data as { data: unknown[] }).data)
      : [];

  return rows
    .map((hit) => {
      if (!hit || typeof hit !== 'object') return null;
      const content = (hit as { content?: EciNationalDisplayContent }).content;
      return content ?? null;
    })
    .filter((row): row is EciNationalDisplayContent => row != null);
}

export async function searchEciVoterByEpic(input: {
  epicNumber: string;
  captchaId: string;
  captchaData: string;
}): Promise<MappedEciVoter> {
  const epicNumber = input.epicNumber.trim().toUpperCase();
  const captchaId = input.captchaId.trim();
  const captchaData = input.captchaData.trim();

  if (!EPIC_NUMBER_PATTERN.test(epicNumber)) {
    throw new EciSearchError('Enter a valid EPIC number', 'invalid_response');
  }
  if (!captchaId || !captchaData) {
    throw new EciSearchError('Captcha is required', 'captcha_failed');
  }

  const encrypted = encryptSearchPayload({
    isPortal: true,
    epicNumber,
    stateCd: MAHARASHTRA_STATE_CD,
    captchaId,
    captchaData,
    securityKey: 'na',
    eSEARCHYNEFjd3S: SEARCH_APP_MARKER,
  });

  const response = await fetch(ECI_SEARCH_URL, {
    method: 'POST',
    headers: {
      ...eciHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(encrypted),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const code = response.status === 400 || response.status === 401 || response.status === 403
      ? 'captcha_failed'
      : 'upstream';
    throw new EciSearchError(
      code === 'captcha_failed'
        ? 'Captcha could not be verified. Please try again.'
        : 'Voter services search failed. Please try again.',
      code,
    );
  }

  const data: unknown = await response.json();
  const contents = parseSearchHits(data);
  const match =
    contents.find(
      (row) => cleanEciText(row.epicNumber)?.toUpperCase() === epicNumber,
    ) ?? contents[0];

  if (!match) {
    throw new EciSearchError(
      'No voter found for this EPIC number',
      'not_found',
    );
  }

  const mapped = mapEciContentToVoter(match);
  if (!mapped) {
    throw new EciSearchError(
      'Voter record from voter services was incomplete',
      'invalid_response',
    );
  }

  return mapped;
}
