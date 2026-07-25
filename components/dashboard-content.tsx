'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cake, Phone, Users, ClipboardCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ModulePageHeader } from '@/components/module-page-header';
import { useTranslations } from '@/hooks/use-translations';
import { PhoneUpdatesChart } from '@/components/phone-updates-chart';
import { SirActivityChart } from '@/components/sir-activity-chart';
import { toWhatsAppChatUrl } from '@/lib/indian-mobile';
import { getTodayDateStringIST } from '@/lib/ist-date';
import { getVerticalBadgeClass } from '@/lib/hierarchy/vertical-colors';
import {
  HIERARCHY_URL_PARAMS,
  HIERARCHY_VIEWS,
} from '@/lib/hierarchy/member-list';
import type { DashboardData } from '@/lib/db/dashboard-queries';

const BIRTHDAY_WHATSAPP_MESSAGE = `HAPPY BIRTHDAY!!
🎉 वाढदिवसाच्या हार्दिक शुभेच्छा! 🎂

आपल्याला उत्तम आरोग्य, दीर्घायुष्य, सुख, समृद्धी आणि भरभरून यश लाभो, हीच सदिच्छा. समाजसेवेतील आपले कार्य असेच जोमाने सुरू राहो.

शुभेच्छांसह,
सना मलिक शेख
आमदार, अणुशक्तीनगर`;

function hierarchyMemberHref(memberId: string): string {
  const params = new URLSearchParams({
    [HIERARCHY_URL_PARAMS.view]: HIERARCHY_VIEWS.allMembers,
    [HIERARCHY_URL_PARAMS.member]: memberId,
    [HIERARCHY_URL_PARAMS.returnTo]: '/modules/dashboard',
  });
  return `/modules/hierarchy?${params.toString()}`;
}

interface DashboardContentProps {
  data: DashboardData;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.47-4.435 9.89-9.885 9.89m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function DashboardContent({ data }: DashboardContentProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const today = getTodayDateStringIST();
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
            <Cake className="h-5 w-5" />
            {t('dashboard.upcomingBirthdays')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcomingBirthdays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noUpcomingBirthdays')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {data.upcomingBirthdays.map((item) => {
                const whenLabel =
                  item.daysUntil === 0
                    ? t('dashboard.birthdayToday')
                    : t('dashboard.birthdayInDays', { days: item.daysUntil });
                const dateLabel = format(parseISO(item.nextBirthday), 'd MMM');
                return (
                  <li
                    key={item.memberId}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        <Link
                          href={hierarchyMemberHref(item.memberId)}
                          className="text-foreground hover:text-primary hover:underline underline-offset-2"
                        >
                          {item.personName}
                        </Link>
                      </p>
                      {item.wings.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.wings.map((wing) => (
                            <Badge
                              key={wing.id}
                              variant="secondary"
                              className={`border-none px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${getVerticalBadgeClass(wing.name)}`}
                            >
                              {wing.name}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          item.primaryPostLabel ?? t('dashboard.cadreMember'),
                          item.turningAge != null
                            ? t('dashboard.turningAge', { age: item.turningAge })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {item.phones.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {item.phones.map((phone) => {
                            const whatsappHref = toWhatsAppChatUrl(
                              phone,
                              BIRTHDAY_WHATSAPP_MESSAGE,
                            );
                            const callHref = `tel:+91${phone}`;
                            return (
                              <span
                                key={phone}
                                className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-1 text-xs"
                              >
                                <span className="px-1 font-medium tabular-nums">
                                  {phone}
                                </span>
                                {whatsappHref ? (
                                  <a
                                    href={whatsappHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex size-6 items-center justify-center rounded text-emerald-700 transition-colors hover:bg-emerald-100"
                                    aria-label={t('dashboard.openWhatsApp', {
                                      phone,
                                    })}
                                    title={t('dashboard.openWhatsApp', {
                                      phone,
                                    })}
                                  >
                                    <WhatsAppIcon className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                                <a
                                  href={callHref}
                                  className="inline-flex size-6 items-center justify-center rounded text-sky-700 transition-colors hover:bg-sky-100"
                                  aria-label={t('dashboard.callPhone', {
                                    phone,
                                  })}
                                  title={t('dashboard.callPhone', { phone })}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary whitespace-nowrap">
                      {whenLabel} · {dateLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
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

