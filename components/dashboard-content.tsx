'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Inbox, Send, FolderKanban, Phone, Users, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ModulePageHeader } from '@/components/module-page-header';
import { useTranslations } from '@/hooks/use-translations';
import { PhoneUpdatesChart } from '@/components/phone-updates-chart';
import type { DashboardData } from '@/lib/db/dashboard-queries';

interface DashboardContentProps {
  data: DashboardData;
}

export function DashboardContent({ data }: DashboardContentProps) {
  const router = useRouter();
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.todayAtGlance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('dashboard.meetings')}
              </span>
              <span className="text-2xl font-semibold">{data.stats.meetings}</span>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.asPerDailyProgramme')}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('dashboard.inwardOutward')}
              </span>
              <span className="text-2xl font-semibold">
                {data.stats.inward} / {data.stats.outward}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.registeredToday')}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('dashboard.projects')}
              </span>
              <span className="text-2xl font-semibold">{data.stats.projects}</span>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.inProgressForConstituency')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Number Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhoneUpdatesChart
            phoneUpdatesBySource={data.phoneUpdates.bySource}
            phoneUpdatesByUser={data.phoneUpdates.byUser}
            totalUpdates={data.phoneUpdates.today}
            totalVotersWithPhone={data.phoneUpdates.totalVotersWithPhone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Beneficiary Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Today's Services Created - Prominent Metric */}
            <div className="flex flex-col gap-1 rounded-lg border p-4 bg-primary/5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Services Created Today
              </span>
              <span className="text-3xl font-bold text-primary">
                {data.beneficiaryServices.servicesCreatedToday}
              </span>
              <span className="text-xs text-muted-foreground">
                out of {data.beneficiaryServices.totalServices} total services
              </span>
            </div>

            {/* Status Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Status Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">
                    {data.beneficiaryServices.byStatus.pending}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.beneficiaryServices.byStatus.in_progress}
                  </div>
                  <div className="text-xs text-gray-600">In Progress</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {data.beneficiaryServices.byStatus.completed}
                  </div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {data.beneficiaryServices.byStatus.cancelled}
                  </div>
                  <div className="text-xs text-gray-600">Cancelled</div>
                </div>
              </div>
            </div>

            {/* Type Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Type Breakdown</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                    <div className="text-2xl font-bold text-purple-600">
                      {data.beneficiaryServices.byType.individual}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">Individual</div>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <div className="text-2xl font-bold text-indigo-600">
                      {data.beneficiaryServices.byType.community}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">Community</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.upcomingProgrammes')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('dashboard.noUpcomingProgrammes')}
              </p>
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {data.upcoming.map((item) => (
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
            <CardTitle>{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/daily-programme')}
              >
                <CalendarDays className="mb-1 h-4 w-4" />
                {t('dashboard.dailyProgramme')}
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/inward')}
              >
                <Inbox className="mb-1 h-4 w-4" />
                {t('dashboard.inward')}
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/projects')}
              >
                <FolderKanban className="mb-1 h-4 w-4" />
                {t('dashboard.addProject')}
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-3"
                onClick={() => router.push('/modules/outward')}
              >
                <Send className="mb-1 h-4 w-4" />
                {t('dashboard.outward')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.phoneUpdates.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Recent Phone Number Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.phoneUpdates.recent.map((update) => (
                <div
                  key={update.id}
                  className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {update.voterFullName || update.epicNumber}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        EPIC: {update.epicNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(update.createdAt), 'MMM dd, HH:mm')}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {update.sourceModule === 'profile_update'
                          ? 'Profile Update'
                          : 'Beneficiary Management'}
                      </p>
                    </div>
                  </div>
                  {(update.oldMobileNoPrimary !== update.newMobileNoPrimary ||
                    update.oldMobileNoSecondary !== update.newMobileNoSecondary) && (
                    <div className="mt-2 space-y-1">
                      {update.oldMobileNoPrimary !== update.newMobileNoPrimary && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Primary:
                          </span>
                          {update.oldMobileNoPrimary && (
                            <span className="text-xs line-through text-muted-foreground font-mono">
                              {update.oldMobileNoPrimary}
                            </span>
                          )}
                          <span className="text-xs">→</span>
                          <span className="text-xs font-mono font-medium">
                            {update.newMobileNoPrimary || 'Removed'}
                          </span>
                        </div>
                      )}
                      {update.oldMobileNoSecondary !== update.newMobileNoSecondary && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Secondary:
                          </span>
                          {update.oldMobileNoSecondary && (
                            <span className="text-xs line-through text-muted-foreground font-mono">
                              {update.oldMobileNoSecondary}
                            </span>
                          )}
                          <span className="text-xs">→</span>
                          <span className="text-xs font-mono font-medium">
                            {update.newMobileNoSecondary || 'Removed'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {update.updatedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated by: {update.updatedBy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

