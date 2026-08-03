import { NextResponse } from 'next/server';
import { getMonitoringSnapshot } from '@/lib/monitoring-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    await getMonitoringSnapshot({
      fetcher: (url, init) => fetch(url, init),
    }),
    { headers: { 'cache-control': 'no-store' } },
  );
}
