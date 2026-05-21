/**
 * DELETE /api/executions/:id — delete an execution
 */

import { NextResponse } from 'next/server';
import { deleteExecution } from '@/lib/db/queries';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const deleted = deleteExecution(id);
	if (!deleted) {
		return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
	}
	return NextResponse.json({ ok: true });
}
