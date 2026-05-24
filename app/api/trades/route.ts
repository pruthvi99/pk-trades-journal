/**
 * GET  /api/trades — list trades with filters (scoped to user)
 * POST /api/trades — create a new trade with first execution
 */

import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getUserIdFromRequest } from '@/lib/auth';
import { createTrade, listTrades } from '@/lib/db/queries';
import { createExecutionSchema } from '@/lib/validators/execution';
import { createTradeSchema } from '@/lib/validators/trade';

const screenshotSchema = z.object({
	timeframe: z.enum(['4H', '1H', '15M', '5M', 'other']),
	url: z.string().url(),
	label: z.string().optional(),
});

/** Full create trade payload including execution and screenshots. */
const createTradePayload = createTradeSchema.extend({
	execution: createExecutionSchema.omit({ tradeId: true }).extend({
		kind: z.literal('entry'),
	}),
	screenshots: z.array(screenshotSchema).optional(),
});

export async function GET(request: Request) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const filters = {
		userId,
		status: searchParams.get('status') ?? undefined,
		symbol: searchParams.get('symbol') ?? undefined,
		strategyId: searchParams.get('strategyId') ?? undefined,
		instrument: searchParams.get('instrument') ?? undefined,
		date: searchParams.get('date') ?? undefined,
		limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
		offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
	};
	const result = listTrades(filters);
	return NextResponse.json(result);
}

export async function POST(request: Request) {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const parsed = createTradePayload.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const trade = createTrade({ ...parsed.data, userId });
		return NextResponse.json(trade, { status: 201 });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Internal server error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
