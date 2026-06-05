import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVoterEpicByPartAndSerial } from '@/lib/db/queries';
import { parseVoterBarcodePayload } from '@/lib/epic/decode-voter-barcode';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim();
    const partNoParam = searchParams.get('partNo')?.trim();
    const srNoParam = searchParams.get('srNo')?.trim();

    const partSerial =
      partNoParam && srNoParam
        ? { partNo: partNoParam, srNo: srNoParam }
        : code
          ? parseVoterBarcodePayload(code)
          : null;

    if (!partSerial) {
      return NextResponse.json(
        { error: 'Invalid voter barcode payload' },
        { status: 400 },
      );
    }

    const epicNumber = await getVoterEpicByPartAndSerial(
      partSerial.partNo,
      partSerial.srNo,
    );

    if (!epicNumber) {
      return NextResponse.json(
        { error: 'Voter not found for this barcode' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      epicNumber,
      partNo: partSerial.partNo,
      srNo: partSerial.srNo,
    });
  } catch (error) {
    console.error('Voter barcode lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve voter barcode' },
      { status: 500 },
    );
  }
}
