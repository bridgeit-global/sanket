'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VoterOption {
  epicNumber: string;
  fullName: string;
}

interface VoterPickerComboboxProps {
  value?: string | null;
  onSelect: (voter: VoterOption | null) => void;
  disabled?: boolean;
}

export function VoterPickerCombobox({ value, onSelect, disabled }: VoterPickerComboboxProps) {
  const [mode, setMode] = useState<'epic' | 'name' | 'phone'>('epic');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<VoterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const param =
        mode === 'epic' ? `epic=${encodeURIComponent(query)}` :
        mode === 'name' ? `name=${encodeURIComponent(query)}` :
        `phone=${encodeURIComponent(query)}`;
      const res = await fetch(`/api/hierarchy/lookups/voters?${param}`);
      const data = await res.json();
      setOptions(
        (data.voters ?? []).map((v: { epicNumber: string; fullName: string }) => ({
          epicNumber: v.epicNumber,
          fullName: v.fullName,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && selectedLabel && (
        <div className="flex items-center justify-between rounded border px-2 py-1 text-sm">
          <span>{selectedLabel}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => { onSelect(null); setSelectedLabel(''); }}>
            Clear
          </Button>
        </div>
      )}
      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="epic">EPIC</TabsTrigger>
          <TabsTrigger value="name">Name</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        <TabsContent value={mode} className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder={mode === 'epic' ? 'EPIC number' : mode === 'name' ? 'Voter name' : 'Phone number'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
            />
            <Button type="button" variant="secondary" onClick={search} disabled={disabled || loading}>
              Search
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      <ul className="max-h-40 overflow-auto border rounded-md">
        {options.map((v) => (
          <li key={v.epicNumber}>
            <button
              type="button"
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                onSelect(v);
                setSelectedLabel(`${v.fullName} (${v.epicNumber})`);
                setOptions([]);
                setQuery('');
              }}
            >
              {v.fullName} — {v.epicNumber}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
