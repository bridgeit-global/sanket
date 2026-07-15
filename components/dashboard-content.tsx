'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ModulePageHeader } from '@/components/module-page-header';
import { useTranslations } from '@/hooks/use-translations';
import { PhoneUpdatesChart } from '@/components/phone-updates-chart';
import { SirActivityChart } from '@/components/sir-activity-chart';
import type { DashboardData } from '@/lib/db/dashboard-queries';

interface DashboardContentProps {
  data: DashboardData;
}

export function DashboardContent({ data }: DashboardContentProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const today = format(new Date(), 'yyyy-MM-dd');
  const sirTitle = t('sir.dashboard.title');
  const sirDashboardTitle =
    sirTitle === 'sir.dashboard.title' ? 'SIR Activity' : sirTitle;

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
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/modules/daily-programme?start=${today}&end=${today}`,
                )
              }
              className="flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('dashboard.meetings')}
              </span>
              <span className="text-2xl font-semibold">{data.stats.meetings}</span>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.asPerDailyProgramme')}
              </span>
            </button>
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('dashboard.inwardOutward')}
              </span>
              <span className="text-2xl font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/modules/io-register?tab=inward&startDate=${today}&endDate=${today}`,
                    )
                  }
                  className="rounded transition-colors hover:text-primary hover:underline"
                >
                  {data.stats.inward}
                </button>
                <span className="text-muted-foreground"> / </span>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/modules/io-register?tab=outward&startDate=${today}&endDate=${today}`,
                    )
                  }
                  className="rounded transition-colors hover:text-primary hover:underline"
                >
                  {data.stats.outward}
                </button>
              </span>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.registeredToday')}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/modules/projects?status=${encodeURIComponent('In Progress')}`,
                )
              }
              className="flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('dashboard.projects')}
              </span>
              <span className="text-2xl font-semibold">{data.stats.projects}</span>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.inProgressForConstituency')}
              </span>
            </button>
          </div>
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
            <button
              type="button"
              onClick={() => router.push('/modules/operator?tab=manage&status=all')}
              className="flex w-full flex-col gap-1 rounded-lg border p-4 bg-primary/5 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Services Created Today
              </span>
              <span className="text-3xl font-bold text-primary">
                {data.beneficiaryServices.servicesCreatedToday}
              </span>
              <span className="text-xs text-muted-foreground">
                out of {data.beneficiaryServices.totalServices} total services
              </span>
            </button>

            {/* Status Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Status Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/modules/operator?tab=manage&status=pending')}
                  className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 transition-colors hover:bg-yellow-100 hover:border-yellow-300"
                >
                  <div className="text-2xl font-bold text-yellow-600">
                    {data.beneficiaryServices.byStatus.pending}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/modules/operator?tab=manage&status=in_progress')}
                  className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200 transition-colors hover:bg-blue-100 hover:border-blue-300"
                >
                  <div className="text-2xl font-bold text-blue-600">
                    {data.beneficiaryServices.byStatus.in_progress}
                  </div>
                  <div className="text-xs text-gray-600">In Progress</div>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/modules/operator?tab=manage&status=completed')}
                  className="text-center p-3 bg-green-50 rounded-lg border border-green-200 transition-colors hover:bg-green-100 hover:border-green-300"
                >
                  <div className="text-2xl font-bold text-green-600">
                    {data.beneficiaryServices.byStatus.completed}
                  </div>
                  <div className="text-xs text-gray-600">Completed</div>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/modules/operator?tab=manage&status=cancelled')}
                  className="text-center p-3 bg-red-50 rounded-lg border border-red-200 transition-colors hover:bg-red-100 hover:border-red-300"
                >
                  <div className="text-2xl font-bold text-red-600">
                    {data.beneficiaryServices.byStatus.cancelled}
                  </div>
                  <div className="text-xs text-gray-600">Cancelled</div>
                </button>
              </div>
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
            <ClipboardCheck className="h-5 w-5" />
            {sirDashboardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SirActivityChart stats={data.sirActivity} />
        </CardContent>
      </Card>
    </div>
  );
}

