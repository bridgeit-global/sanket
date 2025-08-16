'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Loader2, Search } from 'lucide-react';

interface DynamicTargetAudienceProps {
    serviceType: 'one-to-one' | 'one-to-many';
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

interface VoterOption {
    value: string;
    label: string;
    voter?: any;
}

interface PartOption {
    value: string;
    label: string;
    part_no: number;
    voter_count: number;
}

export function DynamicTargetAudience({
    serviceType,
    value,
    onChange,
    disabled = false
}: DynamicTargetAudienceProps) {
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchVoterIds = async (search: string = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('limit', '50');

            const response = await fetch(`/api/beneficiary/voter-ids?${params}`);
            const data = await response.json();

            if (data.success) {
                setOptions(data.voters);
            }
        } catch (error) {
            console.error('Error fetching voter IDs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPartNumbers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/beneficiary/part-numbers');
            const data = await response.json();

            if (data.success) {
                setOptions(data.parts);
            }
        } catch (error) {
            console.error('Error fetching part numbers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (serviceType === 'one-to-one') {
            fetchVoterIds(searchTerm);
        } else {
            fetchPartNumbers();
        }
    }, [serviceType]);

    useEffect(() => {
        if (serviceType === 'one-to-one' && searchTerm) {
            // Debounce search for voter IDs
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            const timeout = setTimeout(() => {
                fetchVoterIds(searchTerm);
            }, 300);

            setSearchTimeout(timeout);
        }
    }, [searchTerm, serviceType]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setShowSuggestions(true);
    };

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getPlaceholder = () => {
        if (serviceType === 'one-to-one') {
            return 'Search for voter ID, name, or family...';
        } else {
            return 'Select a part number...';
        }
    };

    const getLabel = () => {
        if (serviceType === 'one-to-one') {
            return 'Target Voter ID';
        } else {
            return 'Target Part Number';
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor="targetAudience">{getLabel()}</Label>

            {serviceType === 'one-to-one' ? (
                <div className="space-y-2">
                    <div className="relative" ref={containerRef}>
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={getPlaceholder()}
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-10"
                            disabled={disabled}
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading voters...
                        </div>
                    ) : (
                        <div className="relative">
                            <Select value={value} onValueChange={onChange} disabled={disabled}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a voter..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {options.length === 0 && searchTerm && (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            No voters found for &quot;{searchTerm}&quot;
                                        </div>
                                    )}
                                    {options.map((option: VoterOption) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs">{option.value}</span>
                                                <span className="truncate">{option.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Show search suggestions when typing */}
                            {showSuggestions && searchTerm && options.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {options.map((option: VoterOption) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onChange(option.value);
                                                setSearchTerm('');
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full p-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs">{option.value}</span>
                                                <span className="truncate">{option.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <Select value={value} onValueChange={onChange} disabled={disabled}>
                    <SelectTrigger>
                        <SelectValue placeholder={getPlaceholder()} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option: PartOption) => (
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Part {option.part_no}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {option.voter_count} voters
                                    </Badge>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {serviceType === 'one-to-one' && (
                <p className="text-xs text-muted-foreground">
                    Search by voter ID, name, or family name. Select a voter to target for individual services.
                </p>
            )}

            {serviceType === 'one-to-many' && (
                <p className="text-xs text-muted-foreground">
                    Select a part number to target all voters in that area for community services.
                </p>
            )}
        </div>
    );
} 