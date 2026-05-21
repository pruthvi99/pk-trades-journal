/**
 * Timezone conversion helpers.
 * All timestamps are stored as UTC ISO 8601 strings in SQLite.
 * Display conversion uses the user's timezone setting.
 */

import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/** Get current time as ISO 8601 UTC string. */
export function nowUtc(): string {
	return new Date().toISOString();
}

/**
 * Format a UTC ISO timestamp for display in the user's timezone.
 * @param utcIso - ISO 8601 UTC string
 * @param tz - IANA timezone (e.g. 'America/Chicago')
 * @param fmt - date-fns format string
 */
export function formatInTz(utcIso: string, tz: string, fmt: string = 'MMM d, yyyy HH:mm'): string {
	const date = parseISO(utcIso);
	const zoned = toZonedTime(date, tz);
	return format(zoned, fmt);
}

/**
 * Format a UTC ISO timestamp as a relative date (e.g. "Today", "Yesterday", or the date).
 */
export function formatRelativeDate(utcIso: string, tz: string): string {
	const date = parseISO(utcIso);
	const zoned = toZonedTime(date, tz);
	const now = toZonedTime(new Date(), tz);

	const zonedDate = format(zoned, 'yyyy-MM-dd');
	const todayDate = format(now, 'yyyy-MM-dd');

	if (zonedDate === todayDate) return 'Today';

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (zonedDate === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';

	return format(zoned, 'MMM d, yyyy');
}
