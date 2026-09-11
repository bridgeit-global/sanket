import {
  DEFAULT_REGISTER_PAGE_SIZE,
  parseRegisterLimitParam,
  parseRegisterPageParam,
  REGISTER_PAGE_SIZE_OPTIONS,
} from '@/lib/register/url-params';
import {
  GOV_FOLLOW_UP_TABS,
  isGovFollowUpChip,
  isGovFollowUpTab,
  type GovFollowUpChip,
  type GovFollowUpTab,
} from './constants';

export const GOV_FOLLOW_UP_URL_PARAMS = {
  tab: 'tab',
  chip: 'chip',
  search: 'search',
  departmentId: 'departmentId',
  locationId: 'locationId',
  officer: 'officer',
  staffUserId: 'staffUserId',
  status: 'status',
  matter: 'matter',
  new: 'new',
  letterId: 'letterId',
  registerEntryId: 'registerEntryId',
  visitDate: 'visitDate',
  page: 'page',
  limit: 'limit',
} as const;

export const GOV_FOLLOW_UP_PAGE_SIZE_OPTIONS = REGISTER_PAGE_SIZE_OPTIONS;
export const DEFAULT_GOV_FOLLOW_UP_PAGE_SIZE = DEFAULT_REGISTER_PAGE_SIZE;

export function govFollowUpLetterGenerationHref(matterId: string): string {
  return `/modules/letter-generation?govFollowUpMatterId=${encodeURIComponent(matterId)}`;
}

export type GovFollowUpFilterState = {
  tab: GovFollowUpTab;
  chip: GovFollowUpChip | '';
  search: string;
  departmentId: string;
  locationId: string;
  officer: string;
  staffUserId: string;
  status: string;
  matter: string;
  isNew: boolean;
  letterId: string;
  registerEntryId: string;
  visitDate: string;
  page: number;
  limit: number;
};

export function parseGovFollowUpFiltersFromSearchParams(
  params: URLSearchParams,
): GovFollowUpFilterState {
  const tabRaw = params.get(GOV_FOLLOW_UP_URL_PARAMS.tab);
  const chipRaw = params.get(GOV_FOLLOW_UP_URL_PARAMS.chip);
  const newRaw = params.get(GOV_FOLLOW_UP_URL_PARAMS.new);

  return {
    tab: isGovFollowUpTab(tabRaw) ? tabRaw : GOV_FOLLOW_UP_TABS[0],
    chip: isGovFollowUpChip(chipRaw) ? chipRaw : '',
    search: params.get(GOV_FOLLOW_UP_URL_PARAMS.search) ?? '',
    departmentId: params.get(GOV_FOLLOW_UP_URL_PARAMS.departmentId) ?? '',
    locationId: params.get(GOV_FOLLOW_UP_URL_PARAMS.locationId) ?? '',
    officer: params.get(GOV_FOLLOW_UP_URL_PARAMS.officer) ?? '',
    staffUserId: params.get(GOV_FOLLOW_UP_URL_PARAMS.staffUserId) ?? '',
    status: params.get(GOV_FOLLOW_UP_URL_PARAMS.status) ?? '',
    matter: params.get(GOV_FOLLOW_UP_URL_PARAMS.matter) ?? '',
    isNew: newRaw === '1' || newRaw === 'true',
    letterId: params.get(GOV_FOLLOW_UP_URL_PARAMS.letterId) ?? '',
    registerEntryId: params.get(GOV_FOLLOW_UP_URL_PARAMS.registerEntryId) ?? '',
    visitDate: params.get(GOV_FOLLOW_UP_URL_PARAMS.visitDate) ?? '',
    page: parseRegisterPageParam(params.get(GOV_FOLLOW_UP_URL_PARAMS.page)),
    limit: parseRegisterLimitParam(params.get(GOV_FOLLOW_UP_URL_PARAMS.limit)),
  };
}

export function buildGovFollowUpSearchParams(
  state: Partial<GovFollowUpFilterState>,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  const setOrDelete = (key: string, value: string | number | boolean | undefined) => {
    if (value === true) {
      params.set(key, '1');
      return;
    }
    if (value === false || value === undefined || value === '') {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  };

  if (state.tab !== undefined) {
    setOrDelete(
      GOV_FOLLOW_UP_URL_PARAMS.tab,
      state.tab === 'today' ? '' : state.tab,
    );
  }
  if (state.chip !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.chip, state.chip);
  }
  if (state.search !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.search, state.search);
  }
  if (state.departmentId !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.departmentId, state.departmentId);
  }
  if (state.locationId !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.locationId, state.locationId);
  }
  if (state.officer !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.officer, state.officer);
  }
  if (state.staffUserId !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.staffUserId, state.staffUserId);
  }
  if (state.status !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.status, state.status);
  }
  if (state.matter !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.matter, state.matter);
  }
  if (state.isNew !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.new, state.isNew);
  }
  if (state.letterId !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.letterId, state.letterId);
  }
  if (state.registerEntryId !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.registerEntryId, state.registerEntryId);
  }
  if (state.visitDate !== undefined) {
    setOrDelete(GOV_FOLLOW_UP_URL_PARAMS.visitDate, state.visitDate);
  }
  if (state.page !== undefined) {
    setOrDelete(
      GOV_FOLLOW_UP_URL_PARAMS.page,
      state.page > 1 ? String(state.page) : '',
    );
  }
  if (state.limit !== undefined) {
    setOrDelete(
      GOV_FOLLOW_UP_URL_PARAMS.limit,
      state.limit !== DEFAULT_GOV_FOLLOW_UP_PAGE_SIZE
        ? String(state.limit)
        : '',
    );
  }

  return params;
}
