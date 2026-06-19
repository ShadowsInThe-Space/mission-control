import { NextResponse } from 'next/server';
import { getAgentStatusSnapshot } from '@/lib/agent-status-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getAgentStatusSnapshot({
    fetcher: (url, init) => fetch(url, init),
  }));
}
