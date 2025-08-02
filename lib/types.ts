import { z } from 'zod';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { getVoterDemographicsTool } from './ai/tools/get-voter-demographics';
import type { getVoterAgeGroupsWithGenderTool } from './ai/tools/get-voter-age-groups-with-gender';
import type { getVoterPartsTool } from './ai/tools/get-voter-parts';
import type { searchVotersTool } from './ai/tools/search-voters';
import type { sqlQueryTool } from './ai/tools/sql-query';
import type { getServicesTool } from './ai/tools/get-services';
import type { addServiceTool } from './ai/tools/add-service';
import type { addBeneficiaryTool } from './ai/tools/add-beneficiary';
import type { getBeneficiariesTool } from './ai/tools/get-beneficiaries';
import type { updateBeneficiaryTool } from './ai/tools/update-beneficiary';
import type { webSearchTool } from './ai/tools/web-search';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type getVoterDemographicsToolType = InferUITool<ReturnType<typeof getVoterDemographicsTool>>;
type getVoterAgeGroupsWithGenderToolType = InferUITool<ReturnType<typeof getVoterAgeGroupsWithGenderTool>>;
type getVoterPartsToolType = InferUITool<ReturnType<typeof getVoterPartsTool>>;
type searchVotersToolType = InferUITool<ReturnType<typeof searchVotersTool>>;
type sqlQueryToolType = InferUITool<typeof sqlQueryTool>;
type getServicesToolType = InferUITool<ReturnType<typeof getServicesTool>>;
type addServiceToolType = InferUITool<ReturnType<typeof addServiceTool>>;
type addBeneficiaryToolType = InferUITool<ReturnType<typeof addBeneficiaryTool>>;
type getBeneficiariesToolType = InferUITool<ReturnType<typeof getBeneficiariesTool>>;
type updateBeneficiaryToolType = InferUITool<ReturnType<typeof updateBeneficiaryTool>>;
type webSearchToolType = InferUITool<ReturnType<typeof webSearchTool>>;

export type ChatTools = {
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  webSearch: webSearchToolType;
  getVoterDemographics: getVoterDemographicsToolType;
  getVoterAgeGroupsWithGender: getVoterAgeGroupsWithGenderToolType;
  getVoterParts: getVoterPartsToolType;
  searchVoters: searchVotersToolType;
  sqlQuery: sqlQueryToolType;
  getServices: getServicesToolType;
  addService: addServiceToolType;
  addBeneficiary: addBeneficiaryToolType;
  getBeneficiaries: getBeneficiariesToolType;
  updateBeneficiary: updateBeneficiaryToolType;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
