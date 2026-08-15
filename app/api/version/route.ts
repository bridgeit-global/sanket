import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sha =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    null;

  return NextResponse.json({ sha });
}
