/**
 * GET  /api/tags — list tags (scoped to user)
 * POST /api/tags — create tag (assigned to user)
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { createTag, listTags } from '@/lib/db/queries';
import { createTagSchema } from '@/lib/validators/tag';

export async function GET(request: Request) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const includeArchived = searchParams.get('archived') === 'true';
	return NextResponse.json(listTags(includeArchived, userId));
}

export async function POST(request: Request) {
	try {
		const userId = await getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const parsed = createTagSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const tag = createTag({ ...parsed.data, userId });
		return NextResponse.json(tag, { status: 201 });
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
