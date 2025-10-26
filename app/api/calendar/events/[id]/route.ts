import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/queries';
import { calendarEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const event = await db
            .select()
            .from(calendarEvents)
            .where(eq(calendarEvents.id, id))
            .limit(1);

        if (event.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event[0]);
    } catch (error) {
        console.error('Error fetching calendar event:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendar event' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has permission to update events
        if (!['admin', 'back-office'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const {
            title,
            description,
            eventType,
            startTime,
            endTime,
            priority,
            status,
            isRecurring,
            recurrencePattern,
            recurrenceInterval,
            recurrenceEndDate,
            locationId,
            assignedTo,
            travelTimeMinutes,
            preparationTimeMinutes,
            googlePlaceId,
            locationName,
            locationAddress,
            locationLatitude,
            locationLongitude,
        } = body;

        // Check if event exists
        const existingEvent = await db
            .select()
            .from(calendarEvents)
            .where(eq(calendarEvents.id, id))
            .limit(1);

        if (existingEvent.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Validate event type if provided
        if (eventType) {
            const validEventTypes = ['voter_engagement', 'public_meeting', 'training', 'administrative'];
            if (!validEventTypes.includes(eventType)) {
                return NextResponse.json(
                    { error: 'Invalid event type' },
                    { status: 400 }
                );
            }
        }

        // Validate priority if provided
        if (priority) {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(priority)) {
                return NextResponse.json(
                    { error: 'Invalid priority' },
                    { status: 400 }
                );
            }
        }

        // Validate status if provided
        if (status) {
            const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return NextResponse.json(
                    { error: 'Invalid status' },
                    { status: 400 }
                );
            }
        }

        // Validate recurring pattern if provided
        if (recurrencePattern) {
            const validRecurringPatterns = ['daily', 'weekly', 'monthly', 'yearly'];
            if (!validRecurringPatterns.includes(recurrencePattern)) {
                return NextResponse.json(
                    { error: 'Invalid recurring pattern' },
                    { status: 400 }
                );
            }
        }

        // Validate dates if provided
        if (startTime && endTime) {
            const start = new Date(startTime);
            const end = new Date(endTime);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return NextResponse.json(
                    { error: 'Invalid date format' },
                    { status: 400 }
                );
            }

            if (start >= end) {
                return NextResponse.json(
                    { error: 'End date must be after start date' },
                    { status: 400 }
                );
            }
        }

        // Build update object with only provided fields
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (eventType !== undefined) updateData.eventType = eventType;
        if (startTime !== undefined) updateData.startTime = new Date(startTime);
        if (endTime !== undefined) updateData.endTime = new Date(endTime);
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;
        if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
        if (recurrencePattern !== undefined) updateData.recurrencePattern = recurrencePattern;
        if (recurrenceInterval !== undefined) updateData.recurrenceInterval = recurrenceInterval;
        if (recurrenceEndDate !== undefined) updateData.recurrenceEndDate = recurrenceEndDate ? new Date(recurrenceEndDate) : null;
        if (locationId !== undefined) updateData.locationId = locationId;
        if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
        if (travelTimeMinutes !== undefined) updateData.travelTimeMinutes = travelTimeMinutes;
        if (preparationTimeMinutes !== undefined) updateData.preparationTimeMinutes = preparationTimeMinutes;
        if (googlePlaceId !== undefined) updateData.googlePlaceId = googlePlaceId;
        if (locationName !== undefined) updateData.locationName = locationName;
        if (locationAddress !== undefined) updateData.locationAddress = locationAddress;
        if (locationLatitude !== undefined) updateData.locationLatitude = locationLatitude;
        if (locationLongitude !== undefined) updateData.locationLongitude = locationLongitude;

        const updatedEvent = await db
            .update(calendarEvents)
            .set(updateData)
            .where(eq(calendarEvents.id, id))
            .returning();

        return NextResponse.json(updatedEvent[0]);
    } catch (error) {
        console.error('Error updating calendar event:', error);
        return NextResponse.json(
            { error: 'Failed to update calendar event' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has permission to delete events
        if (!['admin', 'back-office'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        // Handle recurring event instances - extract original event ID
        let eventId = id;
        if (eventId.includes('_')) {
            // This is a recurring event instance, extract the original event ID
            eventId = eventId.split('_')[0];
        }

        // Check if event exists
        const existingEvent = await db
            .select()
            .from(calendarEvents)
            .where(eq(calendarEvents.id, eventId))
            .limit(1);

        if (existingEvent.length === 0) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        await db
            .delete(calendarEvents)
            .where(eq(calendarEvents.id, eventId));

        return NextResponse.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        return NextResponse.json(
            { error: 'Failed to delete calendar event' },
            { status: 500 }
        );
    }
}
