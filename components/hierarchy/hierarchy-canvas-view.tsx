'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { ContactWithCall } from './contact-with-call';
import { Button } from '@/components/ui/button';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import { extractWardNumber } from '@/lib/hierarchy/member-list';
import type { CadreConfig } from '@/lib/hierarchy/types';
import type { HierarchyLeaders } from '@/lib/hierarchy/leaders';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

function formatWardLabel(wardName: string): string {
  const wardNumber = extractWardNumber(wardName);
  return wardNumber !== Number.MAX_SAFE_INTEGER ? String(wardNumber) : wardName;
}

function LeaderCard({
  name,
  phone,
  roleLabel,
  className,
}: {
  name: string;
  phone: string | null;
  roleLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-[180px] max-w-[220px] rounded-xl border border-primary/20 bg-card px-3 py-2.5 shadow-sm dark:border-primary/50',
        className,
      )}
    >
      <p className="text-[10px] font-semibold tracking-[0.12em] text-primary uppercase">
        {roleLabel}
      </p>
      <p className="mt-1 text-sm font-medium leading-snug">{name}</p>
      <div className="mt-1.5">
        <ContactWithCall phone={phone} />
      </div>
    </div>
  );
}

interface HierarchyCanvasViewProps {
  leaders: HierarchyLeaders;
  verticalName: string;
  wardOptions: CadreConfig['geoUnits'];
}

export function HierarchyCanvasView({
  leaders,
  verticalName,
  wardOptions,
}: HierarchyCanvasViewProps) {
  const { t } = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const wardHeadById = useMemo(
    () => new Map(leaders.wardHeads.map((entry) => [entry.wardGeoId, entry.member])),
    [leaders.wardHeads],
  );

  const wardEntries = useMemo(
    () =>
      wardOptions.map((ward) => {
        const head = wardHeadById.get(ward.id) ?? null;
        return {
          ward,
          wardLabel: formatWardLabel(ward.name),
          head,
        };
      }),
    [wardOptions, wardHeadById],
  );

  const talukaAdhyaksh = leaders.talukaAdhyaksh;

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

  useEffect(() => {
    const timer = window.setTimeout(() => fitToView(), 100);
    return () => window.clearTimeout(timer);
  }, [fitToView, wardEntries.length, verticalName]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
        <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {t('hierarchyModule.canvasToolbar')}
        </span>
        <div className="flex flex-wrap gap-1.5">
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
          <div ref={contentRef} className="flex flex-col items-center gap-4">
            <LeaderCard
              roleLabel={t('hierarchyModule.canvasTalukaAdhyaksh', { vertical: verticalName })}
              name={talukaAdhyaksh ? getMemberDisplayName(talukaAdhyaksh) : '—'}
              phone={talukaAdhyaksh ? getMemberPhone(talukaAdhyaksh) : null}
            />

            <div className="h-4 w-px bg-border" aria-hidden />

            <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:justify-center lg:gap-4">
              {wardEntries.map((entry) => (
                <div
                  key={entry.ward.id}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/50 p-3"
                >
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {t('hierarchyModule.canvasWard', { ward: entry.wardLabel })}
                  </span>
                  <LeaderCard
                    roleLabel={t('hierarchyModule.canvasWardAdhyaksh')}
                    name={entry.head ? getMemberDisplayName(entry.head) : '—'}
                    phone={entry.head ? getMemberPhone(entry.head) : null}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t('hierarchyModule.canvasPanHint')}
      </p>
    </div>
  );
}
