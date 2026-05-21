/**
 * Login page — single password field, no username.
 * Redirects to /journal on successful authentication.
 */

'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';

export default function LoginPage() {
	const router = useRouter();
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

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
					<p className="mt-1 text-[13px] text-pk-white-muted">Enter your password to continue.</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="password" className="sr-only">
							Password
						</label>
						<Input
							id="password"
							type="password"
							placeholder="Password"
							autoComplete="current-password"
							autoFocus
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={loading}
						/>
					</div>

					{error && (
						<p className="text-[12px] text-red-400" role="alert">
							{error}
						</p>
					)}

					<Button type="submit" className="w-full" disabled={loading || !password}>
						{loading ? 'Signing in…' : 'Sign in'}
					</Button>
				</form>
			</div>
		</div>
	);
}
