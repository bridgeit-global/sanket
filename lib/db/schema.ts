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
  addressMaster: 'AddressMaster',
  letterAddressTypeLink: 'LetterAddressTypeLink',
  documentTypeMaster: 'DocumentTypeMaster',
  voterMaster: 'VoterMaster',
  electionMaster: 'ElectionMaster',
  boothMaster: 'BoothMaster',
  electionMapping: 'ElectionMapping',
  voterMobileNumber: 'VoterMobileNumber',
  beneficiaryServices: 'BeneficiaryService',
  beneficiaryServiceAttachment: 'BeneficiaryServiceAttachment',
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
  sirActivityLog: 'SirActivityLog',
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
  cadreMemberWhatsApp: 'CadreMemberWhatsApp',
  cadreWhatsAppBroadcast: 'CadreWhatsAppBroadcast',
  cadreWhatsAppMessage: 'CadreWhatsAppMessage',
  admFundingCategory: 'AdmFundingCategory',
  admFundRecord: 'AdmFundRecord',
  admFundAllocation: 'AdmFundAllocation',
  admDocument: 'AdmDocument',
  projectGroundMedia: 'ProjectGroundMedia',
  shortUrl: 'ShortUrl',
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

export type AddressMaster = {
  id: string;
  name: string;
  nameMr: string;
  addressType: 'school' | 'office' | 'ration_office' | 'general';
  line1En: string;
  line1Mr: string;
  line2En: string;
  line2Mr: string;
  line3En: string;
  line3Mr: string;
  cityEn: string;
  cityMr: string;
  stateEn: string;
  stateMr: string;
  pincode: string;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentTypeMaster = {
  id: string;
  code: string;
  labelEn: string;
  labelMr: string;
  lastSequence: number;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LetterAddressTypeLink = {
  id: string;
  letterType: string;
  addressField: string;
  addressType: 'school' | 'office' | 'ration_office' | 'general';
  sortOrder: number;
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
  beneficiaryServiceId: string | null;
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

export type BeneficiaryServiceAttachment = {
  id: string;
  serviceId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: Date;
};

export type ServiceCatalog = {
  id: string;
  name: string;
  category: string | null;
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

export type ProjectApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type ProjectNocStatus = 'NotRequired' | 'Pending' | 'Obtained' | 'Rejected';
export type ProjectDocumentKind =
  | 'approval_pdf'
  | 'sanction_letter'
  | 'noc'
  | 'supporting'
  | 'request_letter';
export type ProjectPhysicalStatus = 'WNS' | 'WIP' | 'WC';

export type MlaProject = {
  id: string;
  name: string;
  ward: string | null;
  wardGeoId: string | null;
  boothNo: string | null;
  type: string | null;
  status: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  department: string | null;
  category: string | null;
  taluka: string | null;
  village: string | null;
  estimatedCost: number;
  approvalStatus: ProjectApprovalStatus;
  nocRequired: boolean;
  nocStatus: ProjectNocStatus;
  remarks: string | null;
  physicalStatus: ProjectPhysicalStatus;
  bhoomiPujanDone: boolean;
  bhoomiPujanDate: string | null;
  lokarpanDone: boolean;
  lokarpanDate: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectAttachment = {
  id: string;
  projectId: string;
  registerEntryId: string | null;
  fileName: string | null;
  fileSizeKb: number;
  fileUrl: string | null;
  documentKind: ProjectDocumentKind;
  version: number;
  versionGroupId: string;
  uploadedBy: string | null;
  createdAt: Date;
  /** Populated when joined with RegisterEntry */
  registerRefNo?: string | null;
  registerSubject?: string | null;
  registerDate?: string | null;
  registerFromTo?: string | null;
};

export type ProjectGroundMedia = {
  id: string;
  projectId: string;
  photoType: 'before' | 'after';
  fileUrl: string;
  fileName: string;
  sortOrder: number;
  createdAt: Date;
};

export type RegisterEntry = {
  id: string;
  type: 'inward' | 'outward';
  documentType: string;
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
  /** Populated when listing with ADM/project link counts */
  linkedToAdm?: boolean;
  linkedToProject?: boolean;
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

export type SirActivityAction = 'search' | 'download' | 'share';

export type SirActivityLog = {
  id: string;
  epicNumber: string;
  action: SirActivityAction;
  performedBy: string;
  createdAt: Date;
};

export type ShortUrl = {
  id: string;
  code: string;
  targetUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  createdBy: string | null;
  expiresAt: Date | null;
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

export type AdmPhysicalStatus = ProjectPhysicalStatus;

export type AdmFundingCategory = {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdmFundRecord = {
  id: string;
  categoryId: string;
  financialYear: string;
  projectYear: string;
  /** Distinguishes multiple fund batches in the same FY (e.g. MLA-1, MLA-2). */
  batchLabel: string;
  budget: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdmAmountUnit = 'rupees' | 'thousands' | 'lakhs';

export type AdmFundAllocation = {
  id: string;
  fundRecordId: string;
  projectId: string;
  allocatedBudget: number;
  workCode: string | null;
  sortOrder: number;
  mlaRecommendationRef: string | null;
  technicalSanctionRef: string | null;
  technicalSanctionDate: string | null;
  technicalSanctionAmount: number;
  governmentFixedAmount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdmProjectGroundPhoto = {
  id: string;
  fileUrl: string;
  fileName: string;
};

export type AdmFundAllocationWithProject = AdmFundAllocation & {
  projectName: string;
  projectDepartment: string | null;
  projectCategory: string | null;
  projectTaluka: string | null;
  projectVillage: string | null;
  projectWard: string | null;
  projectWardGeoId: string | null;
  projectBoothNo: string | null;
  projectWardGeoName: string | null;
  projectPhysicalStatus: ProjectPhysicalStatus;
  projectEstimatedCost: number;
  projectApprovalStatus: ProjectApprovalStatus;
  projectBeforePhotos: AdmProjectGroundPhoto[];
  projectAfterPhotos: AdmProjectGroundPhoto[];
};

export type AdmDocument = {
  id: string;
  fundRecordId: string;
  registerEntryId: string | null;
  amountUnit: AdmAmountUnit;
  fileName: string | null;
  fileSizeKb: number;
  fileUrl: string | null;
  kind: string;
  label: string | null;
  uploadedBy: string;
  createdAt: Date;
  /** Populated when joined with RegisterEntry / attachments */
  registerRefNo?: string | null;
  registerSubject?: string | null;
  registerDate?: string | null;
  registerFromTo?: string | null;
  registerDocumentType?: string | null;
  attachmentFileUrl?: string | null;
  attachmentFileName?: string | null;
};

export type AdmFundRecordWithDetails = AdmFundRecord & {
  categoryName: string;
  categoryCode: string;
  allocations: AdmFundAllocationWithProject[];
  documents: AdmDocument[];
  allocatedBudget: number;
};

export type AdmFundingCategoryWithFunds = AdmFundingCategory & {
  fundRecords: AdmFundRecordWithDetails[];
  allocatedBudget: number;
  totalBudget: number;
};

export type CadreMemberWhatsApp = {
  memberId: string;
  whatsappPhone: string;
  updatedBy: string | null;
  updatedAt: Date;
};

export type CadreWhatsAppMessageStatus = 'pending' | 'success' | 'failure';

export type CadreWhatsAppMessageImage = {
  url: string;
  fileName: string;
  mimeType: string;
};

export type CadreWhatsAppBroadcastTarget = {
  constituencyId?: string;
  verticalId?: string;
  wardGeoId?: string;
  boothNo?: string;
  positionId?: string;
};

export type CadreWhatsAppBroadcast = {
  id: string;
  message: string;
  images: CadreWhatsAppMessageImage[];
  target: CadreWhatsAppBroadcastTarget;
  targetLabel: string;
  recipientCount: number;
  skippedNoWhatsapp: number;
  createdBy: string | null;
  createdAt: Date;
};

export type CadreWhatsAppBroadcastWithStats = CadreWhatsAppBroadcast & {
  pendingCount: number;
  successCount: number;
  failureCount: number;
};

export type CadreWhatsAppMessage = {
  id: string;
  memberId: string | null;
  broadcastId: string | null;
  whatsappPhone: string;
  message: string;
  images: CadreWhatsAppMessageImage[];
  status: CadreWhatsAppMessageStatus;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
};
