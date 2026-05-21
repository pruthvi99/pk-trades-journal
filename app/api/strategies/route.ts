/**
 * GET  /api/strategies — list strategies
 * POST /api/strategies — create strategy
 */

import { NextResponse } from 'next/server';
import { createStrategy, listStrategies } from '@/lib/db/queries';
import { createStrategySchema } from '@/lib/validators/strategy';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const includeArchived = searchParams.get('archived') === 'true';
	return NextResponse.json(listStrategies(includeArchived));
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createStrategySchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const strategy = createStrategy(parsed.data);
		return NextResponse.json(strategy, { status: 201 });
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
