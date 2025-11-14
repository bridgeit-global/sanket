'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      // If no history, go to home page
      router.push('/');
    }
  };

  return (
    <Button onClick={handleBack} className="flex-1">
      Go Back
    </Button>
  );
}

