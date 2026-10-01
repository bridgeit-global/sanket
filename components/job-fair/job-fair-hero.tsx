import Image from 'next/image';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

import { JOB_FAIR_EVENT } from '@/lib/job-fair/options';
import { cn } from '@/lib/utils';

export function JobFairEventChips({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-secondary-foreground ring-1 ring-border">
        <CalendarDays className="size-5 shrink-0 text-yellow-400" aria-hidden />
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Date
          </div>
          <div className="font-semibold">{JOB_FAIR_EVENT.dateLabel}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-secondary-foreground ring-1 ring-border">
        <Clock className="size-5 shrink-0 text-yellow-400" aria-hidden />
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Time
          </div>
          <div className="font-semibold">{JOB_FAIR_EVENT.timeLabel}</div>
        </div>
      </div>
      <a
        href={JOB_FAIR_EVENT.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-secondary-foreground ring-1 ring-border transition-colors hover:bg-secondary/80 sm:col-span-2 lg:col-span-1"
        title={JOB_FAIR_EVENT.venueFull}
      >
        <MapPin className="size-5 shrink-0 text-yellow-400" aria-hidden />
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Venue · Open map
          </div>
          <div className="truncate font-semibold">{JOB_FAIR_EVENT.venueShort}</div>
        </div>
      </a>
    </div>
  );
}

export function JobFairHero() {
  return (
    <header className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:pt-10 md:pb-24">
        <div className="flex items-center gap-3">
          <Image
            src="/images/ncp_election_symbol.png"
            alt="Nationalist Congress Party"
            width={130}
            height={123}
            className="size-14 shrink-0 rounded-xl bg-primary-foreground object-contain p-1.5 sm:size-16"
            priority
          />
          <div className="min-w-0 text-sm leading-tight">
            <div className="text-primary-foreground/75">An initiative by</div>
            <div className="truncate font-semibold">
              {JOB_FAIR_EVENT.initiativeBy}, {JOB_FAIR_EVENT.initiativeRole}
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-10">
          <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
            {JOB_FAIR_EVENT.subtitle}
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">
            YUVAAZ <span className="text-yellow-300">2026</span>
          </h1>
          <p className="mt-3 text-lg font-bold tracking-wide sm:text-xl md:text-2xl">
            {JOB_FAIR_EVENT.taglineTop}
            <br />
            <span className="text-yellow-300">{JOB_FAIR_EVENT.taglineBottom}</span>
          </p>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
            Register free in 2 minutes. Meet employers from banking, retail, IT,
            healthcare, logistics and more — all under one roof.
          </p>
        </div>

        <JobFairEventChips className="mt-6" />
      </div>
    </header>
  );
}

export function JobFairFooter() {
  return (
    <footer className="mx-auto max-w-2xl px-4 pb-10 pt-8 text-center text-sm text-muted-foreground">
      <div className="font-bold tracking-wide text-foreground">
        {JOB_FAIR_EVENT.title}
      </div>
      <div className="mt-1">
        {JOB_FAIR_EVENT.dateLabel} | {JOB_FAIR_EVENT.timeLabel}
      </div>
      <div className="mt-1 break-words">{JOB_FAIR_EVENT.venueFull}</div>
      <div className="mt-3 font-semibold text-foreground">
        {JOB_FAIR_EVENT.taglineTop} {JOB_FAIR_EVENT.taglineBottom}
      </div>
      <div className="mt-3">
        An initiative by {JOB_FAIR_EVENT.initiativeBy},{' '}
        {JOB_FAIR_EVENT.initiativeRole}
      </div>
    </footer>
  );
}
