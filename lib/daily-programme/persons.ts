export const DAILY_PROGRAMME_PERSONS = ['SANA', 'NAWAB'] as const;

export type DailyProgrammePerson = (typeof DAILY_PROGRAMME_PERSONS)[number];

export const DEFAULT_DAILY_PROGRAMME_PERSON: DailyProgrammePerson = 'SANA';

export function isDailyProgrammePerson(
  value: string | null | undefined,
): value is DailyProgrammePerson {
  return value === 'SANA' || value === 'NAWAB';
}

export function parseDailyProgrammePerson(
  value: string | null | undefined,
): DailyProgrammePerson {
  return isDailyProgrammePerson(value) ? value : DEFAULT_DAILY_PROGRAMME_PERSON;
}

export function getDailyProgrammePersonLabelKey(
  person: DailyProgrammePerson,
): 'dailyProgramme.personSana' | 'dailyProgramme.personNawab' {
  return person === 'NAWAB'
    ? 'dailyProgramme.personNawab'
    : 'dailyProgramme.personSana';
}

export function getDailyProgrammePrintNameKey(
  person: DailyProgrammePerson,
): 'dailyProgramme.mlaName' | 'dailyProgramme.nawabName' {
  return person === 'NAWAB'
    ? 'dailyProgramme.nawabName'
    : 'dailyProgramme.mlaName';
}
