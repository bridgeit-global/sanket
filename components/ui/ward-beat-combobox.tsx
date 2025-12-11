'use client';

import * as React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface WardPartOption {
  value: string;
  label: string;
  type: 'ward' | 'part';
  wardForPart?: string;
  partCount?: number;
}

interface WardBeatComboboxProps {
  selectedWards?: string[];
  selectedParts?: string[];
  onWardToggle?: (wardValue: string, checked: boolean) => void;
  onPartToggle?: (partValue: string, checked: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  displayValue?: string;
}

export function WardBeatCombobox({
  selectedWards = [],
  selectedParts = [],
  onWardToggle,
  onPartToggle,
  placeholder = 'Select Ward No / Part No',
  disabled = false,
  className,
  loading = false,
  displayValue,
}: WardBeatComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [wardNumbers, setWardNumbers] = React.useState<string[]>([]);
  const [partsByWard, setPartsByWard] = React.useState<Record<string, string[]>>({});
  const [allPartNumbers, setAllPartNumbers] = React.useState<string[]>([]);
  const [loadingWards, setLoadingWards] = React.useState(true);
  const [loadingParts, setLoadingParts] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Prepare ward and part options for display
  const wardOptions = React.useMemo(() => {
    return wardNumbers.map(wardNo => ({
      value: wardNo,
      label: `Ward ${wardNo}`,
      type: 'ward' as const,
      partCount: partsByWard[wardNo]?.length || 0,
    }));
  }, [wardNumbers, partsByWard]);

  const partOptions = React.useMemo(() => {
    return allPartNumbers.map(partNo => {
      const wardForPart = Object.keys(partsByWard).find(ward =>
        partsByWard[ward]?.includes(partNo)
      );
      return {
        value: partNo,
        label: `Part ${partNo}`,
        type: 'part' as const,
        wardForPart,
      };
    });
  }, [allPartNumbers, partsByWard]);

  // Filter wards and parts based on search query
  const filteredWards = React.useMemo(() => {
    if (!searchQuery.trim()) return wardOptions;
    const term = searchQuery.toLowerCase().trim()
      .replace(/^ward\s*/i, '')
      .replace(/\s+/g, '');
    if (!term) return wardOptions;
    return wardOptions.filter(ward => {
      const normalizedWard = ward.value.toLowerCase().replace(/\s+/g, '');
      return normalizedWard.includes(term) ||
        `ward${normalizedWard}`.includes(term);
    });
  }, [wardOptions, searchQuery]);

  const filteredParts = React.useMemo(() => {
    if (!searchQuery.trim()) return partOptions;
    const term = searchQuery.toLowerCase().trim()
      .replace(/^part\s*/i, '')
      .replace(/\s+/g, '');
    if (!term) return partOptions;
    return partOptions.filter(part => {
      const normalizedPart = part.value.toLowerCase().replace(/\s+/g, '');
      return normalizedPart.includes(term) ||
        `part${normalizedPart}`.includes(term);
    });
  }, [partOptions, searchQuery]);

  // Fetch all ward numbers
  React.useEffect(() => {
    const fetchWardNumbers = async () => {
      try {
        setLoadingWards(true);
        const response = await fetch('/api/voters/wards');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.wardNumbers) {
            setWardNumbers(data.data.wardNumbers);
          }
        }
      } catch (error) {
        console.error('Error fetching ward numbers:', error);
      } finally {
        setLoadingWards(false);
      }
    };
    fetchWardNumbers();
  }, []);

  // Fetch all part numbers on mount
  React.useEffect(() => {
    const fetchAllParts = async () => {
      try {
        setLoadingParts(true);
        const response = await fetch('/api/voters/parts-by-wards');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setPartsByWard(data.data.partsByWard || {});
            setAllPartNumbers(data.data.allParts || []);
          }
        }
      } catch (error) {
        console.error('Error fetching all part numbers:', error);
      } finally {
        setLoadingParts(false);
      }
    };
    fetchAllParts();
  }, []);

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

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current && !isTyping) {
      setTimeout(() => {
        searchInputRef.current?.focus();
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
  };

  const handleMainInputFocus = () => {
    if (!open) {
      setOpen(true);
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
    if (loading || loadingWards || loadingParts) return 'Loading...';
    if (displayValue) return displayValue;
    if ((selectedWards.length === 0 && selectedParts.length === 0)) {
      return '';
    }
    return `${selectedWards.length} ward(s), ${selectedParts.length} part(s)`;
  };

  const handleWardToggle = (wardValue: string, checked: boolean) => {
    if (onWardToggle) {
      onWardToggle(wardValue, checked);
    }
  };

  const handlePartToggle = (partValue: string, checked: boolean) => {
    if (onPartToggle) {
      onPartToggle(partValue, checked);
    }
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
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading || loadingWards || loadingParts}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !isTyping && 'cursor-pointer'
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
            {/* Search Input - Keep for reference but sync with main input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search ward or part number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsTyping(true);
                }}
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>

            {/* Ward No Section */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Ward No</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {loadingWards ? (
                  <div className="text-xs text-muted-foreground p-2">Loading wards...</div>
                ) : filteredWards.length > 0 ? (
                  filteredWards.map((ward) => {
                    const wardParts = partsByWard[ward.value] || [];
                    const isWardSelected = selectedWards.includes(ward.value);

                    return (
                      <div key={ward.value} className="space-y-1">
                        <div
                          className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent"
                          onClick={() => handleWardToggle(ward.value, !isWardSelected)}
                        >
                          <Checkbox
                            checked={isWardSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleWardToggle(ward.value, e.target.checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
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
                                  onClick={() => handlePartToggle(partNo, !isPartSelected)}
                                >
                                  <Checkbox
                                    checked={isPartSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handlePartToggle(partNo, e.target.checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
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
                {loadingParts ? (
                  <div className="text-xs text-muted-foreground p-2">Loading parts...</div>
                ) : filteredParts.length > 0 ? (
                  filteredParts.map((part) => {
                    const isPartSelected = selectedParts.includes(part.value);
                    return (
                      <div
                        key={part.value}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent"
                        onClick={() => handlePartToggle(part.value, !isPartSelected)}
                      >
                        <Checkbox
                          checked={isPartSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handlePartToggle(part.value, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
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

      {/* Selected values as badges */}
      {(selectedWards.length > 0 || selectedParts.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedWards.map((wardNo) => (
            <Badge
              key={`ward-${wardNo}`}
              variant="default"
              className="text-xs cursor-pointer"
              onClick={() => handleWardToggle(wardNo, false)}
            >
              Ward {wardNo}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {selectedParts.map((partNo) => (
            <Badge
              key={`part-${partNo}`}
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => handlePartToggle(partNo, false)}
            >
              Part {partNo}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
