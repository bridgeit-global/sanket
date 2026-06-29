export const DAILY_PROGRAMME_URL_PARAMS = {
  start: 'start',
  end: 'end',
  type: 'type',
} as const;

export type DailyProgrammeFilterState = {
  start: string;
  end: string;
  type: 'ALL' | 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY';
};

export function parseDailyProgrammeFiltersFromSearchParams(
  params: URLSearchParams,
): Partial<DailyProgrammeFilterState> {
  const type = params.get(DAILY_PROGRAMME_URL_PARAMS.type);
  const validTypes = ['ALL', 'CONSTITUENCY', 'OUTSIDE_CONSTITUENCY'] as const;

  return {
    start: params.get(DAILY_PROGRAMME_URL_PARAMS.start) ?? undefined,
    end: params.get(DAILY_PROGRAMME_URL_PARAMS.end) ?? undefined,
    type:
      type && (validTypes as readonly string[]).includes(type)
        ? (type as DailyProgrammeFilterState['type'])
        : undefined,
  };
}

export function buildDailyProgrammeSearchParams(
  state: Partial<DailyProgrammeFilterState>,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  const setOrDelete = (key: string, value: string | undefined, omit?: boolean) => {
    if (omit || !value) params.delete(key);
    else params.set(key, value);
  };

  setOrDelete(DAILY_PROGRAMME_URL_PARAMS.start, state.start);
  setOrDelete(DAILY_PROGRAMME_URL_PARAMS.end, state.end);
  setOrDelete(DAILY_PROGRAMME_URL_PARAMS.type, state.type, !state.type || state.type === 'ALL');

  return params;
}
