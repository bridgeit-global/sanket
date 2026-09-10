'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import type {
  GovFollowUpCadreOfficer,
  GovFollowUpCatalogs,
} from '@/lib/gov-follow-up/types';

const ALL_TYPES = '__all__';
const ADDR_PREFIX = 'addr:';
const CADRE_PREFIX = 'cadre:';
const RECENT_PREFIX = 'recent:';

export type OfficerPickerValue = {
  officerName: string;
  designation?: string;
  officeName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

type OfficerSource = 'address' | 'ward';

export function OfficerPicker({
  id,
  catalogs,
  officerName,
  preferWard = false,
  onSelect,
}: {
  id: string;
  catalogs: GovFollowUpCatalogs;
  officerName: string;
  preferWard?: boolean;
  onSelect: (value: OfficerPickerValue) => void;
}) {
  const { t, locale } = useTranslations();
  const [source, setSource] = useState<OfficerSource>(
    preferWard ? 'ward' : 'address',
  );
  const [typeCode, setTypeCode] = useState(ALL_TYPES);
  const [wardGeoId, setWardGeoId] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [members, setMembers] = useState<GovFollowUpCadreOfficer[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(false);

  useEffect(() => {
    if (!officerName) {
      setSource(preferWard ? 'ward' : 'address');
    }
    // officerName is intentionally omitted so clearing the officer does not switch tabs.
  }, [preferWard]);

  const clearDependentFields = () => {
    setSelectedKey('');
    onSelect({
      officerName: '',
      designation: '',
      officeName: '',
      contactPhone: '',
      contactEmail: '',
    });
  };

  useEffect(() => {
    if (source !== 'ward' || !wardGeoId) {
      setMembers([]);
      setMembersError(false);
      setLoadingMembers(false);
      return;
    }

    const controller = new AbortController();
    setLoadingMembers(true);
    setMembersError(false);

    void fetch(
      `/api/gov-follow-up/cadre-officers?wardGeoId=${encodeURIComponent(wardGeoId)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load members');
        const payload = (await response.json()) as {
          officers?: GovFollowUpCadreOfficer[];
        };
        setMembers(payload.officers ?? []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setMembers([]);
        setMembersError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMembers(false);
      });

    return () => controller.abort();
  }, [source, wardGeoId]);

  const addressTypes = catalogs.addressTypes ?? [];
  const addressOfficers = catalogs.addressOfficers ?? [];
  const wards = catalogs.wards ?? [];
  const recentOfficers = catalogs.officers ?? [];

  const typeLabel = (en: string, mr: string) =>
    locale === 'mr' ? mr.trim() || en : en.trim() || mr;

  const typeOptions = useMemo<ComboboxOption[]>(() => {
    const options: ComboboxOption[] = [
      { value: ALL_TYPES, label: t('govFollowUp.officerPicker.allTypes') },
    ];
    for (const type of addressTypes) {
      options.push({
        value: type.code,
        label: typeLabel(type.labelEn, type.labelMr),
      });
    }
    return options;
  }, [addressTypes, locale, t]);

  const wardOptions = useMemo<ComboboxOption[]>(
    () =>
      wards.map((ward) => ({
        value: ward.id,
        label: ward.name,
      })),
    [wards],
  );

  const addressOfficerOptions = useMemo<ComboboxOption[]>(() => {
    const filtered = addressOfficers.filter(
      (officer) => typeCode === ALL_TYPES || officer.typeCode === typeCode,
    );
    const options: ComboboxOption[] = [];
    const recent = recentOfficers.filter((name) => {
      const match = filtered.some(
        (officer) =>
          typeLabel(officer.nameEn, officer.nameMr).toLowerCase() ===
          name.toLowerCase(),
      );
      return !match;
    });

    if (recent.length > 0) {
      options.push({
        value: '__header_recent__',
        label: t('govFollowUp.officerPicker.recentOfficers'),
        disabled: true,
      });
      for (const name of recent) {
        options.push({
          value: `${RECENT_PREFIX}${name}`,
          label: name,
        });
      }
    }

    if (filtered.length > 0) {
      options.push({
        value: '__header_address__',
        label: t('govFollowUp.officerPicker.addressBook'),
        disabled: true,
      });
      const typeByCode = new Map(
        addressTypes.map((type) => [
          type.code,
          typeLabel(type.labelEn, type.labelMr),
        ]),
      );
      for (const officer of filtered) {
        const name = typeLabel(officer.nameEn, officer.nameMr);
        const designation = typeLabel(
          officer.designationEn,
          officer.designationMr,
        );
        const typeName =
          typeCode === ALL_TYPES ? typeByCode.get(officer.typeCode) : '';
        const details = [designation, typeName].filter(Boolean).join(' · ');
        options.push({
          value: `${ADDR_PREFIX}${officer.id}`,
          label: details ? `${name} — ${details}` : name,
        });
      }
    }

    return options;
  }, [
    addressOfficers,
    addressTypes,
    recentOfficers,
    locale,
    t,
    typeCode,
  ]);

  const memberOptions = useMemo<ComboboxOption[]>(() => {
    return members.map((member) => ({
      value: `${CADRE_PREFIX}${member.id}`,
      label: member.designation
        ? `${member.name} — ${member.designation}`
        : member.name,
    }));
  }, [members]);

  const applyCustomName = (name: string) => {
    setSelectedKey('');
    onSelect({ officerName: name });
  };

  const handleAddressOfficerChange = (value: string) => {
    if (value.startsWith(ADDR_PREFIX)) {
      const officer = addressOfficers.find(
        (item) => item.id === value.slice(ADDR_PREFIX.length),
      );
      if (!officer) return;
      setSelectedKey(value);
      onSelect({
        officerName: typeLabel(officer.nameEn, officer.nameMr),
        designation: typeLabel(officer.designationEn, officer.designationMr),
        officeName: typeLabel(officer.officeEn, officer.officeMr),
      });
      return;
    }
    if (value.startsWith(RECENT_PREFIX)) {
      const name = value.slice(RECENT_PREFIX.length);
      setSelectedKey(value);
      onSelect({ officerName: name });
      return;
    }
    applyCustomName(value);
  };

  const handleMemberChange = (value: string) => {
    if (value.startsWith(CADRE_PREFIX)) {
      const member = members.find(
        (item) => item.id === value.slice(CADRE_PREFIX.length),
      );
      if (!member) return;
      const wardName =
        wards.find((ward) => ward.id === wardGeoId)?.name ?? '';
      setSelectedKey(value);
      onSelect({
        officerName: member.name,
        designation: member.designation,
        officeName: wardName,
        contactPhone: member.phone ?? '',
        contactEmail: member.email ?? '',
      });
      return;
    }
    applyCustomName(value);
  };

  const addressValue = selectedKey.startsWith(ADDR_PREFIX) ||
    selectedKey.startsWith(RECENT_PREFIX)
    ? selectedKey
    : source === 'address'
      ? officerName
      : '';
  const memberValue = selectedKey.startsWith(CADRE_PREFIX)
    ? selectedKey
    : source === 'ward'
      ? officerName
      : '';

  return (
    <div className="sm:col-span-2 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={`${id}-officer`}>
          {t('govFollowUp.fields.officerName')}
        </Label>
        <div className="bg-muted inline-flex rounded-md p-0.5">
          <SourceButton
            active={source === 'address'}
            onClick={() => {
              if (source === 'address') return;
              setSource('address');
              setWardGeoId('');
              setMembers([]);
              clearDependentFields();
            }}
          >
            {t('govFollowUp.officerPicker.sourceAddress')}
          </SourceButton>
          <SourceButton
            active={source === 'ward'}
            onClick={() => {
              if (source === 'ward') return;
              setSource('ward');
              setTypeCode(ALL_TYPES);
              clearDependentFields();
            }}
          >
            {t('govFollowUp.officerPicker.sourceWard')}
          </SourceButton>
        </div>
      </div>

      {source === 'address' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-type`}>
              {t('govFollowUp.officerPicker.addressType')}
            </Label>
            <Combobox
              id={`${id}-type`}
              value={typeCode}
              options={typeOptions}
              placeholder={t('govFollowUp.officerPicker.selectType')}
              emptyMessage={t('govFollowUp.officerPicker.noTypes')}
              onValueChange={(value) => {
                if (value === typeCode) return;
                setTypeCode(value);
                clearDependentFields();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-officer`}>
              {t('govFollowUp.officerPicker.officer')}
            </Label>
            <Combobox
              key={`${id}-officer-${typeCode}`}
              id={`${id}-officer`}
              allowCustom
              value={addressValue}
              options={addressOfficerOptions}
              placeholder={t('govFollowUp.officerPicker.selectOfficer')}
              emptyMessage={t('govFollowUp.officerPicker.noOfficers')}
              onValueChange={handleAddressOfficerChange}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-ward`}>
              {t('govFollowUp.officerPicker.ward')}
            </Label>
            <Combobox
              id={`${id}-ward`}
              value={wardGeoId}
              options={wardOptions}
              placeholder={t('govFollowUp.officerPicker.selectWard')}
              emptyMessage={t('govFollowUp.officerPicker.noWards')}
              onValueChange={(value) => {
                if (value === wardGeoId) return;
                setWardGeoId(value);
                setMembers([]);
                clearDependentFields();
              }}
            />
            {wardGeoId && !loadingMembers && !membersError ? (
              <p className="text-muted-foreground text-xs">
                {t('govFollowUp.officerPicker.wardMembers', {
                  count: members.length,
                })}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-officer`}>
              {t('govFollowUp.officerPicker.member')}
            </Label>
            <div className="relative">
              <Combobox
                key={`${id}-member-${wardGeoId}`}
                id={`${id}-officer`}
                allowCustom
                value={memberValue}
                options={memberOptions}
                placeholder={
                  wardGeoId
                    ? t('govFollowUp.officerPicker.selectMember')
                    : t('govFollowUp.officerPicker.pickWardFirst')
                }
                emptyMessage={
                  membersError
                    ? t('govFollowUp.officerPicker.failedMembers')
                    : t('govFollowUp.officerPicker.noMembers')
                }
                onValueChange={handleMemberChange}
              />
              {loadingMembers ? (
                <Loader2 className="text-muted-foreground absolute right-8 top-1/2 size-4 -translate-y-1/2 animate-spin" />
              ) : null}
            </div>
          </div>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {t('govFollowUp.officerPicker.addIfMissing')}
      </p>
    </div>
  );
}

function SourceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
