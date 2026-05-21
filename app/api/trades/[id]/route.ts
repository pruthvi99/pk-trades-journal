/**
 * GET    /api/trades/:id — get trade with relations
 * PATCH  /api/trades/:id — update trade
 * DELETE /api/trades/:id — delete trade and all related data
 */

import { NextResponse } from 'next/server';
import { deleteTrade, getTrade, updateTrade } from '@/lib/db/queries';
import { updateTradeSchema } from '@/lib/validators/trade';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const trade = getTrade(id);
	if (!trade) {
		return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
	}
	return NextResponse.json(trade);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await request.json();
		const parsed = updateTradeSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const updated = updateTrade(id, parsed.data);
		if (!updated) {
			return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
		}
		return NextResponse.json(updated);
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const deleted = deleteTrade(id);
	if (!deleted) {
		return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
	}
	return NextResponse.json({ ok: true });
}
