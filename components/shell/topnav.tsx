/**
 * TopNav — persistent top navigation bar.
 * Visible on all routes, responsive. Replaces sidebar + bottom tabs.
 * Logo left, nav links center, logout right.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
	href: string;
	label: string;
	icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
	{
		href: '/journal',
		label: 'Journal',
		icon: (
			<path
				d="M4 5h12M4 10h12M4 15h8"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		),
	},
	{
		href: '/trades/new',
		label: 'New Trade',
		icon: (
			<path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
		),
	},
	{
		href: '/calendar',
		label: 'Calendar',
		icon: (
			<>
				<rect
					x="3"
					y="4"
					width="14"
					height="13"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
					fill="none"
				/>
				<path
					d="M3 8h14M7 2v4M13 2v4"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
				/>
				<circle cx="7" cy="12" r="1" fill="currentColor" />
				<circle cx="10" cy="12" r="1" fill="currentColor" />
				<circle cx="13" cy="12" r="1" fill="currentColor" />
			</>
		),
	},
	{
		href: '/metrics',
		label: 'Metrics',
		icon: (
			<path
				d="M4 16V8l4 4 4-6 4 4"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		),
	},
	{
		href: '/settings',
		label: 'Settings',
		icon: (
			<>
				<circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
				<path
					d="M10 2v2m0 12v2m-5.66-2.34 1.42-1.42m9.9-5.66 1.42-1.42M2 10h2m12 0h2M4.34 4.34l1.42 1.42m9.9 5.66 1.42 1.42"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
				/>
			</>
		),
	},
];

export function TopNav() {
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-40 border-b border-pk-border bg-pk-black/90 backdrop-blur-md">
			<div className="flex h-14 sm:h-12 items-center px-4 sm:px-6">
				{/* Logo */}
				<Link href="/journal" className="shrink-0 mr-6 flex items-center gap-2">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="/logo.png"
						alt="pk.618"
						width={28}
						height={28}
						className="rounded-full shrink-0 object-cover"
					/>
					<span className="text-[15px] font-semibold text-pk-purple tracking-tight">pk_trades</span>
				</Link>

				{/* Nav links */}
				<nav className="flex items-center gap-1">
					{NAV_ITEMS.map((item) => {
						const active =
							pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									'flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1.5 rounded-[6px] text-[14px] sm:text-[13px] font-medium',
									'transition-colors duration-150 ease-out',
									active
										? 'bg-pk-purple-faint text-pk-white'
										: 'text-pk-white-dim hover:text-pk-white hover:bg-pk-black-raised',
								)}
							>
								<svg
									aria-hidden="true"
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									className="shrink-0 sm:w-4 sm:h-4"
								>
									{item.icon}
								</svg>
								<span className="hidden sm:inline">{item.label}</span>
							</Link>
						);
					})}
				</nav>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Logout */}
				<button
					type="button"
					onClick={async () => {
						await fetch('/api/auth/logout', { method: 'POST' });
						window.location.href = '/login';
					}}
					className={cn(
						'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] font-medium',
						'text-pk-white-dim hover:text-pk-white hover:bg-pk-black-raised',
						'transition-colors duration-150 ease-out',
					)}
				>
					<svg
						aria-hidden="true"
						width="14"
						height="14"
						viewBox="0 0 20 20"
						fill="none"
						className="shrink-0"
					>
						<path
							d="M13 4l4 4-4 4M17 10H7M7 4H5a2 2 0 00-2 2v8a2 2 0 002 2h2"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<span className="hidden sm:inline">Logout</span>
				</button>
			</div>
		</header>
	);
}
