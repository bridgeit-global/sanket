'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
    BarChart3,
    Calendar as CalendarIcon,
    TrendingUp,
    CheckCircle,
    Clock,
    AlertCircle,
    Download,
    RefreshCw
} from 'lucide-react';

interface AnalyticsData {
    overview: {
        totalEvents: number;
        completionRate: number;
    };
    eventsByStatus: Record<string, number>;
    eventsByType: Record<string, number>;
    eventsByPriority: Record<string, number>;
    monthlyTrend: Array<{
        month: string;
        count: number;
    }>;
    recentEvents: Array<{
        id: string;
        title: string;
        eventType: string;
        status: string;
        priority: string;
        startTime: string;
        createdAt: string;
    }>;
}

export function CalendarAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/calendar/analytics');

            if (!response.ok) {
                throw new Error('Failed to fetch analytics');
            }

            const analyticsData = await response.json();
            setData(analyticsData);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'text-yellow-600 bg-yellow-100';
            case 'in_progress':
                return 'text-blue-600 bg-blue-100';
            case 'completed':
                return 'text-green-600 bg-green-100';
            case 'cancelled':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full size-8 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-2 text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Error: {error}</p>
                    <Button onClick={fetchAnalytics} variant="outline">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Calendar Analytics</h2>
                    <p className="text-gray-600">Event statistics and insights</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAnalytics}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <CalendarIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Events</p>
                                <p className="text-2xl font-bold text-gray-900">{data.overview.totalEvents}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                                <p className="text-2xl font-bold text-gray-900">{data.overview.completionRate}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                                <p className="text-2xl font-bold text-gray-900">{data.eventsByStatus.scheduled || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">High Priority</p>
                                <p className="text-2xl font-bold text-gray-900">{data.eventsByPriority.high || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Events by Type */}
                <Card>
                    <CardHeader>
                        <CardTitle>Events by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(data.eventsByType).map(([type, count]) => {
                                const percentage = data.overview.totalEvents > 0
                                    ? (count / data.overview.totalEvents) * 100
                                    : 0;

                                return (
                                    <div key={type} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getEventTypeIcon(type)}</span>
                                                <span className="font-medium capitalize">
                                                    {type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-600">
                                                {count} ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Events by Priority */}
                <Card>
                    <CardHeader>
                        <CardTitle>Events by Priority</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(data.eventsByPriority).map(([priority, count]) => {
                                const percentage = data.overview.totalEvents > 0
                                    ? (count / data.overview.totalEvents) * 100
                                    : 0;

                                return (
                                    <div key={priority} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium capitalize">{priority}</span>
                                            <span className="text-sm text-gray-600">
                                                {count} ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${priority === 'urgent' ? 'bg-black' :
                                                    priority === 'high' ? 'bg-red-500' :
                                                        priority === 'medium' ? 'bg-yellow-500' :
                                                            'bg-green-500'
                                                    }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Events */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Events</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.recentEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{getEventTypeIcon(event.eventType)}</span>
                                    <div>
                                        <p className="font-medium text-sm">{event.title}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(event.startTime).toLocaleDateString()} at{' '}
                                            {new Date(event.startTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(event.priority)}`}
                                    >
                                        {event.priority}
                                    </span>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                                    >
                                        {event.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
