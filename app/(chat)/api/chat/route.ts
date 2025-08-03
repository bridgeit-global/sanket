import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import { getTabPrompt, getTabTools, type TabType } from '@/lib/ai/tab-prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getVoterDemographicsTool } from '@/lib/ai/tools/get-voter-demographics';
import { getVoterAgeGroupsWithGenderTool } from '@/lib/ai/tools/get-voter-age-groups-with-gender';
import { getVoterPartsTool } from '@/lib/ai/tools/get-voter-parts';
import { searchVotersTool } from '@/lib/ai/tools/search-voters';
import { sqlQueryTool } from '@/lib/ai/tools/sql-query';
import { getServicesTool } from '@/lib/ai/tools/get-services';
import { addServiceTool } from '@/lib/ai/tools/add-service';
import { addBeneficiaryTool } from '@/lib/ai/tools/add-beneficiary';
import { addBeneficiaryWithDetailsTool } from '@/lib/ai/tools/add-beneficiary-with-details';
import { searchBeneficiariesTool } from '@/lib/ai/tools/search-beneficiaries';
import { updateBeneficiaryStatusTool } from '@/lib/ai/tools/update-beneficiary-status';
import { trackBeneficiaryProgressTool } from '@/lib/ai/tools/track-beneficiary-progress';
import { linkBeneficiaryToVoterTool } from '@/lib/ai/tools/link-beneficiary-to-voter';
import { exportBeneficiaryDataTool } from '@/lib/ai/tools/export-beneficiary-data';
import { addBeneficiaryServiceTool } from '@/lib/ai/tools/add-beneficiary-service';
import { getBeneficiariesTool } from '@/lib/ai/tools/get-beneficiaries';
import { updateBeneficiaryTool } from '@/lib/ai/tools/update-beneficiary';
import { webSearchTool } from '@/lib/ai/tools/web-search';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  console.log('Active tab from request body:', requestBody.activeTab);

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      activeTab = 'general',
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
      activeTab: TabType;
    } = requestBody;

    // Debug: Also check URL parameters as fallback
    const url = new URL(request.url);
    const urlTab = url.searchParams.get('tab') as TabType;
    console.log('URL tab parameter:', urlTab);
    console.log('Request body activeTab:', activeTab);
    console.log('Final activeTab being used:', activeTab || urlTab || 'general');

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Get tab-specific prompt and tools
        const tabPrompt = getTabPrompt(activeTab);
        const tabTools = getTabTools(activeTab);

        // Create tools object based on active tab
        const baseTools = {
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
        };

        const allTools = {
          ...baseTools,
          webSearch: webSearchTool(),
          getVoterDemographics: getVoterDemographicsTool(),
          getVoterAgeGroupsWithGender: getVoterAgeGroupsWithGenderTool(),
          getVoterParts: getVoterPartsTool(),
          searchVoters: searchVotersTool(),
          sqlQuery: sqlQueryTool,
          getServices: getServicesTool(),
          addBeneficiaryService: addBeneficiaryServiceTool(),
          addBeneficiary: addBeneficiaryTool(),
          addBeneficiaryWithDetails: addBeneficiaryWithDetailsTool(),
          searchBeneficiaries: searchBeneficiariesTool(),
          updateBeneficiaryStatus: updateBeneficiaryStatusTool(),
          trackBeneficiaryProgress: trackBeneficiaryProgressTool(),
          linkBeneficiaryToVoter: linkBeneficiaryToVoterTool(),
          exportBeneficiaryData: exportBeneficiaryDataTool(),
          getBeneficiaries: getBeneficiariesTool(),
          updateBeneficiary: updateBeneficiaryTool(),
        };

        // Filter tools based on active tab
        const activeTools: Record<string, any> = { ...baseTools };
        tabTools.forEach(toolName => {
          if (allTools[toolName as keyof typeof allTools]) {
            activeTools[toolName] = allTools[toolName as keyof typeof allTools];
          }
        });

        // Debug logging
        console.log(`Active tab: ${activeTab}`);
        console.log(`Available tools for ${activeTab}:`, Object.keys(activeTools));
        console.log(`Tab tools from getTabTools:`, tabTools);

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: tabPrompt,
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(10),
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: activeTools,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });
        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error('Chat API error:', error);
    return new ChatSDKError('bad_request:chat').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
