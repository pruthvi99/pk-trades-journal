/**
 * POST /api/auth/login — authenticate with 6-digit passcode.
 * Looks up user by passcode and sets a signed session cookie on success.
 */

import { NextResponse } from 'next/server';
import {
	createSessionToken,
	findUserByPasscode,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE,
} from '@/lib/auth';

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { password?: string };

		if (!body.password || typeof body.password !== 'string') {
			return NextResponse.json({ error: 'Passcode is required' }, { status: 400 });
		}

		const user = findUserByPasscode(body.password);
		if (!user) {
			return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
		}

		const token = await createSessionToken(user.id);
		const response = NextResponse.json({ ok: true });

		response.cookies.set(SESSION_COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.SECURE_COOKIES === 'true',
			sameSite: 'lax',
			path: '/',
			maxAge: SESSION_MAX_AGE,
		});

		return response;
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
