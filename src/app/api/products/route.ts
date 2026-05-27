import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: query products
  return NextResponse.json({ data: [] })
}
