import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Redirect based on user role
  if (session.user.role === 'admin') {
    redirect('/admin');
  } else if (session.user.role === 'operator') {
    redirect('/operator');
  } else {
    redirect('/unauthorized');
  }
}
