'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Brain,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  GraduationCap,
  Heart,
  MapPin,
  Megaphone,
  Mic,
  Newspaper,
  Quote,
  Shield,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

const LANDING_IMAGES = {
  hero: '/images/landing/hero.jpg',
  about: '/images/landing/about.webp',
  logo: '/images/landing/logo.png',
  community: '/images/landing/community.jpg',
  office: '/images/landing/office.jpg',
  handshake: '/images/landing/handshake.jpg',
} as const;

const JOURNEY_ITEMS = [
  { year: '2005', key: 'y2005', image: '/images/landing/timeline/1.webp' },
  { year: '2006', key: 'y2006', image: '/images/landing/timeline/2.webp' },
  { year: '2009', key: 'y2009', image: '/images/landing/timeline/3.webp' },
  { year: '2012', key: 'y2012', image: '/images/landing/timeline/4.webp' },
  { year: '2014', key: 'y2014', image: '/images/landing/timeline/5.webp' },
  { year: '2017', key: 'y2017a', image: '/images/landing/timeline/6.webp' },
  { year: '2017', key: 'y2017b', image: '/images/landing/timeline/7.webp' },
  { year: '2019', key: 'y2019a', image: '/images/landing/timeline/8.webp' },
  { year: '2019', key: 'y2019b', image: '/images/landing/timeline/9.webp' },
  { year: '2024', key: 'y2024a', image: '/images/landing/timeline/10.webp' },
  { year: '2024', key: 'y2024b', image: '/images/landing/timeline/11.webp' },
  { year: '2025', key: 'y2025', image: '/images/landing/timeline/10.webp' },
] as const;

const SPEECH_KEYS = ['rmc', 'hospitals', 'nameFormat', 'noise', 'urdu'] as const;
const NEWS_KEYS = ['decibel', 'ajitPawar', 'spokesperson'] as const;

const NAV_SECTIONS = [
  { id: 'about', labelKey: 'landing.nav.about' },
  { id: 'vision', labelKey: 'landing.nav.vision' },
  { id: 'journey', labelKey: 'landing.nav.journey' },
  { id: 'speeches', labelKey: 'landing.nav.speeches' },
  { id: 'news', labelKey: 'landing.nav.news' },
  { id: 'services', labelKey: 'landing.nav.services' },
] as const;

