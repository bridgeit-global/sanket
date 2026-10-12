import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { JobFairModule } from '@/components/job-fair/job-fair-module';
import {
  getJobFairStats,
  listJobFairAssignees,
  listJobFairRegistrations,
  listOpenJobFairDrafts,
  type JobFairAssignee,
  type JobFairDraftListItem,
  type JobFairRegistration,
  type JobFairStats,
} from '@/lib/db/job-fair-queries';
import { hasModuleAccess } from '@/lib/db/queries';
import { getTodayDateStringIST } from '@/lib/ist-date';
import { JOB_FAIR_MODULE_KEY } from '@/lib/job-fair/options';
import {
  normalizeJobFairSort,
  parseJobFairPageQuery,
  type JobFairPageQuery,
} from '@/lib/job-fair/page-query';

function normalizeRegistrationSort(query: JobFairPageQuery) {
  return normalizeJobFairSort('registrations', query.sort, query.dir).sort;
}

function normalizeDraftSort(query: JobFairPageQuery) {
  return normalizeJobFairSort('drafts', query.sort, query.dir).sort;
}

export default async function JobFairPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, JOB_FAIR_MODULE_KEY);
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const params = await searchParams;
  const query = parseJobFairPageQuery(params);
  const yuvaazRaw = params.yuvaaz;
  const yuvaaz = (Array.isArray(yuvaazRaw) ? yuvaazRaw[0] : yuvaazRaw)?.trim() || null;
  const list = await loadJobFairList(query);

  return (
    <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
      <JobFairModule
        query={query}
        checkInCode={yuvaaz}
        stats={list.stats}
        total={list.total}
        registrations={list.registrations}
        drafts={list.drafts}
        assignees={list.assignees}
      />
    </div>
  );
}

async function loadJobFairList(query: JobFairPageQuery): Promise<{
  stats: JobFairStats;
  total: number;
  registrations: JobFairRegistration[] | null;
  drafts: JobFairDraftListItem[] | null;
  assignees: JobFairAssignee[];
}> {
  const statsPromise = getJobFairStats(getTodayDateStringIST());

  if (query.view === 'drafts') {
    const [stats, drafts, assignees] = await Promise.all([
      statsPromise,
      listOpenJobFairDrafts(query.search || undefined, query.page, query.limit, {
        from: query.from || undefined,
        to: query.to || undefined,
        step: query.step ?? undefined,
        whatsapp: query.whatsapp ?? undefined,
        sort: normalizeDraftSort(query),
        dir: query.dir,
      }),
      listJobFairAssignees(),
    ]);
    return {
      stats,
      total: drafts.total,
      registrations: null,
      drafts: drafts.items,
      assignees,
    };
  }

  const [stats, registrations] = await Promise.all([
    statsPromise,
    listJobFairRegistrations(
      {
        search: query.search || undefined,
        area: query.area || undefined,
        qualification: query.qualification || undefined,
        experience: query.experience || undefined,
        jobType: query.jobType || undefined,
        from: query.from || undefined,
        to: query.to || undefined,
      },
      query.page,
      query.limit,
      { column: normalizeRegistrationSort(query), dir: query.dir },
    ),
  ]);
  return {
    stats,
    total: registrations.total,
    registrations: registrations.items,
    drafts: null,
    assignees: [],
  };
}
