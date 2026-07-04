export const ADM_URL_PARAMS = {
  expanded: 'expanded',
  search: 'search',
} as const;

export type AdmFilterState = {
  expanded: string;
  search: string;
};

export function parseAdmFiltersFromSearchParams(
  params: URLSearchParams,
): AdmFilterState {
  return {
    expanded: params.get(ADM_URL_PARAMS.expanded) ?? '',
    search: params.get(ADM_URL_PARAMS.search) ?? '',
  };
}

export function getAdmCategoryElementId(categoryId: string): string {
  return `adm-category-${categoryId}`;
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

  setOrDelete(ADM_URL_PARAMS.expanded, state.expanded);
  setOrDelete(ADM_URL_PARAMS.search, state.search);

  return params;
}
