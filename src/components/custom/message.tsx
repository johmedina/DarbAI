// message.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cx } from 'classix';
import { SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { ChatMessageModel, ChatMessageRoleType } from "../../interfaces/interfaces"
import { MessageActions } from '@/components/custom/actions';
import { ModalUQ } from '@/pages/chat/ModalUQ';

export const PreviewMessage = ({ message }: { message: ChatMessageModel }) => {
  const [showUQModal, setShowUQModal] = useState(false);

  const isStreaming = (message as any).is_streaming;

  // While streaming and the message is still empty, we let ThinkingMessage
  // cover the "waiting" state entirely. Once the first token arrives the
  // placeholder has content and we render it normally — but without actions
  // until streaming finishes.
  //
  // This is also what eliminates the double-sparkle: ThinkingMessage is
  // visible only while `isStreaming && !message.message`. The moment a token
  // arrives, showThinking → false and THIS component takes over, showing one
  // sparkle (the one inside this component).
  const hideSparkle = isStreaming && !message.message;

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div className={cx(
        'group-data-[role=user]/message:bg-zinc-700 dark:group-data-[role=user]/message:bg-muted group-data-[role=user]/message:text-white flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl'
      )}>
        {/* Sparkle icon: always rendered for assistant messages EXCEPT when the
            placeholder is still empty (ThinkingMessage covers that moment). */}
        {message.role === ChatMessageRoleType.ASSISTANT && !hideSparkle && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        {/* Spacer so content doesn't jump left when the icon is hidden */}
        {message.role === ChatMessageRoleType.ASSISTANT && hideSparkle && (
          <div className="size-8 shrink-0" />
        )}

        <div className="flex flex-col w-full">
          <div className="flex flex-col gap-4 text-left">
            {message.chat_uploaded_files?.map((f, i) =>
              f.objectUrl ? (
                <img key={i} src={f.objectUrl} alt="Uploaded"
                  className="max-h-64 w-auto rounded-lg object-contain" />
              ) : null
            )}
            <Markdown>{message.message}</Markdown>
          </div>

          {/* Show actions as soon as streaming is done — UQ button inside
              MessageActions gates itself on token_data.length > 0 so it
              appears lazily once UQ arrives, without blocking the other icons. */}
          {message.role === ChatMessageRoleType.ASSISTANT && !isStreaming && (
            <MessageActions message={message} setShowUQModal={setShowUQModal} />
          )}
        </div>
      </div>

      {showUQModal && (
        <ModalUQ
          chatMessageResponse={message}
          show={showUQModal}
          handleClose={() => setShowUQModal(false)}
        />
      )}
    </motion.div>
  );
};

// Shown during RAG fetch + prefill phase, before the first token arrives.
// Disappears the moment message.message becomes truthy in the streaming placeholder.
export const ThinkingMessage = ({ elapsedSeconds = 0 }: { elapsedSeconds?: number }) => {
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role="assistant"
    >
      <div className="flex gap-4 rounded-xl">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span>Generating response...</span>
          {elapsedSeconds > 0 && (
            <span className="tabular-nums text-xs text-gray-400">
              ({elapsedSeconds.toFixed(1)}s)
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
