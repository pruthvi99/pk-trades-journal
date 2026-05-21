/**
 * ErrorBoundary — catches React rendering errors per route segment.
 * Displays a minimal error state with retry option.
 */

'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/primitives/button';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('ErrorBoundary caught:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex flex-col items-center justify-center py-16 space-y-4">
					<p className="text-[14px] text-pk-white-muted">Something went wrong.</p>
					<p className="text-[12px] text-pk-white-dim max-w-md text-center">
						{this.state.error?.message ?? 'An unexpected error occurred.'}
					</p>
					<Button
						variant="ghost"
						size="small"
						onClick={() => this.setState({ hasError: false, error: null })}
					>
						Try again
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}
