'use client';

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SELECT_NONE_VALUE,
  fromOptionalSelectValue,
  isValidSelectItemValue,
  toOptionalSelectValue,
} from '@/lib/hierarchy/select-utils';
import type { CadreConfig } from '@/lib/hierarchy/types';
import {
  boothOptionsForWard,
  buildProjectWardDisplay,
  PROJECT_HIERARCHY_CONSTITUENCY_ID,
  wardOptionsFromGeoUnits,
} from '@/lib/projects/hierarchy-geo';
import { useTranslations } from '@/hooks/use-translations';

export type ProjectHierarchyGeoValue = {
  wardGeoId: string | null;
  boothNo: string | null;
  /** Denormalized display string for legacy `ward` column */
  ward: string;
};

interface ProjectHierarchyGeoPickersProps {
  wardGeoId: string | null;
  boothNo: string | null;
  onChange: (value: ProjectHierarchyGeoValue) => void;
  disabled?: boolean;
  className?: string;
}

export function ProjectHierarchyGeoPickers({
  wardGeoId,
  boothNo,
  onChange,
  disabled = false,
  className,
}: ProjectHierarchyGeoPickersProps) {
  const { t } = useTranslations();
  const [geoUnits, setGeoUnits] = useState<CadreConfig['geoUnits']>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await fetch('/api/projects/hierarchy-geo');
        if (!res.ok) throw new Error('Failed to load geography');
        const data = await res.json();
        if (!cancelled) {
          setGeoUnits(Array.isArray(data.geoUnits) ? data.geoUnits : []);
        }
      } catch {
        if (!cancelled) {
          setGeoUnits([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const wardUnits = useMemo(
    () =>
      wardOptionsFromGeoUnits(geoUnits, PROJECT_HIERARCHY_CONSTITUENCY_ID).filter(
        (g) => isValidSelectItemValue(g.id),
      ),
    [geoUnits],
  );

  const boothOptions = useMemo(() => {
    const options = boothOptionsForWard(
      geoUnits,
      wardGeoId,
      PROJECT_HIERARCHY_CONSTITUENCY_ID,
    );
    if (boothNo && !options.some((b) => b.boothNo === boothNo)) {
      return [{ boothNo, label: `Booth ${boothNo}` }, ...options];
    }
    return options;
  }, [geoUnits, wardGeoId, boothNo]);

  const emit = (nextWardGeoId: string | null, nextBoothNo: string | null) => {
    onChange({
      wardGeoId: nextWardGeoId,
      boothNo: nextBoothNo,
      ward: buildProjectWardDisplay(geoUnits, nextWardGeoId, nextBoothNo),
    });
  };

  return (
    <div className={className ?? 'grid gap-3 sm:grid-cols-2'}>
      <div className="space-y-2">
        <Label>{t('projects.ward')}</Label>
        <Select
          value={toOptionalSelectValue(wardGeoId ?? '')}
          onValueChange={(v) => {
            const nextWard = fromOptionalSelectValue(v) || null;
            emit(nextWard, null);
          }}
          disabled={disabled || loading}
        >
          <SelectTrigger className="min-h-11 w-full">
            <SelectValue
              placeholder={
                loading
                  ? t('common.loading')
                  : loadError
                    ? t('projects.geoLoadFailed')
                    : t('projects.selectWard')
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE_VALUE}>{t('common.none')}</SelectItem>
            {wardUnits.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('projects.booth')}</Label>
        <Select
          value={toOptionalSelectValue(boothNo ?? '')}
          onValueChange={(v) => {
            const nextBooth = fromOptionalSelectValue(v) || null;
            emit(wardGeoId, nextBooth);
          }}
          disabled={disabled || loading || !wardGeoId}
        >
          <SelectTrigger className="min-h-11 w-full">
            <SelectValue
              placeholder={
                wardGeoId
                  ? t('projects.selectBooth')
                  : t('projects.selectWardFirst')
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE_VALUE}>{t('common.none')}</SelectItem>
            {boothOptions.map((b) => (
              <SelectItem key={b.boothNo} value={b.boothNo}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
