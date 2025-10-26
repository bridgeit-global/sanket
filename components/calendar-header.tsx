'use client';

import React from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarHeaderProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'month' | 'week' | 'day';
}

export function CalendarHeader({ currentDate, onDateChange, view }: CalendarHeaderProps) {
    const formatDate = (date: Date, view: 'month' | 'week' | 'day') => {
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
        };

        if (view === 'week') {
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
            } else {
                return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${startOfWeek.getFullYear()}`;
            }
        } else if (view === 'day') {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } else {
            return date.toLocaleDateString('en-US', options);
        }
    };

    const navigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);

        switch (view) {
            case 'month':
                newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
                break;
            case 'day':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
                break;
        }

        onDateChange(newDate);
    };

    const goToToday = () => {
        onDateChange(new Date());
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('prev')}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('next')}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">
                    {formatDate(currentDate, view)}
                </h2>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                    <CalendarIcon className="h-4 w-4" />
                    Today
                </Button>
            </div>

            <div className="w-20" /> {/* Spacer for centering */}
        </div>
    );
}
