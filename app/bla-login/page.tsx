'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';

import { blaLogin, type LoginActionState } from '../(auth)/actions';
import { useSession } from 'next-auth/react';

export default function Page() {
  const router = useRouter();
  const { t } = useTranslations();

  const [userId, setUserId] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    blaLogin,
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
        description: t('auth.blaLogin.notAuthorized'),
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: t('auth.messages.validationFailed'),
      });
    } else if (state.status === 'success' && !isSuccessful) {
      setIsSuccessful(true);
      updateSession().then(() => {
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get('callbackUrl');
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
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            {t('auth.blaLogin.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {t('auth.blaLogin.description')}
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultUserId={userId}>
          <SubmitButton isSuccessful={isSuccessful}>
            {t('auth.blaLogin.submit')}
          </SubmitButton>
        </AuthForm>
      </div>
    </div>
  );
}
