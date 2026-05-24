/**
 * POST /api/executions — add an execution to a trade (ownership check)
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { addExecution, isTradeOwnedByUser } from '@/lib/db/queries';
import { createExecutionSchema } from '@/lib/validators/execution';

export async function POST(request: Request) {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const parsed = createExecutionSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}

		// Verify the trade belongs to this user
		if (!isTradeOwnedByUser(parsed.data.tradeId, userId)) {
			return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
		}

		const trade = addExecution(parsed.data);
		if (!trade) {
			return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
		}
		return NextResponse.json(trade, { status: 201 });
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
