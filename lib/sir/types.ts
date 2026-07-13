export interface SirMobileNumber {
  mobileNumber: string;
  sortOrder: number;
}

export interface SirProfile {
  epicNumber: string;
  fullName: string;
  age: number | null;
  dob: string | null;
  gender: string | null;
  relationType: string | null;
  relationName: string | null;
  state: string;
  district: string;
  assemblyConstituency: string;
  partNo: string | null;
  srNo: string | null;
  mobileNumbers: SirMobileNumber[];
}
