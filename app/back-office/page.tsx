import { redirect } from 'next/navigation';

// Backward compatibility - redirect to new module route
export default async function BackOfficePage() {
    redirect('/modules/back-office');
}


