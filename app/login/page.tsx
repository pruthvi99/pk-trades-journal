/**
 * Login page — 6-digit passcode field.
 * Redirects to /journal on successful authentication.
 * Links to /signup for new users.
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';

function LoginContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const justSignedUp = searchParams.get('registered') === 'true';

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
			});

			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				setError(data.error ?? 'Login failed');
				return;
			}

			router.push('/journal');
			router.refresh();
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
						Enter your 6-digit passcode to continue.
					</p>
				</div>

				{/* Success message after signup */}
				{justSignedUp && (
					<div className="rounded-[6px] border border-green-500/20 bg-green-500/10 px-3 py-2">
						<p className="text-[13px] text-green-400">
							Account created successfully! Sign in with your passcode.
						</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="password" className="sr-only">
							Passcode
						</label>
						<Input
							id="password"
							type="password"
							placeholder="6-digit passcode"
							inputMode="numeric"
							maxLength={6}
							pattern="\d{6}"
							autoComplete="current-password"
							autoFocus
							value={password}
							onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
							disabled={loading}
						/>
					</div>

					{error && (
						<p className="text-[12px] text-red-400" role="alert">
							{error}
						</p>
					)}

					<Button type="submit" className="w-full" disabled={loading || password.length !== 6}>
						{loading ? 'Signing in…' : 'Sign in'}
					</Button>
				</form>

				{/* Sign up link */}
				<div className="text-center">
					<p className="text-[13px] text-pk-white-dim">
						Don&apos;t have an account?{' '}
						<Link
							href="/signup"
							className="text-pk-purple-bright hover:text-pk-purple transition-colors font-medium"
						>
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-dvh items-center justify-center bg-pk-black p-4">
					<p className="text-[13px] text-pk-white-dim">Loading…</p>
				</div>
			}
		>
			<LoginContent />
		</Suspense>
	);
}
