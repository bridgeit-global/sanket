export const OPERATOR_MANAGE_URL_PARAMS = {
  tab: 'tab',
  status: 'status',
  priority: 'priority',
  service: 'service',
  token: 'token',
  mobile: 'mobile',
  voterId: 'voterId',
  page: 'page',
  limit: 'limit',
  taskId: 'taskId',
} as const;

export const MANAGE_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_MANAGE_PAGE_SIZE = 10;

export type ManageFilterState = {
  status: string;
  priority: string;
  serviceName: string;
  token: string;
  mobile: string;
  voterId: string;
  page: number;
  limit: number;
  taskId: string;
};

export function parseManagePageParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function parseManageLimitParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_MANAGE_PAGE_SIZE), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MANAGE_PAGE_SIZE;
  return (MANAGE_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_MANAGE_PAGE_SIZE;
}

export function parseManageFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | undefined>,
): ManageFilterState {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    return params[key] ?? null;
  };

  return {
    status: get(OPERATOR_MANAGE_URL_PARAMS.status) || 'all',
    priority: get(OPERATOR_MANAGE_URL_PARAMS.priority) || 'all',
    serviceName: get(OPERATOR_MANAGE_URL_PARAMS.service) || '',
    token: get(OPERATOR_MANAGE_URL_PARAMS.token) || '',
    mobile: get(OPERATOR_MANAGE_URL_PARAMS.mobile) || '',
    voterId: get(OPERATOR_MANAGE_URL_PARAMS.voterId) || '',
    page: parseManagePageParam(get(OPERATOR_MANAGE_URL_PARAMS.page)),
    limit: parseManageLimitParam(get(OPERATOR_MANAGE_URL_PARAMS.limit)),
    taskId: get(OPERATOR_MANAGE_URL_PARAMS.taskId) || '',
  };
}

export function buildManageSearchParams(
  state: Partial<ManageFilterState> & { tab?: string },
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  if (state.tab) {
    params.set(OPERATOR_MANAGE_URL_PARAMS.tab, state.tab);
  }

  const setOrDelete = (key: string, value: string | number | undefined, omit?: boolean) => {
    if (omit || value === undefined || value === '' || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  };

  setOrDelete(OPERATOR_MANAGE_URL_PARAMS.status, state.status, state.status === 'all');
  setOrDelete(OPERATOR_MANAGE_URL_PARAMS.priority, state.priority, state.priority === 'all');
  setOrDelete(OPERATOR_MANAGE_URL_PARAMS.service, state.serviceName);
  setOrDelete(OPERATOR_MANAGE_URL_PARAMS.token, state.token);
  setOrDelete(OPERATOR_MANAGE_URL_PARAMS.mobile, state.mobile);
  setOrDelete(OPERATOR_MANAGE_URL_PARAMS.voterId, state.voterId);
  setOrDelete(OPERATOR_MANAGE_URL_PARAMS.taskId, state.taskId);

  if (state.page !== undefined) {
    if (state.page <= 1) params.delete(OPERATOR_MANAGE_URL_PARAMS.page);
    else params.set(OPERATOR_MANAGE_URL_PARAMS.page, String(state.page));
  }

  if (state.limit !== undefined) {
    if (state.limit === DEFAULT_MANAGE_PAGE_SIZE) params.delete(OPERATOR_MANAGE_URL_PARAMS.limit);
    else params.set(OPERATOR_MANAGE_URL_PARAMS.limit, String(state.limit));
  }

  return params;
}
