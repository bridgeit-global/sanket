export const PROJECTS_URL_PARAMS = {
  search: 'search',
  status: 'status',
  page: 'page',
  limit: 'limit',
} as const;

export const PROJECTS_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PROJECTS_PAGE_SIZE = 10;

export type ProjectsFilterState = {
  search: string;
  status: string;
  page: number;
  limit: number;
};

export function parseProjectsPageParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function parseProjectsLimitParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_PROJECTS_PAGE_SIZE), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PROJECTS_PAGE_SIZE;
  return (PROJECTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PROJECTS_PAGE_SIZE;
}

export function parseProjectsFiltersFromSearchParams(
  params: URLSearchParams,
): ProjectsFilterState {
  return {
    search: params.get(PROJECTS_URL_PARAMS.search) ?? '',
    status: params.get(PROJECTS_URL_PARAMS.status) || 'all',
    page: parseProjectsPageParam(params.get(PROJECTS_URL_PARAMS.page)),
    limit: parseProjectsLimitParam(params.get(PROJECTS_URL_PARAMS.limit)),
  };
}

export function buildProjectsSearchParams(
  state: Partial<ProjectsFilterState>,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  const setOrDelete = (key: string, value: string | undefined, omit?: boolean) => {
    if (omit || !value) params.delete(key);
    else params.set(key, value);
  };

  setOrDelete(PROJECTS_URL_PARAMS.search, state.search);
  setOrDelete(PROJECTS_URL_PARAMS.status, state.status, !state.status || state.status === 'all');

  if (state.page !== undefined) {
    if (state.page <= 1) params.delete(PROJECTS_URL_PARAMS.page);
    else params.set(PROJECTS_URL_PARAMS.page, String(state.page));
  }

  if (state.limit !== undefined) {
    if (state.limit === DEFAULT_PROJECTS_PAGE_SIZE) params.delete(PROJECTS_URL_PARAMS.limit);
    else params.set(PROJECTS_URL_PARAMS.limit, String(state.limit));
  }

  return params;
}
