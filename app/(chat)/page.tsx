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
  } else if (session.user.role === 'back-office') {
    redirect('/back-office');
  } else {
    redirect('/unauthorized');
  }
}
