'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { ContactWithCall } from './contact-with-call';
import { CommitteeMembersDialog } from './committee-members-dialog';
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
import { CANVAS_COMMITTEE_PREVIEW_LIMIT } from '@/lib/hierarchy/canvas-data';
import {
  extractWardNumber,
} from '@/lib/hierarchy/member-list';
import type { CadreConfig, CadreMemberCard } from '@/lib/hierarchy/types';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

type CanvasFocus =
  | { level: 'taluka' }
  | { level: 'ward'; wardGeoId: string }
  | { level: 'booth'; wardGeoId: string; boothNo: string };

function formatWardLabel(wardName: string): string {
  const wardNumber = extractWardNumber(wardName);
  return wardNumber !== Number.MAX_SAFE_INTEGER ? String(wardNumber) : wardName;
}

function formatBoothLabel(boothNo: string): string {
  const numeric = Number.parseInt(boothNo, 10);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : boothNo;
}

function LeaderCard({
  name,
  phone,
  roleLabel,
  className,
  onClick,
  isActive,
}: {
  name: string;
  phone: string | null;
  roleLabel: string;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'min-w-[180px] max-w-[220px] rounded-xl border border-primary/20 bg-card px-3 py-2.5 text-left shadow-sm dark:border-primary/50',
          onClick &&
            'cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          isActive && 'border-primary bg-primary/10 ring-2 ring-primary/30',
        )}
      >
        <p className="text-[10px] font-semibold tracking-[0.12em] text-primary uppercase">
          {roleLabel}
        </p>
        <p className="mt-1 text-sm font-medium leading-snug">{name}</p>
        <div className="mt-1.5">
          <ContactWithCall phone={phone} />
        </div>
      </Tag>
    </div>
  );
}

function CommitteePanel({
  title,
  members,
  total,
  moreLabel,
  onViewAll,
}: {
  title: string;
  members: CadreMemberCard[];
  total: number;
  moreLabel: string;
  onViewAll?: () => void;
}) {
  if (total === 0) {
    return (
      <div className="min-w-[200px] max-w-[260px] rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {title}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  return (
    <div className="min-w-[200px] max-w-[260px] rounded-xl border border-border/70 bg-card/80 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {members.map((member) => (
          <li key={member.id} className="text-sm leading-snug">
            <span className="font-medium">{getMemberDisplayName(member)}</span>
            <div className="mt-0.5">
              <ContactWithCall phone={getMemberPhone(member)} />
            </div>
          </li>
        ))}
      </ul>
      {total > members.length ? (
        onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="mt-2 text-[11px] font-medium text-primary hover:underline"
          >
            {moreLabel}
          </button>
        ) : (
          <p className="mt-2 text-[11px] font-medium text-primary">{moreLabel}</p>
        )
      ) : null}
    </div>
  );
}

const DEFAULT_CONSTITUENCY_ID = '172';

interface HierarchyCanvasViewProps {
  canvasData: HierarchyCanvasData;
  verticalName: string;
  verticalId: string;
  wardOptions: CadreConfig['geoUnits'];
}

