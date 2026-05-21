/**
 * GET    /api/strategies/:id — get strategy
 * PATCH  /api/strategies/:id — update strategy
 */

import { NextResponse } from 'next/server';
import { getStrategy, updateStrategy } from '@/lib/db/queries';
import { updateStrategySchema } from '@/lib/validators/strategy';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const strategy = getStrategy(id);
	if (!strategy) {
		return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
	}
	return NextResponse.json(strategy);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
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
