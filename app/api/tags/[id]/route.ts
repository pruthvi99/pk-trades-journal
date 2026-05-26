/**
 * GET    /api/tags/:id — get tag (ownership check)
 * PATCH  /api/tags/:id — update tag (ownership check)
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getTag, updateTag } from '@/lib/db/queries';
import { updateTagSchema } from '@/lib/validators/tag';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;
	const tag = getTag(id);
	if (!tag || tag.userId !== userId) {
		return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
	}
	return NextResponse.json(tag);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const tag = getTag(id);
		if (!tag || tag.userId !== userId) {
			return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
		}

		const body = await request.json();
		const parsed = updateTagSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const updated = updateTag(id, parsed.data);
		if (!updated) {
			return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
		}
		return NextResponse.json(updated);
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
