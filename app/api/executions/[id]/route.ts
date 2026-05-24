/**
 * DELETE /api/executions/:id — delete an execution (ownership check via trade)
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { deleteExecution, isTradeOwnedByUser } from '@/lib/db/queries';
import { tradeExecutions } from '@/lib/db/schema';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;

	// Look up the execution to find its trade, then check ownership
	const db = getDb();
	const exec = db.select().from(tradeExecutions).where(eq(tradeExecutions.id, id)).get();
	if (!exec || !isTradeOwnedByUser(exec.tradeId, userId)) {
		return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
	}

	const deleted = deleteExecution(id);
	if (!deleted) {
		return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
	}
	return NextResponse.json({ ok: true });
}
