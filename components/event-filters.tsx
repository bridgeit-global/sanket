'use client';

import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Search } from 'lucide-react';

interface EventFiltersProps {
    filters: {
        eventType: string;
        status: string;
        priority: string;
        search: string;
    };
    onFiltersChange: (filters: {
        eventType: string;
        status: string;
        priority: string;
        search: string;
    }) => void;
    onClose: () => void;
}

export function EventFilters({ filters, onFiltersChange, onClose }: EventFiltersProps) {
    const handleFilterChange = (field: string, value: string) => {
        onFiltersChange({
            ...filters,
            [field]: value,
        });
    };

    const clearFilters = () => {
        onFiltersChange({
            eventType: '',
            status: '',
            priority: '',
            search: '',
        });
    };

    const eventTypes = [
        { value: 'voter_engagement', label: 'Voter Engagement', icon: '🏠' },
        { value: 'public_meeting', label: 'Public Meeting', icon: '🏛️' },
        { value: 'training', label: 'Training Session', icon: '📊' },
        { value: 'administrative', label: 'Administrative', icon: '📋' },
    ];

    const statuses = [
        { value: 'scheduled', label: 'Scheduled', color: 'text-yellow-600' },
        { value: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
        { value: 'completed', label: 'Completed', color: 'text-green-600' },
        { value: 'cancelled', label: 'Cancelled', color: 'text-red-600' },
    ];

    const priorities = [
        { value: 'low', label: 'Low Priority', color: 'text-green-600' },
        { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600' },
        { value: 'high', label: 'High Priority', color: 'text-red-600' },
        { value: 'urgent', label: 'Urgent', color: 'text-black' },
    ];

    const hasActiveFilters = Object.values(filters).some(value => value !== '');

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Event Filters
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                            >
                                Clear All
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="search">Search Events</Label>
                        <Input
                            id="search"
                            placeholder="Search by title or description..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="eventType">Event Type</Label>
                        <Select
                            value={filters.eventType || 'all'}
                            onValueChange={(value) => handleFilterChange('eventType', value === 'all' ? '' : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Event Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Event Types</SelectItem>
                                {eventTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        <span className="flex items-center gap-2">
                                            <span>{type.icon}</span>
                                            <span>{type.label}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {statuses.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        <span className={status.color}>{status.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                            value={filters.priority || 'all'}
                            onValueChange={(value) => handleFilterChange('priority', value === 'all' ? '' : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                {priorities.map((priority) => (
                                    <SelectItem key={priority.value} value={priority.value}>
                                        <span className={priority.color}>{priority.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {hasActiveFilters && (
                    <div className="pt-4 border-t">
                        <div className="flex flex-wrap gap-2">
                            {filters.search && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                    Search: &quot;{filters.search}&quot;
                                    <button
                                        onClick={() => handleFilterChange('search', '')}
                                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {filters.eventType && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                    Type: {eventTypes.find(t => t.value === filters.eventType)?.label}
                                    <button
                                        onClick={() => handleFilterChange('eventType', '')}
                                        className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {filters.status && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                    Status: {statuses.find(s => s.value === filters.status)?.label}
                                    <button
                                        onClick={() => handleFilterChange('status', '')}
                                        className="ml-1 hover:bg-yellow-200 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {filters.priority && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                    Priority: {priorities.find(p => p.value === filters.priority)?.label}
                                    <button
                                        onClick={() => handleFilterChange('priority', '')}
                                        className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
