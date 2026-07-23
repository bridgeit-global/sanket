'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { ContactWithCall } from './contact-with-call';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import type { HierarchyCanvasData } from '@/lib/hierarchy/canvas-data';
import { extractWardNumber } from '@/lib/hierarchy/member-list';
import type { CadreConfig } from '@/lib/hierarchy/types';
import type { CadreMaxGeoLevel } from '@/lib/hierarchy/wing-depth';
import { buildRoleSlots, type RoleSlot } from '@/lib/hierarchy/role-slots';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

type CanvasFocus =
  | { level: 'taluka' }
  | { level: 'ward'; wardGeoId: string }
  | { level: 'booth'; wardGeoId: string; boothNo: string };

export type CanvasCommitteeRoles = {
  taluka: string[];
  ward: string[];
  booth: string[];
};

type ChartTone = 'basic' | 'wing';

type TonePalette = {
  root: string;
  leader: string;
  leaderBorder: string;
  committee: string;
  committeeHeader: string;
  strip: string;
  stripHeader: string;
  connector: string;
  accentText: string;
};

const TONES: Record<ChartTone, TonePalette> = {
  basic: {
    root: 'bg-slate-800 text-white border-slate-800',
    leader: 'bg-amber-50 dark:bg-amber-950/40',
    leaderBorder: 'border-amber-500/70',
    committee: 'bg-amber-50/80 dark:bg-amber-950/30',
    committeeHeader: 'bg-amber-600 text-white',
    strip: 'bg-sky-50/90 dark:bg-sky-950/30',
    stripHeader: 'bg-sky-700 text-white',
    connector: 'bg-slate-400 dark:bg-slate-500',
    accentText: 'text-amber-800 dark:text-amber-200',
  },
  wing: {
    root: 'bg-violet-900 text-white border-violet-900',
    leader: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    leaderBorder: 'border-fuchsia-500/70',
    committee: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/30',
    committeeHeader: 'bg-fuchsia-700 text-white',
    strip: 'bg-violet-50/90 dark:bg-violet-950/30',
    stripHeader: 'bg-violet-800 text-white',
    connector: 'bg-violet-400 dark:bg-violet-500',
    accentText: 'text-fuchsia-800 dark:text-fuchsia-200',
  },
};

const WARD_TONE = {
  leader: 'bg-emerald-50 dark:bg-emerald-950/40',
  leaderBorder: 'border-emerald-500/70',
  committee: 'bg-emerald-50/80 dark:bg-emerald-950/30',
  committeeHeader: 'bg-emerald-700 text-white',
  strip: 'bg-emerald-50/90 dark:bg-emerald-950/30',
  stripHeader: 'bg-emerald-800 text-white',
  connector: 'bg-emerald-400 dark:bg-emerald-600',
  accentText: 'text-emerald-800 dark:text-emerald-200',
};

const BOOTH_TONE = {
  leader: 'bg-yellow-50 dark:bg-yellow-950/40',
  leaderBorder: 'border-yellow-500/70',
  committee: 'bg-yellow-50/80 dark:bg-yellow-950/30',
  committeeHeader: 'bg-yellow-600 text-yellow-950',
  bla: 'bg-amber-100/90 dark:bg-amber-950/50',
  blaBorder: 'border-amber-500/60',
  connector: 'bg-yellow-500/70',
  accentText: 'text-yellow-900 dark:text-yellow-100',
};

function formatWardLabel(wardName: string): string {
  const wardNumber = extractWardNumber(wardName);
  return wardNumber !== Number.MAX_SAFE_INTEGER ? String(wardNumber) : wardName;
}

function formatBoothLabel(boothNo: string): string {
  const numeric = Number.parseInt(boothNo, 10);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : boothNo;
}

function VLine({ className, tone }: { className?: string; tone: string }) {
  return <div className={cn('h-5 w-px', tone, className)} aria-hidden />;
}

