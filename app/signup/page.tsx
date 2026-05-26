/**
 * Sign-up page — create account with a 6-digit passcode.
 * Validates format, blocks easy patterns, checks uniqueness.
 * On success, redirects to /login with a success message.
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';

export default function SignupPage() {
	const router = useRouter();
	const [passcode, setPasscode] = useState('');
	const [confirmPasscode, setConfirmPasscode] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError('');

		// Client-side validation
		if (passcode.length !== 6) {
			setError('Passcode must be exactly 6 digits');
			return;
		}

		if (passcode !== confirmPasscode) {
			setError('Passcodes do not match');
			return;
		}

		// Check for repetitive pattern (all same digit)
		if (/^(\d)\1{5}$/.test(passcode)) {
			setError('Passcode cannot be all the same digit');
			return;
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
		];
		if (easyPatterns.includes(passcode)) {
			setError('Passcode is too easy to guess');
			return;
		}

		setLoading(true);

		try {
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ passcode }),
			});

			const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };

			if (!res.ok) {
				setError(data.error ?? 'Signup failed');
				return;
			}

			// Auto-logged in — go straight to dashboard
			router.push('/dashboard');
		} catch {
			setError('Network error');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-dvh items-center justify-center bg-pk-black p-4">
			<div className="w-full max-w-xs space-y-6">
				{/* Branding */}
				<div>
					<h1 className="text-[28px] font-semibold text-pk-white">pk_trades</h1>
					<p className="mt-1 text-[13px] text-pk-white-muted">
						Create your account with a 6-digit passcode.
					</p>
				</div>

				{/* Rules */}
				<div className="rounded-[6px] border border-pk-border bg-pk-black-raised px-3 py-2.5 space-y-1">
					<p className="text-[12px] font-medium text-pk-white-dim">Passcode rules:</p>
					<ul className="text-[12px] text-pk-white-dim space-y-0.5 list-disc list-inside">
						<li>Must be exactly 6 digits</li>
						<li>Cannot be all the same digit (e.g. 111111)</li>
						<li>Cannot be a simple sequence (e.g. 123456)</li>
						<li>Must be unique — not used by another account</li>
					</ul>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-3">
						<div>
							<label htmlFor="passcode" className="text-[12px] text-pk-white-dim block mb-1">
								Passcode
							</label>
							<Input
								id="passcode"
								type="password"
								placeholder="6-digit passcode"
								inputMode="numeric"
								maxLength={6}
								pattern="\d{6}"
								autoFocus
								value={passcode}
								onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
								disabled={loading}
							/>
						</div>
						<div>
							<label htmlFor="confirmPasscode" className="text-[12px] text-pk-white-dim block mb-1">
								Confirm passcode
							</label>
							<Input
								id="confirmPasscode"
								type="password"
								placeholder="Re-enter passcode"
								inputMode="numeric"
								maxLength={6}
								pattern="\d{6}"
								value={confirmPasscode}
								onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
								disabled={loading}
							/>
						</div>
					</div>

					{error && (
						<p className="text-[12px] text-red-400" role="alert">
							{error}
						</p>
					)}

					<Button
						type="submit"
						className="w-full"
						disabled={loading || passcode.length !== 6 || confirmPasscode.length !== 6}
					>
						{loading ? 'Creating account…' : 'Sign up'}
					</Button>
				</form>

				{/* Back to login */}
				<div className="text-center">
					<p className="text-[13px] text-pk-white-dim">
						Already have an account?{' '}
						<Link
							href="/login"
							className="text-pk-purple-bright hover:text-pk-purple transition-colors font-medium"
						>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
