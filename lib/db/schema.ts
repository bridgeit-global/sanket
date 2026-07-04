import type { CadreGeographicUnitType } from '@/lib/hierarchy/types';

/** Database table names (PascalCase as stored in PostgreSQL). */
export const TABLES = {
  role: 'Role',
  user: 'User',
  roleModulePermissions: 'RoleModulePermissions',
  chat: 'Chat',
  messageDeprecated: 'Message',
  message: 'Message_v2',
  voteDeprecated: 'Vote',
  vote: 'Vote_v2',
  document: 'Document',
  suggestion: 'Suggestion',
  stream: 'Stream',
  letter: 'Letter',
  letterMaster: 'LetterMaster',
  voterMaster: 'VoterMaster',
  electionMaster: 'ElectionMaster',
  boothMaster: 'BoothMaster',
  electionMapping: 'ElectionMapping',
  voterMobileNumber: 'VoterMobileNumber',
  beneficiaryServices: 'BeneficiaryService',
  serviceCatalog: 'ServiceCatalog',
  voterTasks: 'VoterTask',
  communityServiceAreas: 'CommunityServiceArea',
  taskHistory: 'TaskHistory',
  userModulePermissions: 'UserModulePermissions',
  dailyProgramme: 'DailyProgramme',
  dailyProgrammeAttachment: 'DailyProgrammeAttachment',
  mlaProject: 'MlaProject',
  projectAttachment: 'ProjectAttachment',
  registerEntry: 'RegisterEntry',
  registerAttachment: 'RegisterAttachment',
  exportJob: 'ExportJob',
  phoneUpdateHistory: 'PhoneUpdateHistory',
  voterProfile: 'VoterProfile',
  userPartAssignment: 'UserPartAssignment',
  pushSubscription: 'PushSubscription',
  cadreVerticalCategory: 'CadreVerticalCategory',
  cadreVertical: 'CadreVertical',
  cadrePositionLevel: 'CadrePositionLevel',
  cadrePosition: 'CadrePosition',
  cadreGeographicUnit: 'CadreGeographicUnit',
  cadreMember: 'CadreMember',
  cadreMemberVertical: 'CadreMemberVertical',
  cadreMemberPost: 'CadreMemberPost',
  admFundingCategory: 'AdmFundingCategory',
  admWork: 'AdmWork',
} as const;

