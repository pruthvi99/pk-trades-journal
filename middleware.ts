/**
 * Next.js middleware — protects authenticated routes.
 * Redirects to /login if session cookie is missing or invalid.
 */

import { type NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight HMAC verification for the Edge runtime.
 * Mirrors the logic in lib/auth.ts but uses only Web Crypto APIs.
 */
async function verifyTokenEdge(token: string, secret: string): Promise<boolean> {
	const parts = token.split('.');
	if (parts.length !== 2) return false;
	const [encoded, sig] = parts as [string, string];

	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
	const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

	if (expectedSig.length !== sig.length) return false;

	// Constant-time comparison (best effort in Edge runtime)
	let mismatch = 0;
	for (let i = 0; i < expectedSig.length; i++) {
		mismatch |= (expectedSig.charCodeAt(i) ?? 0) ^ (sig.charCodeAt(i) ?? 0);
	}
	if (mismatch !== 0) return false;

	try {
		const payload = JSON.parse(atob(encoded)) as { iat?: number; userId?: string };
		if (!payload.iat) return false;
		// Require userId in token (multi-user format)
		if (!payload.userId) return false;
		const age = Math.floor(Date.now() / 1000) - payload.iat;
		return age >= 0 && age < 60 * 60 * 24 * 30; // 30 days
	} catch {
		return false;
	}
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Public routes that don't require auth
	if (
		pathname === '/login' ||
		pathname === '/signup' ||
		pathname === '/design' ||
		pathname.startsWith('/api/auth/') ||
		pathname.startsWith('/api/admin/') ||
		pathname.startsWith('/_next/') ||
		pathname === '/favicon.ico'
	) {
		return NextResponse.next();
	}

	const secret = process.env.SESSION_SECRET;
	if (!secret || secret.length < 32) {
		// If no secret configured, allow access (dev mode without .env)
		return NextResponse.next();
	}

	const rawToken = request.cookies.get('pk_session')?.value;
	if (!rawToken) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	// Cookie values may be URL-encoded by the framework; decode before verification
	const token = decodeURIComponent(rawToken);
	const valid = await verifyTokenEdge(token, secret);
	if (!valid) {
		const response = NextResponse.redirect(new URL('/login', request.url));
		response.cookies.delete('pk_session');
		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization)
		 * - favicon.ico
		 */
		'/((?!_next/static|_next/image|favicon.ico).*)',
	],
};
