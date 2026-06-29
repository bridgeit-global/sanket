export const DATA_EXPORT_URL_PARAMS = {
  format: 'format',
  wardNo: 'wardNo',
  partNo: 'partNo',
  gender: 'gender',
  minAge: 'minAge',
  maxAge: 'maxAge',
  hasPhone: 'hasPhone',
  religion: 'religion',
  isVoted2024: 'isVoted2024',
  columns: 'columns',
} as const;

export type DataExportUrlState = {
  format: 'excel' | 'csv' | 'pdf';
  wardNo: string[];
  partNo: string[];
  gender: string;
  minAge: string;
  maxAge: string;
  hasPhone: string;
  religion: string;
  isVoted2024: string;
  columns: string[];
};

export function parseDataExportStateFromSearchParams(
  params: URLSearchParams,
): Partial<DataExportUrlState> {
  const format = params.get(DATA_EXPORT_URL_PARAMS.format);
  const wardNo = params.get(DATA_EXPORT_URL_PARAMS.wardNo);
  const partNo = params.get(DATA_EXPORT_URL_PARAMS.partNo);
  const columns = params.get(DATA_EXPORT_URL_PARAMS.columns);

  return {
    format:
      format === 'excel' || format === 'csv' || format === 'pdf' ? format : undefined,
    wardNo: wardNo ? wardNo.split(',').filter(Boolean) : undefined,
    partNo: partNo ? partNo.split(',').filter(Boolean) : undefined,
    gender: params.get(DATA_EXPORT_URL_PARAMS.gender) ?? undefined,
    minAge: params.get(DATA_EXPORT_URL_PARAMS.minAge) ?? undefined,
    maxAge: params.get(DATA_EXPORT_URL_PARAMS.maxAge) ?? undefined,
    hasPhone: params.get(DATA_EXPORT_URL_PARAMS.hasPhone) ?? undefined,
    religion: params.get(DATA_EXPORT_URL_PARAMS.religion) ?? undefined,
    isVoted2024: params.get(DATA_EXPORT_URL_PARAMS.isVoted2024) ?? undefined,
    columns: columns ? columns.split(',').filter(Boolean) : undefined,
  };
}

export function buildDataExportSearchParams(
  state: Partial<DataExportUrlState>,
  existing?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(existing?.toString() ?? '');

  const setOrDelete = (key: string, value: string | undefined, omit?: boolean) => {
    if (omit || !value) params.delete(key);
    else params.set(key, value);
  };

  setOrDelete(
    DATA_EXPORT_URL_PARAMS.format,
    state.format,
    !state.format || state.format === 'excel',
  );
  setOrDelete(
    DATA_EXPORT_URL_PARAMS.wardNo,
    state.wardNo && state.wardNo.length > 0 ? state.wardNo.join(',') : undefined,
  );
  setOrDelete(
    DATA_EXPORT_URL_PARAMS.partNo,
    state.partNo && state.partNo.length > 0 ? state.partNo.join(',') : undefined,
  );
  setOrDelete(DATA_EXPORT_URL_PARAMS.gender, state.gender);
  setOrDelete(DATA_EXPORT_URL_PARAMS.minAge, state.minAge);
  setOrDelete(DATA_EXPORT_URL_PARAMS.maxAge, state.maxAge);
  setOrDelete(DATA_EXPORT_URL_PARAMS.hasPhone, state.hasPhone);
  setOrDelete(DATA_EXPORT_URL_PARAMS.religion, state.religion);
  setOrDelete(DATA_EXPORT_URL_PARAMS.isVoted2024, state.isVoted2024);
  setOrDelete(
    DATA_EXPORT_URL_PARAMS.columns,
    state.columns && state.columns.length > 0 ? state.columns.join(',') : undefined,
  );

  return params;
}