export function LandingPage() {
  const { t } = useTranslations();
  const { locale, setLocale } = useLanguage();
  const [journeyIndex, setJourneyIndex] = useState(0);

  const activeJourney = JOURNEY_ITEMS[journeyIndex];

  const visionAreas = [
    {
      icon: Heart,
      title: t('landing.vision.socialReform.title'),
      description: t('landing.vision.socialReform.description'),
    },
    {
      icon: GraduationCap,
      title: t('landing.vision.education.title'),
      description: t('landing.vision.education.description'),
    },
    {
      icon: TrendingUp,
      title: t('landing.vision.economy.title'),
      description: t('landing.vision.economy.description'),
    },
    {
      icon: Megaphone,
      title: t('landing.vision.awareness.title'),
      description: t('landing.vision.awareness.description'),
    },
    {
      icon: Brain,
      title: t('landing.vision.wellbeing.title'),
      description: t('landing.vision.wellbeing.description'),
    },
    {
      icon: Stethoscope,
      title: t('landing.vision.health.title'),
      description: t('landing.vision.health.description'),
    },
  ];

  const aboutHighlights = [
    {
      icon: Award,
      title: t('landing.about.highlights.mla.title'),
      description: t('landing.about.highlights.mla.description'),
    },
    {
      icon: Megaphone,
      title: t('landing.about.highlights.spokesperson.title'),
      description: t('landing.about.highlights.spokesperson.description'),
    },
    {
      icon: Users,
      title: t('landing.about.highlights.committees.title'),
      description: t('landing.about.highlights.committees.description'),
    },
    {
      icon: Shield,
      title: t('landing.about.highlights.legacy.title'),
      description: t('landing.about.highlights.legacy.description'),
    },
  ];

  const features = [
    {
      icon: Users,
      title: t('landing.features.beneficiary.title'),
      description: t('landing.features.beneficiary.description'),
    },
    {
      icon: CalendarDays,
      title: t('landing.features.programme.title'),
      description: t('landing.features.programme.description'),
    },
    {
      icon: Briefcase,
      title: t('landing.features.operations.title'),
      description: t('landing.features.operations.description'),
    },
  ];

  const stats = [
    {
      icon: Award,
      value: t('landing.stats.mla.value'),
      label: t('landing.stats.mla.label'),
    },
    {
      icon: MapPin,
      value: t('landing.stats.constituency.value'),
      label: t('landing.stats.constituency.label'),
    },
    {
      icon: Users,
      value: t('landing.stats.votes.value'),
      label: t('landing.stats.votes.label'),
    },
    {
      icon: Shield,
      value: t('landing.stats.committees.value'),
      label: t('landing.stats.committees.label'),
    },
  ];

  const galleryItems = [
    {
      src: LANDING_IMAGES.community,
      alt: t('landing.gallery.community'),
      label: t('landing.gallery.community'),
      className: 'md:col-span-2 md:row-span-2',
    },
    {
      src: LANDING_IMAGES.office,
      alt: t('landing.gallery.office'),
      label: t('landing.gallery.office'),
      className: '',
    },
    {
      src: LANDING_IMAGES.handshake,
      alt: t('landing.gallery.partnership'),
      label: t('landing.gallery.partnership'),
      className: '',
    },
  ];

  const shiftJourney = (direction: -1 | 1) => {
    setJourneyIndex((current) => {
      const next = current + direction;
      if (next < 0) return JOURNEY_ITEMS.length - 1;
      if (next >= JOURNEY_ITEMS.length) return 0;
      return next;
    });
  };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 md:h-[4.5rem]">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Image
                src={LANDING_IMAGES.logo}
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:inline">
              {t('landing.title')}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
            {NAV_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t(section.labelKey)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setLocale(locale === 'en' ? 'mr' : 'en')}
              aria-label={t('userNav.language')}
            >
              <Globe className="size-4" />
              <span className="hidden text-xs font-medium sm:inline">
                {locale === 'en' ? 'मराठी' : 'EN'}
              </span>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/login">{t('landing.signIn')}</Link>
            </Button>
            <Button size="sm" asChild className="shadow-md shadow-primary/20">
              <Link href="/login">{t('landing.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-16 md:pt-[4.5rem]">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="absolute -left-1/4 top-0 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -right-1/4 top-1/3 h-[28rem] w-[28rem] rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="container mx-auto grid items-center gap-10 px-4 py-14 md:grid-cols-2 md:gap-12 md:py-20 lg:py-24">
            <div className="order-2 md:order-1">
              <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                {t('landing.hero.badge')}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
                <span className="block">{t('landing.title')}</span>
                <span className="mt-1 block bg-gradient-to-r from-primary via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  {t('landing.tagline')}
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {t('landing.hero.subtitle')}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground/90">
                {t('landing.hero.roles')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" asChild className="h-12 gap-2 px-8 shadow-lg shadow-primary/25">
                  <Link href="/login">
                    {t('landing.getStarted')}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 border-primary/20 bg-background/80 backdrop-blur-sm"
                >
                  <a href="#about">{locale === 'en' ? 'Learn more' : 'अधिक जाणून घ्या'}</a>
                </Button>
              </div>
            </div>

            <div className="relative order-1 md:order-2">
              <div className="relative mx-auto aspect-[4/5] max-w-md md:max-w-none">
                <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-primary/30 via-transparent to-emerald-500/20 blur-2xl" />
                <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-white/20 shadow-2xl shadow-primary/10 ring-1 ring-black/5">
                  <Image
                    src={LANDING_IMAGES.hero}
                    alt={t('landing.title')}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white drop-shadow-md">
                    {t('landing.description')}
                  </p>
                </div>

                <div className="absolute -bottom-4 -left-2 w-[42%] overflow-hidden rounded-xl border-2 border-background shadow-xl md:-left-6">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={LANDING_IMAGES.community}
                      alt={t('landing.gallery.community')}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                </div>

                <div className="absolute -right-2 top-8 w-[38%] overflow-hidden rounded-xl border-2 border-background shadow-xl md:-right-6">
                  <div className="relative aspect-square">
                    <Image
                      src={LANDING_IMAGES.handshake}
                      alt={t('landing.gallery.partnership')}
                      fill
                      className="object-cover"
                      sizes="180px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-muted/40">
          <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:py-12">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center md:items-start md:text-left"
              >
                <stat.icon className="mb-2 size-5 text-primary" aria-hidden />
                <span className="text-2xl font-bold tracking-tight md:text-3xl">{stat.value}</span>
                <span className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-24 container mx-auto px-4 py-16 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="relative mx-auto aspect-[689/816] w-full max-w-md overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 lg:max-w-none">
              <Image
                src={LANDING_IMAGES.about}
                alt={t('landing.title')}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 45vw"
              />
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t('landing.about.sectionTitle')}
              </h2>
              <p className="mt-3 text-muted-foreground md:text-lg">
                {t('landing.about.sectionSubtitle')}
              </p>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                <p>{t('landing.about.bio')}</p>
                <p>{t('landing.about.bioContinued')}</p>
              </div>
            </div>
          </div>

          <blockquote className="mx-auto mt-12 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
            <Quote className="mx-auto mb-4 size-8 text-primary/60" aria-hidden />
            <p className="text-lg font-medium leading-relaxed italic text-foreground md:text-xl">
              {t('landing.quote')}
            </p>
          </blockquote>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {aboutHighlights.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/30"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary ring-1 ring-primary/20">
                  <item.icon className="size-5" aria-hidden />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section id="vision" className="scroll-mt-24 bg-muted/30 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t('landing.vision.sectionTitle')}
              </h2>
              <p className="mt-3 text-muted-foreground md:text-lg">
                {t('landing.vision.sectionSubtitle')}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                {t('landing.vision.intro')}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visionAreas.map((area) => (
                <article
                  key={area.title}
                  className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary ring-1 ring-primary/20">
                    <area.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="font-semibold">{area.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {area.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Political journey */}
        <section id="journey" className="scroll-mt-24 container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t('landing.journey.sectionTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground md:text-lg">
              {t('landing.journey.sectionSubtitle')}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold text-muted-foreground">
                {activeJourney.year}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => shiftJourney(-1)}
                  aria-label={t('landing.journey.prev')}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => shiftJourney(1)}
                  aria-label={t('landing.journey.next')}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2">
              <div className="relative aspect-[16/11] md:aspect-auto md:min-h-[280px]">
                <Image
                  src={activeJourney.image}
                  alt={t(`landing.journey.items.${activeJourney.key}.title`)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="flex flex-col justify-center p-6 md:p-8">
                <span className="mb-2 inline-flex w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {activeJourney.year}
                </span>
                <h3 className="text-xl font-semibold">
                  {t(`landing.journey.items.${activeJourney.key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {t(`landing.journey.items.${activeJourney.key}.description`)}
                </p>
              </div>
            </div>

            <div
              className="flex gap-2 overflow-x-auto border-t px-4 py-3"
              role="tablist"
              aria-label={t('landing.journey.sectionTitle')}
            >
              {JOURNEY_ITEMS.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={index === journeyIndex}
                  onClick={() => setJourneyIndex(index)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    index === journeyIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {item.year}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Assembly speeches */}
        <section id="speeches" className="scroll-mt-24 bg-muted/30 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t('landing.speeches.sectionTitle')}
              </h2>
              <p className="mt-3 text-muted-foreground md:text-lg">
                {t('landing.speeches.sectionSubtitle')}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SPEECH_KEYS.map((key) => (
                <article
                  key={key}
                  className="flex gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mic className="size-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-snug">
                      {t(`landing.speeches.items.${key}.title`)}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`landing.speeches.items.${key}.date`)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Services for voters */}
        <section id="services" className="scroll-mt-24 container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t('landing.features.sectionTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground md:text-lg">
              {t('landing.features.sectionSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all duration-300',
                  'hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                )}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />
                <div className="relative">
                  <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                    <feature.icon className="size-6" aria-hidden />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {t('landing.gallery.title')}
                </h2>
                <p className="mt-3 text-muted-foreground md:text-lg">
                  {t('landing.gallery.subtitle')}
                </p>
              </div>
              <Button variant="outline" asChild className="shrink-0 gap-2 self-start md:self-auto">
                <Link href="/login">
                  {t('landing.getStarted')}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="grid auto-rows-[180px] grid-cols-1 gap-4 md:auto-rows-[200px] md:grid-cols-3">
              {galleryItems.map((item) => (
                <div
                  key={item.alt}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5',
                    item.className,
                  )}
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
                  <p className="absolute bottom-4 left-4 text-sm font-semibold text-white drop-shadow">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* News */}
        <section id="news" className="scroll-mt-24 container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t('landing.news.sectionTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground md:text-lg">
              {t('landing.news.sectionSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {NEWS_KEYS.map((key) => (
              <article
                key={key}
                className="rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/30"
              >
                <Newspaper className="mb-4 size-5 text-primary" aria-hidden />
                <h3 className="font-semibold leading-snug">
                  {t(`landing.news.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(`landing.news.items.${key}.source`)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-emerald-600 to-teal-700" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
            aria-hidden
          />
          <div className="container relative mx-auto px-4 py-16 text-center md:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              {t('landing.cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 md:text-lg">
              {t('landing.cta.description')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="h-12 gap-2 bg-white px-8 text-primary hover:bg-white/90"
              >
                <Link href="/login">
                  {t('landing.cta.button')}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} {t('landing.title')} — {t('landing.footer')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="transition-colors hover:text-primary">
              {t('landing.signIn')}
            </Link>
            <Link href="/register" className="transition-colors hover:text-primary">
              {t('landing.createAccount')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
