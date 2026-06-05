/** Serial numbers in voter ID Code 128 barcodes occupy the last 5 digits. */
export const VOTER_BARCODE_SERIAL_WIDTH = 5;
export const VOTER_BARCODE_SERIAL_DIVISOR = 10 ** VOTER_BARCODE_SERIAL_WIDTH;

export type VoterBarcodePartSerial = {
  partNo: string;
  srNo: string;
};

/**
 * Decode a numeric voter ID Code 128 payload into part number + serial number.
 *
 * ECI-style barcodes encode: partNo * 100000 + serialNo
 * Example: 21664533 -> part 216, serial 64533
 */
export function parseVoterBarcodePayload(
  payload: string,
): VoterBarcodePartSerial | null {
  const raw = (payload ?? '').trim();
  if (!/^\d{6,10}$/.test(raw)) return null;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;

  const partNo = Math.floor(value / VOTER_BARCODE_SERIAL_DIVISOR);
  const srNo = value % VOTER_BARCODE_SERIAL_DIVISOR;
  if (partNo <= 0 || srNo <= 0) return null;

  return {
    partNo: String(partNo),
    srNo: String(srNo),
  };
}

export function isNumericVoterBarcodePayload(payload: string): boolean {
  return parseVoterBarcodePayload(payload) != null;
}
