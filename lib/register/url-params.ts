export const REGISTER_URL_PARAMS = {
  startDate: 'startDate',
  endDate: 'endDate',
  projectIds: 'projectIds',
  projectStatus: 'projectStatus',
  search: 'search',
  page: 'page',
  limit: 'limit',
} as const;

export const REGISTER_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_REGISTER_PAGE_SIZE = 10;

export type RegisterFilterState = {
  startDate: string;
  endDate: string;
  projectIds: string[];
  projectStatus: 'all' | 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  search: string;
  page: number;
  limit: number;
};

export function parseRegisterPageParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function parseRegisterLimitParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_REGISTER_PAGE_SIZE), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_REGISTER_PAGE_SIZE;
  return (REGISTER_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_REGISTER_PAGE_SIZE;
}

export function parseRegisterFiltersFromSearchParams(
  params: URLSearchParams,
): RegisterFilterState {
  const projectIdsRaw = params.get(REGISTER_URL_PARAMS.projectIds) ?? '';
  const projectStatus = params.get(REGISTER_URL_PARAMS.projectStatus) || 'all';

  return {
    startDate: params.get(REGISTER_URL_PARAMS.startDate) ?? '',
    endDate: params.get(REGISTER_URL_PARAMS.endDate) ?? '',
    projectIds: projectIdsRaw ? projectIdsRaw.split(',').filter(Boolean) : [],
    projectStatus: projectStatus as RegisterFilterState['projectStatus'],
    search: params.get(REGISTER_URL_PARAMS.search) ?? '',
    page: parseRegisterPageParam(params.get(REGISTER_URL_PARAMS.page)),
    limit: parseRegisterLimitParam(params.get(REGISTER_URL_PARAMS.limit)),
  };
}

export function buildRegisterSearchParams(
  state: Partial<RegisterFilterState>,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  const setOrDelete = (key: string, value: string | undefined, omit?: boolean) => {
    if (omit || !value) params.delete(key);
    else params.set(key, value);
  };

  setOrDelete(REGISTER_URL_PARAMS.startDate, state.startDate);
  setOrDelete(REGISTER_URL_PARAMS.endDate, state.endDate);
  setOrDelete(
    REGISTER_URL_PARAMS.projectIds,
    state.projectIds && state.projectIds.length > 0
      ? state.projectIds.join(',')
      : undefined,
  );
  setOrDelete(
    REGISTER_URL_PARAMS.projectStatus,
    state.projectStatus,
    !state.projectStatus || state.projectStatus === 'all',
  );
  setOrDelete(REGISTER_URL_PARAMS.search, state.search);

  if (state.page !== undefined) {
    if (state.page <= 1) params.delete(REGISTER_URL_PARAMS.page);
    else params.set(REGISTER_URL_PARAMS.page, String(state.page));
  }

  if (state.limit !== undefined) {
    if (state.limit === DEFAULT_REGISTER_PAGE_SIZE) params.delete(REGISTER_URL_PARAMS.limit);
    else params.set(REGISTER_URL_PARAMS.limit, String(state.limit));
  }

  return params;
}