/** Vertical trunk on small screens; horizontal T-fork from lg up. */
function BranchConnector({ tone }: { tone: string }) {
  return (
    <>
      <div className="flex flex-col items-center lg:hidden" aria-hidden>
        <div className={cn('h-4 w-px', tone)} />
      </div>
      <div
        className="hidden w-full max-w-[720px] flex-col items-center lg:flex"
        aria-hidden
      >
        <div className={cn('h-4 w-px', tone)} />
        <div className={cn('h-px w-full max-w-[560px]', tone)} />
        <div className="flex w-full max-w-[560px] justify-between px-8">
          <div className={cn('h-4 w-px', tone)} />
          <div className={cn('h-4 w-px', tone)} />
        </div>
      </div>
    </>
  );
}

function WingRootBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-sm',
        className,
      )}
    >
      <UserRound className="size-4 shrink-0 opacity-90" aria-hidden />
      <span className="text-xs font-semibold tracking-[0.14em] uppercase">{label}</span>
    </div>
  );
}

function OrgLeaderCard({
  roleLabel,
  name,
  phone,
  className,
  borderClass,
  accentClass,
  onClick,
  isActive,
}: {
  roleLabel: string;
  name: string;
  phone: string | null;
  className: string;
  borderClass: string;
  accentClass: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'min-w-[200px] max-w-[260px] rounded-xl border-2 px-3 py-2.5 text-left shadow-sm',
        className,
        borderClass,
        onClick &&
        'cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isActive && 'ring-2 ring-offset-2 ring-primary/40',
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <UserRound className={cn('size-3.5 shrink-0', accentClass)} aria-hidden />
        <p className={cn('text-[10px] font-semibold tracking-[0.12em] uppercase', accentClass)}>
          {roleLabel}
        </p>
      </div>
      <p className="text-sm font-semibold leading-snug">{name}</p>
      <div className="mt-1.5">
        <ContactWithCall phone={phone} />
      </div>
    </Tag>
  );
}

