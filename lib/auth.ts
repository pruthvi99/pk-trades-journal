/**
 * Authentication utilities for multi-user session management.
 * Uses HMAC-SHA256 signed cookies — no JWTs, no third-party auth.
 * Users authenticate with a 6-digit passcode.
 */

import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDb, getSqlite } from './db/client';
import { type User, users } from './db/schema';
import { seedDefaultTags } from './db/seed-defaults';
import { nowUtc } from './time';

const COOKIE_NAME = 'pk_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Well-known admin user ID (created by migration). */
export const ADMIN_USER_ID = '00000000-0000-0000-0000-000000090909';

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

// ─── Passcode validation ────────────────────────────────────────────────────

/**
 * Validate a 6-digit passcode against rules:
 * - Must be exactly 6 digits
 * - Cannot be all the same digit (111111, 222222, etc.)
 * - Cannot be simple sequential patterns (123456, 654321)
 */
export function validatePasscode(passcode: string): { valid: boolean; error?: string } {
	if (!/^\d{6}$/.test(passcode)) {
		return { valid: false, error: 'Passcode must be exactly 6 digits' };
	}

	// Check repetitive (all same digit)
	if (/^(\d)\1{5}$/.test(passcode)) {
		return { valid: false, error: 'Passcode cannot be all the same digit' };
	}

	// Check easy sequential patterns
	const easyPatterns = [
		'123456',
		'654321',
		'012345',
		'543210',
		'234567',
		'765432',
		'345678',
		'876543',
		'456789',
		'987654',
		'000000',
	];
	if (easyPatterns.includes(passcode)) {
		return { valid: false, error: 'Passcode is too easy to guess' };
	}

	return { valid: true };
}

// ─── User operations ────────────────────────────────────────────────────────

/** Find a user by their passcode. */
export function findUserByPasscode(passcode: string): User | undefined {
	const db = getDb();
	return db.select().from(users).where(eq(users.passcode, passcode)).get();
}

/** Check if a passcode is already taken. */
export function isPasscodeAvailable(passcode: string): boolean {
	return !findUserByPasscode(passcode);
}

/** Create a new user with the given passcode. */
export function createUser(passcode: string, displayName?: string): User {
	const db = getDb();
	const sqlite = getSqlite();
	const id = uuid();
	const now = nowUtc();

	// Atomic: user + default tags in one transaction.
	// If seedDefaultTags fails, user creation is rolled back — prevents orphan users
	// that cause "passcode already in use" on retry with no way to recover.
	const createUserTxn = sqlite.transaction(() => {
		db.insert(users)
			.values({
				id,
				passcode,
				displayName: displayName ?? null,
				isAdmin: false,
				createdAt: now,
			})
			.run();

		seedDefaultTags(id);
	});
	createUserTxn();

	return db.select().from(users).where(eq(users.id, id)).get()!;
}

// ─── Session tokens ─────────────────────────────────────────────────────────

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
 * Create a signed session token that includes the userId.
 * Token format: `payload.signature` where payload is base64-encoded JSON.
 */
export async function createSessionToken(userId: string): Promise<string> {
	const payload = JSON.stringify({
		userId,
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
		const payload = JSON.parse(atob(encoded)) as { iat?: number; userId?: string };
		if (!payload.iat) return false;
		if (!payload.userId) return false;
		const age = Math.floor(Date.now() / 1000) - payload.iat;
		return age >= 0 && age < MAX_AGE_SECONDS;
	} catch {
		return false;
	}
}

/**
 * Extract the userId from a session cookie in a request.
 * Used by API routes to identify the current user.
 *
 * In dev mode (no SESSION_SECRET), returns the admin user ID.
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
	// Dev mode fallback — no auth required
	if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
		return ADMIN_USER_ID;
	}

	const cookieHeader = request.headers.get('cookie');
	if (!cookieHeader) return null;

	// Parse cookies
	const cookies: Record<string, string> = {};
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim();
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx > 0) {
			cookies[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
		}
	}

	const rawToken = cookies[COOKIE_NAME];
	if (!rawToken) return null;

	// Cookie values may be URL-encoded; decode before verification
	const token = decodeURIComponent(rawToken);
	const parts = token.split('.');
	if (parts.length !== 2) return null;
	const [encoded, sig] = parts as [string, string];

	const valid = await hmacVerify(encoded, sig);
	if (!valid) return null;

	try {
		const payload = JSON.parse(atob(encoded)) as { iat?: number; userId?: string };
		if (!payload.iat || !payload.userId) return null;
		const age = Math.floor(Date.now() / 1000) - payload.iat;
		if (age < 0 || age >= MAX_AGE_SECONDS) return null;
		return payload.userId;
	} catch {
		return null;
	}
}

/** The cookie name used for the session. */
export const SESSION_COOKIE_NAME = COOKIE_NAME;

/** Max age for the session cookie in seconds. */
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
