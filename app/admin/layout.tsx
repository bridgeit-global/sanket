import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Dashboard - Voter Analysis',
    description: 'Admin interface for voter analysis and management',
};

export default function AdminLayout({
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
