import { useState } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { ChatMessageModel, ChatMessageRoleType } from "../../interfaces/interfaces";
import { MessageActions } from '@/components/custom/actions';
import { ModalUQ } from '@/pages/chat/ModalUQ';

export const PreviewMessage = ({ message }: { message: ChatMessageModel }) => {
  const [showUQModal, setShowUQModal] = useState(false);
  const isUser = message.role === ChatMessageRoleType.USER;

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      {isUser ? (
        /* User bubble — right-aligned, dark */
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            maxWidth: "78%",
            background: "var(--user-bubble)",
            color: "var(--user-ink)",
            padding: message.chat_uploaded_files?.some(f => f.objectUrl) ? 6 : "11px 15px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 15,
            lineHeight: 1.55,
          }}>
            {message.chat_uploaded_files?.map((f, i) =>
              f.objectUrl ? (
                <img
                  key={i}
                  src={f.objectUrl}
                  alt="Uploaded"
                  style={{ display: "block", maxWidth: "min(300px, 72vw)", maxHeight: 240, width: "auto", borderRadius: 12, objectFit: "cover" }}
                />
              ) : null
            )}
            {message.message && (
              <div style={{ padding: message.chat_uploaded_files?.some(f => f.objectUrl) ? "9px 9px 4px" : 0 }}>
                {message.message}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Assistant message — left-aligned with spark avatar */
        <div style={{ display: "flex", gap: 13 }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: "var(--ink)", color: "var(--road)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: 2,
          }}>
            <SparklesIcon size={14} />
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            {/* Sign images (matched signs) */}
            {message.images && message.images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                {message.images.map((img) => (
                  <div key={img.sign_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <img
                      src={img.resolvedUrl ?? img.url}
                      alt={img.name}
                      style={{
                        height: 112, width: "auto", borderRadius: 12,
                        border: "1px solid var(--line)", objectFit: "contain",
                        background: "var(--surface-2)",
                      }}
                    />
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)", textAlign: "center", maxWidth: "7rem" }}>{img.name}</span>
                    <span style={{ fontSize: 10, color: "var(--ink-3)", opacity: .6 }}>p.{img.page}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Uploaded image in assistant context */}
            {message.chat_uploaded_files?.map((f, i) =>
              f.objectUrl ? (
                <img
                  key={i}
                  src={f.objectUrl}
                  alt="Uploaded"
                  className="max-h-64 w-auto rounded-lg object-contain mb-3"
                />
              ) : null
            )}

            <div style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--ink)" }}>
              <Markdown>{message.message}</Markdown>
            </div>

            <MessageActions message={message} setShowUQModal={setShowUQModal} />
          </div>
        </div>
      )}

      {showUQModal && (
        <ModalUQ chatMessageResponse={message} show={showUQModal} handleClose={() => setShowUQModal(false)} />
      )}
    </motion.div>
  );
};

export const ThinkingMessage = ({ elapsedSeconds = 0 }: { elapsedSeconds?: number }) => (
  <motion.div
    className="w-full mx-auto max-w-3xl px-4"
    initial={{ y: 5, opacity: 0 }}
    animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
  >
    <div style={{ display: "flex", gap: 13 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: "var(--ink)", color: "var(--road)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 2,
      }}>
        <SparklesIcon size={14} />
      </div>
      <div style={{ flex: 1, paddingTop: 5 }}>
        <div style={{ fontSize: 14.5, color: "var(--ink-2)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span>Checking the official traffic sources…</span>
          {elapsedSeconds > 0 && (
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
              ({elapsedSeconds.toFixed(1)}s)
            </span>
          )}
        </div>
        <div className="road-strip" style={{ height: 10, borderRadius: 99, width: 200, maxWidth: "60%" }} />
      </div>
    </div>
  </motion.div>
);
