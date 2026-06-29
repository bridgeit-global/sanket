export const FIELD_VISITOR_URL_PARAMS = {
  booth: 'booth',
  filter: 'filter',
} as const;

export type FieldVisitorFilterValue = 'all' | 'pending' | 'profiled';

export type FieldVisitorFilterState = {
  booth: string;
  filter: FieldVisitorFilterValue;
};

export function parseFieldVisitorFiltersFromSearchParams(
  params: URLSearchParams,
): Partial<FieldVisitorFilterState> {
  const filter = params.get(FIELD_VISITOR_URL_PARAMS.filter);
  const validFilters = ['all', 'pending', 'profiled'] as const;

  return {
    booth: params.get(FIELD_VISITOR_URL_PARAMS.booth) ?? undefined,
    filter:
      filter && (validFilters as readonly string[]).includes(filter)
        ? (filter as FieldVisitorFilterValue)
        : undefined,
  };
}

export function buildFieldVisitorSearchParams(
  state: Partial<FieldVisitorFilterState>,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  const setOrDelete = (key: string, value: string | undefined, omit?: boolean) => {
    if (omit || !value) params.delete(key);
    else params.set(key, value);
  };

  setOrDelete(FIELD_VISITOR_URL_PARAMS.booth, state.booth);
  setOrDelete(
    FIELD_VISITOR_URL_PARAMS.filter,
    state.filter,
    !state.filter || state.filter === 'all',
  );

  return params;
}
