import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Beneficiary Management - Voter Management',
    description: 'Beneficiary management interface for updating voter mobile numbers',
};

export default function OperatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
}