function RoleStructurePanel({
  title,
  slots,
  panelClass,
  headerClass,
  compact,
}: {
  title: string;
  slots: RoleSlot[];
  panelClass: string;
  headerClass: string;
  /** Tighter layout for side-by-side / mobile. */
  compact?: boolean;
}) {
  const [openRoles, setOpenRoles] = useState<Set<string>>(
    () => new Set(slots.filter((slot) => slot.assignees.length > 0).map((slot) => slot.role)),
  );

  const toggleRole = (role: string) => {
    setOpenRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  return (
    <div
      className={cn(
        'w-full min-w-0 overflow-hidden rounded-xl border border-black/10 shadow-sm dark:border-white/10',
        compact ? 'max-w-none' : 'max-w-[420px]',
        panelClass,
      )}
    >
      <div className={cn('px-2.5 py-2 text-center sm:px-3', headerClass)}>
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">{title}</p>
      </div>
      {slots.length === 0 ? (
        <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">—</p>
      ) : (
        <ul
          className={cn(
            'divide-y divide-black/5 dark:divide-white/10',
            compact
              ? 'max-h-[280px] overflow-y-auto sm:max-h-[360px]'
              : 'max-h-[420px] overflow-y-auto',
          )}
        >
          {slots.map((slot) => {
            const isOpen = openRoles.has(slot.role);
            const count = slot.assignees.length;
            return (
              <li key={slot.role}>
                <button
                  type="button"
                  onClick={() => toggleRole(slot.role)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 sm:px-3"
                >
                  <ChevronDown
                    className={cn(
                      'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                      !isOpen && '-rotate-90',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug">
                    {slot.role}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {count > 0 ? count : '—'}
                  </span>
                </button>
                {isOpen ? (
                  <div className="px-2.5 pb-2 pl-7 sm:px-3 sm:pl-8">
                    {count === 0 ? (
                      <p className="text-[11px] italic text-muted-foreground">—</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {slot.assignees.map((person) => (
                          <li key={`${slot.role}-${person.id}`} className="min-w-0">
                            <p className="truncate text-[11px] font-medium leading-snug">
                              {person.name}
                            </p>
                            {person.phone ? (
                              <div className="mt-0.5">
                                <ContactWithCall phone={person.phone} />
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ChildStrip({
  title,
  headerClass,
  panelClass,
  children,
}: PropsWithChildren<{
  title: string;
  headerClass: string;
  panelClass: string;
}>) {
  return (
    <div
      className={cn(
        'w-full min-w-0 overflow-hidden rounded-xl border border-black/10 shadow-sm dark:border-white/10',
        panelClass,
      )}
    >
      <div className={cn('px-2.5 py-2 text-center sm:px-3', headerClass)}>
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">{title}</p>
      </div>
      <div className="flex max-h-[280px] flex-wrap justify-center gap-1.5 overflow-y-auto p-2 sm:max-h-[360px] sm:gap-2 sm:p-3">
        {children}
      </div>
    </div>
  );
}

/** Stacked on mobile; side-by-side from lg. */
function ParallelBranch({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[920px] flex-col items-stretch gap-6 px-2 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
      <div className="min-w-0 lg:flex-1">{left}</div>
      <div className="min-w-0 lg:flex-1">{right}</div>
    </div>
  );
}

function MiniWardCard({
  label,
  name,
  onClick,
  tone,
}: {
  label: string;
  name: string;
  onClick: () => void;
  tone: ChartTone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-[calc(50%-0.25rem)] min-w-[72px] max-w-[110px] rounded-lg border bg-white px-1.5 py-1.5 text-center shadow-sm transition-transform hover:-translate-y-0.5 sm:w-auto sm:min-w-[96px] sm:max-w-[120px] sm:px-2 sm:py-2 dark:bg-background',
        tone === 'basic' ? 'border-sky-300' : 'border-violet-300',
      )}
    >
      <p
        className={cn(
          'text-[8px] font-semibold tracking-[0.08em] uppercase sm:text-[9px] sm:tracking-[0.1em]',
          tone === 'basic' ? 'text-sky-700' : 'text-violet-700',
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug sm:mt-1 sm:text-[11px]">
        {name}
      </p>
    </button>
  );
}

function MiniBoothCard({
  label,
  name,
  onClick,
}: {
  label: string;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[calc(50%-0.25rem)] min-w-[72px] max-w-[110px] rounded-lg border border-yellow-400/80 bg-white px-1.5 py-1.5 text-center shadow-sm transition-transform hover:-translate-y-0.5 sm:w-auto sm:min-w-[96px] sm:max-w-[120px] sm:px-2 sm:py-2 dark:bg-background"
    >
      <p className="text-[8px] font-semibold tracking-[0.08em] text-yellow-800 uppercase sm:text-[9px] sm:tracking-[0.1em]">
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug sm:mt-1 sm:text-[11px]">
        {name}
      </p>
    </button>
  );
}

interface HierarchyCanvasViewProps {
  canvasData: HierarchyCanvasData;
  verticalName: string;
  maxGeoLevel: CadreMaxGeoLevel;
  wardOptions: CadreConfig['geoUnits'];
  committeeRoles: CanvasCommitteeRoles;
}

export function HierarchyCanvasView({
  canvasData,
  verticalName,
  maxGeoLevel,
  wardOptions,
  committeeRoles,
}: HierarchyCanvasViewProps) {
  const { t } = useTranslations();
  const includeBooths = maxGeoLevel === 'booth';
  const tone: ChartTone = includeBooths ? 'basic' : 'wing';
  const palette = TONES[tone];

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [focus, setFocus] = useState<CanvasFocus>({ level: 'taluka' });
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const wardLabelById = useMemo(
    () => new Map(wardOptions.map((ward) => [ward.id, formatWardLabel(ward.name)])),
    [wardOptions],
  );

  const wardEntries = useMemo(
    () =>
      canvasData.wards.map((ward) => ({
        ...ward,
        wardLabel: wardLabelById.get(ward.wardGeoId) ?? ward.wardGeoId,
      })),
    [canvasData.wards, wardLabelById],
  );

  const focusedWard = useMemo(() => {
    if (focus.level === 'taluka') return null;
    return wardEntries.find((ward) => ward.wardGeoId === focus.wardGeoId) ?? null;
  }, [focus, wardEntries]);

  const focusedBooth = useMemo(() => {
    if (focus.level !== 'booth' || !focusedWard) return null;
    return focusedWard.booths.find((booth) => booth.boothNo === focus.boothNo) ?? null;
  }, [focus, focusedWard]);

  const boothOptions = useMemo(() => {
    if (!focusedWard) return [];
    return [...focusedWard.booths].sort((a, b) => {
      const na = Number.parseInt(a.boothNo, 10);
      const nb = Number.parseInt(b.boothNo, 10);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.boothNo.localeCompare(b.boothNo);
    });
  }, [focusedWard]);

  const boothSelectDisabled = !includeBooths || focus.level === 'taluka' || boothOptions.length === 0;
  const activeWardGeoId = focus.level !== 'taluka' ? focus.wardGeoId : null;

  const resetView = useCallback(() => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  }, []);

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const containerRect = container.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const currentScale = zoomRef.current || 1;
    const naturalWidth = contentRect.width / currentScale;
    const naturalHeight = contentRect.height / currentScale;

    const scaleX = (containerRect.width - 32) / naturalWidth;
    const scaleY = (containerRect.height - 32) / naturalHeight;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, 1)));
    setZoom(nextZoom);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, [role="combobox"]')) return;
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan.x, pan.y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
    },
    [isPanning],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPanning(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const goToTaluka = useCallback(() => {
    setFocus({ level: 'taluka' });
  }, []);

  const goToWard = useCallback((wardGeoId: string) => {
    setFocus({ level: 'ward', wardGeoId });
  }, []);

  const goToBooth = useCallback((wardGeoId: string, boothNo: string) => {
    setFocus({ level: 'booth', wardGeoId, boothNo });
  }, []);

  const goBack = useCallback(() => {
    setFocus((current) => {
      if (current.level === 'booth') {
        return { level: 'ward', wardGeoId: current.wardGeoId };
      }
      return { level: 'taluka' };
    });
  }, []);

  useEffect(() => {
    setFocus({ level: 'taluka' });
  }, [verticalName, maxGeoLevel]);

  useEffect(() => {
    const timer = window.setTimeout(() => fitToView(), 100);
    return () => window.clearTimeout(timer);
  }, [fitToView, focus, wardEntries.length, verticalName, canvasData.talukaCommitteeTotal]);

  const breadcrumb = (
    <nav
      aria-label={t('hierarchyModule.canvasBreadcrumb')}
      className="flex flex-wrap items-center gap-1 text-xs"
    >
      <button
        type="button"
        onClick={goToTaluka}
        className={cn(
          'rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-muted',
          focus.level === 'taluka' ? 'text-foreground' : 'text-primary',
        )}
      >
        {t('hierarchyModule.canvasNavTaluka')}
      </button>
      {focus.level !== 'taluka' && focusedWard ? (
        <>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
          <button
            type="button"
            onClick={() => goToWard(focusedWard.wardGeoId)}
            className={cn(
              'rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-muted',
              focus.level === 'ward' ? 'text-foreground' : 'text-primary',
            )}
          >
            {t('hierarchyModule.canvasWard', { ward: focusedWard.wardLabel })}
          </button>
        </>
      ) : null}
      {focus.level === 'booth' && focusedBooth ? (
        <>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="px-1.5 py-0.5 font-medium text-foreground">
            {t('hierarchyModule.canvasBoothNav', {
              booth: formatBoothLabel(focusedBooth.boothNo),
            })}
          </span>
        </>
      ) : null}
    </nav>
  );

  const renderTalukaView = () => (
    <div className="flex flex-col items-center gap-0">
      <WingRootBadge label={verticalName} className={palette.root} />
      <VLine tone={palette.connector} />
      <OrgLeaderCard
        roleLabel={t('hierarchyModule.canvasTalukaAdhyaksh', { vertical: verticalName })}
        name={
          canvasData.talukaAdhyaksh
            ? getMemberDisplayName(canvasData.talukaAdhyaksh)
            : '—'
        }
        phone={
          canvasData.talukaAdhyaksh ? getMemberPhone(canvasData.talukaAdhyaksh) : null
        }
        className={palette.leader}
        borderClass={palette.leaderBorder}
        accentClass={palette.accentText}
      />

      <BranchConnector tone={palette.connector} />

      <ParallelBranch
        left={
          <RoleStructurePanel
            key={`taluka-committee-${verticalName}`}
            compact
            title={
              includeBooths
                ? t('hierarchyModule.canvasTalukaExecutiveCommittee', {
                  vertical: verticalName,
                })
                : t('hierarchyModule.canvasTalukaCommitteeNamed', {
                  vertical: verticalName,
                })
            }
            slots={buildRoleSlots(
              committeeRoles.taluka,
              canvasData.talukaCommitteeMembers,
              'taluka_committee',
            )}
            panelClass={palette.committee}
            headerClass={palette.committeeHeader}
          />
        }
        right={
          <ChildStrip
            title={
              includeBooths
                ? t('hierarchyModule.canvasWardPresidentsStrip', {
                  vertical: verticalName,
                })
                : t('hierarchyModule.canvasAllWardAdhyaksh', { vertical: verticalName })
            }
            headerClass={palette.stripHeader}
            panelClass={palette.strip}
          >
            {wardEntries.length === 0 ? (
              <p className="px-2 text-center text-xs text-muted-foreground">
                {t('hierarchyModule.noWardsMatch')}
              </p>
            ) : (
              wardEntries.map((entry) => (
                <MiniWardCard
                  key={entry.wardGeoId}
                  tone={tone}
                  label={t('hierarchyModule.canvasWard', { ward: entry.wardLabel })}
                  name={
                    entry.adhyaksh ? getMemberDisplayName(entry.adhyaksh) : '—'
                  }
                  onClick={() => goToWard(entry.wardGeoId)}
                />
              ))
            )}
          </ChildStrip>
        }
      />

      {!includeBooths ? (
        <p className="mt-4 max-w-md rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-center text-[11px] text-fuchsia-900 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
          {t('hierarchyModule.canvasWingDepthNote', { vertical: verticalName })}
        </p>
      ) : null}
    </div>
  );

  const renderWardView = () => {
    if (!focusedWard) return null;

    const wardLeaderTone = includeBooths
      ? {
        leader: WARD_TONE.leader,
        border: WARD_TONE.leaderBorder,
        accent: WARD_TONE.accentText,
        committee: WARD_TONE.committee,
        committeeHeader: WARD_TONE.committeeHeader,
        strip: WARD_TONE.strip,
        stripHeader: WARD_TONE.stripHeader,
        connector: WARD_TONE.connector,
      }
      : {
        leader: palette.leader,
        border: palette.leaderBorder,
        accent: palette.accentText,
        committee: palette.committee,
        committeeHeader: palette.committeeHeader,
        strip: palette.strip,
        stripHeader: palette.stripHeader,
        connector: palette.connector,
      };

    return (
      <div className="flex flex-col items-center gap-0">
        <OrgLeaderCard
          roleLabel={t('hierarchyModule.canvasWardAdhyakshNamed', {
            ward: focusedWard.wardLabel,
            vertical: verticalName,
          })}
          name={
            focusedWard.adhyaksh ? getMemberDisplayName(focusedWard.adhyaksh) : '—'
          }
          phone={focusedWard.adhyaksh ? getMemberPhone(focusedWard.adhyaksh) : null}
          className={wardLeaderTone.leader}
          borderClass={wardLeaderTone.border}
          accentClass={wardLeaderTone.accent}
        />

        {includeBooths && focusedWard.booths.length > 0 ? (
          <>
            <BranchConnector tone={wardLeaderTone.connector} />
            <ParallelBranch
              left={
                <RoleStructurePanel
                  key={`ward-exec-${focusedWard.wardGeoId}`}
                  compact
                  title={t('hierarchyModule.canvasWardExecutiveCommittee', {
                    ward: focusedWard.wardLabel,
                    vertical: verticalName,
                  })}
                  slots={buildRoleSlots(
                    committeeRoles.ward,
                    focusedWard.committeeMembers,
                    'ward_committee',
                  )}
                  panelClass={wardLeaderTone.committee}
                  headerClass={wardLeaderTone.committeeHeader}
                />
              }
              right={
                <ChildStrip
                  title={t('hierarchyModule.canvasBoothPresidentsStrip', {
                    ward: focusedWard.wardLabel,
                  })}
                  headerClass={wardLeaderTone.stripHeader}
                  panelClass={wardLeaderTone.strip}
                >
                  {focusedWard.booths.map((booth) => (
                    <MiniBoothCard
                      key={booth.boothNo}
                      label={t('hierarchyModule.canvasBoothNav', {
                        booth: formatBoothLabel(booth.boothNo),
                      })}
                      name={
                        booth.adhyaksh ? getMemberDisplayName(booth.adhyaksh) : '—'
                      }
                      onClick={() => goToBooth(focusedWard.wardGeoId, booth.boothNo)}
                    />
                  ))}
                </ChildStrip>
              }
            />
          </>
        ) : (
          <>
            <VLine tone={wardLeaderTone.connector} />
            <div className="w-full max-w-[420px] px-1">
              <RoleStructurePanel
                key={`ward-committee-${focusedWard.wardGeoId}`}
                title={t('hierarchyModule.canvasWardCommitteeNamed', {
                  ward: focusedWard.wardLabel,
                  vertical: verticalName,
                })}
                slots={buildRoleSlots(
                  committeeRoles.ward,
                  focusedWard.committeeMembers,
                  'ward_committee',
                )}
                panelClass={wardLeaderTone.committee}
                headerClass={wardLeaderTone.committeeHeader}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderBoothView = () => {
    if (!focusedWard || !focusedBooth) return null;

    return (
      <div className="flex flex-col items-center gap-0">
        <OrgLeaderCard
          roleLabel={t('hierarchyModule.canvasBoothAdhyaksh', {
            booth: formatBoothLabel(focusedBooth.boothNo),
          })}
          name={
            focusedBooth.adhyaksh
              ? getMemberDisplayName(focusedBooth.adhyaksh)
              : '—'
          }
          phone={
            focusedBooth.adhyaksh ? getMemberPhone(focusedBooth.adhyaksh) : null
          }
          className={BOOTH_TONE.leader}
          borderClass={BOOTH_TONE.leaderBorder}
          accentClass={BOOTH_TONE.accentText}
        />

        <BranchConnector tone={BOOTH_TONE.connector} />

        <ParallelBranch
          left={
            <div
              className={cn(
                'w-full rounded-xl border-2 px-3 py-2.5 shadow-sm',
                BOOTH_TONE.bla,
                BOOTH_TONE.blaBorder,
              )}
            >
              <p className="text-[10px] font-semibold tracking-[0.12em] text-amber-800 uppercase dark:text-amber-200">
                {t('hierarchyModule.canvasBlaLabel')}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {focusedBooth.bla
                  ? getMemberDisplayName(focusedBooth.bla)
                  : '—'}
              </p>
              <div className="mt-1.5">
                <ContactWithCall
                  phone={
                    focusedBooth.bla ? getMemberPhone(focusedBooth.bla) : null
                  }
                />
              </div>
            </div>
          }
          right={
            <RoleStructurePanel
              key={`booth-committee-${focusedWard.wardGeoId}-${focusedBooth.boothNo}`}
              compact
              title={t('hierarchyModule.canvasBoothCommitteeNamed', {
                booth: formatBoothLabel(focusedBooth.boothNo),
                vertical: verticalName,
              })}
              slots={buildRoleSlots(
                committeeRoles.booth,
                focusedBooth.committeeMembers,
                'booth_committee',
              )}
              panelClass={BOOTH_TONE.committee}
              headerClass={BOOTH_TONE.committeeHeader}
            />
          }
        />
      </div>
    );
  };

  const renderContent = () => {
    switch (focus.level) {
      case 'taluka':
        return renderTalukaView();
      case 'ward':
        return renderWardView();
      case 'booth':
        return includeBooths ? renderBoothView() : renderWardView();
      default:
        return renderTalukaView();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {t('hierarchyModule.canvasToolbar')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {focus.level !== 'taluka' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 rounded-lg px-2"
                onClick={goBack}
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">{t('hierarchyModule.canvasBack')}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg px-2"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              aria-label={t('hierarchyModule.canvasZoomIn')}
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg px-2"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              aria-label={t('hierarchyModule.canvasZoomOut')}
            >
              <Minus className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-lg px-2"
              onClick={fitToView}
            >
              <Maximize2 className="size-3.5" />
              <span className="hidden sm:inline">{t('hierarchyModule.canvasFit')}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 rounded-lg px-2"
              onClick={resetView}
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">{t('hierarchyModule.canvasReset')}</span>
            </Button>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {Math.round(zoom * 100)}% · {verticalName}
            {!includeBooths
              ? ` · ${t('hierarchyModule.canvasDepthWardOnly')}`
              : ` · ${t('hierarchyModule.canvasDepthToBooth')}`}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {breadcrumb}
          {wardEntries.length > 0 ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Select
                key={verticalName}
                value={focus.level === 'taluka' ? undefined : focus.wardGeoId}
                onValueChange={(wardGeoId) => goToWard(wardGeoId)}
              >
                <SelectTrigger className="h-8 w-full rounded-lg text-xs sm:w-[180px]">
                  <SelectValue placeholder={t('hierarchyModule.canvasJumpToWard')} />
                </SelectTrigger>
                <SelectContent>
                  {wardEntries.map((entry) => (
                    <SelectItem key={entry.wardGeoId} value={entry.wardGeoId}>
                      {t('hierarchyModule.canvasWard', { ward: entry.wardLabel })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {includeBooths ? (
                <Select
                  key={`${verticalName}-${activeWardGeoId ?? 'none'}`}
                  value={focus.level === 'booth' ? focus.boothNo : undefined}
                  onValueChange={(boothNo) => {
                    if (activeWardGeoId) goToBooth(activeWardGeoId, boothNo);
                  }}
                  disabled={boothSelectDisabled}
                >
                  <SelectTrigger className="h-8 w-full rounded-lg text-xs sm:w-[180px]">
                    <SelectValue
                      placeholder={
                        boothSelectDisabled && focus.level === 'taluka'
                          ? t('hierarchyModule.canvasSelectWardFirst')
                          : t('hierarchyModule.canvasJumpToBooth')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {boothOptions.map((booth) => (
                      <SelectItem key={booth.boothNo} value={booth.boothNo}>
                        {t('hierarchyModule.canvasBoothNav', {
                          booth: formatBoothLabel(booth.boothNo),
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'relative min-h-[min(70vh,720px)] overflow-hidden rounded-xl border border-border touch-none',
          'min-h-[min(65dvh,720px)]',
          tone === 'basic'
            ? 'bg-gradient-to-b from-amber-50/40 via-background to-sky-50/30 dark:from-amber-950/20 dark:to-sky-950/20'
            : 'bg-gradient-to-b from-fuchsia-50/50 via-background to-violet-50/40 dark:from-fuchsia-950/20 dark:to-violet-950/20',
          isPanning ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="absolute inset-0 flex items-start justify-center p-6"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center top',
          }}
        >
          <div ref={contentRef} className="flex flex-col items-center py-2">
            {renderContent()}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t('hierarchyModule.canvasPanHint')}
      </p>
    </div>
  );
}
