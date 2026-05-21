/**
 * Authenticated app shell layout.
 * Top navigation bar on all viewports, content below.
 */

import { KeyboardShortcuts } from '@/components/shell/keyboard-shortcuts';
import { TopNav } from '@/components/shell/topnav';

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="min-h-dvh bg-pk-black">
			<TopNav />
			<main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
			<KeyboardShortcuts />
		</div>
	);
}
