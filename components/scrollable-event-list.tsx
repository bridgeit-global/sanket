'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CalendarEvent } from '@/lib/db/schema';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    Calendar as CalendarIcon,
    Clock,
    Edit,
    Eye,
    ChevronUp,
    ChevronDown
} from 'lucide-react';

interface ScrollableEventListProps {
    onEventClick: (event: CalendarEvent) => void;
    getEventTypeIcon: (eventType: string) => string;
    getPriorityColor: (priority: string) => string;
    userRole: string;
    filters: {
        eventType: string;
        status: string;
        priority: string;
        search: string;
    };
}

interface PaginationState {
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    isLoading: boolean;
    totalEvents: number;
}

export function ScrollableEventList({
    onEventClick,
    getEventTypeIcon,
    getPriorityColor,
    userRole,
    filters,
}: ScrollableEventListProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 0,
        hasNextPage: true,
        hasPreviousPage: false,
        isLoading: false,
        totalEvents: 0,
    });
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef<HTMLDivElement>(null);
    const topLoadingRef = useRef<HTMLDivElement>(null);

    const EVENTS_PER_PAGE = 10;

    // Fetch events for a specific page
    const fetchEvents = useCallback(async (page: number, direction: 'next' | 'previous' | 'initial') => {
        try {
            setPagination(prev => ({ ...prev, isLoading: true }));
            setError(null);

            // Calculate date range - always use a wide range to get all events
            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1); // Go back 1 year
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1); // Go forward 1 year

            const params = new URLSearchParams();
            params.append('startDate', startDate.toISOString());
            params.append('endDate', endDate.toISOString());
            params.append('limit', EVENTS_PER_PAGE.toString());
            params.append('offset', (page * EVENTS_PER_PAGE).toString());

            // Add filters
            if (filters.eventType) params.append('eventType', filters.eventType);
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.search) params.append('search', filters.search);

            const response = await fetch(`/api/calendar/events?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }

            const data = await response.json();
            const newEvents = data.events || [];

            setEvents(prevEvents => {
                if (direction === 'next') {
                    return [...prevEvents, ...newEvents];
                } else if (direction === 'previous') {
                    return [...newEvents, ...prevEvents];
                } else {
                    return newEvents;
                }
            });

            setPagination(prev => ({
                ...prev,
                currentPage: page,
                hasNextPage: newEvents.length === EVENTS_PER_PAGE,
                hasPreviousPage: page > 0,
                isLoading: false,
                totalEvents: data.total || (page * EVENTS_PER_PAGE + newEvents.length),
            }));

        } catch (err) {
            console.error('Error fetching events:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch events');
            setPagination(prev => ({ ...prev, isLoading: false }));
        }
    }, [currentDate, filters]);

    // Load next page
    const loadNextPage = useCallback(() => {
        if (!pagination.isLoading && pagination.hasNextPage) {
            fetchEvents(pagination.currentPage + 1, 'next');
        }
    }, [pagination, fetchEvents]);

    // Load previous page
    const loadPreviousPage = useCallback(() => {
        if (!pagination.isLoading && pagination.hasPreviousPage) {
            fetchEvents(pagination.currentPage - 1, 'previous');
        }
    }, [pagination, fetchEvents]);

    // Intersection observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0];
                if (target.isIntersecting) {
                    if (target.target === loadingRef.current) {
                        loadNextPage();
                    } else if (target.target === topLoadingRef.current) {
                        loadPreviousPage();
                    }
                }
            },
            { threshold: 0.1 }
        );

        if (loadingRef.current) {
            observer.observe(loadingRef.current);
        }
        if (topLoadingRef.current) {
            observer.observe(topLoadingRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [loadNextPage, loadPreviousPage]);

    // Initial load
    useEffect(() => {
        fetchEvents(0, 'initial');
    }, [fetchEvents]);

    // Reset when filters change
    useEffect(() => {
        setEvents([]);
        setPagination({
            currentPage: 0,
            hasNextPage: true,
            hasPreviousPage: false,
            isLoading: false,
            totalEvents: 0,
        });
        fetchEvents(0, 'initial');
    }, [filters]);

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'bg-yellow-200 text-yellow-900 border-yellow-300';
            case 'in_progress':
                return 'bg-blue-200 text-blue-900 border-blue-300';
            case 'completed':
                return 'bg-green-200 text-green-900 border-green-300';
            case 'cancelled':
                return 'bg-red-200 text-red-900 border-red-300';
            default:
                return 'bg-gray-200 text-gray-900 border-gray-300';
        }
    };

    const getEventTypeLabel = (eventType: string) => {
        switch (eventType) {
            case 'voter_engagement':
                return 'Voter Engagement';
            case 'public_meeting':
                return 'Public Meeting';
            case 'training':
                return 'Training Session';
            case 'administrative':
                return 'Administrative';
            default:
                return eventType;
        }
    };

    if (error) {
        return (
            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <CalendarIcon className="h-12 w-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Error loading events</h3>
                    <p className="text-red-300 text-center mb-4">{error}</p>
                    <Button
                        onClick={() => fetchEvents(0, 'initial')}
                        variant="outline"
                        className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
                    >
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Top loading indicator */}
            {pagination.hasPreviousPage && (
                <div ref={topLoadingRef} className="flex justify-center py-4">
                    {pagination.isLoading ? (
                        <div className="flex items-center gap-2 text-gray-300">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300" />
                            <span className="font-medium">Loading previous events...</span>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadPreviousPage}
                            className="flex items-center gap-2 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
                        >
                            <ChevronUp className="h-4 w-4" />
                            Load Previous Events
                        </Button>
                    )}
                </div>
            )}

            {/* Events list */}
            {events.length === 0 && !pagination.isLoading ? (
                <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <CalendarIcon className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No events found</h3>
                        <p className="text-gray-300 text-center">
                            No events match your current filters. Try adjusting your search criteria.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                events.map((event) => (
                    <Card key={event.id} className="hover:shadow-lg transition-all duration-200 bg-gray-800 border-gray-700 hover:bg-gray-750">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">{getEventTypeIcon(event.eventType)}</span>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white truncate">
                                                {event.title}
                                            </h3>
                                            <p className="text-sm text-gray-200 font-medium">
                                                {getEventTypeLabel(event.eventType)}
                                            </p>
                                        </div>
                                    </div>

                                    {event.description && (
                                        <p className="text-gray-300 mb-3 line-clamp-2">
                                            {event.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-3">
                                        <div className="flex items-center gap-1">
                                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{formatDate(event.startTime)}</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">
                                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className={`${getPriorityColor(event.priority)} border font-medium`}
                                        >
                                            {event.priority}
                                        </Badge>

                                        <Badge
                                            variant="outline"
                                            className={`${getStatusColor(event.status)} border font-medium`}
                                        >
                                            {event.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEventClick(event)}
                                        className="text-gray-300 hover:text-white hover:bg-gray-700"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    {['admin', 'back-office'].includes(userRole) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEventClick(event)}
                                            className="text-gray-300 hover:text-white hover:bg-gray-700"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}

            {/* Bottom loading indicator */}
            {pagination.hasNextPage && (
                <div ref={loadingRef} className="flex justify-center py-4">
                    {pagination.isLoading ? (
                        <div className="flex items-center gap-2 text-gray-300">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300" />
                            <span className="font-medium">Loading more events...</span>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadNextPage}
                            className="flex items-center gap-2 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
                        >
                            <ChevronDown className="h-4 w-4" />
                            Load More Events
                        </Button>
                    )}
                </div>
            )}

            {/* End of list indicator */}
            {!pagination.hasNextPage && events.length > 0 && (
                <div className="flex justify-center py-4">
                    <p className="text-gray-400 text-sm font-medium">No more events to load</p>
                </div>
            )}
        </div>
    );
}
