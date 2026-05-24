/**
 * GET    /api/trades/:id — get trade with relations (ownership check)
 * PATCH  /api/trades/:id — update trade (ownership check)
 * DELETE /api/trades/:id — delete trade and all related data (ownership check)
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { deleteTrade, getTrade, isTradeOwnedByUser, updateTrade } from '@/lib/db/queries';
import { updateTradeSchema } from '@/lib/validators/trade';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;
	const trade = getTrade(id);
	if (!trade) {
		return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
	}

	// Ownership check
	if (trade.userId && trade.userId !== userId) {
		return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
	}

	return NextResponse.json(trade);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		// Ownership check
		if (!isTradeOwnedByUser(id, userId)) {
			return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
		}

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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;

	// Ownership check
	if (!isTradeOwnedByUser(id, userId)) {
		return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
	}

	const deleted = deleteTrade(id);
	if (!deleted) {
		return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
	}
	return NextResponse.json({ ok: true });
}
