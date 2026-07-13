'use client';

import { useTranslations } from '@/hooks/use-translations';
import type { SirActivityStats } from '@/lib/db/sir-queries';

interface SirActivityChartProps {
  stats: SirActivityStats;
}

export function SirActivityChart({ stats }: SirActivityChartProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.searchedToday}</div>
          <div className="text-xs text-muted-foreground">{t('sir.dashboard.searchedToday')}</div>
        </div>
        <div className="rounded-lg bg-primary/5 p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.searchedWeek}</div>
          <div className="text-xs text-muted-foreground">{t('sir.dashboard.searchedWeek')}</div>
        </div>
        <div className="rounded-lg bg-blue-500/10 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.downloadedToday}
          </div>
          <div className="text-xs text-muted-foreground">{t('sir.dashboard.downloadedToday')}</div>
        </div>
        <div className="rounded-lg bg-blue-500/5 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.downloadedWeek}
          </div>
          <div className="text-xs text-muted-foreground">{t('sir.dashboard.downloadedWeek')}</div>
        </div>
      </div>

      {stats.byUser.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            {t('sir.dashboard.byUser')}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">{t('sir.dashboard.user')}</th>
                  <th className="py-2 px-2 text-right font-medium">
                    {t('sir.dashboard.searchedTodayShort')}
                  </th>
                  <th className="py-2 px-2 text-right font-medium">
                    {t('sir.dashboard.searchedWeekShort')}
                  </th>
                  <th className="py-2 px-2 text-right font-medium">
                    {t('sir.dashboard.downloadedTodayShort')}
                  </th>
                  <th className="py-2 pl-2 text-right font-medium">
                    {t('sir.dashboard.downloadedWeekShort')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.byUser.map((u) => (
                  <tr key={u.userId} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono">{u.userId}</td>
                    <td className="py-2 px-2 text-right">{u.searchedToday}</td>
                    <td className="py-2 px-2 text-right">{u.searchedWeek}</td>
                    <td className="py-2 px-2 text-right">{u.downloadedToday}</td>
                    <td className="py-2 pl-2 text-right">{u.downloadedWeek}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t('sir.dashboard.noActivity')}
        </p>
      )}
    </div>
  );
}
