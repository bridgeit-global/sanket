import type { CalendarEvent } from '@/lib/db/schema';

export interface ExpandedCalendarEvent extends CalendarEvent {
    isRecurringInstance?: boolean;
    originalEventId?: string;
    instanceDate?: Date;
}

/**
 * Generates recurring event instances for a given event
 */
export function generateRecurringInstances(
    event: CalendarEvent,
    startDate: Date,
    endDate: Date
): ExpandedCalendarEvent[] {
    if (!event.isRecurring || !event.recurrencePattern) {
        return [event];
    }

    const instances: ExpandedCalendarEvent[] = [];
    const originalStart = new Date(event.startTime);
    const originalEnd = new Date(event.endTime);
    const recurrenceEnd = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null;

    // Calculate the duration of the event
    const eventDuration = originalEnd.getTime() - originalStart.getTime();

    let currentDate = new Date(originalStart);
    const interval = event.recurrenceInterval || 1;

    // Generate instances until we reach the end date or recurrence end date
    while (currentDate <= endDate) {
        // Skip if this instance is before the requested start date
        if (currentDate >= startDate) {
            // Check if we've exceeded the recurrence end date
            if (recurrenceEnd && currentDate > recurrenceEnd) {
                break;
            }

            // Create a new instance
            const instanceStart = new Date(currentDate);
            const instanceEnd = new Date(instanceStart.getTime() + eventDuration);

            const instance: ExpandedCalendarEvent = {
                ...event,
                id: `${event.id}_${currentDate.getTime()}`, // Unique ID for this instance
                startTime: instanceStart,
                endTime: instanceEnd,
                isRecurringInstance: true,
                originalEventId: event.id,
                instanceDate: new Date(currentDate),
            };

            instances.push(instance);
        }

        // Move to the next occurrence based on the pattern
        switch (event.recurrencePattern) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + interval);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + (7 * interval));
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + interval);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + interval);
                break;
            default:
                // Unknown pattern, stop generating
                return instances;
        }
    }

    return instances;
}

/**
 * Expands all events in a list, generating recurring instances
 */
export function expandRecurringEvents(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date
): ExpandedCalendarEvent[] {
    const expandedEvents: ExpandedCalendarEvent[] = [];

    for (const event of events) {
        const instances = generateRecurringInstances(event, startDate, endDate);
        expandedEvents.push(...instances);
    }

    // Sort by start time
    return expandedEvents.sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
}

/**
 * Checks if an event should be visible in a given date range
 */
export function isEventInRange(
    event: CalendarEvent,
    startDate: Date,
    endDate: Date
): boolean {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // Event is visible if it overlaps with the date range
    return (
        (eventStart >= startDate && eventStart <= endDate) ||
        (eventEnd >= startDate && eventEnd <= endDate) ||
        (eventStart <= startDate && eventEnd >= endDate)
    );
}
