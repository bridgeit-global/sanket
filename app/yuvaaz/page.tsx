import type { Metadata } from 'next';

import {
  JobFairFooter,
  JobFairHero,
} from '@/components/job-fair/job-fair-hero';
import { JobFairRegistrationForm } from '@/components/job-fair/registration-form';
import { JOB_FAIR_EVENT } from '@/lib/job-fair/options';

import './yuvaaz.css';

const description = `${JOB_FAIR_EVENT.taglineTop} ${JOB_FAIR_EVENT.taglineBottom} Free registration for the ${JOB_FAIR_EVENT.subtitle} on ${JOB_FAIR_EVENT.dateLabel}, ${JOB_FAIR_EVENT.timeLabel} at ${JOB_FAIR_EVENT.venueShort}. An initiative by ${JOB_FAIR_EVENT.initiativeBy}, ${JOB_FAIR_EVENT.initiativeRole}.`;

export const metadata: Metadata = {
  title: `${JOB_FAIR_EVENT.title} – Register | ${JOB_FAIR_EVENT.subtitle}`,
  description,
  openGraph: {
    title: `${JOB_FAIR_EVENT.title} – ${JOB_FAIR_EVENT.subtitle}`,
    description,
    type: 'website',
    url: '/yuvaaz',
    images: ['/images/landing/logo.png'],
  },
};

export default function YuvaazRegistrationPage() {
  return (
    <div className="yuvaaz-page min-h-dvh overflow-x-hidden bg-[hsl(330_45%_97%)] text-foreground">
      <JobFairHero />
      <main className="relative z-10 mx-auto -mt-10 w-full min-w-0 max-w-2xl px-4 md:-mt-14 lg:max-w-3xl">
        <JobFairRegistrationForm />
      </main>
      <JobFairFooter />
    </div>
  );
}
