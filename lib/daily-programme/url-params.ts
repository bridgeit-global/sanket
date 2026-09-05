import {
  DEFAULT_DAILY_PROGRAMME_PERSON,
  isDailyProgrammePerson,
  type DailyProgrammePerson,
} from '@/lib/daily-programme/persons';

export const DAILY_PROGRAMME_URL_PARAMS = {
  start: 'start',
  end: 'end',
  type: 'type',
  person: 'person',
} as const;

export type DailyProgrammeFilterState = {
  start: string;
  end: string;
  type: 'ALL' | 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY';
  person: DailyProgrammePerson;
};

export function parseDailyProgrammeFiltersFromSearchParams(
  params: URLSearchParams,
): Partial<DailyProgrammeFilterState> {
  const type = params.get(DAILY_PROGRAMME_URL_PARAMS.type);
  const validTypes = ['ALL', 'CONSTITUENCY', 'OUTSIDE_CONSTITUENCY'] as const;
  const person = params.get(DAILY_PROGRAMME_URL_PARAMS.person);

  return {
    start: params.get(DAILY_PROGRAMME_URL_PARAMS.start) ?? undefined,
    end: params.get(DAILY_PROGRAMME_URL_PARAMS.end) ?? undefined,
    type:
      type && (validTypes as readonly string[]).includes(type)
        ? (type as DailyProgrammeFilterState['type'])
        : undefined,
    person: isDailyProgrammePerson(person) ? person : undefined,
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
  setOrDelete(
    DAILY_PROGRAMME_URL_PARAMS.person,
    state.person,
    !state.person || state.person === DEFAULT_DAILY_PROGRAMME_PERSON,
  );

  return params;
}
