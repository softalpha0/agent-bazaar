import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.BAZAAR_API_URL ?? 'http://localhost:4000';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(req.url);
  const target = `${BASE}/${path.join('/')}${url.search}`;
  try {
    const res = await fetch(target, { cache: 'no-store' });
    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'AgentBazaar API not reachable' }, { status: 502 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const body: unknown = await req.json();
  try {
    const res = await fetch(`${BASE}/${path.join('/')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'AgentBazaar API not reachable' }, { status: 502 });
  }
}
