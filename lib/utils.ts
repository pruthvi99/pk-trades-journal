/**
 * Utility for merging class names. Minimal — no clsx/tailwind-merge needed.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(' ');
}
