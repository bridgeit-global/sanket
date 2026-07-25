'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';

import { login, type LoginActionState } from '../actions';
import { useSession } from 'next-auth/react';

export default function Page() {
  const router = useRouter();
  const { t } = useTranslations();

  const [userId, setUserId] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  // Only react when the server action returns a new state object. Do not
  // depend on `t` / other render-unstable values — those re-fired the previous
  // error toast on the next submit while status was still "failed".
  useEffect(() => {
    if (state.status === 'failed') {
      toast({
        type: 'error',
        description: t('auth.messages.invalidCredentials'),
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: t('auth.messages.validationFailed'),
      });
    } else if (state.status === 'success' && !isSuccessful) {
      setIsSuccessful(true);
      // Update session and then navigate
      updateSession().then(() => {
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get('callbackUrl');
        // Use window.location for a hard navigation to ensure cookies are set
        window.location.href = callbackUrl || '/home';
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on action result only
  }, [state]);

  const handleSubmit = (formData: FormData) => {
    toast.dismiss();
    setUserId(formData.get('userId') as string);
    formAction(formData);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="relative flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
        onClick={handleBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('common.back')}
      </Button>
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">{t('auth.login.title')}</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {t('auth.login.description')}
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultUserId={userId}>
          <SubmitButton isSuccessful={isSuccessful}>{t('auth.login.submit')}</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {t('auth.login.noAccount')}
            <Link
              href="/register"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              {t('auth.login.signUpLink')}
            </Link>
            {t('auth.login.signUpSuffix')}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
