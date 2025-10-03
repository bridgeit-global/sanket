import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    if (session.user.role !== 'admin') {
        redirect('/unauthorized');
    }

    const id = generateUUID();

    return (
        <DataStreamProvider>
            <SidebarProvider>
                <AppSidebar user={session.user} />
                <main className="flex flex-1 flex-col gap-4 p-4">
                    <Chat
                        id={id}
                        initialMessages={[]}
                        initialChatModel={DEFAULT_CHAT_MODEL}
                        initialVisibilityType="private"
                        isReadonly={false}
                        session={session}
                        autoResume={false}
                    />
                </main>
            </SidebarProvider>
        </DataStreamProvider>
    );
}
