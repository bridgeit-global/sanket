import { redirect } from 'next/navigation';

// Backward compatibility - redirect to merged Daily Programme module
export default async function CalendarPage() {
    redirect('/modules/daily-programme');
}