export type Role = {
  id: string;
  name: string;
  description: string | null;
  defaultLandingModule: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: string;
  userId: string;
  password: string | null;
  roleId: string | null;
  metadata: unknown;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleModulePermission = {
  id: string;
  roleId: string;
  moduleKey: string;
  hasAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Chat = {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: 'public' | 'private';
};

export type MessageDeprecated = {
  id: string;
  chatId: string;
  role: string;
  content: unknown;
  createdAt: Date;
};

export type DBMessage = {
  id: string;
  chatId: string;
  role: string;
  parts: unknown;
  attachments: unknown;
  createdAt: Date;
};

export type VoteDeprecated = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

export type Vote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

export type Document = {
  id: string;
  createdAt: Date;
  title: string;
  content: string | null;
  kind: 'text' | 'code' | 'image' | 'sheet';
  userId: string;
};

export type Suggestion = {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description: string | null;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
};

export type Stream = {
  id: string;
  chatId: string;
  createdAt: Date;
};

export type LetterMaster = {
  id: string;
  name: string;
  letterType: string;
  letterLocale: string;
  templateHtml: string;
  letterheadUrl: string | null;
  letterheadMode: 'half' | 'full';
  paperSize: 'a4' | 'a5' | 'b5';
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Letter = {
  id: string;
  letterMasterId: string | null;
  letterType: string;
  letterLocale: string;
  referenceNo: string;
  title: string;
  fields: unknown;
  renderedHtml: string;
  paperSize: 'a4' | 'a5' | 'b5';
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VoterMaster = {
  epicNumber: string;
  fullName: string;
  relationType: string | null;
  relationName: string | null;
  familyGrouping: string | null;
  houseNumber: string | null;
  localityStreet: string | null;
  townVillage: string | null;
  religion: string | null;
  caste: string | null;
  age: number | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  pincode: string | null;
};

export type ElectionMaster = {
  electionId: string;
  electionType: string;
  year: number;
  delimitationVersion: string | null;
  dataSource: string | null;
  constituencyType: 'ward' | 'assembly' | 'parliament' | null;
  constituencyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BoothMaster = {
  electionId: string;
  boothNo: string;
  boothName: string | null;
  boothAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ElectionMapping = {
  epicNumber: string;
  electionId: string;
  boothNo: string | null;
  srNo: string | null;
  hasVoted: boolean | null;
};

export type VoterWithBooth = VoterMaster & {
  acNo?: string | null;
  boothNo?: string | null;
  /** @deprecated Use boothNo */
  partNo?: string | null;
  srNo?: string | null;
  isVoted2024?: boolean;
  mobileNoPrimary?: string | null;
  mobileNoSecondary?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  wardNo?: string | null;
  boothName?: string | null;
  englishBoothAddress?: string | null;
  caste?: string | null;
};

/** @deprecated Use VoterWithBooth */
export type VoterWithPartNo = VoterWithBooth;

export type VoterMobileNumber = {
  epicNumber: string;
  mobileNumber: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BeneficiaryService = {
  id: string;
  serviceType: 'individual' | 'community';
  serviceName: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: string;
  assignedTo: string | null;
  voterId: string | null;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  notes: string | null;
  programmeId: string | null;
};

export type ServiceCatalog = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VoterTask = {
  id: string;
  serviceId: string;
  voterId: string;
  taskType: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  notes: string | null;
};

export type CommunityServiceArea = {
  id: string;
  serviceId: string;
  electionId: string | null;
  boothNo: string | null;
  wardNo: string | null;
  acNo: string | null;
  createdAt: Date;
};

export type TaskHistory = {
  id: string;
  taskId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy: string;
  notes: string | null;
  createdAt: Date;
};

export type UserModulePermission = {
  id: string;
  userId: string;
  moduleKey: string;
  hasAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DailyProgramme = {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string;
  remarks: string | null;
  attended: boolean | null;
  programmeType: 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY';
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DailyProgrammeAttachment = {
  id: string;
  programmeId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: Date;
};

export type MlaProject = {
  id: string;
  name: string;
  ward: string | null;
  type: string | null;
  status: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectAttachment = {
  id: string;
  projectId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: Date;
};

export type RegisterEntry = {
  id: string;
  type: 'inward' | 'outward';
  documentType: 'VIP' | 'Department' | 'General';
  date: string;
  fromTo: string;
  subject: string;
  projectId: string | null;
  mode: string | null;
  refNo: string | null;
  officer: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RegisterAttachment = {
  id: string;
  entryId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: Date;
};

export type ExportJob = {
  id: string;
  type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number | null;
  processedRecords: number | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSizeKb: number | null;
  filters: unknown;
  errorMessage: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type PhoneUpdateHistory = {
  id: string;
  epicNumber: string;
  oldMobileNoPrimary: string | null;
  newMobileNoPrimary: string | null;
  oldMobileNoSecondary: string | null;
  newMobileNoSecondary: string | null;
  updatedBy: string;
  sourceModule: string;
  createdAt: Date;
};

export type VoterProfile = {
  epicNumber: string;
  education: string | null;
  occupationType: 'business' | 'service' | null;
  occupationDetail: string | null;
  region: string | null;
  religion: string | null;
  caste: string | null;
  isOurSupporter: boolean | null;
  feedback: string | null;
  influencerType: 'political' | 'local' | 'education' | 'religious' | null;
  vehicleType: '2w' | '4w' | 'both' | null;
  isProfiled: boolean;
  profiledAt: Date | null;
  profiledBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserPartAssignment = {
  id: string;
  userId: string;
  electionId: string;
  boothNo: string;
  createdAt: Date;
};

export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CadreVerticalCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CadreVertical = {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CadrePositionLevel = {
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CadrePosition = {
  id: string;
  levelId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CadreGeographicUnit = {
  id: string;
  type: CadreGeographicUnitType;
  name: string;
  parentId: string | null;
  acNo: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CadreMember = {
  id: string;
  constituencyId: string | null;
  personName: string | null;
  personPhone: string | null;
  personEmail: string | null;
  photoUrl: string | null;
  userId: string | null;
  epicNumber: string | null;
  notes: string | null;
  isActive: boolean;
  appointedAt: Date | null;
  termEndsAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CadreMemberVertical = {
  memberId: string;
  verticalId: string;
  isPrimary: boolean;
  createdAt: Date;
};

export type CadreMemberPost = {
  id: string;
  memberId: string;
  positionId: string;
  talukaId: string | null;
  wardGeoId: string | null;
  electionId: string | null;
  boothNo: string | null;
  label: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdmPhysicalStatus = 'WNS' | 'WIP' | 'WC';

export type AdmFundingCategory = {
  id: string;
  code: string;
  name: string;
  masterBudget: number;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdmWork = {
  id: string;
  categoryId: string;
  projectId: string | null;
  name: string;
  workBudget: number;
  physicalStatus: AdmPhysicalStatus;
  bhoomiPujanDone: boolean;
  bhoomiPujanDate: string | null;
  lokarpanDone: boolean;
  lokarpanDate: string | null;
  beforePhotoUrl: string | null;
  beforePhotoName: string | null;
  afterPhotoUrl: string | null;
  afterPhotoName: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdmWorkWithProject = AdmWork & {
  projectName: string | null;
};

export type AdmFundingCategoryWithWorks = AdmFundingCategory & {
  works: AdmWorkWithProject[];
  allocatedBudget: number;
};
