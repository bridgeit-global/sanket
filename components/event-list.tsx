'use client';

import React from 'react';
import { CalendarEvent } from '@/lib/db/schema';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    User,
    Edit,
    Eye,
    Trash2
} from 'lucide-react';

interface EventListProps {
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    getEventTypeIcon: (eventType: string) => string;
    getPriorityColor: (priority: string) => string;
}

export function EventList({
    events,
    onEventClick,
    getEventTypeIcon,
    getPriorityColor,
}: EventListProps) {
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
                return 'bg-yellow-100 text-yellow-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
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

    if (events.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                    <p className="text-gray-500 text-center">
                        No events match your current filters. Try adjusting your search criteria.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {events.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{getEventTypeIcon(event.eventType)}</span>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                                            {event.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {getEventTypeLabel(event.eventType)}
                                        </p>
                                    </div>
                                </div>

                                {event.description && (
                                    <p className="text-gray-700 mb-3 line-clamp-2">
                                        {event.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                                    <div className="flex items-center gap-1">
                                        <CalendarIcon className="h-4 w-4" />
                                        <span>{formatDate(event.startTime)}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant="secondary"
                                        className={getPriorityColor(event.priority)}
                                    >
                                        {event.priority}
                                    </Badge>

                                    <Badge
                                        variant="outline"
                                        className={getStatusColor(event.status)}
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
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEventClick(event)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
