/**
 * POST /api/executions — add an execution to a trade
 */

import { NextResponse } from 'next/server';
import { addExecution } from '@/lib/db/queries';
import { createExecutionSchema } from '@/lib/validators/execution';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createExecutionSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
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
