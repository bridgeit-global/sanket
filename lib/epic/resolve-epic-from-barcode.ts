import { extractEpicFromPayload } from '@/lib/epic/extract-epic-from-payload';
import { parseVoterBarcodePayload } from '@/lib/epic/decode-voter-barcode';

export async function resolveEpicFromBarcodePayload(
  payload: string,
): Promise<string | null> {
  const directEpic = extractEpicFromPayload(payload);
  if (directEpic) return directEpic;

  const partSerial = parseVoterBarcodePayload(payload);
  if (!partSerial) return null;

  const params = new URLSearchParams({
    partNo: partSerial.partNo,
    srNo: partSerial.srNo,
  });
  const response = await fetch(`/api/voter/barcode?${params.toString()}`);
  if (!response.ok) return null;

  const data = (await response.json()) as { epicNumber?: string };
  return data.epicNumber?.trim().toUpperCase() ?? null;
}
