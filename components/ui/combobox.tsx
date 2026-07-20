'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface ComboboxOption {
    value: string;
    label: string;
    className?: string;
    /** Always shown in the list, even when the search query does not match. */
    pinned?: boolean;
    /** Non-selectable section header (e.g. category group). */
    disabled?: boolean;
    renderLabel?: (label: string) => React.ReactNode;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    emptyMessage?: string;
    /**
     * Allow committing arbitrary typed text that is not in `options`.
     * When enabled, a "create" row is shown for the current query and the
     * typed value is committed on Enter or when focus leaves the field.
     */
    allowCustom?: boolean;
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = 'Select an option...',
    disabled = false,
    className,
    emptyMessage = 'No options found',
    allowCustom = false,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const optionRefs = React.useRef<(HTMLDivElement | null)[]>([]);

    const selectedOption = options.find((opt) => opt.value === value);

    // Filter options based on search query (pinned options always remain visible).
    // Category headers stay only when at least one following selectable option matches.
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        const matched = options.filter(
            (opt) =>
                opt.pinned ||
                (!opt.disabled && opt.label.toLowerCase().includes(query)),
        );
        const matchedValues = new Set(matched.map((opt) => opt.value));
        const result: typeof options = [];
        let pendingHeader: (typeof options)[number] | null = null;
        for (const opt of options) {
            if (opt.disabled) {
                pendingHeader = opt;
                continue;
            }
            if (matchedValues.has(opt.value) || opt.pinned) {
                if (pendingHeader) {
                    result.push(pendingHeader);
                    pendingHeader = null;
                }
                result.push(opt);
            }
        }
        return result;
    }, [options, searchQuery]);

    const trimmedQuery = searchQuery.trim();
    const hasExactMatch = options.some(
        (opt) => opt.label.toLowerCase() === trimmedQuery.toLowerCase(),
    );
    const showCreate = allowCustom && trimmedQuery.length > 0 && !hasExactMatch;

    // Reset highlighted index when filtered options change
    React.useEffect(() => {
        setHighlightedIndex(0);
        optionRefs.current = [];
    }, [filteredOptions]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                const pendingQuery = searchQuery.trim();
                if (
                    allowCustom &&
                    pendingQuery.length > 0 &&
                    pendingQuery !== (selectedOption?.label ?? value ?? '')
                ) {
                    onValueChange?.(pendingQuery);
                }
                setOpen(false);
                setSearchQuery('');
                setHighlightedIndex(0);
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [open, allowCustom, searchQuery, selectedOption, value, onValueChange]);

    // Focus input when dropdown opens
    React.useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const handleSelect = (optionValue: string) => {
        const option = options.find((opt) => opt.value === optionValue);
        if (option?.disabled) return;
        onValueChange?.(optionValue);
        setOpen(false);
        setSearchQuery('');
        setHighlightedIndex(0);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (!open) setOpen(true);
    };

    const handleInputFocus = () => {
        setOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setOpen(false);
            setSearchQuery('');
            setHighlightedIndex(0);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) {
                setOpen(true);
            } else {
                setHighlightedIndex((prev) => {
                    let newIndex = prev;
                    for (let i = prev + 1; i < filteredOptions.length; i++) {
                        if (!filteredOptions[i]?.disabled) {
                            newIndex = i;
                            break;
                        }
                    }
                    setTimeout(() => {
                        optionRefs.current[newIndex]?.scrollIntoView({
                            block: 'nearest',
                        });
                    }, 0);
                    return newIndex;
                });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (open) {
                setHighlightedIndex((prev) => {
                    let newIndex = prev;
                    for (let i = prev - 1; i >= 0; i--) {
                        if (!filteredOptions[i]?.disabled) {
                            newIndex = i;
                            break;
                        }
                    }
                    setTimeout(() => {
                        optionRefs.current[newIndex]?.scrollIntoView({
                            block: 'nearest',
                        });
                    }, 0);
                    return newIndex;
                });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && filteredOptions.length > 0) {
                const highlighted = filteredOptions[highlightedIndex];
                const fallback = filteredOptions.find((opt) => !opt.disabled);
                const selected = highlighted && !highlighted.disabled ? highlighted : fallback;
                if (selected) {
                    handleSelect(selected.value);
                }
            } else if (open && showCreate) {
                handleSelect(trimmedQuery);
            } else if (!open) {
                setOpen(true);
            }
        }
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <div className="relative">
                <Input
                    ref={inputRef}
                    type="text"
                    value={open ? searchQuery : selectedOption?.label ?? value ?? ''}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                        !selectedOption && open && 'text-muted-foreground'
                    )}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="combobox-options"
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
                    id="combobox-options"
                    className="absolute z-[60] w-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                >
                    {filteredOptions.length === 0 && !showCreate ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className="p-1">
                            {showCreate && (
                                <div
                                    onClick={() => handleSelect(trimmedQuery)}
                                    className="relative flex w-full cursor-default select-none items-center gap-1 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    role="option"
                                    aria-selected={false}
                                >
                                    <span className="truncate">{trimmedQuery}</span>
                                </div>
                            )}
                            {filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    ref={(el) => {
                                        optionRefs.current[index] = el;
                                    }}
                                    onClick={() => {
                                        if (!option.disabled) handleSelect(option.value);
                                    }}
                                    onMouseEnter={() => {
                                        if (!option.disabled) setHighlightedIndex(index);
                                    }}
                                    className={cn(
                                        'relative flex w-full select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                                        option.disabled
                                            ? 'cursor-default px-2 pl-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'
                                            : 'cursor-default hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                                        !option.disabled &&
                                            value === option.value &&
                                            'bg-accent text-accent-foreground',
                                        !option.disabled &&
                                            highlightedIndex === index &&
                                            'bg-accent text-accent-foreground',
                                        option.className
                                    )}
                                    role={option.disabled ? 'presentation' : 'option'}
                                    aria-selected={option.disabled ? undefined : value === option.value}
                                    aria-disabled={option.disabled || undefined}
                                >
                                    {!option.disabled && value === option.value && (
                                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                            <Check className="h-4 w-4" />
                                        </span>
                                    )}
                                    {option.renderLabel ? option.renderLabel(option.label) : option.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

