import { redirect } from 'next/navigation';

// Backward compatibility - redirect to new module route
export default async function OperatorPage() {
    redirect('/modules/operator');
}
