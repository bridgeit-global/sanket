'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface WardPartOption {
  value: string;
  label: string;
  type: 'ward' | 'part';
  wardForPart?: string;
  partCount?: number;
}

interface MultiComboboxProps {
  wards: WardPartOption[];
  parts: WardPartOption[];
  partsByWard: Record<string, string[]>;
  selectedWards: string[];
  selectedParts: string[];
  onWardToggle: (wardValue: string, checked: boolean) => void;
  onPartToggle: (partValue: string, checked: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  displayValue?: string;
}

export function MultiCombobox({
  wards,
  parts,
  partsByWard,
  selectedWards,
  selectedParts,
  onWardToggle,
  onPartToggle,
  placeholder = 'Select Ward No / Part No',
  disabled = false,
  className,
  loading = false,
  displayValue,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Filter wards and parts based on search query
  const filteredWards = React.useMemo(() => {
    if (!searchQuery.trim()) return wards;
    const term = searchQuery.toLowerCase().trim()
      .replace(/^ward\s*/i, '')
      .replace(/\s+/g, '');
    if (!term) return wards;
    return wards.filter(ward => {
      const normalizedWard = ward.value.toLowerCase().replace(/\s+/g, '');
      return normalizedWard.includes(term) ||
        `ward${normalizedWard}`.includes(term);
    });
  }, [wards, searchQuery]);

  const filteredParts = React.useMemo(() => {
    if (!searchQuery.trim()) return parts;
    const term = searchQuery.toLowerCase().trim()
      .replace(/^part\s*/i, '')
      .replace(/\s+/g, '');
    if (!term) return parts;
    return parts.filter(part => {
      const normalizedPart = part.value.toLowerCase().replace(/\s+/g, '');
      return normalizedPart.includes(term) ||
        `part${normalizedPart}`.includes(term);
    });
  }, [parts, searchQuery]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearchQuery('');
        setIsTyping(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Focus and select text in main input when it opens and user is typing
  React.useEffect(() => {
    if (open && isTyping && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, isTyping]);


  const handleMainInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsTyping(true);
    if (!open) {
      setOpen(true);
    }
    // Ensure cursor is visible
    setTimeout(() => {
      const input = e.target;
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }, 0);
  };

  const handleMainInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!open) {
      setOpen(true);
    }
    // Select all text when focusing (if not already typing)
    if (!isTyping && e.target.value) {
      setTimeout(() => {
        e.target.select();
      }, 0);
    }
  };

  const handleMainInputBlur = () => {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsTyping(false);
        setSearchQuery('');
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearchQuery('');
      setIsTyping(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Don't close on Enter, allow user to continue typing
    }
  };

  const getInputValue = () => {
    if (isTyping) {
      return searchQuery;
    }
    if (loading) return 'Loading...';
    if (displayValue) return displayValue;
    if ((selectedWards.length === 0 && selectedParts.length === 0)) {
      return '';
    }
    return `${selectedWards.length} ward(s), ${selectedParts.length} part(s)`;
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={getInputValue()}
          onChange={handleMainInputChange}
          onFocus={handleMainInputFocus}
          onBlur={handleMainInputBlur}
          onClick={(e) => {
            if (!disabled) {
              setOpen(true);
              // If there's text and user isn't typing, select it on click
              if (!isTyping && e.currentTarget.value) {
                setTimeout(() => {
                  e.currentTarget.select();
                }, 0);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !isTyping && 'cursor-pointer'
          )}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="multi-combobox-options"
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
          id="multi-combobox-options"
          className="absolute z-50 w-full mt-1 max-h-96 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          <div className="p-2 space-y-4">
            {/* Ward No Section */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Ward No</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredWards.length > 0 ? (
                  filteredWards.map((ward) => {
                    const wardParts = partsByWard[ward.value] || [];
                    const isWardSelected = selectedWards.includes(ward.value);

                    return (
                      <div key={ward.value} className="space-y-1">
                        <div
                          className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent"
                          onClick={(e) => {
                            // Only toggle if clicking on the row itself, not the checkbox
                            if ((e.target as HTMLElement).closest('label')) return;
                            onWardToggle(ward.value, !isWardSelected);
                          }}
                        >
                          <Checkbox
                            checked={isWardSelected}
                            onChange={(e) => {
                              onWardToggle(ward.value, e.target.checked);
                            }}
                          />
                          <span className="text-sm font-medium">Ward {ward.value}</span>
                          {wardParts.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              ({wardParts.length} parts)
                            </span>
                          )}
                        </div>

                        {/* Part No sub-items for this ward */}
                        {isWardSelected && wardParts.length > 0 && (
                          <div className="ml-6 space-y-1 border-l-2 border-muted pl-3">
                            {wardParts.map((partNo) => {
                              const isPartSelected = selectedParts.includes(partNo);
                              return (
                                <div
                                  key={partNo}
                                  className="flex items-center space-x-2 cursor-pointer p-1.5 rounded hover:bg-accent/50"
                                  onClick={(e) => {
                                    // Only toggle if clicking on the row itself, not the checkbox
                                    if ((e.target as HTMLElement).closest('label')) return;
                                    onPartToggle(partNo, !isPartSelected);
                                  }}
                                >
                                  <Checkbox
                                    checked={isPartSelected}
                                    onChange={(e) => {
                                      onPartToggle(partNo, e.target.checked);
                                    }}
                                  />
                                  <span className="text-xs">Part {partNo}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground p-2">
                    {searchQuery ? 'No wards found' : 'No wards available'}
                  </div>
                )}
              </div>
            </div>

            {/* Part No Section - Independent Selection */}
            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Part No</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredParts.length > 0 ? (
                  filteredParts.map((part) => {
                    const isPartSelected = selectedParts.includes(part.value);
                    return (
                      <div
                        key={part.value}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent"
                        onClick={(e) => {
                          // Only toggle if clicking on the row itself, not the checkbox
                          if ((e.target as HTMLElement).closest('label')) return;
                          onPartToggle(part.value, !isPartSelected);
                        }}
                      >
                        <Checkbox
                          checked={isPartSelected}
                          onChange={(e) => {
                            onPartToggle(part.value, e.target.checked);
                          }}
                        />
                        <span className="text-sm">Part {part.value}</span>
                        {part.wardForPart && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            (Ward {part.wardForPart})
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground p-2">
                    {searchQuery ? 'No parts found' : 'No parts available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

