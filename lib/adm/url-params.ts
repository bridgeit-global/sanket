export const ADM_URL_PARAMS = {
  fund: 'fund',
  search: 'search',
  tab: 'tab',
  dlTitle: 'dlTitle',
  dlFrom: 'dlFrom',
  dlTo: 'dlTo',
} as const;

export type AdmTab = 'funds' | 'demand-letters';

export type AdmFilterState = {
  fund: string;
  search: string;
  tab: AdmTab;
  dlTitle: string;
  dlFrom: string;
  dlTo: string;
};

function parseAdmTab(value: string | null): AdmTab {
  return value === 'demand-letters' ? 'demand-letters' : 'funds';
}

export function parseAdmFiltersFromSearchParams(
  params: URLSearchParams,
): AdmFilterState {
  return {
    fund: params.get(ADM_URL_PARAMS.fund) ?? '',
    search: params.get(ADM_URL_PARAMS.search) ?? '',
    tab: parseAdmTab(params.get(ADM_URL_PARAMS.tab)),
    dlTitle: params.get(ADM_URL_PARAMS.dlTitle) ?? '',
    dlFrom: params.get(ADM_URL_PARAMS.dlFrom) ?? '',
    dlTo: params.get(ADM_URL_PARAMS.dlTo) ?? '',
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
  setOrDelete(
    ADM_URL_PARAMS.tab,
    state.tab && state.tab !== 'funds' ? state.tab : undefined,
  );
  setOrDelete(ADM_URL_PARAMS.dlTitle, state.dlTitle);
  setOrDelete(ADM_URL_PARAMS.dlFrom, state.dlFrom);
  setOrDelete(ADM_URL_PARAMS.dlTo, state.dlTo);

  // Drop legacy category accordion param
  params.delete('expanded');

  return params;
}
