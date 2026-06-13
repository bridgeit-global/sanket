export const SELECT_NONE_VALUE = '__none__';

/** Radix Select.Item cannot use an empty string as value. */
export function isValidSelectItemValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function toOptionalSelectValue(value: string) {
  return isValidSelectItemValue(value) ? value : SELECT_NONE_VALUE;
}

export function fromOptionalSelectValue(value: string) {
  return value === SELECT_NONE_VALUE ? '' : value;
}

export function toControlledSelectValue(value: string) {
  return isValidSelectItemValue(value) ? value : undefined;
}

/** Pick first non-empty string for SelectItem value, or null if none. */
export function resolveSelectItemValue(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (isValidSelectItemValue(value)) return value;
  }
  return null;
}
