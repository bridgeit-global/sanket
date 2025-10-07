'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { BackOfficeWorkflow } from '@/components/back-office-workflow';

export default function BackOfficePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session?.user) {
            router.push('/login');
            return;
        }

        if (!['admin', 'back-office'].includes(session.user.role)) {
            router.push('/unauthorized');
            return;
        }

        setIsLoading(false);
    }, [session, status, router]);

    const handleSignOut = () => {
        signOut({ redirectTo: '/' });
    };

    if (isLoading || status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
                <BackOfficeWorkflow onSignOut={handleSignOut} />
            </div>
        </div>
    );
}


