/**
 * GET  /api/tags — list tags
 * POST /api/tags — create tag
 */

import { NextResponse } from 'next/server';
import { createTag, listTags } from '@/lib/db/queries';
import { createTagSchema } from '@/lib/validators/tag';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const includeArchived = searchParams.get('archived') === 'true';
	return NextResponse.json(listTags(includeArchived));
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createTagSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
		}
		const tag = createTag(parsed.data);
		return NextResponse.json(tag, { status: 201 });
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
