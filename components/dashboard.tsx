'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Inbox, Send, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';
import { DashboardSkeleton } from '@/components/module-skeleton';
import { ModulePageHeader } from '@/components/module-page-header';

interface DashboardStats {
  meetings: number;
  inward: number;
  outward: number;
  projects: number;
}

interface UpcomingProgramme {
  id: string;
  date: string;
  startTime: string;
  title: string;
  location: string;
}

export function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    meetings: 0,
    inward: 0,
    outward: 0,
    projects: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingProgramme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Single consolidated API call for all dashboard data
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setUpcoming(data.upcoming);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title="Dashboard"
        description="Overview of activities and statistics"
      />

      <Card>
        <CardHeader>
          <CardTitle>Today at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Meetings
              </span>
              <span className="text-2xl font-semibold">{stats.meetings}</span>
              <span className="text-xs text-muted-foreground">
                As per Daily Programme
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Inward / Outward
              </span>
              <span className="text-2xl font-semibold">
                {stats.inward} / {stats.outward}
              </span>
              <span className="text-xs text-muted-foreground">
                Registered today
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Projects
              </span>
              <span className="text-2xl font-semibold">{stats.projects}</span>
              <span className="text-xs text-muted-foreground">
                In progress for the Constituency
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming programmes</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming programmes
              </p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {upcoming.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.location}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {item.startTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/daily-programme')}
              >
                <CalendarDays className="mb-1 h-4 w-4" />
                Daily Programme
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/inward')}
              >
                <Inbox className="mb-1 h-4 w-4" />
                Inward
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/projects')}
              >
                <FolderKanban className="mb-1 h-4 w-4" />
                Add Project
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/outward')}
              >
                <Send className="mb-1 h-4 w-4" />
                Outward
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

