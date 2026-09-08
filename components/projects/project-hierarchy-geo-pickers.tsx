'use client';

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { CheckboxMultiSelect } from '@/components/ui/checkbox-multi-select';
import { isValidSelectItemValue } from '@/lib/hierarchy/select-utils';
import type { CadreConfig } from '@/lib/hierarchy/types';
import {
  boothOptionsForWards,
  buildProjectWardDisplay,
  isOverallProjectWard,
  overallProjectWardOptionId,
  PROJECT_HIERARCHY_CONSTITUENCY_ID,
  retainValidBoothNos,
  sanitizeProjectWardGeoIds,
  wardOptionsFromGeoUnits,
  withManualOverallProjectWard,
} from '@/lib/projects/hierarchy-geo';
import { useTranslations } from '@/hooks/use-translations';

export type ProjectHierarchyGeoValue = {
  wardGeoIds: string[];
  boothNos: string[];
  wardGeoId: string | null;
  boothNo: string | null;
  /** Denormalized display string for legacy `ward` column */
  ward: string;
};

interface ProjectHierarchyGeoPickersProps {
  wardGeoIds: string[];
  boothNos: string[];
  onChange: (value: ProjectHierarchyGeoValue) => void;
  disabled?: boolean;
  className?: string;
  /** Show hardcoded "172 - Anushakti Nagar" (create form only). */
  includeOverallWard?: boolean;
}

export function ProjectHierarchyGeoPickers({
  wardGeoIds,
  boothNos,
  onChange,
  disabled = false,
  className,
  includeOverallWard = false,
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

  const overallWardId = overallProjectWardOptionId(geoUnits);
  const unitsForOptions = useMemo(
    () =>
      includeOverallWard || wardGeoIds.includes(overallWardId)
        ? withManualOverallProjectWard(geoUnits)
        : geoUnits,
    [geoUnits, includeOverallWard, overallWardId, wardGeoIds],
  );

  const wardUnits = useMemo(() => {
    const catalog = wardOptionsFromGeoUnits(
      unitsForOptions,
      PROJECT_HIERARCHY_CONSTITUENCY_ID,
    ).filter((g) => isValidSelectItemValue(g.id));
    const overall = catalog.find((ward) => isOverallProjectWard(ward));
    const others = catalog.filter((ward) => !isOverallProjectWard(ward));
    const selectedHasOverall = wardGeoIds.includes(overallWardId);
    if (!includeOverallWard && !selectedHasOverall) return others;
    return overall ? [overall, ...others] : others;
  }, [unitsForOptions, includeOverallWard, overallWardId, wardGeoIds]);

  const boothOptions = useMemo(() => {
    const options = boothOptionsForWards(
      unitsForOptions,
      wardGeoIds,
      PROJECT_HIERARCHY_CONSTITUENCY_ID,
    );
    const extra = boothNos.filter(
      (boothNo) => !options.some((option) => option.boothNo === boothNo),
    );
    if (extra.length === 0) return options;
    return [
      ...extra.map((boothNo) => ({ boothNo, label: `Booth ${boothNo}` })),
      ...options,
    ];
  }, [unitsForOptions, wardGeoIds, boothNos]);

  const emit = (nextWardGeoIds: string[], nextBoothNos: string[]) => {
    const catalog = boothOptionsForWards(
      unitsForOptions,
      nextWardGeoIds,
      PROJECT_HIERARCHY_CONSTITUENCY_ID,
    );
    const wardsUnchanged =
      nextWardGeoIds.length === wardGeoIds.length &&
      nextWardGeoIds.every((id) => wardGeoIds.includes(id));
    const extras = wardsUnchanged
      ? boothNos
          .filter((boothNo) => !catalog.some((option) => option.boothNo === boothNo))
          .map((boothNo) => ({ boothNo }))
      : [];
    const nextBooths = retainValidBoothNos(nextBoothNos, [...extras, ...catalog]);
    const persistableWardGeoIds = sanitizeProjectWardGeoIds(nextWardGeoIds);
    onChange({
      wardGeoIds: nextWardGeoIds,
      boothNos: nextBooths,
      wardGeoId: persistableWardGeoIds[0] ?? null,
      boothNo: nextBooths[0] ?? null,
      ward: buildProjectWardDisplay(unitsForOptions, nextWardGeoIds, nextBooths),
    });
  };

  return (
    <div className={className ?? 'grid gap-3 sm:grid-cols-2'}>
      <div className="space-y-2">
        <Label>{t('projects.ward')}</Label>
        <CheckboxMultiSelect
          options={wardUnits.map((ward) => ({
            value: ward.id,
            label: ward.name,
          }))}
          selected={wardGeoIds}
          onChange={(next) => emit(next, boothNos)}
          disabled={disabled || loading}
          loading={loading}
          placeholder={
            loading
              ? t('common.loading')
              : loadError
                ? t('projects.geoLoadFailed')
                : t('projects.selectWard')
          }
          searchPlaceholder={t('projects.searchWards')}
          emptyMessage={t('projects.noWardOptions')}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('projects.booth')}</Label>
        <CheckboxMultiSelect
          options={boothOptions.map((booth) => ({
            value: booth.boothNo,
            label: booth.label,
          }))}
          selected={boothNos}
          onChange={(next) => emit(wardGeoIds, next)}
          disabled={disabled || loading || wardGeoIds.length === 0}
          loading={loading}
          placeholder={
            loading
              ? t('common.loading')
              : wardGeoIds.length > 0
                ? t('projects.selectBooth')
                : t('projects.selectWardFirst')
          }
          searchPlaceholder={t('projects.searchBooths')}
          emptyMessage={t('projects.noBoothOptions')}
        />
      </div>
    </div>
  );
}
