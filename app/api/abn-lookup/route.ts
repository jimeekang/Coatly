import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'ABN lookup is temporarily disabled' },
    { status: 503 }
  );
}
