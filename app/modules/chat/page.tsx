import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
import { ChatHistory } from '@/components/chat-history';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'chat');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const id = generateUUID();

  return (
    <main className="flex flex-1 h-[calc(100vh-4rem)] gap-4 p-4 overflow-hidden">
      <div className="w-80 border-r border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">Chat History</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatHistory user={session.user} />
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Chat
          id={id}
          initialMessages={[]}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType="private"
          isReadonly={false}
          session={session}
          autoResume={false}
        />
      </div>
    </main>
  );
}

