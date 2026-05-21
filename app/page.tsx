import { redirect } from 'next/navigation';

/** Root redirects to journal — the default view */
export default function RootPage() {
	redirect('/journal');
}
