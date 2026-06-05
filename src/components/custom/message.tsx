//message.tsx

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
        {message.role === ChatMessageRoleType.ASSISTANT && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
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

          {/* Actions (copy/like/dislike/UQ/time) — shown only when not streaming */}
          {message.role === ChatMessageRoleType.ASSISTANT && !(message as any).is_streaming && (
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

// Thinking spinner shown before the placeholder message appears
// (covers RAG fetch + first token latency, typically ~2s)
export const ThinkingMessage = ({ elapsedSeconds = 0 }: { elapsedSeconds?: number }) => {
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
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
