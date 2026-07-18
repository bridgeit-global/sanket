'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import equal from 'fast-deep-equal';
import { cn, sanitizeText } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { VoterInsights } from './voter-insights';
import { SqlQueryResults } from './sql-query-results';
import { BeneficiaryInsights } from './beneficiary-insights';
// Type narrowing is handled by TypeScript's control flow analysis
// The AI SDK provides proper discriminated unions for tool calls

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
  sendMessage,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === 'file',
  );

  useDataStream();

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4 w-full', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={{
                      name: attachment.filename ?? 'file',
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning' && part.text?.trim().length > 0) {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.text}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-4', {
                          'bg-primary text-primary-foreground px-3 py-2 rounded-xl':
                            message.role === 'user',
                        })}
                      >
                        <Markdown>{sanitizeText(part.text)}</Markdown>
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        regenerate={regenerate}
                      />
                    </div>
                  );
                }
              }

              if ((type as string) === 'tool-sqlQuery') {
                const { toolCallId, state } = part as any;

                if (state === 'input-available') {
                  return (
                    <div key={toolCallId} className="skeleton my-4 space-y-2">
                      <p className="text-sm text-muted-foreground animate-pulse">
                        Running SQL query…
                      </p>
                      <div className="animate-pulse bg-muted h-24 rounded-lg" />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part as any;

                  const rowCount = typeof output?.rowCount === 'number' ? output.rowCount : 0;
                  const rows = Array.isArray(output?.results) ? output.results : [];
                  const columns =
                    rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
                  const hasMore = rowCount > rows.length;

                  const dataForComponent = {
                    query: String(output?.query ?? output?.sql ?? ''),
                    rowCount,
                    columns,
                    data: rows,
                    hasMore,
                    summary: String(output?.answer ?? output?.description ?? ''),
                    error: output?.error ? String(output.error) : undefined,
                    details: undefined as string | undefined,
                    note: undefined as string | undefined,
                  };

                  return (
                    <div key={toolCallId} className="my-4">
                      <SqlQueryResults data={dataForComponent} />
                    </div>
                  );
                }
              }

              if ((type as string) === 'tool-form20Query') {
                const { toolCallId, state } = part as any;

                if (state === 'input-available') {
                  return (
                    <div key={toolCallId} className="skeleton my-4 space-y-2">
                      <p className="text-sm text-muted-foreground animate-pulse">
                        Loading Form 20 results…
                      </p>
                      <div className="animate-pulse bg-muted h-24 rounded-lg" />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part as any;

                  const rowCount = typeof output?.rowCount === 'number' ? output.rowCount : 0;
                  const rows = Array.isArray(output?.results) ? output.results : [];
                  const columns =
                    rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
                  const hasMore = Boolean(output?.truncated) || rowCount > rows.length;

                  const dataForComponent = {
                    query: `Form 20 · ${String(output?.mappingSource ?? 'ElectionMapping')}`,
                    rowCount,
                    columns,
                    data: rows,
                    hasMore,
                    summary: String(output?.answer ?? output?.summary ?? ''),
                    error: output?.error ? String(output.error) : undefined,
                    details: undefined as string | undefined,
                    note: output?.note ? String(output.note) : undefined,
                  };

                  return (
                    <div key={toolCallId} className="my-4">
                      <SqlQueryResults data={dataForComponent} />
                    </div>
                  );
                }
              }

              if (type === 'tool-createDocument') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  return (
                    <div key={toolCallId}>
                      <DocumentPreview isReadonly={isReadonly} args={input} />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part;

                  if ('error' in output) {
                    return (
                      <div
                        key={toolCallId}
                        className="text-red-500 p-2 border rounded"
                      >
                        Error: {String(output.error)}
                      </div>
                    );
                  }

                  return (
                    <div key={toolCallId}>
                      <DocumentPreview
                        isReadonly={isReadonly}
                        result={output}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-updateDocument') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;

                  return (
                    <div key={toolCallId}>
                      <DocumentToolCall
                        type="update"
                        args={input}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part;

                  if ('error' in output) {
                    return (
                      <div
                        key={toolCallId}
                        className="text-red-500 p-2 border rounded"
                      >
                        Error: {String(output.error)}
                      </div>
                    );
                  }

                  return (
                    <div key={toolCallId}>
                      <DocumentToolResult
                        type="update"
                        result={output}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }
              }

              // Handle voter analysis tool results
              if (
                type.startsWith('tool-') &&
                type.includes('voterAnalysis')
              ) {
                const { toolCallId, state } = part as { toolCallId: string; state: string };

                if (state === 'input-available') {
                  return (
                    <div key={toolCallId} className="skeleton">
                      <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part as any;

                  return (
                    <div key={toolCallId} className="my-4">
                      <VoterInsights data={output} />
                    </div>
                  );
                }
              }

              // Handle beneficiary tool results
              if (type.startsWith('tool-') && ['getServices', 'addService', 'addBeneficiary', 'getBeneficiaries', 'updateBeneficiary', 'addBeneficiaryWithDetails', 'searchBeneficiaries', 'updateBeneficiaryStatus'].some(tool => type.includes(tool))) {
                const { toolCallId, state } = part as any;

                if (state === 'input-available') {
                  return (
                    <div key={toolCallId} className="skeleton">
                      <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part as any;
                  const toolName = type.replace('tool-', '');

                  return (
                    <div key={toolCallId} className="my-4">
                      <BeneficiaryInsights toolName={toolName} data={output} />
                    </div>
                  );
                }
              }

              if (type === 'tool-requestSuggestions') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  return (
                    <div key={toolCallId}>
                      <DocumentToolCall
                        type="request-suggestions"
                        args={input}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part;

                  if ('error' in output) {
                    return (
                      <div
                        key={toolCallId}
                        className="text-red-500 p-2 border rounded"
                      >
                        Error: {String(output.error)}
                      </div>
                    );
                  }

                  return (
                    <div key={toolCallId}>
                      <DocumentToolResult
                        type="request-suggestions"
                        result={output}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return false;
  },
);

/** True when the assistant message already shows text, reasoning, or a tool call. */
export function messageHasVisibleActivity(message: ChatMessage | undefined): boolean {
  if (!message || message.role !== 'assistant') return false;
  for (const part of message.parts ?? []) {
    const type = part.type as string;
    if (type === 'text' && 'text' in part && String((part as { text?: string }).text ?? '').trim()) {
      return true;
    }
    if (
      type === 'reasoning' &&
      'text' in part &&
      String((part as { text?: string }).text ?? '').trim()
    ) {
      return true;
    }
    if (type.startsWith('tool-')) return true;
  }
  return false;
}

/** Show the in-chat working indicator while waiting for tokens or before tool UI appears. */
export function shouldShowThinkingMessage(
  status: UseChatHelpers<ChatMessage>['status'],
  messages: ChatMessage[],
): boolean {
  if (status !== 'submitted' && status !== 'streaming') return false;
  if (messages.length === 0) return false;
  const last = messages[messages.length - 1];
  if (status === 'submitted') return last.role === 'user';
  if (last.role === 'user') return true;
  return last.role === 'assistant' && !messageHasVisibleActivity(last);
}

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={role}
    >
      <div className="flex gap-4 w-full">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
          <span className="animate-pulse">
            <SparklesIcon size={14} />
          </span>
        </div>

        <div className="flex flex-col gap-2 w-full justify-center min-h-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex gap-1" aria-hidden>
              <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:300ms]" />
            </span>
            <span>Working on your request…</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
