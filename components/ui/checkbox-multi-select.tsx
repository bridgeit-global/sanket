'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export type CheckboxMultiSelectOption = {
  value: string;
  label: string;
};

interface CheckboxMultiSelectProps {
  options: CheckboxMultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function CheckboxMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select',
  searchPlaceholder = 'Search',
  disabled = false,
  loading = false,
  emptyMessage = 'No options',
  className,
}: CheckboxMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const filteredOptions = React.useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.value.toLowerCase().includes(term),
    );
  }, [options, searchQuery]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const triggerLabel = React.useMemo(() => {
    if (loading) return placeholder;
    if (selected.length === 0) return placeholder;
    const labels = selected
      .map((value) => options.find((option) => option.value === value)?.label ?? value)
      .filter(Boolean);
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [loading, options, placeholder, selected]);

  const toggle = (value: string, checked: boolean) => {
    if (checked) {
      if (selectedSet.has(value)) return;
      onChange([...selected, value]);
      return;
    }
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          if (disabled || loading) return;
          setOpen((current) => !current);
        }}
        className={cn(
          'flex min-h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selected.length && !loading && 'text-muted-foreground',
        )}
      >
        <span className="line-clamp-2 pr-2">{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedSet.has(option.value);
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={checked}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => toggle(option.value, !checked)}
                  >
                    <span className="pointer-events-none">
                      <Checkbox
                        checked={checked}
                        onChange={() => {}}
                        tabIndex={-1}
                      />
                    </span>
                    <span className="leading-snug">{option.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
