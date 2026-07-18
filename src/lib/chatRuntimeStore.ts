// ── Per-chat generation runtime store ────────────────────────────────────────
// Everything about "is this specific chat currently generating a response"
// lives here, keyed by chatId, completely outside React's component tree.
//
// Why this exists: the Chat page component stays mounted across navigation
// (both "/" and "/chat/:chatId" render the same <Chat/> element), so any
// generation state kept in that component's useState/useRef was effectively
// global — whichever chat happened to be on screen "borrowed" it. Streaming
// callbacks kept writing into that shared state even after the user
// navigated to a different chat, which both showed the loading indicator in
// the wrong chat and could overwrite the wrong chat's messages.
//
// Keying this store by chatId — and having every streaming callback close
// over the chatId it started for, not "whatever's currently on screen" —
// makes that impossible by construction, and lets multiple chats generate
// concurrently for free.
import { useCallback, useSyncExternalStore } from "react";
import type { ChatMessageModel } from "@/interfaces/interfaces";

export interface ChatRuntime {
  messages: ChatMessageModel[];
  isLoading: boolean;
  submitting: boolean;
  streamingIdx: number;
  elapsedSeconds: number;
  regeneratingIdx: number;
  country: string | null;
}

const EMPTY_RUNTIME: ChatRuntime = {
  messages: [],
  isLoading: false,
  submitting: false,
  streamingIdx: -1,
  elapsedSeconds: 0,
  regeneratingIdx: -1,
  country: null,
};

// Key used for the "not-yet-created" chat shown at "/" before the first
// message is sent. A brand new chatId is minted and takes over as soon as
// the first message goes out (see handleSubmit).
export const DRAFT_CHAT_KEY = "__draft__";

const runtimes = new Map<string, ChatRuntime>();
const listeners = new Map<string, Set<() => void>>();

function notify(chatId: string) {
  listeners.get(chatId)?.forEach((cb) => cb());
}

export function getChatRuntime(chatId: string): ChatRuntime {
  return runtimes.get(chatId) ?? EMPTY_RUNTIME;
}

type RuntimePatch = Partial<ChatRuntime> | ((prev: ChatRuntime) => Partial<ChatRuntime>);

export function setChatRuntime(chatId: string, patch: RuntimePatch) {
  const prev = getChatRuntime(chatId);
  const next = typeof patch === "function" ? patch(prev) : patch;
  runtimes.set(chatId, { ...prev, ...next });
  notify(chatId);
}

export function clearChatRuntime(chatId: string) {
  runtimes.delete(chatId);
  notify(chatId);
}

// Subscribes a component to exactly one chat's runtime slice. Re-renders
// only fire for updates targeting this chatId — switching chats is just a
// subscription change, not a data copy/reset.
export function useChatRuntime(chatId: string): ChatRuntime {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!listeners.has(chatId)) listeners.set(chatId, new Set());
      const set = listeners.get(chatId)!;
      set.add(onStoreChange);
      return () => {
        set.delete(onStoreChange);
        if (set.size === 0) listeners.delete(chatId);
      };
    },
    [chatId]
  );
  const getSnapshot = useCallback(() => getChatRuntime(chatId), [chatId]);
  return useSyncExternalStore(subscribe, getSnapshot);
}