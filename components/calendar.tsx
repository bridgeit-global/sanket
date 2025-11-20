'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CalendarEvent } from '@/lib/db/schema';
import { CalendarGrid } from './calendar-grid';
import { EventModal } from './event-modal';
import { EventFilters } from './event-filters';
import { CalendarHeader } from './calendar-header';
import { ScrollableEventList } from './scrollable-event-list';
import { CalendarAnalytics } from './calendar-analytics';
import { Button } from './ui/button';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
    Calendar as CalendarIcon,
    List,
    BarChart3,
    Plus,
    Filter
} from 'lucide-react';

export type CalendarView = 'month' | 'week' | 'day' | 'list';

interface CalendarProps {
    userRole: string;
    embedLayout?: boolean;
}

export function Calendar({ userRole, embedLayout = false }: CalendarProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarView>('list');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        eventType: '',
        status: '',
        priority: '',
        search: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // Fetch events
    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();

            // Add date range based on current view
            const startOfPeriod = getStartOfPeriod(currentDate, view);
            const endOfPeriod = getEndOfPeriod(currentDate, view);

            params.append('startDate', startOfPeriod.toISOString());
            params.append('endDate', endOfPeriod.toISOString());

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
            setEvents(data.events || []);
        } catch (err) {
            console.error('Error fetching events:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch events');
        } finally {
            setLoading(false);
        }
    }, [currentDate, view, filters]);

    // Helper functions for date calculations
    const getStartOfPeriod = (date: Date, view: CalendarView): Date => {
        const d = new Date(date);
        switch (view) {
            case 'month': {
                d.setDate(1);
                d.setHours(0, 0, 0, 0);
                return d;
            }
            case 'week': {
                const day = d.getDay();
                d.setDate(d.getDate() - day);
                d.setHours(0, 0, 0, 0);
                return d;
            }
            case 'day': {
                d.setHours(0, 0, 0, 0);
                return d;
            }
            default:
                return d;
        }
    };

    const getEndOfPeriod = (date: Date, view: CalendarView): Date => {
        const d = new Date(date);
        switch (view) {
            case 'month': {
                d.setMonth(d.getMonth() + 1, 0);
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'week': {
                d.setDate(d.getDate() - d.getDay() + 6);
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'day': {
                d.setHours(23, 59, 59, 999);
                return d;
            }
            default:
                return d;
        }
    };

    // Fetch events when dependencies change
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Handle event creation/update
    const handleEventSave = async (eventData: Partial<CalendarEvent>) => {
        try {
            const url = selectedEvent ? `/api/calendar/events/${selectedEvent.id}` : '/api/calendar/events';
            const method = selectedEvent ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (!response.ok) {
                throw new Error('Failed to save event');
            }

            await fetchEvents();
            setIsEventModalOpen(false);
            setSelectedEvent(null);
        } catch (err) {
            console.error('Error saving event:', err);
            setError(err instanceof Error ? err.message : 'Failed to save event');
        }
    };

    // Handle event deletion
    const handleEventDelete = async (eventId: string) => {
        try {
            const response = await fetch(`/api/calendar/events/${eventId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete event');
            }

            await fetchEvents();
            setIsEventModalOpen(false);
            setSelectedEvent(null);
        } catch (err) {
            console.error('Error deleting event:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete event');
        }
    };

    // Handle event click
    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsEventModalOpen(true);
    };

    // Handle new event creation
    const handleNewEvent = () => {
        setSelectedEvent(null);
        setIsEventModalOpen(true);
    };

    // Get today's events
    const todaysEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate >= today && eventDate < tomorrow;
        });
    }, [events]);

    // Get event type icon
    const getEventTypeIcon = (eventType: string) => {
        switch (eventType) {
            case 'voter_engagement':
                return '🏠';
            case 'public_meeting':
                return '🏛️';
            case 'training':
                return '📊';
            case 'administrative':
                return '📋';
            default:
                return '📅';
        }
    };

    // Get priority color
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'text-black bg-black';
            case 'high':
                return 'text-red-600 bg-red-100';
            case 'medium':
                return 'text-yellow-600 bg-yellow-100';
            case 'low':
                return 'text-green-600 bg-green-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full size-8 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-2 text-gray-600">Loading calendar...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Error: {error}</p>
                    <Button onClick={fetchEvents} variant="outline">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    const headerTitleClass = `text-2xl font-bold ${embedLayout ? 'text-foreground' : 'text-white'}`;
    const headerSubtitleClass = embedLayout ? 'text-muted-foreground' : 'text-gray-300';
    const viewTabsListClass = `grid w-full grid-cols-4 ${
        embedLayout ? 'bg-muted border border-border rounded-md' : 'bg-gray-800 border border-gray-700'
    }`;
    const viewTabsTriggerClass = `flex items-center gap-2 ${
        embedLayout
            ? 'text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground'
            : 'text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white'
    }`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    {!embedLayout && <SidebarToggle />}
                    <div>
                        <h1 className={headerTitleClass}>Calendar</h1>
                        <p className={headerSubtitleClass}>Manage your events and schedule</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setShowFilters(!showFilters)}
                        variant="outline"
                        size="sm"
                    >
                        <Filter className="size-4 mr-2" />
                        Filters
                    </Button>

                    {['admin', 'back-office'].includes(userRole) && (
                        <Button onClick={handleNewEvent} size="sm">
                            <Plus className="size-4 mr-2" />
                            New Event
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <EventFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClose={() => setShowFilters(false)}
                />
            )}

            {/* Main Content */}
            <Tabs value={view} onValueChange={(value: string) => setView(value as CalendarView)}>
                <TabsList className={viewTabsListClass}>
                    <TabsTrigger value="list" className={viewTabsTriggerClass}>
                        <List className="size-4" />
                        List
                    </TabsTrigger>
                    <TabsTrigger value="day" className={viewTabsTriggerClass}>
                        <CalendarIcon className="size-4" />
                        Day
                    </TabsTrigger>
                    <TabsTrigger value="week" className={viewTabsTriggerClass}>
                        <CalendarIcon className="size-4" />
                        Week
                    </TabsTrigger>
                    <TabsTrigger value="month" className={viewTabsTriggerClass}>
                        <CalendarIcon className="size-4" />
                        Month
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    <ScrollableEventList
                        onEventClick={handleEventClick}
                        getEventTypeIcon={getEventTypeIcon}
                        getPriorityColor={getPriorityColor}
                        userRole={userRole}
                        filters={filters}
                    />
                </TabsContent>

                <TabsContent value="day" className="space-y-4">
                    <CalendarHeader
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        view="day"
                    />
                    <CalendarGrid
                        events={events}
                        currentDate={currentDate}
                        view="day"
                        onEventClick={handleEventClick}
                        getEventTypeIcon={getEventTypeIcon}
                        getPriorityColor={getPriorityColor}
                    />
                </TabsContent>

                <TabsContent value="week" className="space-y-4">
                    <CalendarHeader
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        view="week"
                    />
                    <CalendarGrid
                        events={events}
                        currentDate={currentDate}
                        view="week"
                        onEventClick={handleEventClick}
                        getEventTypeIcon={getEventTypeIcon}
                        getPriorityColor={getPriorityColor}
                    />
                </TabsContent>

                <TabsContent value="month" className="space-y-4">
                    <CalendarHeader
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        view="month"
                    />
                    <CalendarGrid
                        events={events}
                        currentDate={currentDate}
                        view="month"
                        onEventClick={handleEventClick}
                        getEventTypeIcon={getEventTypeIcon}
                        getPriorityColor={getPriorityColor}
                    />
                </TabsContent>
            </Tabs>

            {/* Today's Events Sidebar */}
            {todaysEvents.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="size-5" />
                            Today&apos;s Events ({todaysEvents.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {todaysEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleEventClick(event)}
                                >
                                    <span className="text-lg">{getEventTypeIcon(event.eventType)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{event.title}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(event.startTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(event.priority)}`}
                                    >
                                        {event.priority}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Analytics Tab for Admin */}
            {userRole === 'admin' && (
                <Tabs value={view} onValueChange={(value: string) => setView(value as CalendarView)}>
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="list">List</TabsTrigger>
                        <TabsTrigger value="day">Day</TabsTrigger>
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="analytics" className="flex items-center gap-2">
                            <BarChart3 className="size-4" />
                            Analytics
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="analytics">
                        <CalendarAnalytics />
                    </TabsContent>
                </Tabs>
            )}

            {/* Event Modal */}
            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => {
                    setIsEventModalOpen(false);
                    setSelectedEvent(null);
                }}
                event={selectedEvent}
                onSave={handleEventSave}
                onDelete={handleEventDelete}
                userRole={userRole}
            />
        </div>
    );
}
