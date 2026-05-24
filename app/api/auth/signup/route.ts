/**
 * POST /api/auth/signup — create a new user account with a 6-digit passcode.
 * Validates passcode rules, checks uniqueness, creates user.
 */

import { NextResponse } from 'next/server';
import { createUser, isPasscodeAvailable, validatePasscode } from '@/lib/auth';

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { passcode?: string; displayName?: string };

		if (!body.passcode || typeof body.passcode !== 'string') {
			return NextResponse.json({ error: 'Passcode is required' }, { status: 400 });
		}

		// Validate passcode format and rules
		const validation = validatePasscode(body.passcode);
		if (!validation.valid) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		// Check if passcode is already taken
		if (!isPasscodeAvailable(body.passcode)) {
			return NextResponse.json(
				{ error: 'This passcode is already in use. Please choose a different one.' },
				{ status: 409 },
			);
		}

		// Create the user
		const user = createUser(body.passcode, body.displayName);

		return NextResponse.json(
			{
				ok: true,
				message: 'Account created successfully! You can now sign in with your passcode.',
				userId: user.id,
			},
			{ status: 201 },
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Internal server error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
