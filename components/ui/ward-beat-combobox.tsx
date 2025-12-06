'use client';

import * as React from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface WardBeatComboboxProps {
  values: string[];
  selectedValues: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowNew?: boolean;
}

export function WardBeatCombobox({
  values,
  selectedValues,
  onValuesChange,
  placeholder = 'Select Ward / Beat...',
  disabled = false,
  className,
  allowNew = true,
}: WardBeatComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [newValue, setNewValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Filter values based on search query
  const filteredValues = React.useMemo(() => {
    if (!searchQuery.trim()) return values;
    const term = searchQuery.toLowerCase().trim();
    return values.filter((value) =>
      value.toLowerCase().includes(term)
    );
  }, [values, searchQuery]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearchQuery('');
        setNewValue('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearchQuery('');
      setNewValue('');
    } else if (e.key === 'Enter' && allowNew && newValue.trim()) {
      e.preventDefault();
      const trimmedValue = newValue.trim();
      if (!selectedValues.includes(trimmedValue)) {
        onValuesChange([...selectedValues, trimmedValue]);
      }
      setNewValue('');
      setSearchQuery('');
    }
  };

  const handleToggle = (value: string, checked: boolean) => {
    if (checked) {
      if (!selectedValues.includes(value)) {
        onValuesChange([...selectedValues, value]);
      }
    } else {
      onValuesChange(selectedValues.filter((v) => v !== value));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === 1) {
      return selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={getDisplayText()}
          readOnly
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
          )}
          role="combobox"
          aria-expanded={open}
          aria-controls="ward-beat-combobox-options"
        />
        <ChevronDown
          className={cn(
            'absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none transition-transform',
            open && 'transform rotate-180'
          )}
        />
      </div>

      {open && (
        <div
          id="ward-beat-combobox-options"
          className="absolute z-50 w-full mt-1 max-h-96 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          <div className="p-2 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search or type new value..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (allowNew) {
                    setNewValue(e.target.value);
                  }
                }}
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Add new value option */}
            {allowNew && newValue.trim() && !values.includes(newValue.trim()) && (
              <div
                className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent border border-dashed"
                onClick={() => {
                  const trimmedValue = newValue.trim();
                  if (!selectedValues.includes(trimmedValue)) {
                    onValuesChange([...selectedValues, trimmedValue]);
                  }
                  setNewValue('');
                  setSearchQuery('');
                }}
              >
                <span className="text-sm text-muted-foreground">+ Add &quot;{newValue.trim()}&quot;</span>
              </div>
            )}

            {/* Values List */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Ward / Beat</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredValues.length > 0 ? (
                  filteredValues.map((value) => {
                    const isSelected = selectedValues.includes(value);
                    return (
                      <div
                        key={value}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent"
                        onClick={() => handleToggle(value, !isSelected)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggle(value, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm">{value}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground p-2">
                    {searchQuery ? 'No values found' : 'No values available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected values as badges */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedValues.map((value) => (
            <Badge
              key={value}
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => handleToggle(value, false)}
            >
              {value}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

