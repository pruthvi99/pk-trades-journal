/**
 * POST /api/auth/login — authenticate with admin password.
 * Sets a signed session cookie on success.
 */

import { NextResponse } from 'next/server';
import {
	createSessionToken,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE,
	verifyPassword,
} from '@/lib/auth';

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { password?: string };

		if (!body.password || typeof body.password !== 'string') {
			return NextResponse.json({ error: 'Password is required' }, { status: 400 });
		}

		if (!verifyPassword(body.password)) {
			return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
		}

		const token = await createSessionToken();
		const response = NextResponse.json({ ok: true });

		response.cookies.set(SESSION_COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: SESSION_MAX_AGE,
		});

		return response;
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
