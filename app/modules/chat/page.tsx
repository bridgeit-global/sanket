import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Chat } from '@/components/chat';
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
  );
}

