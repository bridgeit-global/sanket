'use client';

import React from 'react';
import type { CalendarEvent } from '@/lib/db/schema';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
    events: CalendarEvent[];
    currentDate: Date;
    view: 'month' | 'week' | 'day';
    onEventClick: (event: CalendarEvent) => void;
    getEventTypeIcon: (eventType: string) => string;
    getPriorityColor: (priority: string) => string;
}

export function CalendarGrid({
    events,
    currentDate,
    view,
    onEventClick,
    getEventTypeIcon,
    getPriorityColor,
}: CalendarGridProps) {
    // Get days for the current view
    const getDaysForView = () => {
        const days = [];
        const startOfPeriod = getStartOfPeriod(currentDate, view);
        const endOfPeriod = getEndOfPeriod(currentDate, view);

        if (view === 'month') {
            // Month view: show 6 weeks (42 days)
            const startOfMonth = new Date(startOfPeriod);
            const startOfWeek = new Date(startOfMonth);
            startOfWeek.setDate(startOfMonth.getDate() - startOfMonth.getDay());

            for (let i = 0; i < 42; i++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                days.push(new Date(date));
            }
        } else if (view === 'week') {
            // Week view: show 7 days
            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfPeriod);
                date.setDate(startOfPeriod.getDate() + i);
                days.push(new Date(date));
            }
        } else {
            // Day view: show single day
            days.push(new Date(startOfPeriod));
        }

        return days;
    };

    const getStartOfPeriod = (date: Date, view: 'month' | 'week' | 'day'): Date => {
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

    const getEndOfPeriod = (date: Date, view: 'month' | 'week' | 'day'): Date => {
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

    // Get events for a specific day
    const getEventsForDay = (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return events.filter(event => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);

            return (
                (eventStart >= startOfDay && eventStart <= endOfDay) ||
                (eventEnd >= startOfDay && eventEnd <= endOfDay) ||
                (eventStart <= startOfDay && eventEnd >= endOfDay)
            );
        });
    };

    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    // Check if date is in current month (for month view)
    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    const days = getDaysForView();

    if (view === 'day') {
        const dayEvents = getEventsForDay(days[0]);


        const hours = Array.from({ length: 24 }, (_, i) => i);

        return (
            <Card>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 divide-y">
                        {hours.map((hour) => {
                            const hourStart = new Date(days[0]);
                            hourStart.setHours(hour, 0, 0, 0);
                            const hourEnd = new Date(days[0]);
                            hourEnd.setHours(hour, 59, 59, 999);

                            const hourEvents = dayEvents.filter(event => {
                                const eventStart = new Date(event.startTime);
                                const eventEnd = new Date(event.endTime);

                                // Show event in the hour where it starts
                                return eventStart >= hourStart && eventStart < hourEnd;
                            });

                            return (
                                <div key={hour} className="flex min-h-[60px] border-b border-gray-700">
                                    <div className="w-20 p-2 text-sm text-gray-300 border-r border-gray-700">
                                        {hour.toString().padStart(2, '0')}:00
                                    </div>
                                    <div className="flex-1 p-2 relative">
                                        {hourEvents.map((event) => {
                                            const eventStart = new Date(event.startTime);
                                            const eventEnd = new Date(event.endTime);
                                            const eventStartHour = eventStart.getHours();
                                            const eventEndHour = eventEnd.getHours();
                                            const eventStartMinute = eventStart.getMinutes();
                                            const eventEndMinute = eventEnd.getMinutes();

                                            // Calculate the height and position for the event block
                                            const totalMinutes = (eventEndHour - eventStartHour) * 60 + (eventEndMinute - eventStartMinute);
                                            const height = Math.max(40, (totalMinutes / 60) * 60); // Minimum 40px height
                                            const topOffset = (eventStartMinute / 60) * 60; // Offset within the hour

                                            return (
                                                <div
                                                    key={event.id}
                                                    className="absolute inset-x-2 p-2 rounded cursor-pointer hover:bg-gray-700 border-l-4 border-blue-500 bg-gray-800 shadow-sm"
                                                    style={{
                                                        height: `${height}px`,
                                                        top: `${topOffset}px`,
                                                        zIndex: 10
                                                    }}
                                                    onClick={() => onEventClick(event)}
                                                >
                                                    <div className="flex items-center gap-2 h-full">
                                                        <span className="text-sm">{getEventTypeIcon(event.eventType)}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate text-white">{event.title}</div>
                                                            <div className="text-xs text-gray-400">
                                                                {eventStart.toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })} - {eventEnd.toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(event.priority)}`}
                                                        >
                                                            {event.priority}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="grid grid-cols-7 divide-x divide-y">
                    {/* Header for month/week view */}
                    {(view === 'month' || view === 'week') &&
                        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="p-2 text-center font-medium text-gray-200 bg-gray-800 border-b border-gray-700">
                                {day}
                            </div>
                        ))
                    }

                    {/* Calendar days */}
                    {days.map((date) => {
                        const dayEvents = getEventsForDay(date);
                        const isCurrentDay = isToday(date);
                        const isCurrentMonthDay = view === 'month' ? isCurrentMonth(date) : true;

                        return (
                            <div
                                key={date.toISOString()}
                                className={cn(
                                    'min-h-[120px] p-2 border-r border-b border-gray-700',
                                    !isCurrentMonthDay && 'bg-gray-900 text-gray-500',
                                    isCurrentDay && 'bg-blue-900'
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span
                                        className={cn(
                                            'text-sm font-medium text-white',
                                            isCurrentDay && 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                                        )}
                                    >
                                        {date.getDate()}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    {dayEvents.slice(0, 3).map((event) => (
                                        <div
                                            key={event.id}
                                            className="text-xs p-1 rounded cursor-pointer hover:bg-gray-700 truncate bg-gray-800"
                                            onClick={() => onEventClick(event)}
                                            title={event.title}
                                        >
                                            <div className="flex items-center gap-1">
                                                <span>{getEventTypeIcon(event.eventType)}</span>
                                                <span className="truncate text-white">{event.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-xs text-gray-400">
                                            +{dayEvents.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
