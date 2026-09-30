export const ADM_URL_PARAMS = {
  fund: 'fund',
  search: 'search',
  dlTitle: 'dlTitle',
  dlFrom: 'dlFrom',
  dlTo: 'dlTo',
  rlTitle: 'rlTitle',
  rlStatus: 'rlStatus',
  rlFrom: 'rlFrom',
  rlTo: 'rlTo',
} as const;

export type AdmFilterState = {
  fund: string;
  search: string;
  dlTitle: string;
  dlFrom: string;
  dlTo: string;
  rlTitle: string;
  rlStatus: string;
  rlFrom: string;
  rlTo: string;
};

export function parseAdmFiltersFromSearchParams(
  params: URLSearchParams,
): AdmFilterState {
  return {
    fund: params.get(ADM_URL_PARAMS.fund) ?? '',
    search: params.get(ADM_URL_PARAMS.search) ?? '',
    dlTitle: params.get(ADM_URL_PARAMS.dlTitle) ?? '',
    dlFrom: params.get(ADM_URL_PARAMS.dlFrom) ?? '',
    dlTo: params.get(ADM_URL_PARAMS.dlTo) ?? '',
    rlTitle: params.get(ADM_URL_PARAMS.rlTitle) ?? '',
    rlStatus: params.get(ADM_URL_PARAMS.rlStatus) ?? '',
    rlFrom: params.get(ADM_URL_PARAMS.rlFrom) ?? '',
    rlTo: params.get(ADM_URL_PARAMS.rlTo) ?? '',
  };
}

export function getAdmFundElementId(fundId: string): string {
  return `adm-fund-${fundId}`;
}

export function buildAdmSearchParams(
  state: Partial<AdmFilterState>,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  const setOrDelete = (key: string, value: string | undefined) => {
    if (!value) params.delete(key);
    else params.set(key, value);
  };

  setOrDelete(ADM_URL_PARAMS.fund, state.fund);
  setOrDelete(ADM_URL_PARAMS.search, state.search);
  setOrDelete(ADM_URL_PARAMS.dlTitle, state.dlTitle);
  setOrDelete(ADM_URL_PARAMS.dlFrom, state.dlFrom);
  setOrDelete(ADM_URL_PARAMS.dlTo, state.dlTo);
  setOrDelete(ADM_URL_PARAMS.rlTitle, state.rlTitle);
  setOrDelete(ADM_URL_PARAMS.rlStatus, state.rlStatus);
  setOrDelete(ADM_URL_PARAMS.rlFrom, state.rlFrom);
  setOrDelete(ADM_URL_PARAMS.rlTo, state.rlTo);

  // Drop leftover tab / category accordion params
  params.delete('tab');
  params.delete('expanded');

  return params;
}
