/**
 * Unit tests for lib/auth.ts — session token creation, verification, and passcode validation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Set env vars before importing auth module
beforeEach(() => {
	vi.stubEnv('SESSION_SECRET', 'test-secret-that-is-at-least-32-chars-long');
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('validatePasscode', () => {
	it('accepts a valid 6-digit passcode', async () => {
		const { validatePasscode } = await import('@/lib/auth');
		expect(validatePasscode('090909')).toEqual({ valid: true });
	});

	it('accepts another valid passcode', async () => {
		const { validatePasscode } = await import('@/lib/auth');
		expect(validatePasscode('482719')).toEqual({ valid: true });
	});

	it('rejects non-digit characters', async () => {
		const { validatePasscode } = await import('@/lib/auth');
		expect(validatePasscode('12345a').valid).toBe(false);
	});

	it('rejects too short passcode', async () => {
		const { validatePasscode } = await import('@/lib/auth');
		expect(validatePasscode('12345').valid).toBe(false);
	});

	it('rejects too long passcode', async () => {
		const { validatePasscode } = await import('@/lib/auth');
		expect(validatePasscode('1234567').valid).toBe(false);
	});

	it('rejects all-same-digit passcode', async () => {
		const { validatePasscode } = await import('@/lib/auth');
		expect(validatePasscode('111111').valid).toBe(false);
		expect(validatePasscode('999999').valid).toBe(false);
	});

	it('rejects easy sequential patterns', async () => {
		const { validatePasscode } = await import('@/lib/auth');
		expect(validatePasscode('123456').valid).toBe(false);
		expect(validatePasscode('654321').valid).toBe(false);
	});
});

describe('createSessionToken + verifySessionToken', () => {
	it('creates a token that verifies successfully', async () => {
		const { createSessionToken, verifySessionToken } = await import('@/lib/auth');
		const token = await createSessionToken('test-user-id');
		expect(typeof token).toBe('string');
		expect(token).toContain('.');

		const valid = await verifySessionToken(token);
		expect(valid).toBe(true);
	});

	it('token contains userId in payload', async () => {
		const { createSessionToken } = await import('@/lib/auth');
		const token = await createSessionToken('my-user-123');
		const [encoded] = token.split('.');
		const payload = JSON.parse(atob(encoded!));
		expect(payload.userId).toBe('my-user-123');
	});

	it('rejects a tampered token', async () => {
		const { createSessionToken, verifySessionToken } = await import('@/lib/auth');
		const token = await createSessionToken('test-user-id');
		const tampered = `${token}x`;
		expect(await verifySessionToken(tampered)).toBe(false);
	});

	it('rejects an empty string', async () => {
		const { verifySessionToken } = await import('@/lib/auth');
		expect(await verifySessionToken('')).toBe(false);
	});

	it('rejects a malformed token (no dot)', async () => {
		const { verifySessionToken } = await import('@/lib/auth');
		expect(await verifySessionToken('nodothere')).toBe(false);
	});

	it('rejects a token with invalid base64 payload', async () => {
		const { verifySessionToken } = await import('@/lib/auth');
		expect(await verifySessionToken('not-valid-base64.fakesig')).toBe(false);
	});

	it('rejects a token without userId', async () => {
		const { verifySessionToken } = await import('@/lib/auth');
		// Manually craft a token with old format (no userId)
		const oldPayload = JSON.stringify({
			role: 'admin',
			iat: Math.floor(Date.now() / 1000),
		});
		const encoded = btoa(oldPayload);

		const secret = process.env.SESSION_SECRET!;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign'],
		);
		const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
		const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

		const token = `${encoded}.${sig}`;
		expect(await verifySessionToken(token)).toBe(false);
	});

	it('rejects an expired token', async () => {
		const { verifySessionToken } = await import('@/lib/auth');
		// Manually craft a token with iat in the distant past
		const oldPayload = JSON.stringify({
			userId: 'test-user',
			iat: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 31, // 31 days ago
		});
		const encoded = btoa(oldPayload);

		// Sign it properly
		const secret = process.env.SESSION_SECRET!;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign'],
		);
		const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
		const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

		const token = `${encoded}.${sig}`;
		expect(await verifySessionToken(token)).toBe(false);
	});
});

describe('SESSION_COOKIE_NAME and SESSION_MAX_AGE', () => {
	it('exports correct cookie name', async () => {
		const { SESSION_COOKIE_NAME } = await import('@/lib/auth');
		expect(SESSION_COOKIE_NAME).toBe('pk_session');
	});

	it('exports max age of 30 days', async () => {
		const { SESSION_MAX_AGE } = await import('@/lib/auth');
		expect(SESSION_MAX_AGE).toBe(60 * 60 * 24 * 30);
	});
});
