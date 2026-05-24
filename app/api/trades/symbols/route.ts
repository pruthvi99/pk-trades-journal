/**
 * GET /api/trades/symbols — distinct symbols for autocomplete (scoped to user)
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getDistinctSymbols } from '@/lib/db/queries';

export async function GET(request: Request) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	return NextResponse.json(getDistinctSymbols(userId));
}
