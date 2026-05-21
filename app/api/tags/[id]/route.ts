/**
 * GET    /api/tags/:id — get tag
 * PATCH  /api/tags/:id — update tag
 */

import { NextResponse } from 'next/server';
import { getTag, updateTag } from '@/lib/db/queries';
import { updateTagSchema } from '@/lib/validators/tag';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const tag = getTag(id);
	if (!tag) {
		return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
	}
	return NextResponse.json(tag);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
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