export function HierarchyCanvasView({
  canvasData,
  verticalName,
  verticalId,
  wardOptions,
}: HierarchyCanvasViewProps) {
  const { t } = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [focus, setFocus] = useState<CanvasFocus>({ level: 'taluka' });
  const [talukaCommitteeOpen, setTalukaCommitteeOpen] = useState(false);
  const [wardCommitteeOpen, setWardCommitteeOpen] = useState(false);
  const [boothCommitteeOpen, setBoothCommitteeOpen] = useState(false);
  const [fullWardCommitteeMembers, setFullWardCommitteeMembers] = useState<CadreMemberCard[]>([]);
  const [fullBoothCommitteeMembers, setFullBoothCommitteeMembers] = useState<CadreMemberCard[]>([]);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const wardLabelById = useMemo(
    () =>
      new Map(
        wardOptions.map((ward) => [ward.id, formatWardLabel(ward.name)]),
      ),
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

  const boothSelectDisabled = focus.level === 'taluka' || boothOptions.length === 0;
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

  const talukaCommitteePreview = useMemo(
    () => canvasData.talukaCommitteeMembers.slice(0, CANVAS_COMMITTEE_PREVIEW_LIMIT),
    [canvasData.talukaCommitteeMembers],
  );

  const openTalukaCommittee = useCallback(() => {
    setTalukaCommitteeOpen(true);
  }, []);

  useEffect(() => {
    if (!wardCommitteeOpen || !focusedWard) return;

    const controller = new AbortController();
    setFullWardCommitteeMembers([]);

    (async () => {
      try {
        const params = new URLSearchParams({
          constituencyId: DEFAULT_CONSTITUENCY_ID,
          scope: 'ward_committee',
          verticalId,
          wardGeoId: focusedWard.wardGeoId,
        });
        const res = await fetch(`/api/hierarchy/scoped-members?${params}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setFullWardCommitteeMembers([]);
          return;
        }
        const data = (await res.json()) as { members?: CadreMemberCard[] };
        if (controller.signal.aborted) return;
        setFullWardCommitteeMembers(data.members ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setFullWardCommitteeMembers([]);
        }
      }
    })();

    return () => controller.abort();
  }, [wardCommitteeOpen, focusedWard, verticalId]);

  useEffect(() => {
    if (!boothCommitteeOpen || !focusedWard || !focusedBooth) return;

    const controller = new AbortController();
    setFullBoothCommitteeMembers([]);

    (async () => {
      try {
        const params = new URLSearchParams({
          constituencyId: DEFAULT_CONSTITUENCY_ID,
          scope: 'booth_committee',
          verticalId,
          wardGeoId: focusedWard.wardGeoId,
          boothNo: focusedBooth.boothNo,
        });
        const res = await fetch(`/api/hierarchy/scoped-members?${params}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setFullBoothCommitteeMembers([]);
          return;
        }
        const data = (await res.json()) as { members?: CadreMemberCard[] };
        if (controller.signal.aborted) return;
        setFullBoothCommitteeMembers(data.members ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setFullBoothCommitteeMembers([]);
        }
      }
    })();

    return () => controller.abort();
  }, [boothCommitteeOpen, focusedWard, focusedBooth, verticalId]);

  const committeeMoreLabel = useCallback(
    (shown: number, total: number) =>
      t('hierarchyModule.canvasCommitteeMore', {
        remaining: String(Math.max(0, total - shown)),
        total: String(total),
      }),
    [t],
  );

  useEffect(() => {
    setFocus({ level: 'taluka' });
  }, [verticalName]);

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
    <div className="flex flex-col items-center gap-4">
      <LeaderCard
        roleLabel={t('hierarchyModule.canvasTalukaAdhyaksh', { vertical: verticalName })}
        name={
          canvasData.talukaAdhyaksh
            ? getMemberDisplayName(canvasData.talukaAdhyaksh)
            : '—'
        }
        phone={
          canvasData.talukaAdhyaksh ? getMemberPhone(canvasData.talukaAdhyaksh) : null
        }
      />

      <div className="h-4 w-px bg-border" aria-hidden />

      <CommitteePanel
        title={t('hierarchyModule.canvasTalukaCommittee')}
        members={talukaCommitteePreview}
        total={canvasData.talukaCommitteeTotal}
        moreLabel={committeeMoreLabel(
          talukaCommitteePreview.length,
          canvasData.talukaCommitteeTotal,
        )}
        onViewAll={openTalukaCommittee}
      />

      <div className="h-4 w-px bg-border" aria-hidden />

      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {t('hierarchyModule.canvasWardsSection')}
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:justify-center">
          {wardEntries.map((entry) => (
            <div
              key={entry.wardGeoId}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/50 p-3"
            >
              <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {t('hierarchyModule.canvasWard', { ward: entry.wardLabel })}
              </span>
              <LeaderCard
                roleLabel={t('hierarchyModule.canvasWardAdhyaksh')}
                name={entry.adhyaksh ? getMemberDisplayName(entry.adhyaksh) : '—'}
                phone={entry.adhyaksh ? getMemberPhone(entry.adhyaksh) : null}
                onClick={() => goToWard(entry.wardGeoId)}
              />
              {entry.committeeTotal > 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  {t('hierarchyModule.canvasCommitteeCount', {
                    count: String(entry.committeeTotal),
                  })}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWardView = () => {
    if (!focusedWard) return null;

    return (
      <div className="flex flex-col items-center gap-4">
        <LeaderCard
          roleLabel={t('hierarchyModule.canvasWardAdhyaksh')}
          name={
            focusedWard.adhyaksh ? getMemberDisplayName(focusedWard.adhyaksh) : '—'
          }
          phone={focusedWard.adhyaksh ? getMemberPhone(focusedWard.adhyaksh) : null}
        />

        <div className="h-4 w-px bg-border" aria-hidden />

        <CommitteePanel
          title={t('hierarchyModule.canvasWardCommittee')}
          members={focusedWard.committeeMembers}
          total={focusedWard.committeeTotal}
          moreLabel={committeeMoreLabel(
            focusedWard.committeeMembers.length,
            focusedWard.committeeTotal,
          )}
          onViewAll={() => setWardCommitteeOpen(true)}
        />

        <div className="h-4 w-px bg-border" aria-hidden />

        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {t('hierarchyModule.canvasBoothsSection', { ward: focusedWard.wardLabel })}
          </p>
          {focusedWard.booths.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('hierarchyModule.canvasNoBooths')}
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {focusedWard.booths.map((booth) => (
                <LeaderCard
                  key={booth.boothNo}
                  roleLabel={t('hierarchyModule.canvasBoothAdhyaksh', {
                    booth: formatBoothLabel(booth.boothNo),
                  })}
                  name={booth.adhyaksh ? getMemberDisplayName(booth.adhyaksh) : '—'}
                  phone={booth.adhyaksh ? getMemberPhone(booth.adhyaksh) : null}
                  onClick={() => goToBooth(focusedWard.wardGeoId, booth.boothNo)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBoothView = () => {
    if (!focusedWard || !focusedBooth) return null;

    return (
      <div className="flex flex-col items-center gap-4">
        <LeaderCard
          roleLabel={t('hierarchyModule.canvasBoothAdhyaksh', {
            booth: formatBoothLabel(focusedBooth.boothNo),
          })}
          name={
            focusedBooth.adhyaksh ? getMemberDisplayName(focusedBooth.adhyaksh) : '—'
          }
          phone={focusedBooth.adhyaksh ? getMemberPhone(focusedBooth.adhyaksh) : null}
        />

        <div className="h-4 w-px bg-border" aria-hidden />

        <CommitteePanel
          title={t('hierarchyModule.canvasBoothCommittee')}
          members={focusedBooth.committeeMembers}
          total={focusedBooth.committeeTotal}
          moreLabel={committeeMoreLabel(
            focusedBooth.committeeMembers.length,
            focusedBooth.committeeTotal,
          )}
          onViewAll={() => setBoothCommitteeOpen(true)}
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
        return renderBoothView();
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
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'relative min-h-[min(70vh,640px)] overflow-hidden rounded-xl border border-border bg-muted/10 touch-none',
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
          <div ref={contentRef} className="flex flex-col items-center">
            {renderContent()}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t('hierarchyModule.canvasPanHint')}
      </p>

      <CommitteeMembersDialog
        open={talukaCommitteeOpen}
        onOpenChange={setTalukaCommitteeOpen}
        title={t('hierarchyModule.canvasTalukaCommittee')}
        members={canvasData.talukaCommitteeMembers}
        emptyLabel={t('hierarchyModule.talukaCommitteeEmpty')}
      />

      <CommitteeMembersDialog
        open={wardCommitteeOpen}
        onOpenChange={setWardCommitteeOpen}
        title={t('hierarchyModule.canvasWardCommittee')}
        members={fullWardCommitteeMembers}
        emptyLabel={t('hierarchyModule.talukaCommitteeEmpty')}
      />

      <CommitteeMembersDialog
        open={boothCommitteeOpen}
        onOpenChange={setBoothCommitteeOpen}
        title={t('hierarchyModule.canvasBoothCommittee')}
        members={fullBoothCommitteeMembers}
        emptyLabel={t('hierarchyModule.talukaCommitteeEmpty')}
      />
    </div>
  );
}
