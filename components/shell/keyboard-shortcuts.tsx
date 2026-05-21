/**
 * KeyboardShortcuts — global keyboard navigation.
 *
 * Shortcuts:
 * - n        → /trades/new (new trade)
 * - /        → focus search/symbol filter
 * - g then j → /journal
 * - g then m → /metrics
 * - g then s → /settings
 *
 * Disabled when typing in an input/textarea/select.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export function KeyboardShortcuts() {
	const router = useRouter();
	const pendingG = useRef(false);
	const gTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isTyping = useCallback(() => {
		const el = document.activeElement;
		if (!el) return false;
		const tag = el.tagName.toLowerCase();
		return (
			tag === 'input' ||
			tag === 'textarea' ||
			tag === 'select' ||
			(el as HTMLElement).isContentEditable
		);
	}, []);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// Skip if typing in an input
			if (isTyping()) return;
			// Skip if modifier keys are held
			if (e.metaKey || e.ctrlKey || e.altKey) return;

			const key = e.key.toLowerCase();

			// Handle "g" prefix sequences
			if (pendingG.current) {
				pendingG.current = false;
				if (gTimeout.current) {
					clearTimeout(gTimeout.current);
					gTimeout.current = null;
				}
				switch (key) {
					case 'j':
						e.preventDefault();
						router.push('/journal');
						return;
					case 'm':
						e.preventDefault();
						router.push('/metrics');
						return;
					case 's':
						e.preventDefault();
						router.push('/settings');
						return;
				}
				return;
			}

			switch (key) {
				case 'n':
					e.preventDefault();
					router.push('/trades/new');
					break;
				case '/': {
					e.preventDefault();
					// Find the first visible text input and focus it
					const input = document.querySelector<HTMLInputElement>(
						'input[type="text"], input:not([type])',
					);
					if (input) input.focus();
					break;
				}
				case 'g':
					pendingG.current = true;
					// Reset after 500ms if no follow-up key
					gTimeout.current = setTimeout(() => {
						pendingG.current = false;
					}, 500);
					break;
			}
		};

		document.addEventListener('keydown', handler);
		return () => {
			document.removeEventListener('keydown', handler);
			if (gTimeout.current) clearTimeout(gTimeout.current);
		};
	}, [router, isTyping]);

	return null; // This component renders nothing — it's just a side-effect
}
