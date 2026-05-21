/**
 * GET /api/trades/symbols — distinct symbols for autocomplete
 */

import { NextResponse } from 'next/server';
import { getDistinctSymbols } from '@/lib/db/queries';

export async function GET() {
	return NextResponse.json(getDistinctSymbols());
}
