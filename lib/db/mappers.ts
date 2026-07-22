import type {
  BeneficiaryService,
  BeneficiaryServiceAttachment,
  BoothMaster,
  CadreGeographicUnit,
  CadreMember,
  CadreMemberPost,
  CadreMemberWhatsApp,
  CadreWhatsAppBroadcast,
  CadreWhatsAppBroadcastTarget,
  CadreWhatsAppMessage,
  CadreWhatsAppMessageImage,
  CadrePosition,
  CadrePositionLevel,
  CadreVertical,
  CadreVerticalCategory,
  Chat,
  CommunityServiceArea,
  DailyProgramme,
  DailyProgrammeAttachment,
  DBMessage,
  Document,
  ElectionMapping,
  ElectionMaster,
  ExportJob,
  Letter,
  LetterMaster,
  AddressMaster,
  DocumentTypeMaster,
  LetterAddressTypeLink,
  MlaProject,
  PhoneUpdateHistory,
  ProjectAttachment,
  PushSubscription,
  RegisterAttachment,
  RegisterEntry,
  Role,
  RoleModulePermission,
  ServiceCatalog,
  Stream,
  Suggestion,
  TaskHistory,
  User,
  UserModulePermission,
  UserPartAssignment,
  Vote,
  VoterMaster,
  VoterMobileNumber,
  VoterProfile,
  VoterTask,
  AdmFundingCategory,
  AdmFundRecord,
  AdmFundAllocation,
  AdmDocument,
  ProjectGroundMedia,
  ProjectApprovalStatus,
  ProjectNocStatus,
  ProjectPhysicalStatus,
  ProjectDocumentKind,
} from './schema';
import { getDefaultLetterPaperSize } from '@/lib/letters/paper-size';
import { isAddressType } from '@/lib/letters/address-types';

type Row = Record<string, unknown>;

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  return toDate(value);
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

/** Normalize DB date/timestamptz values to `yyyy-MM-dd` for API responses. */
function formatDateField(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
  }
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;
  if (date && !Number.isNaN(date.getTime())) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value);
}

