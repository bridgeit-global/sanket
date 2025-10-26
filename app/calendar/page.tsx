import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Calendar } from '@/components/calendar';

export default async function CalendarPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // Check if user has access to calendar
    if (!['admin', 'back-office', 'operator'].includes(session.user.role)) {
        redirect('/unauthorized');
    }

    return (
        <div className="container mx-auto py-6 px-4">
            <Calendar userRole={session.user.role} />
        </div>
    );
}
