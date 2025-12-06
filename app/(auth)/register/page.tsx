'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { useTranslations } from '@/hooks/use-translations';

import { register, type RegisterActionState } from '../actions';
import { toast } from '@/components/toast';
import { useSession } from 'next-auth/react';

export default function Page() {
  const router = useRouter();
  const { t } = useTranslations();

  const [userId, setUserId] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast({ type: 'error', description: t('auth.messages.accountExists') });
    } else if (state.status === 'failed') {
      toast({ type: 'error', description: t('auth.messages.createFailed') });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: t('auth.messages.validationFailed'),
      });
    } else if (state.status === 'success') {
      toast({ type: 'success', description: t('auth.messages.createSuccess') });

      setIsSuccessful(true);
      router.push('/login');
    }
  }, [state, t, router]);

  const handleSubmit = (formData: FormData) => {
    setUserId(formData.get('userId') as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">{t('auth.register.title')}</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {t('auth.register.description')}
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultUserId={userId}>
          <SubmitButton isSuccessful={isSuccessful}>{t('auth.register.submit')}</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {t('auth.register.hasAccount')}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              {t('auth.register.signInLink')}
            </Link>
            {t('auth.register.signInSuffix')}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
