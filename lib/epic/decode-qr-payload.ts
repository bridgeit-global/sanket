export type EpicQrData = {
  epic: string;
  uniqueGeneratedId: number;
};

const KEY = 'X_4k$uq23FSwI.qT';
const IV = 'H76$suq23_po(8sD';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function decryptAes128Cbc(ciphertext: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(KEY),
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: new TextEncoder().encode(IV) },
    cryptoKey,
    ciphertext,
  );

  return new Uint8Array(decrypted);
}

export async function decodeEpicQrPayload(rawPayload: string): Promise<EpicQrData> {
  const payload = rawPayload.trim();
  if (!payload) {
    throw new Error('Empty QR payload');
  }

  try {
    const ciphertext = base64ToBytes(payload);
    const decrypted = await decryptAes128Cbc(ciphertext);
    const parsed = JSON.parse(new TextDecoder('utf-8').decode(decrypted)) as {
      epic_no?: string;
      unique_generated_id?: number;
    };

    const epic = parsed.epic_no?.trim();
    if (!epic) {
      throw new Error('No EPIC number found in voter QR code');
    }

    return {
      epic,
      uniqueGeneratedId: parsed.unique_generated_id ?? 0,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('EPIC')) {
      throw error;
    }
    throw new Error('Could not read voter ID QR code');
  }
}
