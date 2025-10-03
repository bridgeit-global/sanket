import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Operator Dashboard - Voter Management',
    description: 'Operator interface for updating voter mobile numbers',
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
