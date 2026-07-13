import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { getShortUrlByCode } from '@/lib/db/short-url-queries';

/** Signed URL lifetime (seconds) for private Storage objects. */
const SIGNED_URL_TTL_SECONDS = 60;

// Public: resolves a short code to its target. For private Storage objects a
// short-lived signed URL is minted per request, so the underlying object is
// never publicly reachable and stops resolving once the short URL expires.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const shortUrl = await getShortUrlByCode(code);
  if (!shortUrl) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (shortUrl.storageBucket && shortUrl.storagePath) {
    const { data, error } = await supabase.storage
      .from(shortUrl.storageBucket)
      .createSignedUrl(shortUrl.storagePath, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error('Failed to sign short URL storage object', error);
      return new NextResponse('Not found', { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl, 302);
  }

  if (shortUrl.targetUrl) {
    return NextResponse.redirect(shortUrl.targetUrl, 302);
  }

  return new NextResponse('Not found', { status: 404 });
}
