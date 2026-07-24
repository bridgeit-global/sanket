'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
}) {
  const { pending } = useFormStatus();
  const isLoading = pending || isSuccessful;

  return (
    <Button
      type={pending ? 'button' : 'submit'}
      aria-disabled={isLoading}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {children}

      <output aria-live="polite" className="sr-only">
        {isLoading ? 'Loading' : 'Submit form'}
      </output>
    </Button>
  );
}
