'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface ComboboxOption {
    value: string;
    label: string;
    className?: string;
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
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = 'Select an option...',
    disabled = false,
    className,
    emptyMessage = 'No options found',
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const optionRefs = React.useRef<(HTMLDivElement | null)[]>([]);

    const selectedOption = options.find((opt) => opt.value === value);

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter(
            (opt) => opt.label.toLowerCase().includes(query)
        );
    }, [options, searchQuery]);

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
                setOpen(false);
                setSearchQuery('');
                setHighlightedIndex(0);
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [open]);

    // Focus input when dropdown opens
    React.useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const handleSelect = (optionValue: string) => {
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
                    const newIndex = prev < filteredOptions.length - 1 ? prev + 1 : prev;
                    // Scroll into view after state update
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
                    const newIndex = prev > 0 ? prev - 1 : 0;
                    // Scroll into view after state update
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
                handleSelect(filteredOptions[highlightedIndex]?.value || filteredOptions[0].value);
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
                    value={open ? searchQuery : selectedOption?.label || ''}
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
                    className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                >
                    {filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    ref={(el) => {
                                        optionRefs.current[index] = el;
                                    }}
                                    onClick={() => handleSelect(option.value)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    className={cn(
                                        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                                        value === option.value && 'bg-accent text-accent-foreground',
                                        highlightedIndex === index && 'bg-accent text-accent-foreground',
                                        option.className
                                    )}
                                    role="option"
                                    aria-selected={value === option.value}
                                >
                                    {value === option.value && (
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

