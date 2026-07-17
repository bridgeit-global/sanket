import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from './schema';
import { mapUserRow } from './mappers';
import { generateHashedPassword } from './utils';
import { ChatSDKError } from '../errors';
import type { User } from './schema';
import {
  supportsVoterMasterCasteColumn,
} from './raw-queries';

export {
  type BasicVoterWithBooth,
  type VoterSearchPagination,
  type VotingHistoryWithBooth,
  getAllVoter,
  getVoterByAC,
  getVoterByWard,
  getVoterByPart,
  getVoterEpicByPartAndSerial,
  getVoterByBooth,
  searchVoterByEpicNumber,
  countSearchVoterByEpicNumber,
  searchVoterByName,
  countSearchVoterByName,
  searchVoterByPhoneNumber,
  searchVoterByMobileNumberTable,
  countSearchVoterByMobileNumberTable,
  getVoterByVotingStatus,
  getVoterCountByAC,
  searchVoterByDetails,
  countSearchVoterByDetails,
  getRelatedVoters,
  getPhoneUpdateStats,
  getBeneficiaryServiceStats,
  getMessageCountByUserId,
  getTasksWithFilters,
  getDailyProgrammeItems,
  getCommunityServicesWithAreas,
  getVoterVotingHistory,
  getVotingStatistics,
  getVotersForExport,
  getVotersCountForExport,
  getVotingPatterns,
  getRelatedVotersServicesAndEvents,
} from './raw-queries';

export { getCurrentElectionId } from './election';

export {
  type SirPartAndSerial,
  type SirActivityBucket,
  type SirActivityGroupStat,
  type SirActivityStats,
  type SirActivityUserStat,
  getSirPartAndSerial,
  logSirActivity,
  getSirActivityStats,
} from './sir-queries';

