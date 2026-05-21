/**
 * POST /api/auth/logout — clear the session cookie.
 */

import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
	const response = NextResponse.json({ ok: true });
	response.cookies.delete(SESSION_COOKIE_NAME);
	return response;
}
