import Image from 'next/image';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

import { JOB_FAIR_EVENT } from '@/lib/job-fair/options';
import { cn } from '@/lib/utils';

export function JobFairEventChips({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 md:grid-cols-3',
        className,
      )}
    >
      <div className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-black/10">
        <CalendarDays className="size-5 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Date
          </div>
          <div className="font-semibold leading-snug">{JOB_FAIR_EVENT.dateLabel}</div>
        </div>
      </div>
      <div className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-black/10">
        <Clock className="size-5 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Time
          </div>
          <div className="break-words font-semibold leading-snug">{JOB_FAIR_EVENT.timeLabel}</div>
        </div>
      </div>
      <a
        href={JOB_FAIR_EVENT.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-black/10 transition-colors hover:bg-amber-50"
        title={JOB_FAIR_EVENT.venueFull}
      >
        <MapPin className="size-5 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Venue · Open map
          </div>
          <div className="break-words font-semibold leading-snug">{JOB_FAIR_EVENT.venueShort}</div>
        </div>
      </a>
    </div>
  );
}

export function JobFairHero() {
  return (
    <header className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-5 sm:pt-8 md:pb-24 md:pt-10">
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
            <div className="flex items-start flex-col">
              <div className="font-semibold text-base">{JOB_FAIR_EVENT.initiativeBy}</div>
              <div className="font-semibold text-base">{JOB_FAIR_EVENT.initiativeRole}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-10">
          <p className="inline-flex max-w-full rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary sm:tracking-widest">
            {JOB_FAIR_EVENT.subtitle}
          </p>
          <h1 className="mt-3 break-words text-4xl font-black tracking-tight sm:text-6xl md:text-7xl">
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
    <footer className="mx-auto max-w-2xl px-4 pb-10 pt-8 text-center text-sm text-muted-foreground lg:max-w-3xl">
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
        An initiative by
        <div className="flex flex-col">
          <div className="font-semibold">{JOB_FAIR_EVENT.initiativeBy}</div>
          <div className="font-semibold">{JOB_FAIR_EVENT.initiativeRole}</div>
        </div>
      </div>
    </footer>
  );
}
