'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ElectionMasterOption {
  electionId: string;
  electionType: string;
  year: number;
  delimitationVersion: string | null;
  constituencyType: string | null;
  constituencyId: string | null;
}

interface ElectionSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const constituencyTypeLabels: Record<string, string> = {
  assembly: 'Assembly',
  ward: 'Ward',
  parliament: 'Parliament',
};

function formatElectionLabel(election: ElectionMasterOption) {
  const rawType = election.constituencyType?.trim().toLowerCase();
  const typeLabel =
    (rawType && constituencyTypeLabels[rawType]) ||
    (election.constituencyType
      ? `${election.constituencyType[0]?.toUpperCase() || ''}${election.constituencyType.slice(1)}`
      : 'Election');
  return election.constituencyId
    ? `${typeLabel} ${election.constituencyId}`
    : typeLabel;
}

export function ElectionSelect({
  id,
  value,
  onValueChange,
  placeholder = 'Select election',
  disabled,
}: ElectionSelectProps) {
  const [elections, setElections] = useState<ElectionMasterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchElections = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/elections');
        if (!response.ok) {
          throw new Error('Failed to load elections');
        }
        const data = await response.json();
        if (isActive && data.success) {
          setElections(data.elections || []);
        }
      } catch (error) {
        console.error('Error fetching elections:', error);
        if (isActive) {
          setLoadError('Failed to load elections');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchElections();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!elections.length) return;
    const hasValue = elections.some((election) => election.electionId === value);
    if (!hasValue) {
      onValueChange(elections[0].electionId);
    }
  }, [elections, onValueChange, value]);

  const groupedElections = useMemo(() => {
    const groups = new Map<number, ElectionMasterOption[]>();
    elections.forEach((election) => {
      const list = groups.get(election.year) ?? [];
      list.push(election);
      groups.set(election.year, list);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, items]) => ({ year, items }));
  }, [elections]);

  const isDisabled = disabled || isLoading || loadError !== null;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={isDisabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={isLoading ? 'Loading elections...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {loadError ? (
          <SelectItem value={value || 'error'} disabled>
            {loadError}
          </SelectItem>
        ) : (
          groupedElections.map((group) => (
            <SelectGroup key={group.year}>
              <SelectLabel>{group.year}</SelectLabel>
              {group.items.map((election) => (
                <SelectItem key={election.electionId} value={election.electionId}>
                  {formatElectionLabel(election)}
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
