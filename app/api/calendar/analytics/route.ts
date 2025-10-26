import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/queries';
import { calendarEvents } from '@/lib/db/schema';
import { and, gte, lte, sql, count } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin users can access analytics
        if (session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build date filter
        const dateConditions = [];
        if (startDate) {
            dateConditions.push(gte(calendarEvents.startTime, new Date(startDate)));
        }
        if (endDate) {
            dateConditions.push(lte(calendarEvents.startTime, new Date(endDate)));
        }
        const whereClause = dateConditions.length > 0 ? and(...dateConditions) : undefined;

        // Get total events count
        const totalEvents = await db
            .select({ count: count() })
            .from(calendarEvents)
            .where(whereClause);

        // Get events by status
        const eventsByStatus = await db
            .select({
                status: calendarEvents.status,
                count: count(),
            })
            .from(calendarEvents)
            .where(whereClause)
            .groupBy(calendarEvents.status);

        // Get events by type
        const eventsByType = await db
            .select({
                eventType: calendarEvents.eventType,
                count: count(),
            })
            .from(calendarEvents)
            .where(whereClause)
            .groupBy(calendarEvents.eventType);

        // Get events by priority
        const eventsByPriority = await db
            .select({
                priority: calendarEvents.priority,
                count: count(),
            })
            .from(calendarEvents)
            .where(whereClause)
            .groupBy(calendarEvents.priority);

        // Get monthly activity trend (last 12 months)
        const monthlyTrend = await db
            .select({
                month: sql<string>`DATE_TRUNC('month', ${calendarEvents.startTime})`,
                count: count(),
            })
            .from(calendarEvents)
            .where(whereClause)
            .groupBy(sql`DATE_TRUNC('month', ${calendarEvents.startTime})`)
            .orderBy(sql`DATE_TRUNC('month', ${calendarEvents.startTime})`);

        // Get recent events (last 10)
        const recentEvents = await db
            .select()
            .from(calendarEvents)
            .where(whereClause)
            .orderBy(sql`${calendarEvents.createdAt} DESC`)
            .limit(10);

        // Calculate completion rate
        const completedEvents = eventsByStatus.find(e => e.status === 'completed')?.count || 0;
        const totalEventsCount = totalEvents[0]?.count || 0;
        const completionRate = totalEventsCount > 0 ? (completedEvents / totalEventsCount) * 100 : 0;

        return NextResponse.json({
            overview: {
                totalEvents: totalEventsCount,
                completionRate: Math.round(completionRate * 100) / 100,
            },
            eventsByStatus: eventsByStatus.reduce((acc: Record<string, number>, item) => {
                acc[item.status] = item.count;
                return acc;
            }, {} as Record<string, number>),
            eventsByType: eventsByType.reduce((acc: Record<string, number>, item) => {
                acc[item.eventType] = item.count;
                return acc;
            }, {} as Record<string, number>),
            eventsByPriority: eventsByPriority.reduce((acc: Record<string, number>, item) => {
                acc[item.priority] = item.count;
                return acc;
            }, {} as Record<string, number>),
            monthlyTrend: monthlyTrend.map((item: any) => ({
                month: item.month,
                count: item.count,
            })),
            recentEvents: recentEvents.map((event: any) => ({
                id: event.id,
                title: event.title,
                eventType: event.eventType,
                status: event.status,
                priority: event.priority,
                startDate: event.startDate,
                createdAt: event.createdAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching calendar analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch calendar analytics' },
            { status: 500 }
        );
    }
}
