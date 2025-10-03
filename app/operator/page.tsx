import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { VoterMobileUpdateInterface } from '@/components/voter-mobile-update-interface';

export default async function OperatorPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    if (!['admin', 'operator'].includes(session.user.role)) {
        redirect('/unauthorized');
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Voter Mobile Number Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Update voter mobile numbers and contact information
                    </p>
                </div>
                <VoterMobileUpdateInterface />
            </div>
        </div>
    );
}
