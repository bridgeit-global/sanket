export const VISITOR_MANAGE_URL_PARAMS = {
  tab: 'tab',
  status: 'status',
  service: 'service',
  token: 'token',
  mobile: 'mobile',
  voterId: 'voterId',
  name: 'name',
  createdFrom: 'createdFrom',
  createdTo: 'createdTo',
  page: 'page',
  limit: 'limit',
} as const;

export const VISITOR_MANAGE_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_VISITOR_MANAGE_PAGE_SIZE = 10;

export type VisitorManageFilterState = {
  status: string;
  serviceName: string;
  token: string;
  mobile: string;
  voterId: string;
  name: string;
  createdFrom: string;
  createdTo: string;
  page: number;
  limit: number;
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseVisitorManageDateParam(value: string | null): string {
  const trimmed = (value ?? '').trim();
  return YMD_RE.test(trimmed) ? trimmed : '';
}

export function parseVisitorManagePageParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function parseVisitorManageLimitParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_VISITOR_MANAGE_PAGE_SIZE), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_VISITOR_MANAGE_PAGE_SIZE;
  return (VISITOR_MANAGE_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_VISITOR_MANAGE_PAGE_SIZE;
}

export function parseVisitorManageFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | undefined>,
): VisitorManageFilterState {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    return params[key] ?? null;
  };

  return {
    status: get(VISITOR_MANAGE_URL_PARAMS.status) || 'all',
    serviceName: get(VISITOR_MANAGE_URL_PARAMS.service) || '',
    token: get(VISITOR_MANAGE_URL_PARAMS.token) || '',
    mobile: get(VISITOR_MANAGE_URL_PARAMS.mobile) || '',
    voterId: get(VISITOR_MANAGE_URL_PARAMS.voterId) || '',
    name: get(VISITOR_MANAGE_URL_PARAMS.name) || '',
    createdFrom: parseVisitorManageDateParam(get(VISITOR_MANAGE_URL_PARAMS.createdFrom)),
    createdTo: parseVisitorManageDateParam(get(VISITOR_MANAGE_URL_PARAMS.createdTo)),
    page: parseVisitorManagePageParam(get(VISITOR_MANAGE_URL_PARAMS.page)),
    limit: parseVisitorManageLimitParam(get(VISITOR_MANAGE_URL_PARAMS.limit)),
  };
}

export function buildVisitorManageSearchParams(
  state: Partial<VisitorManageFilterState> & { tab?: string },
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  if (state.tab) {
    params.set(VISITOR_MANAGE_URL_PARAMS.tab, state.tab);
  }

  const setOrDelete = (key: string, value: string | number | undefined, omit?: boolean) => {
    if (omit || value === undefined || value === '' || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  };

  setOrDelete(VISITOR_MANAGE_URL_PARAMS.status, state.status, state.status === 'all');
  setOrDelete(VISITOR_MANAGE_URL_PARAMS.service, state.serviceName);
  setOrDelete(VISITOR_MANAGE_URL_PARAMS.token, state.token);
  setOrDelete(VISITOR_MANAGE_URL_PARAMS.mobile, state.mobile);
  setOrDelete(VISITOR_MANAGE_URL_PARAMS.voterId, state.voterId);
  setOrDelete(VISITOR_MANAGE_URL_PARAMS.name, state.name);
  setOrDelete(VISITOR_MANAGE_URL_PARAMS.createdFrom, state.createdFrom);
  setOrDelete(VISITOR_MANAGE_URL_PARAMS.createdTo, state.createdTo);

  if (state.page !== undefined) {
    if (state.page <= 1) params.delete(VISITOR_MANAGE_URL_PARAMS.page);
    else params.set(VISITOR_MANAGE_URL_PARAMS.page, String(state.page));
  }

  if (state.limit !== undefined) {
    if (state.limit === DEFAULT_VISITOR_MANAGE_PAGE_SIZE) {
      params.delete(VISITOR_MANAGE_URL_PARAMS.limit);
    } else {
      params.set(VISITOR_MANAGE_URL_PARAMS.limit, String(state.limit));
    }
  }

  return params;
}
