import { useState } from 'react';
import { motion } from 'framer-motion';
import { cx } from 'classix';
import { SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { ChatMessageModel, ChatMessageRoleType } from "../../interfaces/interfaces"
import { MessageActions } from '@/components/custom/actions';
import { ModalUQ } from '@/pages/chat/ModalUQ';
 
export const PreviewMessage = ({ message }: { message: ChatMessageModel; }) => {
  const [showUQModal, setShowUQModal] = useState(false);

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div
        className={cx(
          'group-data-[role=user]/message:bg-zinc-700 dark:group-data-[role=user]/message:bg-muted group-data-[role=user]/message:text-white flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl'
        )}
      >
        {message.role === ChatMessageRoleType.ASSISTANT && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div className="flex flex-col w-full">
          <div className="flex flex-col gap-4 text-left">
            <Markdown>{message.message}</Markdown>
          </div>

          {message.role === ChatMessageRoleType.ASSISTANT && (
            <MessageActions message={message} setShowUQModal={setShowUQModal} />
          )}
        </div> 
      </div>

      {showUQModal && <ModalUQ chatMessageResponse={message} show={showUQModal} handleClose={() => setShowUQModal(false)} />}
    </motion.div>
  );
};

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          'group-data-[role=user]/message:bg-muted'
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>
        <div>Generating response...</div>
      </div>
    </motion.div>
  );
};
