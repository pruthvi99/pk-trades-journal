/**
 * GET   /api/settings — return user settings as a key-value object.
 * PATCH /api/settings — update one or more user settings.
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserSettings, updateUserSettings } from '@/lib/db/queries';

export async function GET(request: Request) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = getUserSettings(userId);
	return NextResponse.json(result);
}

export async function PATCH(request: Request) {
	const userId = await getUserIdFromRequest(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as Record<string, string>;
	const result = updateUserSettings(userId, body);
	return NextResponse.json(result);
}
