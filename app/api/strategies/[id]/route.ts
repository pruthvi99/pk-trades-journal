/**
 * GET    /api/strategies/:id — get strategy (ownership check)
 * PATCH  /api/strategies/:id — update strategy (ownership check)
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getStrategy, updateStrategy } from '@/lib/db/queries';
import { updateStrategySchema } from '@/lib/validators/strategy';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;
	const strategy = getStrategy(id);
	if (!strategy || strategy.userId !== userId) {
		return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
	}
	return NextResponse.json(strategy);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const strategy = getStrategy(id);
		if (!strategy || strategy.userId !== userId) {
			return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
		}

		const body = await request.json();
		const parsed = updateStrategySchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const updated = updateStrategy(id, parsed.data);
		if (!updated) {
			return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
		}
		return NextResponse.json(updated);
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
