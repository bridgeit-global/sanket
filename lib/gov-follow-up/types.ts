import type {
  GovFollowUpDepartment,
  GovFollowUpLocation,
  GovFollowUpLogKind,
  GovFollowUpMode,
  GovFollowUpPriority,
  GovFollowUpStatus,
} from '@/lib/db/schema';

export type GovFollowUpCatalogs = {
  departments: GovFollowUpDepartment[];
  locations: GovFollowUpLocation[];
  officers: string[];
  offices: string[];
  desks: string[];
  users: Array<{ id: string; userId: string }>;
};

export type GovFollowUpMatterInput = {
  subject: string;
  departmentId: string;
  locationId: string;
  officeName?: string | null;
  officerName?: string | null;
  designation?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  deskName?: string | null;
  presentStage?: string | null;
  staffUserId?: string | null;
  dateSubmitted: string;
  inwardRefNo?: string | null;
  nextAction?: string | null;
  nextFollowUpOn?: string | null;
  priority?: GovFollowUpPriority;
  status?: GovFollowUpStatus;
  remarks?: string | null;
  letterId?: string | null;
  registerEntryId?: string | null;
  beneficiaryServiceId?: string | null;
  projectId?: string | null;
};

export type GovFollowUpLogInput = {
  occurredOn: string;
  kind: GovFollowUpLogKind;
  mode?: GovFollowUpMode | null;
  body: string;
  departmentId?: string | null;
  locationId?: string | null;
  officeName?: string | null;
  officerName?: string | null;
  designation?: string | null;
  deskName?: string | null;
  presentStage?: string | null;
  nextFollowUpOn?: string | null;
  nextAction?: string | null;
  status?: GovFollowUpStatus;
  inwardRefNo?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export type GovFollowUpSummary = {
  dueToday: number;
  overdue: number;
  stale7: number;
  mantralaya: number;
  bmc: number;
  sra: number;
  minister: number;
  deptReply: number;
  sanctions: number;
  recentlyClosed: number;
};

export type GovFollowUpGroupRow = {
  key: string;
  label: string;
  count: number;
};

export type GovFollowUpVisitPlanner = {
  locationId: string;
  locationName: string;
  date: string;
  total: number;
  byDepartment: Array<{ departmentId: string; name: string; count: number }>;
};
