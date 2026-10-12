export const JOB_FAIR_PAGE_SIZES = [10, 20, 50, 100] as const;

export type JobFairPageView = 'registrations' | 'drafts';

export type JobFairWhatsappFilter = 'verified' | 'unverified';

export type JobFairPageQuery = {
  view: JobFairPageView;
  page: number;
  limit: number;
  search: string;
  area: string;
  qualification: string;
  experience: string;
  jobType: string;
  from: string;
  to: string;
  step: number | null;
  whatsapp: JobFairWhatsappFilter | null;
};

export type JobFairQueryPatch = {
  view?: JobFairPageView | null;
  page?: number | null;
  limit?: number | null;
  search?: string | null;
  area?: string | null;
  qualification?: string | null;
  experience?: string | null;
  jobType?: string | null;
  from?: string | null;
  to?: string | null;
  step?: number | null;
  whatsapp?: JobFairWhatsappFilter | null;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

export function parseJobFairPageQuery(
  params: Record<string, string | string[] | undefined>,
): JobFairPageQuery {
  const fromRaw = firstParam(params, 'from');
  const toRaw = firstParam(params, 'to');
  const stepRaw = firstParam(params, 'step');
  const step = /^[0-4]$/.test(stepRaw) ? Number(stepRaw) : null;
  const whatsappRaw = firstParam(params, 'whatsapp');
  const whatsapp: JobFairWhatsappFilter | null =
    whatsappRaw === 'verified' || whatsappRaw === 'unverified'
      ? whatsappRaw
      : null;
  const viewRaw = firstParam(params, 'view');
  const view: JobFairPageView =
    viewRaw === 'drafts' || viewRaw === 'registrations'
      ? viewRaw
      : step !== null || whatsapp
        ? 'drafts'
        : 'registrations';
  const limitRaw = Number(firstParam(params, 'limit')) || 10;
  const limit = (JOB_FAIR_PAGE_SIZES as readonly number[]).includes(limitRaw)
    ? limitRaw
    : 10;

  return {
    view,
    page: Math.max(1, Number(firstParam(params, 'page')) || 1),
    limit,
    search: firstParam(params, 'search'),
    area: firstParam(params, 'area'),
    qualification: firstParam(params, 'qualification'),
    experience: firstParam(params, 'experience'),
    jobType: firstParam(params, 'jobType'),
    from: YMD.test(fromRaw) ? fromRaw : '',
    to: YMD.test(toRaw) ? toRaw : '',
    step,
    whatsapp,
  };
}

function writeParam(
  params: URLSearchParams,
  key: string,
  value: string | number | null | undefined,
) {
  if (value === undefined) return;
  if (value === null || value === '') params.delete(key);
  else params.set(key, String(value));
}

/** Returns the query string (no leading `?`). Preserves unrelated params such as `yuvaaz`. */
export function applyJobFairQueryPatch(
  current: URLSearchParams,
  patch: JobFairQueryPatch,
  options?: { resetPage?: boolean },
): string {
  const next = new URLSearchParams(current.toString());
  writeParam(next, 'view', patch.view);
  writeParam(next, 'search', patch.search);
  writeParam(next, 'area', patch.area);
  writeParam(next, 'qualification', patch.qualification);
  writeParam(next, 'experience', patch.experience);
  writeParam(next, 'jobType', patch.jobType);
  writeParam(next, 'from', patch.from);
  writeParam(next, 'to', patch.to);
  writeParam(next, 'step', patch.step);
  writeParam(next, 'whatsapp', patch.whatsapp);

  if (options?.resetPage) next.delete('page');
  else if (patch.page !== undefined) {
    if (!patch.page || patch.page <= 1) next.delete('page');
    else next.set('page', String(patch.page));
  }

  if (patch.limit !== undefined) {
    if (!patch.limit || patch.limit === 10) next.delete('limit');
    else next.set('limit', String(patch.limit));
  }

  return next.toString();
}

export const CLEARED_JOB_FAIR_FILTERS: JobFairQueryPatch = {
  search: null,
  area: null,
  qualification: null,
  experience: null,
  jobType: null,
  from: null,
  to: null,
  step: null,
  whatsapp: null,
};

export function jobFairRegistrationExportQuery(query: JobFairPageQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.area) params.set('area', query.area);
  if (query.qualification) params.set('qualification', query.qualification);
  if (query.experience) params.set('experience', query.experience);
  if (query.jobType) params.set('jobType', query.jobType);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return params.toString();
}
