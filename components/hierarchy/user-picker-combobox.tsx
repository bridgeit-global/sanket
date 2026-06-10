'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UserOption {
  id: string;
  userId: string;
  roleName: string | null;
}

interface UserPickerComboboxProps {
  value?: string | null;
  onSelect: (user: UserOption | null) => void;
  disabled?: boolean;
}

export function UserPickerCombobox({ value, onSelect, disabled }: UserPickerComboboxProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hierarchy/lookups/users?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setOptions(data.users ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

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
      <Input
        placeholder="Search portal users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      {loading && <p className="text-xs text-muted-foreground">Searching...</p>}
      <ul className="max-h-40 overflow-auto border rounded-md">
        {options.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                onSelect(u);
                setSelectedLabel(u.userId);
                setQuery('');
                setOptions([]);
              }}
            >
              {u.userId}
              {u.roleName ? ` (${u.roleName})` : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
