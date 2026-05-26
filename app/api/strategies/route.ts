/**
 * GET  /api/strategies — list strategies (scoped to user)
 * POST /api/strategies — create strategy (assigned to user)
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { createStrategy, listStrategies } from '@/lib/db/queries';
import { createStrategySchema } from '@/lib/validators/strategy';

export async function GET(request: Request) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const includeArchived = searchParams.get('archived') === 'true';
	return NextResponse.json(listStrategies(includeArchived, userId));
}

export async function POST(request: Request) {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const parsed = createStrategySchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const strategy = createStrategy({ ...parsed.data, userId });
		return NextResponse.json(strategy, { status: 201 });
	} catch (err) {
		const message = err instanceof Error ? err.message : '';
		if (message.includes('UNIQUE constraint')) {
			return NextResponse.json(
				{ error: 'A strategy with this name already exists' },
				{ status: 409 },
			);
		}
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
