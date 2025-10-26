import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/queries';
import { calendarEvents } from '@/lib/db/schema';
import { eq, and, gte, lte, asc, or, ilike, isNull } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';
import { expandRecurringEvents } from '@/lib/calendar-utils';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const eventType = searchParams.get('eventType');
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const search = searchParams.get('search');
        const page = Number.parseInt(searchParams.get('page') || '1');
        const limit = Number.parseInt(searchParams.get('limit') || '50');
        const offsetParam = searchParams.get('offset');
        const offset = offsetParam ? Number.parseInt(offsetParam) : (page - 1) * limit;

        // Build query conditions
        const conditions = [];

        // Build a time overlap condition so multi-day/spanning events are included
        if (startDate && endDate) {
            const rangeStart = new Date(startDate);
            const rangeEnd = new Date(endDate);

            const overlapsRange = or(
                and(gte(calendarEvents.startTime, rangeStart), lte(calendarEvents.startTime, rangeEnd)),
                and(gte(calendarEvents.endTime, rangeStart), lte(calendarEvents.endTime, rangeEnd)),
                and(lte(calendarEvents.startTime, rangeStart), gte(calendarEvents.endTime, rangeEnd))
            );

            // For recurring events that started long ago but have future recurrences, include them too
            const recurringInRange = and(
                eq(calendarEvents.isRecurring, true as any),
                lte(calendarEvents.startTime, rangeEnd),
                or(
                    // No end specified -> assume ongoing
                    isNull(calendarEvents.recurrenceEndDate),
                    gte(calendarEvents.recurrenceEndDate as any, rangeStart)
                )
            );

            conditions.push(or(overlapsRange, recurringInRange));
        } else if (startDate) {
            conditions.push(gte(calendarEvents.endTime, new Date(startDate)));
        } else if (endDate) {
            conditions.push(lte(calendarEvents.startTime, new Date(endDate)));
        }
        if (eventType) {
            conditions.push(eq(calendarEvents.eventType, eventType as any));
        }
        if (status) {
            conditions.push(eq(calendarEvents.status, status as any));
        }
        if (priority) {
            conditions.push(eq(calendarEvents.priority, priority as any));
        }
        if (search) {
            conditions.push(
                or(
                    ilike(calendarEvents.title, `%${search}%`),
                    ilike(calendarEvents.description, `%${search}%`)
                )
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const events = await db
            .select()
            .from(calendarEvents)
            .where(whereClause)
            .orderBy(asc(calendarEvents.startTime))
            .limit(limit)
            .offset(offset);

        // Expand recurring events
        const startDateForExpansion = startDate ? new Date(startDate) : new Date();
        const endDateForExpansion = endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

        const expandedEvents = expandRecurringEvents(events, startDateForExpansion, endDateForExpansion);

        // Get total count for pagination (this is approximate for recurring events)
        const totalCount = await db
            .select({ count: calendarEvents.id })
            .from(calendarEvents)
            .where(whereClause);

        return NextResponse.json({
            events: expandedEvents,
            pagination: {
                page,
                limit,
                total: totalCount.length,
                totalPages: Math.ceil(totalCount.length / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendar events' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has permission to create events
        if (!['admin', 'back-office'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        console.log('Received event data:', JSON.stringify(body, null, 2));

        const {
            title,
            description,
            eventType,
            startTime,
            endTime,
            priority = 'medium',
            status = 'scheduled',
            isRecurring = false,
            recurrencePattern,
            recurrenceInterval = 1,
            recurrenceEndDate,
            locationId,
            assignedTo,
            travelTimeMinutes = 0,
            preparationTimeMinutes = 0,
            googlePlaceId,
            locationName,
            locationAddress,
            locationLatitude,
            locationLongitude,
        } = body;

        // Validate required fields
        if (!title || !eventType || !startTime || !endTime) {
            console.log('Validation failed - missing required fields:', {
                title: !!title,
                eventType: !!eventType,
                startTime: !!startTime,
                endTime: !!endTime
            });
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate event type
        const validEventTypes = ['voter_engagement', 'public_meeting', 'training', 'administrative'];
        if (!validEventTypes.includes(eventType)) {
            console.log('Validation failed - invalid event type:', eventType);
            return NextResponse.json(
                { error: 'Invalid event type' },
                { status: 400 }
            );
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            console.log('Validation failed - invalid priority:', priority);
            return NextResponse.json(
                { error: 'Invalid priority' },
                { status: 400 }
            );
        }

        // Validate status
        const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            console.log('Validation failed - invalid status:', status);
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            );
        }

        // Validate recurring pattern if provided
        if (recurrencePattern && recurrencePattern !== null) {
            const validRecurringPatterns = ['daily', 'weekly', 'monthly', 'yearly'];
            if (!validRecurringPatterns.includes(recurrencePattern)) {
                console.log('Validation failed - invalid recurring pattern:', recurrencePattern);
                return NextResponse.json(
                    { error: 'Invalid recurring pattern' },
                    { status: 400 }
                );
            }
        }

        // Validate dates
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            console.log('Validation failed - invalid date format:', { startTime, endTime });
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            );
        }

        if (start >= end) {
            console.log('Validation failed - end date not after start date:', { start, end });
            return NextResponse.json(
                { error: 'End time must be after start time' },
                { status: 400 }
            );
        }

        // Validate that start and end dates are the same
        const startDate = start.toDateString();
        const endDate = end.toDateString();
        if (startDate !== endDate) {
            console.log('Validation failed - start and end dates must be the same:', { startDate, endDate });
            return NextResponse.json(
                { error: 'Start date and end date must be the same. Events can only span within a single day.' },
                { status: 400 }
            );
        }

        const newEvent = await db
            .insert(calendarEvents)
            .values({
                title,
                description,
                eventType,
                startTime: start,
                endTime: end,
                priority,
                status,
                createdBy: session.user.id,
                isRecurring,
                recurrencePattern,
                recurrenceInterval,
                recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
                locationId,
                assignedTo,
                travelTimeMinutes,
                preparationTimeMinutes,
                googlePlaceId,
                locationName,
                locationAddress,
                locationLatitude,
                locationLongitude,
            })
            .returning();

        return NextResponse.json(newEvent[0], { status: 201 });
    } catch (error) {
        console.error('Error creating calendar event:', error);
        return NextResponse.json(
            { error: 'Failed to create calendar event' },
            { status: 500 }
        );
    }
}
