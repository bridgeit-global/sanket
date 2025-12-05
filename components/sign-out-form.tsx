'use client';

import Form from 'next/form';

import { signOutAction } from '@/app/(auth)/actions';
import { useTranslations } from '@/hooks/use-translations';

export const SignOutForm = () => {
  const { t } = useTranslations();

  return (
    <Form className="w-full" action={signOutAction}>
      <button
        type="submit"
        className="w-full text-left px-1 py-0.5 text-red-500"
      >
        {t('userNav.signOut')}
      </button>
    </Form>
  );
};
