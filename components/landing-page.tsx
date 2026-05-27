'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';

export function LandingPage() {
  const { t } = useTranslations();

  const features = [
    {
      title: t('landing.features.beneficiary.title'),
      description: t('landing.features.beneficiary.description'),
    },
    {
      title: t('landing.features.programme.title'),
      description: t('landing.features.programme.description'),
    },
    {
      title: t('landing.features.operations.title'),
      description: t('landing.features.operations.description'),
    },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-lg font-semibold">{t('sidebar.title')}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">{t('landing.signIn')}</Link>
            </Button>
            <Button asChild>
              <Link href="/login">{t('landing.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {t('landing.title')}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('landing.description')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login">{t('landing.getStarted')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">{t('landing.createAccount')}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="container mx-auto grid gap-6 px-4 py-12 md:grid-cols-3 md:py-16">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-background p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