function formatDateFieldOrNull(value: unknown): string | null {
  if (value == null) return null;
  const formatted = formatDateField(value);
  return formatted || null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toBoolOrNull(value: unknown): boolean | null {
  if (value == null) return null;
  return Boolean(value);
}

/** Parse Postgres booleans reliably (including 't'/'f' string forms). */
function toBool(value: unknown, defaultValue = false): boolean {
  if (value == null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 't' || value === 'true' || value === '1') return true;
  if (value === 'f' || value === 'false' || value === '0') return false;
  return Boolean(value);
}

export function mapUserRow(row: Row): User {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? row.userId),
    password: toStringOrNull(row.password),
    roleId: toStringOrNull(row.role_id ?? row.roleId),
    metadata: row.metadata ?? null,
    lastLogin: toDateOrNull(row.last_login ?? row.lastLogin),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapRoleRow(row: Row): Role {
  return {
    id: String(row.id),
    name: String(row.name),
    description: toStringOrNull(row.description),
    defaultLandingModule: toStringOrNull(
      row.default_landing_module ?? row.defaultLandingModule,
    ),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapRoleModulePermissionRow(row: Row): RoleModulePermission {
  return {
    id: String(row.id),
    roleId: String(row.role_id ?? row.roleId),
    moduleKey: String(row.module_key ?? row.moduleKey),
    hasAccess: Boolean(row.has_access ?? row.hasAccess),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapUserModulePermissionRow(row: Row): UserModulePermission {
  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id),
    moduleKey: String(row.module_key ?? row.moduleKey),
    hasAccess: Boolean(row.has_access ?? row.hasAccess),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapChatRow(row: Row): Chat {
  return {
    id: String(row.id),
    createdAt: toDate(row.createdAt),
    title: String(row.title),
    userId: String(row.userId),
    visibility: (row.visibility as Chat['visibility']) ?? 'private',
  };
}

export function mapMessageRow(row: Row): DBMessage {
  return {
    id: String(row.id),
    chatId: String(row.chatId),
    role: String(row.role),
    parts: row.parts,
    attachments: row.attachments,
    createdAt: toDate(row.createdAt),
  };
}

export function mapVoteRow(row: Row): Vote {
  return {
    chatId: String(row.chatId),
    messageId: String(row.messageId),
    isUpvoted: Boolean(row.isUpvoted),
  };
}

export function mapDocumentRow(row: Row): Document {
  return {
    id: String(row.id),
    createdAt: toDate(row.createdAt),
    title: String(row.title),
    content: toStringOrNull(row.content),
    kind: (row.text ?? row.kind ?? 'text') as Document['kind'],
    userId: String(row.userId),
  };
}

export function mapSuggestionRow(row: Row): Suggestion {
  return {
    id: String(row.id),
    documentId: String(row.documentId),
    documentCreatedAt: toDate(row.documentCreatedAt),
    originalText: String(row.originalText),
    suggestedText: String(row.suggestedText),
    description: toStringOrNull(row.description),
    isResolved: Boolean(row.isResolved),
    userId: String(row.userId),
    createdAt: toDate(row.createdAt),
  };
}

export function mapStreamRow(row: Row): Stream {
  return {
    id: String(row.id),
    chatId: String(row.chatId),
    createdAt: toDate(row.createdAt),
  };
}

function mapLetterPaperSize(
  value: unknown,
  letterType: string,
): 'a4' | 'a5' | 'b5' {
  if (value === 'a4' || value === 'a5' || value === 'b5') return value;
  return getDefaultLetterPaperSize(letterType);
}

export function mapLetterMasterRow(row: Row): LetterMaster {
  const letterType = String(row.letter_type ?? row.letterType);
  return {
    id: String(row.id),
    name: String(row.name),
    letterType,
    letterLocale: String(row.letter_locale ?? row.letterLocale),
    templateHtml: String(row.template_html ?? row.templateHtml),
    letterheadUrl: toStringOrNull(row.letterhead_url ?? row.letterheadUrl),
    letterheadMode:
      (row.letterhead_mode ?? row.letterheadMode) === 'half' ? 'half' : 'full',
    paperSize: mapLetterPaperSize(row.paper_size ?? row.paperSize, letterType),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    updatedBy: toStringOrNull(row.updated_by ?? row.updatedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

function mapAddressType(value: unknown): AddressMaster['addressType'] {
  return isAddressType(value) ? value : 'general';
}

export function mapAddressMasterRow(row: Row): AddressMaster {
  return {
    id: String(row.id),
    name: String(row.name),
    nameMr: String(row.name_mr ?? row.nameMr ?? ''),
    addressType: mapAddressType(row.address_type ?? row.addressType),
    line1En: String(row.line1_en ?? row.line1En ?? ''),
    line1Mr: String(row.line1_mr ?? row.line1Mr ?? ''),
    line2En: String(row.line2_en ?? row.line2En ?? ''),
    line2Mr: String(row.line2_mr ?? row.line2Mr ?? ''),
    line3En: String(row.line3_en ?? row.line3En ?? ''),
    line3Mr: String(row.line3_mr ?? row.line3Mr ?? ''),
    cityEn: String(row.city_en ?? row.cityEn ?? ''),
    cityMr: String(row.city_mr ?? row.cityMr ?? ''),
    stateEn: String(row.state_en ?? row.stateEn ?? ''),
    stateMr: String(row.state_mr ?? row.stateMr ?? ''),
    pincode: String(row.pincode ?? ''),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    updatedBy: toStringOrNull(row.updated_by ?? row.updatedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapDocumentTypeMasterRow(row: Row): DocumentTypeMaster {
  return {
    id: String(row.id),
    code: String(row.code),
    labelEn: String(row.label_en ?? row.labelEn ?? ''),
    labelMr: String(row.label_mr ?? row.labelMr ?? ''),
    lastSequence: Number(row.last_sequence ?? row.lastSequence ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    updatedBy: toStringOrNull(row.updated_by ?? row.updatedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapLetterAddressTypeLinkRow(row: Row): LetterAddressTypeLink {
  return {
    id: String(row.id),
    letterType: String(row.letter_type ?? row.letterType),
    addressField: String(row.address_field ?? row.addressField),
    addressType: mapAddressType(row.address_type ?? row.addressType),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapLetterRow(row: Row): Letter {
  const letterType = String(row.letter_type ?? row.letterType);
  return {
    id: String(row.id),
    letterMasterId: toStringOrNull(row.letter_master_id ?? row.letterMasterId),
    letterType,
    letterLocale: String(row.letter_locale ?? row.letterLocale),
    referenceNo: String(row.reference_no ?? row.referenceNo ?? ''),
    title: String(row.title),
    fields: row.fields ?? null,
    renderedHtml: String(
      row.rendered_html ?? row.renderedHtml ?? row.body ?? '',
    ),
    paperSize: mapLetterPaperSize(row.paper_size ?? row.paperSize, letterType),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    beneficiaryServiceId: toStringOrNull(
      row.beneficiary_service_id ?? row.beneficiaryServiceId,
    ),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapVoterMasterRow(row: Row): VoterMaster {
  return {
    epicNumber: String(row.epic_number ?? row.epicNumber),
    fullName: String(row.full_name ?? row.fullName),
    relationType: toStringOrNull(row.relation_type ?? row.relationType),
    relationName: toStringOrNull(row.relation_name ?? row.relationName),
    familyGrouping: toStringOrNull(row.family_grouping ?? row.familyGrouping),
    houseNumber: toStringOrNull(row.house_number ?? row.houseNumber),
    localityStreet: toStringOrNull(row.locality_street ?? row.localityStreet),
    townVillage: toStringOrNull(row.town_village ?? row.townVillage),
    religion: toStringOrNull(row.religion),
    caste: toStringOrNull(row.caste),
    age: toNumberOrNull(row.age),
    dob: toStringOrNull(row.dob),
    gender: toStringOrNull(row.gender),
    address: toStringOrNull(row.address),
    pincode: toStringOrNull(row.pincode),
  };
}

export function mapElectionMasterRow(row: Row): ElectionMaster {
  return {
    electionId: String(row.election_id ?? row.electionId),
    electionType: String(row.election_type ?? row.electionType),
    year: Number(row.year),
    delimitationVersion: toStringOrNull(
      row.delimitation_version ?? row.delimitationVersion,
    ),
    dataSource: toStringOrNull(row.data_source ?? row.dataSource),
    constituencyType: (row.constituency_type ??
      row.constituencyType) as ElectionMaster['constituencyType'],
    constituencyId: toStringOrNull(row.constituency_id ?? row.constituencyId),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapBoothMasterRow(row: Row): BoothMaster {
  return {
    electionId: String(row.election_id ?? row.electionId),
    boothNo: String(row.booth_no ?? row.boothNo),
    boothName: toStringOrNull(row.booth_name ?? row.boothName),
    boothAddress: toStringOrNull(row.booth_address ?? row.boothAddress),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapElectionMappingRow(row: Row): ElectionMapping {
  return {
    epicNumber: String(row.epic_number ?? row.epicNumber),
    electionId: String(row.election_id ?? row.electionId),
    boothNo: toStringOrNull(row.booth_no ?? row.boothNo),
    srNo: toStringOrNull(row.sr_no ?? row.srNo),
    hasVoted: toBoolOrNull(row.has_voted ?? row.hasVoted),
  };
}

export function mapVoterMobileNumberRow(row: Row): VoterMobileNumber {
  return {
    epicNumber: String(row.epic_number ?? row.epicNumber),
    mobileNumber: String(row.mobile_number ?? row.mobileNumber),
    sortOrder: Number(row.sort_order ?? row.sortOrder),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapBeneficiaryServiceRow(row: Row): BeneficiaryService {
  return {
    id: String(row.id),
    serviceType: (row.service_type ?? row.serviceType) as BeneficiaryService['serviceType'],
    serviceName: String(row.service_name ?? row.serviceName),
    description: toStringOrNull(row.description),
    status: row.status as BeneficiaryService['status'],
    priority: row.priority as BeneficiaryService['priority'],
    requestedBy: String(row.requested_by ?? row.requestedBy),
    assignedTo: toStringOrNull(row.assigned_to ?? row.assignedTo),
    voterId: toStringOrNull(row.voter_id ?? row.voterId),
    token: String(row.token),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
    completedAt: toDateOrNull(row.completed_at ?? row.completedAt),
    notes: toStringOrNull(row.notes),
    programmeId: toStringOrNull(row.programme_id ?? row.programmeId),
  };
}

export function mapServiceCatalogRow(row: Row): ServiceCatalog {
  return {
    id: String(row.id),
    name: String(row.name),
    category: toStringOrNull(row.category),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapVoterTaskRow(row: Row): VoterTask {
  return {
    id: String(row.id),
    serviceId: String(row.service_id ?? row.serviceId),
    voterId: String(row.voter_id ?? row.voterId),
    taskType: String(row.task_type ?? row.taskType),
    description: toStringOrNull(row.description),
    status: row.status as VoterTask['status'],
    priority: row.priority as VoterTask['priority'],
    assignedTo: toStringOrNull(row.assigned_to ?? row.assignedTo),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    updatedBy: toStringOrNull(row.updated_by ?? row.updatedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
    completedAt: toDateOrNull(row.completed_at ?? row.completedAt),
    notes: toStringOrNull(row.notes),
  };
}

export function mapCommunityServiceAreaRow(row: Row): CommunityServiceArea {
  return {
    id: String(row.id),
    serviceId: String(row.service_id ?? row.serviceId),
    electionId: toStringOrNull(row.election_id ?? row.electionId),
    boothNo: toStringOrNull(row.booth_no ?? row.boothNo),
    wardNo: toStringOrNull(row.ward_no ?? row.wardNo),
    acNo: toStringOrNull(row.ac_no ?? row.acNo),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapTaskHistoryRow(row: Row): TaskHistory {
  return {
    id: String(row.id),
    taskId: String(row.task_id ?? row.taskId),
    action: String(row.action),
    oldValue: toStringOrNull(row.old_value ?? row.oldValue),
    newValue: toStringOrNull(row.new_value ?? row.newValue),
    performedBy: String(row.performed_by ?? row.performedBy),
    notes: toStringOrNull(row.notes),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapDailyProgrammeRow(row: Row): DailyProgramme {
  return {
    id: String(row.id),
    date: formatDateField(row.date),
    startTime: String(row.start_time ?? row.startTime),
    endTime: toStringOrNull(row.end_time ?? row.endTime),
    title: String(row.title),
    location: String(row.location),
    remarks: toStringOrNull(row.remarks),
    attended: toBoolOrNull(row.attended),
    programmeType: (row.programme_type ?? row.programmeType) as DailyProgramme['programmeType'],
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 1),
    startDate: formatDateFieldOrNull(row.start_date ?? row.startDate),
    endDate: formatDateFieldOrNull(row.end_date ?? row.endDate),
    createdBy: String(row.created_by ?? row.createdBy),
    updatedBy: toStringOrNull(row.updated_by ?? row.updatedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapDailyProgrammeAttachmentRow(row: Row): DailyProgrammeAttachment {
  return {
    id: String(row.id),
    programmeId: String(row.programme_id ?? row.programmeId),
    fileName: String(row.file_name ?? row.fileName),
    fileSizeKb: Number(row.file_size_kb ?? row.fileSizeKb),
    fileUrl: toStringOrNull(row.file_url ?? row.fileUrl),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapMlaProjectRow(row: Row): MlaProject {
  return {
    id: String(row.id),
    name: String(row.name),
    ward: toStringOrNull(row.ward),
    wardGeoId: toStringOrNull(row.ward_geo_id ?? row.wardGeoId),
    boothNo: toStringOrNull(row.booth_no ?? row.boothNo),
    type: toStringOrNull(row.type),
    status: row.status as MlaProject['status'],
    department: toStringOrNull(row.department),
    category: toStringOrNull(row.category),
    taluka: toStringOrNull(row.taluka),
    village: toStringOrNull(row.village),
    estimatedCost: Number(row.estimated_cost ?? row.estimatedCost ?? 0),
    approvalStatus: (row.approval_status ??
      row.approvalStatus ??
      'Pending') as ProjectApprovalStatus,
    nocRequired: Boolean(row.noc_required ?? row.nocRequired ?? false),
    nocStatus: (row.noc_status ?? row.nocStatus ?? 'NotRequired') as ProjectNocStatus,
    remarks: toStringOrNull(row.remarks),
    physicalStatus: (row.physical_status ??
      row.physicalStatus ??
      'WNS') as ProjectPhysicalStatus,
    bhoomiPujanDone: Boolean(row.bhoomi_pujan_done ?? row.bhoomiPujanDone ?? false),
    bhoomiPujanDate: row.bhoomi_pujan_date ?? row.bhoomiPujanDate
      ? formatDateField(row.bhoomi_pujan_date ?? row.bhoomiPujanDate)
      : null,
    lokarpanDone: Boolean(row.lokarpan_done ?? row.lokarpanDone ?? false),
    lokarpanDate: row.lokarpan_date ?? row.lokarpanDate
      ? formatDateField(row.lokarpan_date ?? row.lokarpanDate)
      : null,
    createdBy: String(row.created_by ?? row.createdBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapAdmFundingCategoryRow(row: Row): AdmFundingCategory {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    displayOrder: Number(row.display_order ?? row.displayOrder ?? 0),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapAdmFundRecordRow(row: Row): AdmFundRecord {
  return {
    id: String(row.id),
    categoryId: String(row.category_id ?? row.categoryId),
    financialYear: String(row.financial_year ?? row.financialYear),
    projectYear: String(row.project_year ?? row.projectYear),
    batchLabel: String(row.batch_label ?? row.batchLabel ?? ''),
    budget: Number(row.budget ?? 0),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapAdmFundAllocationRow(row: Row): AdmFundAllocation {
  return {
    id: String(row.id),
    fundRecordId: String(row.fund_record_id ?? row.fundRecordId),
    projectId: String(row.project_id ?? row.projectId),
    allocatedBudget: Number(row.allocated_budget ?? row.allocatedBudget ?? 0),
    workCode: toStringOrNull(row.work_code ?? row.workCode),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    mlaRecommendationRef: toStringOrNull(
      row.mla_recommendation_ref ?? row.mlaRecommendationRef,
    ),
    technicalSanctionRef: toStringOrNull(
      row.technical_sanction_ref ?? row.technicalSanctionRef,
    ),
    technicalSanctionDate: row.technical_sanction_date ?? row.technicalSanctionDate
      ? formatDateField(row.technical_sanction_date ?? row.technicalSanctionDate)
      : null,
    technicalSanctionAmount: Number(
      row.technical_sanction_amount ?? row.technicalSanctionAmount ?? 0,
    ),
    governmentFixedAmount: Number(
      row.government_fixed_amount ?? row.governmentFixedAmount ?? 0,
    ),
    createdBy: String(row.created_by ?? row.createdBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapAdmDocumentRow(row: Row): AdmDocument {
  return {
    id: String(row.id),
    fundRecordId: String(row.fund_record_id ?? row.fundRecordId),
    registerEntryId: toStringOrNull(
      row.register_entry_id ?? row.registerEntryId,
    ),
    amountUnit: (row.amount_unit ??
      row.amountUnit ??
      'rupees') as AdmDocument['amountUnit'],
    fileName: toStringOrNull(row.file_name ?? row.fileName),
    fileSizeKb: Number(row.file_size_kb ?? row.fileSizeKb ?? 0),
    fileUrl: toStringOrNull(row.file_url ?? row.fileUrl),
    kind: String(row.kind ?? 'sanction_order'),
    label: toStringOrNull(row.label),
    uploadedBy: String(row.uploaded_by ?? row.uploadedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    registerRefNo: toStringOrNull(row.register_ref_no ?? row.registerRefNo),
    registerSubject: toStringOrNull(
      row.register_subject ?? row.registerSubject,
    ),
    registerDate: row.register_date ?? row.registerDate
      ? formatDateField(row.register_date ?? row.registerDate)
      : null,
    registerFromTo: toStringOrNull(
      row.register_from_to ?? row.registerFromTo,
    ),
    registerDocumentType: toStringOrNull(
      row.register_document_type ?? row.registerDocumentType,
    ),
    attachmentFileUrl: toStringOrNull(
      row.attachment_file_url ?? row.attachmentFileUrl,
    ),
    attachmentFileName: toStringOrNull(
      row.attachment_file_name ?? row.attachmentFileName,
    ),
  };
}

export function mapProjectGroundMediaRow(row: Row): ProjectGroundMedia {
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? row.projectId),
    photoType: (row.photo_type ?? row.photoType) as 'before' | 'after',
    fileUrl: String(row.file_url ?? row.fileUrl),
    fileName: String(row.file_name ?? row.fileName),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapProjectAttachmentRow(row: Row): ProjectAttachment {
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? row.projectId),
    registerEntryId: toStringOrNull(
      row.register_entry_id ?? row.registerEntryId,
    ),
    fileName: toStringOrNull(row.file_name ?? row.fileName),
    fileSizeKb: Number(row.file_size_kb ?? row.fileSizeKb ?? 0),
    fileUrl: toStringOrNull(row.file_url ?? row.fileUrl),
    documentKind: (row.document_kind ??
      row.documentKind ??
      'supporting') as ProjectDocumentKind,
    version: Number(row.version ?? 1),
    versionGroupId: String(
      row.version_group_id ?? row.versionGroupId ?? row.id,
    ),
    uploadedBy: toStringOrNull(row.uploaded_by ?? row.uploadedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    registerRefNo: toStringOrNull(row.register_ref_no ?? row.registerRefNo),
    registerSubject: toStringOrNull(
      row.register_subject ?? row.registerSubject,
    ),
    registerDate: row.register_date ?? row.registerDate
      ? formatDateField(row.register_date ?? row.registerDate)
      : null,
    registerFromTo: toStringOrNull(
      row.register_from_to ?? row.registerFromTo,
    ),
  };
}

export function mapRegisterEntryRow(row: Row): RegisterEntry {
  return {
    id: String(row.id),
    type: row.type as RegisterEntry['type'],
    documentType: (row.document_type ?? row.documentType) as RegisterEntry['documentType'],
    date: String(row.date),
    fromTo: String(row.from_to ?? row.fromTo),
    subject: String(row.subject),
    projectId: toStringOrNull(row.project_id ?? row.projectId),
    mode: toStringOrNull(row.mode),
    refNo: toStringOrNull(row.ref_no ?? row.refNo),
    officer: toStringOrNull(row.officer),
    createdBy: String(row.created_by ?? row.createdBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapBeneficiaryServiceAttachmentRow(
  row: Row,
): BeneficiaryServiceAttachment {
  return {
    id: String(row.id),
    serviceId: String(row.service_id ?? row.serviceId),
    fileName: String(row.file_name ?? row.fileName),
    fileSizeKb: Number(row.file_size_kb ?? row.fileSizeKb),
    fileUrl: toStringOrNull(row.file_url ?? row.fileUrl),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapRegisterAttachmentRow(row: Row): RegisterAttachment {
  return {
    id: String(row.id),
    entryId: String(row.entry_id ?? row.entryId),
    fileName: String(row.file_name ?? row.fileName),
    fileSizeKb: Number(row.file_size_kb ?? row.fileSizeKb),
    fileUrl: toStringOrNull(row.file_url ?? row.fileUrl),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapExportJobRow(row: Row): ExportJob {
  return {
    id: String(row.id),
    type: String(row.type),
    format: String(row.format),
    status: row.status as ExportJob['status'],
    progress: Number(row.progress ?? 0),
    totalRecords: toNumberOrNull(row.total_records ?? row.totalRecords),
    processedRecords: toNumberOrNull(row.processed_records ?? row.processedRecords),
    fileUrl: toStringOrNull(row.file_url ?? row.fileUrl),
    fileName: toStringOrNull(row.file_name ?? row.fileName),
    fileSizeKb: toNumberOrNull(row.file_size_kb ?? row.fileSizeKb),
    filters: row.filters ?? null,
    errorMessage: toStringOrNull(row.error_message ?? row.errorMessage),
    createdBy: String(row.created_by ?? row.createdBy),
    // ExportJob.created_at is timestamp without time zone (UTC wall clock from DB now())
    createdAt: parseUtcTimestamp(row.created_at ?? row.createdAt),
    updatedAt: parseUtcTimestamp(row.updated_at ?? row.updatedAt),
    completedAt: (() => {
      const value = row.completed_at ?? row.completedAt;
      return value == null ? null : parseUtcTimestamp(value);
    })(),
  };
}

/** Parse Postgres `timestamp without time zone` values as UTC. */
function parseUtcTimestamp(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return new Date();
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    return new Date(`${normalized}Z`);
  }
  return new Date();
}

export function mapPhoneUpdateHistoryRow(row: Row): PhoneUpdateHistory {
  return {
    id: String(row.id),
    epicNumber: String(row.epic_number ?? row.epicNumber),
    oldMobileNoPrimary: toStringOrNull(
      row.old_mobile_no_primary ?? row.oldMobileNoPrimary,
    ),
    newMobileNoPrimary: toStringOrNull(
      row.new_mobile_no_primary ?? row.newMobileNoPrimary,
    ),
    oldMobileNoSecondary: toStringOrNull(
      row.old_mobile_no_secondary ?? row.oldMobileNoSecondary,
    ),
    newMobileNoSecondary: toStringOrNull(
      row.new_mobile_no_secondary ?? row.newMobileNoSecondary,
    ),
    updatedBy: String(row.updated_by ?? row.updatedBy),
    sourceModule: String(row.source_module ?? row.sourceModule),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapVoterProfileRow(row: Row): VoterProfile {
  return {
    epicNumber: String(row.epic_number ?? row.epicNumber),
    education: toStringOrNull(row.education),
    occupationType: (row.occupation_type ?? row.occupationType) as VoterProfile['occupationType'],
    occupationDetail: toStringOrNull(row.occupation_detail ?? row.occupationDetail),
    region: toStringOrNull(row.region),
    religion: toStringOrNull(row.religion),
    caste: toStringOrNull(row.caste),
    isOurSupporter: toBoolOrNull(row.is_our_supporter ?? row.isOurSupporter),
    feedback: toStringOrNull(row.feedback),
    influencerType: (row.influencer_type ?? row.influencerType) as VoterProfile['influencerType'],
    vehicleType: (row.vehicle_type ?? row.vehicleType) as VoterProfile['vehicleType'],
    isProfiled: Boolean(row.is_profiled ?? row.isProfiled),
    profiledAt: toDateOrNull(row.profiled_at ?? row.profiledAt),
    profiledBy: toStringOrNull(row.profiled_by ?? row.profiledBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapUserPartAssignmentRow(row: Row): UserPartAssignment {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? row.userId),
    electionId: String(row.election_id ?? row.electionId),
    boothNo: String(row.booth_no ?? row.boothNo),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapPushSubscriptionRow(row: Row): PushSubscription {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? row.userId),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
    userAgent: toStringOrNull(row.user_agent ?? row.userAgent),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadreVerticalCategoryRow(row: Row): CadreVerticalCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadreVerticalRow(row: Row): CadreVertical {
  return {
    id: String(row.id),
    categoryId: String(row.category_id ?? row.categoryId),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadrePositionLevelRow(row: Row): CadrePositionLevel {
  return {
    id: String(row.id),
    key: String(row.key),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadrePositionRow(row: Row): CadrePosition {
  return {
    id: String(row.id),
    levelId: String(row.level_id ?? row.levelId),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadreGeographicUnitRow(row: Row): CadreGeographicUnit {
  return {
    id: String(row.id),
    type: row.type as CadreGeographicUnit['type'],
    name: String(row.name),
    parentId: toStringOrNull(row.parent_id ?? row.parentId),
    acNo: toStringOrNull(row.ac_no ?? row.acNo),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadreMemberRow(row: Row): CadreMember {
  return {
    id: String(row.id),
    constituencyId: toStringOrNull(row.constituency_id ?? row.constituencyId),
    personName: toStringOrNull(row.person_name ?? row.personName),
    personPhone: toStringOrNull(row.person_phone ?? row.personPhone),
    personEmail: toStringOrNull(row.person_email ?? row.personEmail),
    photoUrl: toStringOrNull(row.photo_url ?? row.photoUrl),
    userId: toStringOrNull(row.user_id ?? row.userId),
    epicNumber: toStringOrNull(row.epic_number ?? row.epicNumber),
    notes: toStringOrNull(row.notes),
    isActive: toBool(row.is_active ?? row.isActive, true),
    appointedAt: toDateOrNull(row.appointed_at ?? row.appointedAt),
    termEndsAt: toDateOrNull(row.term_ends_at ?? row.termEndsAt),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    updatedBy: toStringOrNull(row.updated_by ?? row.updatedBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadreMemberPostRow(row: Row): CadreMemberPost {
  return {
    id: String(row.id),
    memberId: String(row.member_id ?? row.memberId),
    positionId: String(row.position_id ?? row.positionId),
    talukaId: toStringOrNull(row.taluka_id ?? row.talukaId),
    wardGeoId: toStringOrNull(row.ward_geo_id ?? row.wardGeoId),
    electionId: toStringOrNull(row.election_id ?? row.electionId),
    boothNo: toStringOrNull(row.booth_no ?? row.boothNo),
    label: toStringOrNull(row.label),
    isPrimary: toBool(row.is_primary ?? row.isPrimary),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

export function mapCadreMemberWhatsAppRow(row: Row): CadreMemberWhatsApp {
  return {
    memberId: String(row.member_id ?? row.memberId),
    whatsappPhone: String(row.whatsapp_phone ?? row.whatsappPhone),
    updatedBy: toStringOrNull(row.updated_by ?? row.updatedBy),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
  };
}

function mapCadreWhatsAppMessageImages(value: unknown): CadreWhatsAppMessageImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const url = row.url ?? row.fileUrl;
      const fileName = row.fileName ?? row.file_name;
      const mimeType = row.mimeType ?? row.mime_type;
      if (typeof url !== 'string' || !url.trim()) return null;
      return {
        url: url.trim(),
        fileName: typeof fileName === 'string' && fileName.trim() ? fileName.trim() : 'image',
        mimeType:
          typeof mimeType === 'string' && mimeType.trim()
            ? mimeType.trim()
            : 'image/jpeg',
      };
    })
    .filter((item): item is CadreWhatsAppMessageImage => item !== null);
}

function mapCadreWhatsAppBroadcastTarget(value: unknown): CadreWhatsAppBroadcastTarget {
  if (!value || typeof value !== 'object') return {};
  const row = value as Record<string, unknown>;
  const result: CadreWhatsAppBroadcastTarget = {};
  if (typeof row.constituencyId === 'string' && row.constituencyId.trim()) {
    result.constituencyId = row.constituencyId.trim();
  } else if (typeof row.constituency_id === 'string' && row.constituency_id.trim()) {
    result.constituencyId = row.constituency_id.trim();
  }
  if (typeof row.verticalId === 'string' && row.verticalId.trim()) {
    result.verticalId = row.verticalId.trim();
  } else if (typeof row.vertical_id === 'string' && row.vertical_id.trim()) {
    result.verticalId = row.vertical_id.trim();
  }
  if (typeof row.wardGeoId === 'string' && row.wardGeoId.trim()) {
    result.wardGeoId = row.wardGeoId.trim();
  } else if (typeof row.ward_geo_id === 'string' && row.ward_geo_id.trim()) {
    result.wardGeoId = row.ward_geo_id.trim();
  }
  if (typeof row.boothNo === 'string' && row.boothNo.trim()) {
    result.boothNo = row.boothNo.trim();
  } else if (typeof row.booth_no === 'string' && row.booth_no.trim()) {
    result.boothNo = row.booth_no.trim();
  }
  if (typeof row.positionId === 'string' && row.positionId.trim()) {
    result.positionId = row.positionId.trim();
  } else if (typeof row.position_id === 'string' && row.position_id.trim()) {
    result.positionId = row.position_id.trim();
  }
  return result;
}

export function mapCadreWhatsAppBroadcastRow(row: Row): CadreWhatsAppBroadcast {
  return {
    id: String(row.id),
    message: String(row.message ?? ''),
    images: mapCadreWhatsAppMessageImages(row.image_urls ?? row.imageUrls),
    target: mapCadreWhatsAppBroadcastTarget(row.target),
    targetLabel: String(row.target_label ?? row.targetLabel ?? ''),
    recipientCount: Number(row.recipient_count ?? row.recipientCount ?? 0),
    skippedNoWhatsapp: Number(row.skipped_no_whatsapp ?? row.skippedNoWhatsapp ?? 0),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
  };
}

export function mapCadreWhatsAppMessageRow(row: Row): CadreWhatsAppMessage {
  return {
    id: String(row.id),
    memberId: toStringOrNull(row.member_id ?? row.memberId),
    broadcastId: toStringOrNull(row.broadcast_id ?? row.broadcastId),
    whatsappPhone: String(row.whatsapp_phone ?? row.whatsappPhone),
    message: String(row.message ?? ''),
    images: mapCadreWhatsAppMessageImages(row.image_urls ?? row.imageUrls),
    status: String(row.status) as CadreWhatsAppMessage['status'],
    errorMessage: toStringOrNull(row.error_message ?? row.errorMessage),
    createdBy: toStringOrNull(row.created_by ?? row.createdBy),
    createdAt: toDate(row.created_at ?? row.createdAt),
    updatedAt: toDate(row.updated_at ?? row.updatedAt),
    processedAt: toDateOrNull(row.processed_at ?? row.processedAt),
  };
}

/** Convert camelCase object keys to snake_case for Supabase inserts/updates. */
export function toSnakeCaseKeys<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/** Chat SDK tables use camelCase column names in the database. */
export function toChatSdkKeys<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  return { ...obj };
}
