export const ADM_URL_PARAMS = {
  fund: 'fund',
  search: 'search',
} as const;

export type AdmFilterState = {
  fund: string;
  search: string;
};

export function parseAdmFiltersFromSearchParams(
  params: URLSearchParams,
): AdmFilterState {
  return {
    fund: params.get(ADM_URL_PARAMS.fund) ?? '',
    search: params.get(ADM_URL_PARAMS.search) ?? '',
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

  // Drop legacy category accordion param
  params.delete('expanded');

  return params;
}
