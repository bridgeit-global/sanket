'use client';

import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  Landmark,
  MapPin,
  Megaphone,
  Menu,
  Mic,
  Moon,
  Newspaper,
  Quote,
  Shield,
  Stethoscope,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

const LANDING_IMAGES = {
  hero: '/images/landing/hero-banner.png',
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

const LANDING_SECTION_SCROLL_MARGIN = 'scroll-mt-[4.75rem] md:scroll-mt-[5.25rem]';

function getLandingHeaderOffset() {
  const header = document.querySelector<HTMLElement>('[data-landing-header]');
  return (header?.getBoundingClientRect().height ?? 64) + 8;
}

function scrollToLandingSection(sectionId: string, updateHash = true) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - getLandingHeaderOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

  if (updateHash) {
    window.history.replaceState(null, '', `#${sectionId}`);
  }
}

function LandingSectionLink({
  sectionId,
  className,
  children,
  onNavigate,
}: {
  sectionId: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (onNavigate) {
      onNavigate();
      requestAnimationFrame(() => scrollToLandingSection(sectionId));
      return;
    }
    scrollToLandingSection(sectionId);
  };

  return (
    <a href={`#${sectionId}`} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

function LandingGridOverlay() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
      aria-hidden
    >
      <defs>
        <linearGradient id="landing-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 40, 60, 80].map((y) => (
        <line
          key={`h-${y}`}
          x1="0"
          y1={`${y}%`}
          x2="100%"
          y2={`${y}%`}
          stroke="url(#landing-line-grad)"
          strokeWidth="0.5"
        />
      ))}
      {[15, 35, 55, 75, 90].map((x) => (
        <line
          key={`v-${x}`}
          x1={`${x}%`}
          y1="0"
          x2={`${x}%`}
          y2="100%"
          stroke="url(#landing-line-grad)"
          strokeWidth="0.5"
        />
      ))}
      <circle cx="85%" cy="15%" r="120" fill="hsl(var(--primary) / 0.08)" />
      <circle cx="10%" cy="70%" r="80" fill="hsl(var(--primary) / 0.06)" />
    </svg>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  onDark = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  onDark?: boolean;
}) {
  return (
    <motion.header
      variants={fadeUp}
      className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}
    >
      {eyebrow ? (
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary" />
          {eyebrow}
          {align === 'center' && (
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary" />
          )}
        </p>
      ) : null}
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-tight">
        <span
          className={cn(
            'bg-clip-text text-transparent',
            onDark
              ? 'bg-gradient-to-br from-landing-contrast-foreground via-landing-contrast-foreground to-landing-contrast-foreground/70'
              : 'bg-gradient-to-br from-foreground via-foreground to-foreground/70',
          )}
        >
          {title}
        </span>
      </h2>
      {subtitle ? (
        <p
          className={cn(
            'mt-4 text-base leading-relaxed md:text-lg',
            onDark ? 'text-landing-contrast-foreground/70' : 'text-muted-foreground',
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </motion.header>
  );
}

function LandingDarkBand({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('landing-dark-band relative overflow-hidden', className)}>
      {children}
    </section>
  );
}

function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'landing-glow-border rounded-2xl bg-card/60 shadow-lg shadow-primary/5 backdrop-blur-md',
        'ring-1 ring-white/10 dark:ring-white/5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const { t } = useTranslations();
  const { locale, setLocale } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => setThemeMounted(true), []);

  const scrollToSectionFromHash = useCallback(() => {
    const sectionId = window.location.hash.replace('#', '');
    if (!sectionId || !document.getElementById(sectionId)) return;
    requestAnimationFrame(() => scrollToLandingSection(sectionId, false));
  }, []);

  useEffect(() => {
    scrollToSectionFromHash();
    window.addEventListener('hashchange', scrollToSectionFromHash);
    return () => window.removeEventListener('hashchange', scrollToSectionFromHash);
  }, [scrollToSectionFromHash]);

  const isDarkTheme = themeMounted ? resolvedTheme === 'dark' : true;

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
    <div className="min-h-dvh scroll-smooth overflow-x-hidden bg-background text-foreground">
      {/* Header */}
      <header
        data-landing-header
        className="fixed inset-x-0 top-0 z-50 border-b border-primary/10 bg-background/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55"
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 md:h-[4.5rem]">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <Image
              src={LANDING_IMAGES.logo}
              alt=""
              width={140}
              height={140}
              className="relative object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Sections">
            {NAV_SECTIONS.map((section) => (
              <LandingSectionLink
                key={section.id}
                sectionId={section.id}
                className="relative rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="relative z-10">{t(section.labelKey)}</span>
                <span className="absolute inset-0 scale-90 rounded-lg bg-primary/0 opacity-0 transition-all hover:scale-100 hover:bg-primary/10 hover:opacity-100" />
              </LandingSectionLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-full border border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/5 lg:hidden"
                  aria-label={t('landing.nav.menu')}
                >
                  <Menu className="size-4 text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100%,20rem)] pt-12">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('landing.nav.menu')}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1" aria-label="Sections">
                  {NAV_SECTIONS.map((section) => (
                    <LandingSectionLink
                      key={section.id}
                      sectionId={section.id}
                      onNavigate={() => setMobileNavOpen(false)}
                      className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                    >
                      {t(section.labelKey)}
                    </LandingSectionLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full border border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/5"
              onClick={() => setTheme(isDarkTheme ? 'light' : 'dark')}
              aria-label={t('userNav.toggleTheme', {
                theme: isDarkTheme ? t('userNav.light') : t('userNav.dark'),
              })}
            >
              {isDarkTheme ? (
                <Sun className="size-4 text-primary" />
              ) : (
                <Moon className="size-4 text-primary" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full border border-transparent text-muted-foreground hover:border-primary/20 hover:bg-primary/5"
              onClick={() => setLocale(locale === 'en' ? 'mr' : 'en')}
              aria-label={t('userNav.language')}
            >
              <Globe className="size-4 text-primary" />
              <span className="hidden text-xs font-semibold sm:inline">
                {locale === 'en' ? 'मराठी' : 'EN'}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-16 md:pt-[4.5rem]">
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-primary">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src={LANDING_IMAGES.hero}
              alt={t('landing.title')}
              width={1024}
              height={365}
              priority
              className="h-auto w-full"
              sizes="100vw"
            />
          </motion.div>

          <div className="border-t border-chart-3/40 bg-background">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-center"
            >
              <motion.div variants={fadeUp}>
                <Button
                  size="lg"
                  asChild
                  className="group h-12 rounded-full bg-primary px-8 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
                >
                  <LandingSectionLink sectionId="about">
                    {locale === 'en' ? 'Explore profile' : 'प्रोफाइल पहा'}
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                  </LandingSectionLink>
                </Button>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Button size="lg" variant="outline" asChild className="h-12 rounded-full px-8">
                  <LandingSectionLink sectionId="journey">
                    {locale === 'en' ? 'Political journey' : 'राजकीय प्रवास'}
                  </LandingSectionLink>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="relative z-10 px-4 pb-4 pt-2 md:pb-6">
          <div className="container mx-auto">
            <GlassCard className="grid grid-cols-2 divide-y divide-primary/10 md:grid-cols-4 md:divide-x md:divide-y-0">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex flex-col items-center gap-2 p-6 text-center md:items-start md:p-8 md:text-left"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                    <stat.icon className="size-5" aria-hidden />
                  </div>
                  <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
                    {stat.value}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:text-sm">
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </GlassCard>
          </div>
        </section>

        {/* About */}
        <section
          id="about"
          className={cn(LANDING_SECTION_SCROLL_MARGIN, 'container mx-auto px-4 py-20 md:py-28')}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
          >
            <motion.div variants={fadeUp} className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
              <div className="landing-glow-border relative aspect-[689/816] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl lg:max-w-none">
                <Image
                  src={LANDING_IMAGES.about}
                  alt={t('landing.title')}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-transparent" />
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <SectionHeader
                align="left"
                eyebrow={locale === 'en' ? 'Profile' : 'प्रोफाइल'}
                title={t('landing.about.sectionTitle')}
                subtitle={t('landing.about.sectionSubtitle')}
              />
              <div className="mt-8 space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                <p>{t('landing.about.bio')}</p>
                <p>{t('landing.about.bioContinued')}</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.blockquote
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="landing-glow-border relative mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card/80 to-card/80 p-10 text-center backdrop-blur-sm"
          >
            <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <Quote className="relative mx-auto mb-4 size-10 text-primary" aria-hidden />
            <p className="relative text-lg font-medium leading-relaxed italic md:text-xl">
              {t('landing.quote')}
            </p>
          </motion.blockquote>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {aboutHighlights.map((item) => (
              <motion.article
                key={item.title}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-2xl transition-transform group-hover:scale-150" />
                <div className="relative mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 text-primary ring-1 ring-primary/25">
                  <item.icon className="size-5" aria-hidden />
                </div>
                <h3 className="relative font-semibold">{item.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* Vision */}
        <section
          id="vision"
          className={cn(
            LANDING_SECTION_SCROLL_MARGIN,
            'relative overflow-hidden bg-muted/40 py-20 md:py-28',
          )}
        >
          <div className="landing-mesh absolute inset-0 opacity-50" aria-hidden />
          <div className="container relative mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <SectionHeader
                eyebrow={locale === 'en' ? 'Vision' : 'दृष्टी'}
                title={t('landing.vision.sectionTitle')}
                subtitle={t('landing.vision.sectionSubtitle')}
              />

              <motion.div
                variants={stagger}
                className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visionAreas.map((area, index) => (
                  <motion.article
                    key={area.title}
                    variants={fadeUp}
                    className="group relative overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10"
                  >
                    <span
                      className="absolute -right-2 -top-4 text-7xl font-black text-primary/[0.06]"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="relative mb-4 inline-flex rounded-xl bg-primary/15 p-2.5 text-primary ring-1 ring-primary/20">
                      <area.icon className="size-5" aria-hidden />
                    </div>
                    <h3 className="relative font-semibold">{area.title}</h3>
                    <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                      {area.description}
                    </p>
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-primary to-chart-2 transition-all duration-500 group-hover:w-full" />
                  </motion.article>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Journey */}
        <section
          id="journey"
          className={cn(LANDING_SECTION_SCROLL_MARGIN, 'container mx-auto px-4 py-20 md:py-28')}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <SectionHeader
              eyebrow={locale === 'en' ? 'Timeline' : 'कालरेखा'}
              title={t('landing.journey.sectionTitle')}
              subtitle={t('landing.journey.sectionSubtitle')}
            />

            <motion.div variants={fadeUp} className="mx-auto mt-12 max-w-5xl">
              <GlassCard className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-primary/10 bg-muted/30 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                    <span className="font-mono text-sm font-bold text-primary">
                      {activeJourney.year}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {journeyIndex + 1} / {JOURNEY_ITEMS.length}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full border border-border hover:border-primary/30 hover:bg-primary/10"
                      onClick={() => shiftJourney(-1)}
                      aria-label={t('landing.journey.prev')}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full border border-border hover:border-primary/30 hover:bg-primary/10"
                      onClick={() => shiftJourney(1)}
                      aria-label={t('landing.journey.next')}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2">
                  <div className="relative min-h-[240px] lg:min-h-[320px]">
                    <motion.div
                      key={activeJourney.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={activeJourney.image}
                        alt={t(`landing.journey.items.${activeJourney.key}.title`)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/80 lg:to-card" />
                    </motion.div>
                  </div>
                  <div className="flex flex-col justify-center border-t border-primary/10 p-6 md:p-10 lg:border-l lg:border-t-0">
                    <span className="mb-3 inline-flex w-fit rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25">
                      {activeJourney.year}
                    </span>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {t(`landing.journey.items.${activeJourney.key}.title`)}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {t(`landing.journey.items.${activeJourney.key}.description`)}
                    </p>
                  </div>
                </div>

                <div
                  className="flex gap-2 overflow-x-auto border-t border-primary/10 bg-muted/20 px-4 py-4"
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
                        'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                        index === journeyIndex
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                          : 'bg-background/80 text-muted-foreground ring-1 ring-border hover:ring-primary/30',
                      )}
                    >
                      {item.year}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        </section>

        {/* Speeches */}
        <LandingDarkBand
          id="speeches"
          className={cn(LANDING_SECTION_SCROLL_MARGIN, 'py-20 md:py-28')}
        >
          <div className="container relative mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <SectionHeader
                onDark
                eyebrow={locale === 'en' ? 'Assembly floor' : 'विधानसभा'}
                title={t('landing.speeches.sectionTitle')}
                subtitle={t('landing.speeches.sectionSubtitle')}
              />
              <motion.div
                variants={stagger}
                className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {SPEECH_KEYS.map((key, i) => (
                  <motion.article
                    key={key}
                    variants={fadeUp}
                    className="group flex gap-4 rounded-2xl border border-landing-contrast-foreground/10 bg-landing-contrast-foreground/5 p-5 backdrop-blur-md transition-all hover:border-primary/40 hover:bg-landing-contrast-foreground/10"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30">
                      <Mic className="size-5" aria-hidden />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="mt-1 font-semibold leading-snug text-landing-contrast-foreground">
                        {t(`landing.speeches.items.${key}.title`)}
                      </h3>
                      <p className="mt-2 text-xs text-landing-contrast-foreground/50">
                        {t(`landing.speeches.items.${key}.date`)}
                      </p>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </LandingDarkBand>

        {/* Services */}
        <section
          id="services"
          className={cn(LANDING_SECTION_SCROLL_MARGIN, 'container mx-auto px-4 py-20 md:py-28')}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <SectionHeader
              eyebrow={locale === 'en' ? 'For constituents' : 'मतदारांसाठी'}
              title={t('landing.features.sectionTitle')}
              subtitle={t('landing.features.sectionSubtitle')}
            />

            <motion.div variants={stagger} className="mt-14 grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  variants={fadeUp}
                  className="group relative overflow-hidden rounded-2xl border bg-card/60 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-2xl hover:shadow-primary/10"
                >
                  <span
                    className="absolute right-4 top-4 font-mono text-5xl font-black text-primary/10"
                    aria-hidden
                  >
                    0{index + 1}
                  </span>
                  <div className="mb-5 inline-flex rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 p-3.5 text-primary ring-1 ring-primary/25">
                    <feature.icon className="size-6" aria-hidden />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  <div className="mt-6 h-px w-full bg-gradient-to-r from-primary/50 via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.article>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Gallery */}
        <section className="relative overflow-hidden bg-muted/30 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <SectionHeader
                  align="left"
                  eyebrow={locale === 'en' ? 'In the field' : 'क्षेत्रात'}
                  title={t('landing.gallery.title')}
                  subtitle={t('landing.gallery.subtitle')}
                />
              </div>

              <motion.div
                variants={stagger}
                className="grid auto-rows-[200px] grid-cols-1 gap-4 md:auto-rows-[220px] md:grid-cols-3"
              >
                {galleryItems.map((item) => (
                  <motion.div
                    key={item.alt}
                    variants={fadeUp}
                    className={cn(
                      'landing-glow-border group relative overflow-hidden rounded-2xl shadow-xl',
                      item.className,
                    )}
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-landing-contrast/90 via-landing-contrast/30 to-transparent" />
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
                    </div>
                    <p className="absolute bottom-5 left-5 text-sm font-bold uppercase tracking-wide text-landing-contrast-foreground">
                      {item.label}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* News */}
        <section
          id="news"
          className={cn(LANDING_SECTION_SCROLL_MARGIN, 'container mx-auto px-4 py-20 md:py-28')}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <SectionHeader
              eyebrow={locale === 'en' ? 'Press' : 'प्रेस'}
              title={t('landing.news.sectionTitle')}
              subtitle={t('landing.news.sectionSubtitle')}
            />

            <motion.div variants={stagger} className="mt-14 grid gap-6 md:grid-cols-3">
              {NEWS_KEYS.map((key) => (
                <motion.article
                  key={key}
                  variants={fadeUp}
                  className="group relative overflow-hidden rounded-2xl border bg-card/60 p-6 backdrop-blur-sm transition-all hover:border-primary/35 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Newspaper className="size-5" aria-hidden />
                  </div>
                  <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary">
                    {t(`landing.news.items.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t(`landing.news.items.${key}.source`)}
                  </p>
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                </motion.article>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* CTA */}
        <LandingDarkBand>
          <LandingGridOverlay />
          <div className="container relative mx-auto px-4 py-20 text-center md:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Landmark className="mx-auto mb-6 size-12 text-primary-foreground/90" />
              <h2 className="text-3xl font-bold tracking-tight text-landing-contrast-foreground md:text-5xl">
                {t('landing.cta.title')}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-landing-contrast-foreground/80 md:text-lg">
                {t('landing.cta.description')}
              </p>
              <Button
                size="lg"
                asChild
                className="mt-10 h-12 rounded-full bg-landing-contrast-foreground px-8 font-semibold text-landing-contrast hover:bg-landing-contrast-foreground/90"
              >
                <LandingSectionLink sectionId="about">
                  {locale === 'en' ? 'Get started' : 'सुरू करा'}
                  <ArrowRight className="ml-2 size-4" />
                </LandingSectionLink>
              </Button>
            </motion.div>
          </div>
        </LandingDarkBand>
      </main>

      <footer className="border-t border-primary/10 bg-muted/20 py-10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} {t('landing.title')} — {t('landing.footer')}
          </p>
          <p className="text-xs uppercase tracking-widest text-primary/70">
            Member of Legislative Assembly
          </p>
        </div>
      </footer>
    </div>
  );
}
