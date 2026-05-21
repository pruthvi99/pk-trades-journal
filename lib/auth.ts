/**
 * Authentication utilities for single-user session management.
 * Uses HMAC-SHA256 signed cookies — no JWTs, no third-party auth.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'pk_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Return the session secret from environment.
 * Throws at startup if missing or too short.
 */
function getSessionSecret(): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error('SESSION_SECRET must be at least 32 characters');
	}
	return secret;
}

/**
 * Return the admin password from environment.
 * Throws if not set.
 */
function getAdminPassword(): string {
	const pw = process.env.ADMIN_PASSWORD;
	if (!pw) {
		throw new Error('ADMIN_PASSWORD is not set');
	}
	return pw;
}

/**
 * Verify the supplied password matches the admin password.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPassword(input: string): boolean {
	const expected = getAdminPassword();
	// HMAC both sides to normalize to equal-length buffers for timing-safe compare.
	const digest = (s: string) => createHmac('sha256', 'pk-verify').update(s).digest();
	return timingSafeEqual(digest(input), digest(expected));
}

/**
 * Create an HMAC-SHA256 signature for a payload string.
 */
async function hmacSign(payload: string): Promise<string> {
	const secret = getSessionSecret();
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
	return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify an HMAC-SHA256 signature for a payload string.
 */
async function hmacVerify(payload: string, signature: string): Promise<boolean> {
	const expected = await hmacSign(payload);
	if (expected.length !== signature.length) return false;
	const a = Buffer.from(expected);
	const b = Buffer.from(signature);
	return timingSafeEqual(a, b);
}

/**
 * Create a signed session token.
 * Token format: `payload.signature` where payload is base64-encoded JSON.
 */
export async function createSessionToken(): Promise<string> {
	const payload = JSON.stringify({
		role: 'admin',
		iat: Math.floor(Date.now() / 1000),
	});
	const encoded = btoa(payload);
	const sig = await hmacSign(encoded);
	return `${encoded}.${sig}`;
}

/**
 * Verify a session token. Returns true if valid and not expired.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
	const parts = token.split('.');
	if (parts.length !== 2) return false;
	const [encoded, sig] = parts as [string, string];

	const valid = await hmacVerify(encoded, sig);
	if (!valid) return false;

	try {
		const payload = JSON.parse(atob(encoded)) as { iat?: number };
		if (!payload.iat) return false;
		const age = Math.floor(Date.now() / 1000) - payload.iat;
		return age >= 0 && age < MAX_AGE_SECONDS;
	} catch {
		return false;
	}
}

/** The cookie name used for the session. */
export const SESSION_COOKIE_NAME = COOKIE_NAME;

/** Max age for the session cookie in seconds. */
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
