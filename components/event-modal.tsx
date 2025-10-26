'use client';

import React, { useState, useEffect } from 'react';
import type { CalendarEvent } from '@/lib/db/schema';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { Trash2, Save } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent | null;
    onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
    onDelete: (eventId: string) => Promise<void>;
    userRole: string;
}

export function EventModal({
    isOpen,
    onClose,
    event,
    onSave,
    onDelete,
    userRole,
}: EventModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventType: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        priority: 'medium',
        status: 'scheduled',
        recurringPattern: 'none',
        recurringUntil: '',
        notes: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form data when event changes
    useEffect(() => {
        if (event) {
            const startDate = new Date(event.startTime);
            const endDate = new Date(event.endTime);

            setFormData({
                title: event.title,
                description: event.description || '',
                eventType: event.eventType,
                startDate: startDate.toISOString().split('T')[0],
                startTime: startDate.toTimeString().slice(0, 5),
                endDate: endDate.toISOString().split('T')[0],
                endTime: endDate.toTimeString().slice(0, 5),
                priority: event.priority,
                status: event.status,
                recurringPattern: event.recurrencePattern || 'none',
                recurringUntil: event.recurrenceEndDate ? new Date(event.recurrenceEndDate).toISOString().split('T')[0] : '',
                notes: '',
            });
        } else {
            // Reset form for new event
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            setFormData({
                title: '',
                description: '',
                eventType: '',
                startDate: now.toISOString().split('T')[0],
                startTime: '09:00',
                endDate: now.toISOString().split('T')[0], // Same date as start
                endTime: '17:00',
                priority: 'medium',
                status: 'scheduled',
                recurringPattern: 'none',
                recurringUntil: '',
                notes: '',
            });
        }
    }, [event]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate required fields
            if (!formData.title || !formData.eventType || !formData.startDate || !formData.endDate) {
                throw new Error('Please fill in all required fields');
            }

            // Validate that start and end dates are the same
            if (formData.startDate !== formData.endDate) {
                throw new Error('Start date and end date must be the same. Events can only span within a single day.');
            }

            // Combine date and time
            const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

            if (startDateTime >= endDateTime) {
                throw new Error('End time must be after start time');
            }

            const eventData = {
                title: formData.title,
                description: formData.description,
                eventType: formData.eventType as 'voter_engagement' | 'public_meeting' | 'training' | 'administrative',
                startTime: startDateTime,
                endTime: endDateTime,
                priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
                status: formData.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
                isRecurring: formData.recurringPattern !== 'none',
                recurrencePattern: formData.recurringPattern !== 'none' ? formData.recurringPattern as 'daily' | 'weekly' | 'monthly' | 'yearly' : null,
                recurrenceEndDate: formData.recurringUntil ? new Date(formData.recurringUntil) : null,
            };

            await onSave(eventData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save event');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;

        if (window.confirm('Are you sure you want to delete this event?')) {
            setLoading(true);
            try {
                await onDelete(event.id);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete event');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Auto-sync end date when start date changes
            if (field === 'startDate') {
                newData.endDate = value;
            }

            return newData;
        });
    };

    const eventTypes = [
        { value: 'voter_engagement', label: 'Voter Engagement', icon: '🏠' },
        { value: 'public_meeting', label: 'Public Meeting', icon: '🏛️' },
        { value: 'training', label: 'Training Session', icon: '📊' },
        { value: 'administrative', label: 'Administrative', icon: '📋' },
    ];

    const priorities = [
        { value: 'low', label: 'Low Priority', color: 'text-green-600' },
        { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600' },
        { value: 'high', label: 'High Priority', color: 'text-red-600' },
        { value: 'urgent', label: 'Urgent', color: 'text-black' },
    ];

    const statuses = [
        { value: 'scheduled', label: 'Scheduled', color: 'text-yellow-600' },
        { value: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
        { value: 'completed', label: 'Completed', color: 'text-green-600' },
        { value: 'cancelled', label: 'Cancelled', color: 'text-red-600' },
    ];

    const recurringPatterns = [
        { value: 'none', label: 'No Recurrence' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {event ? 'Edit Event' : 'Create New Event'}
                    </DialogTitle>
                    <DialogDescription>
                        {event ? 'Update the event details below.' : 'Fill in the details to create a new calendar event.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                placeholder="Enter event title"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="eventType">Event Type *</Label>
                            <Select
                                value={formData.eventType}
                                onValueChange={(value) => handleInputChange('eventType', value)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select event type" />
                                </SelectTrigger>
                                <SelectContent>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date *</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => handleInputChange('startDate', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time *</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => handleInputChange('startTime', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date *</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => handleInputChange('endDate', e.target.value)}
                                required
                                readOnly
                                className="bg-gray-50 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500">End date automatically matches start date</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endTime">End Time *</Label>
                            <Input
                                id="endTime"
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => handleInputChange('endTime', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(value) => handleInputChange('priority', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorities.map((priority) => (
                                        <SelectItem key={priority.value} value={priority.value}>
                                            <span className={priority.color}>{priority.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => handleInputChange('status', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                            <span className={status.color}>{status.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="recurringPattern">Recurring</Label>
                            <Select
                                value={formData.recurringPattern}
                                onValueChange={(value) => handleInputChange('recurringPattern', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {recurringPatterns.map((pattern) => (
                                        <SelectItem key={pattern.value} value={pattern.value}>
                                            {pattern.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.recurringPattern !== 'none' && (
                        <div className="space-y-2">
                            <Label htmlFor="recurringUntil">Recurring Until</Label>
                            <Input
                                id="recurringUntil"
                                type="date"
                                value={formData.recurringUntil}
                                onChange={(e) => handleInputChange('recurringUntil', e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Enter event description"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            placeholder="Enter additional notes"
                            rows={2}
                        />
                    </div>

                    <DialogFooter className="flex justify-between">
                        <div>
                            {event && ['admin', 'back-office'].includes(userRole) && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={loading}
                                >
                                    <Trash2 className="size-4 mr-2" />
                                    Delete
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            {['admin', 'back-office'].includes(userRole) && (
                                <Button type="submit" disabled={loading}>
                                    <Save className="size-4 mr-2" />
                                    {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
