/**
 * GET /api/calendar?year=2026&month=5
 * Returns daily P&L aggregates for the given month.
 */

import { NextResponse } from 'next/server';
import { getCalendarMonth } from '@/lib/db/queries';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const now = new Date();
	const year = Number(searchParams.get('year') ?? now.getFullYear());
	const month = Number(searchParams.get('month') ?? now.getMonth() + 1);

	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		year < 2000 ||
		year > 2100 ||
		month < 1 ||
		month > 12
	) {
		return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
	}

	const days = getCalendarMonth(year, month);
	return NextResponse.json(days);
}