export {
  type ElectionMasterOption,
  type VoterWithElectionData,
  type MobileNumberWithSortOrder,
  type FieldVisitorVoterRow,
  saveChat,
  deleteChatById,
  getChatsByUserId,
  getChatById,
  saveMessages,
  getMessagesByChatId,
  voteMessage,
  getVotesByChatId,
  saveDocument,
  getDocumentsById,
  getDocumentById,
  deleteDocumentsByIdAfterTimestamp,
  saveSuggestions,
  getSuggestionsByDocumentId,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatVisiblityById,
  createStreamId,
  getStreamIdsByChatId,
  createLetter,
  getLetterByReferenceNo,
  getReferenceNosForPrefix,
  getLetterById,
  getLetters,
  deleteLetter,
  updateLetterRenderedHtml,
  ensureLetterMasterDefaults,
  getLetterMasters,
  getLetterMasterByTypeAndLocale,
  getLetterMasterById,
  createLetterMaster,
  updateLetterMaster,
  ensureAddressMasterDefaults,
  getAddressMasters,
  getAddressMasterById,
  createAddressMaster,
  updateAddressMaster,
  deleteAddressMaster,
  ensureDocumentTypeDefaults,
  getDocumentTypes,
  getDocumentTypeById,
  getDocumentTypeByCode,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  peekDocumentTypeSequence,
  allocateDocumentTypeSequence,
  bumpDocumentTypeSequence,
  resolveDocumentTypeReferenceForSave,
  getElectionMasters,
  getVoterByEpicNumber,
  getVoterCount,
  getVotersByFamilyGrouping,
  updateVoterMobileNumber,
  updateVoter,
  createVoter,
  getActiveServiceCatalog,
  ensureServiceCatalogEntry,
  createBeneficiaryService,
  getBeneficiaryServiceById,
  updateBeneficiaryServiceStatus,
  getBeneficiaryServicesByStatus,
  getBeneficiaryServiceAttachments,
  createBeneficiaryServiceAttachment,
  deleteBeneficiaryServiceAttachment,
  createVoterTask,
  getVoterTasksByServiceId,
  getVoterTasksByVoterId,
  getVoterBeneficiaryServices,
  getVoterDailyProgrammeEvents,
  getVoterTaskById,
  updateVoterTaskStatus,
  createCommunityServiceAreas,
  getCommunityServiceAreasByServiceId,
  createTaskHistoryEntry,
  getTaskHistory,
  getUserModulePermissions,
  getAllUsersWithPermissions,
  updateUserModulePermissions,
  hasModuleAccess,
  createUserWithPermissions,
  deleteUser,
  createDailyProgrammeItem,
  getDailyProgrammeItemsWithAttachments,
  getDailyProgrammeItemById,
  updateDailyProgrammeItem,
  updateDailyProgrammeSortOrders,
  deleteDailyProgrammeItem,
  getDailyProgrammeAttachments,
  createDailyProgrammeAttachment,
  deleteDailyProgrammeAttachment,
  getDailyProgrammeAttachmentById,
  createRegisterEntry,
  getRegisterEntries,
  getRegisterEntriesWithAttachments,
  getRegisterEntriesByProjectId,
  getRegisterEntryById,
  updateRegisterEntry,
  deleteRegisterEntry,
  getRegisterAttachments,
  createRegisterAttachment,
  deleteRegisterAttachment,
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getAdmDashboard,
  findAdmFundingCategoryByName,
  createAdmFundingCategory,
  getAdmFundRecordById,
  createAdmFundRecord,
  updateAdmFundRecord,
  deleteAdmFundRecord,
  getAdmFundAllocationById,
  getAdmAllocationsByProjectId,
  createAdmFundAllocation,
  updateAdmFundAllocation,
  deleteAdmFundAllocation,
  createAdmDocument,
  updateAdmDocument,
  getAdmDocumentsByFundRecordId,
  getAdmDocumentById,
  deleteAdmDocument,
  getProjectAttachments,
  createProjectAttachment,
  getProjectAttachmentById,
  getLatestProjectAttachmentVersion,
  deleteProjectAttachment,
  getProjectGroundMedia,
  createProjectGroundMedia,
  getProjectGroundMediaById,
  deleteProjectGroundMedia,
  getAllRoles,
  getRoleById,
  getRoleAccessibleModules,
  createRole,
  updateRole,
  deleteRole,
  getUsersWithRole,
  createExportJob,
  getExportJobById,
  getExportJobsByUser,
  updateExportJobProgress,
  deleteExportJob,
  getVoterElectionMappings,
  markVoterVote,
  bulkMarkVoterVotes,
  syncVoterMobileNumberTable,
  getVoterMobileNumbersByEpicNumbers,
  getBoothsForElection,
  getFieldVisitorVoters,
  getFieldVisitorRelatedVoters,
  getFieldVisitorProfile,
  getFieldVisitorFamily,
  getFieldVisitorAssignments,
  verifyFieldVisitorBoothAccess,
  saveFieldVisitorProfile,
  bulkSaveFieldVisitorFamilyProfiles,
  getDistinctWards,
  getPartsByWards,
  getDistinctReligions,
  getVotingParticipationParts,
  getDashboardCounts,
  getLatestElectionId,
  getAdminUserPartAssignments,
  replaceUserPartAssignments,
  deleteUserPartAssignment,
  updateUserDetails,
} from './queries-crud';

export { supportsVoterMasterCasteColumn };

export async function getUser(userIdValue: string): Promise<Array<User>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.user)
      .select('*')
      .eq('user_id', userIdValue);
    throwOnSupabaseError(error, 'Failed to get user by userId');
    return (data ?? []).map(mapUserRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get user by userId');
  }
}

export async function createUser(userIdValue: string, password: string, roleId?: string | null) {
  const hashedPassword = generateHashedPassword(password);
  try {
    const { error } = await supabase.from(TABLES.user).insert({
      user_id: userIdValue,
      password: hashedPassword,
      role_id: roleId || null,
    });
    throwOnSupabaseError(error, 'Failed to create user');
    return { rowCount: 1 };
  } catch (error) {
    console.error('Create user error:', error);
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function updateUserRole(userId: string, _role: never) {
  console.warn('updateUserRole is deprecated. Use updateUserRoleId instead.');
  throw new ChatSDKError('bad_request:database', 'updateUserRole is deprecated. Use updateUserRoleId instead.');
}

export async function updateUserRoleId(userId: string, roleId: string | null) {
  try {
    const { error } = await supabase
      .from(TABLES.user)
      .update({ role_id: roleId, updated_at: new Date().toISOString() })
      .eq('id', userId);
    throwOnSupabaseError(error, 'Failed to update user roleId');
    return { rowCount: 1 };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update user roleId');
  }
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.user)
    .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId);
  throwOnSupabaseError(error, 'Failed to update user last login');
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.user)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get user by id');
    return data ? mapUserRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get user by id');
  }
}

export async function getAllUsers(): Promise<Array<User>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.user)
      .select('*')
      .order('user_id', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get all users');
    return (data ?? []).map(mapUserRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get all users');
  }
}
