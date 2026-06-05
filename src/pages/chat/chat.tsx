/**
 * chat.tsx
 * src/pages/chat/chat.tsx
 *
 * Single component instance handles both "/" and "/chat/:chatId" via layout route.
 * This means chatSessions, sidebar state, and Header are never remounted.
 */

import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChatMessageGenerationType,
  ChatMessageModel,
  ChatMessageRoleType,
} from "../../interfaces/interfaces";
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import { Sidebar, ChatSession, HistoryMessage } from "@/components/custom/sidebar";
import { v4 as uuidv4 } from "uuid";
import { PanelLeftIcon, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { apiClient, API_BASE } from "@/lib/apiClient";

// ── Authenticated image loader ─────────────────────────────────────────────────
const _blobCache = new Map<string, string>();

async function toAuthenticatedBlobUrl(imagePath: string, token: string): Promise<string> {
  if (_blobCache.has(imagePath)) return _blobCache.get(imagePath)!;
  const res = await fetch(`${API_BASE}${imagePath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return "";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  _blobCache.set(imagePath, url);
  return url;
}

// ── Session → ChatMessageModel[] ──────────────────────────────────────────────
function sessionToMessages(
  session: ChatSession,
  imageUrlMap: Record<string, string> = {}
): ChatMessageModel[] {
  return session.messages.flatMap((m: HistoryMessage) => {
    const objectUrl = m.image_url ? (imageUrlMap[m.image_url] ?? undefined) : undefined;
    return [
      {
        message: m.question,
        role: ChatMessageRoleType.USER,
        chat_id: session.chat_id,
        generation_type: objectUrl
          ? ChatMessageGenerationType.IMAGE_UNDERSTANDING
          : ChatMessageGenerationType.TEXT,
        ...(objectUrl ? { chat_uploaded_files: [{ objectUrl }] } : {}),
      } as ChatMessageModel,
      {
        message: m.response,
        role: ChatMessageRoleType.ASSISTANT,
        chat_id: session.chat_id,
        generation_type: ChatMessageGenerationType.TEXT,
        total_reliability: m.total_reliability,
        total_entropy: m.total_entropy,
        total_collision_entropy: m.total_collision_entropy,
        generation_time_seconds: m.generation_time_seconds,
        // Ensure token_data from history is preserved so UQ hover works on reload
        token_data: (m as any).token_data ?? [],
      } as ChatMessageModel,
    ];
  });
}

// ── Component ──────────────────────────────────────────────────────────────────
export function Chat() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const { chatId: urlChatId } = useParams<{ chatId?: string }>();
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  // Sidebar
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [chatSessions, setChatSessions]     = useState<ChatSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Current conversation
  const [messages, setMessages]   = useState<ChatMessageModel[]>([]);
  const [question, setQuestion]   = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage]         = useState<File | null>(null);

  // FIX 1: track whether streaming has started (first token received)
  // When true, hide ThinkingMessage even if isLoading is still true
  const [streamingStarted, setStreamingStarted] = useState(false);

  const loadedChatIdRef   = useRef<string | null>(null);
  const streamingIdxRef   = useRef<number>(-1);

  // Live generation timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedChatId = urlChatId ?? null;

  // ── Timer helpers ─────────────────────────────────────────────────────────
  function startTimer() {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => +(s + 0.1).toFixed(1));
    }, 100);
  }

  // FIX 2: stopTimer returns the current elapsed value synchronously so we
  // can stamp it onto the done-event message in the same state update, avoiding
  // the extra render cycle that was delaying the icons.
  function stopTimer(): number {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Read the latest value via a ref trick — capture it below
    return elapsedSeconds;
  }

  // Keep a ref mirror of elapsedSeconds so stopTimer can read the latest value
  // without needing to be inside a closure that captures a stale state.
  const elapsedRef = useRef(0);
  useEffect(() => { elapsedRef.current = elapsedSeconds; }, [elapsedSeconds]);

  // ── Timer lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      startTimer();
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Sync live timer into the streaming message
  useEffect(() => {
    const idx = streamingIdxRef.current;
    if (idx < 0) return;
    setMessages((prev) => {
      if (idx >= prev.length) return prev;
      const msg = prev[idx] as any;
      if (!msg.is_streaming) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], generation_time_seconds: elapsedSeconds };
      return updated;
    });
  }, [elapsedSeconds]);

  // ── Resolve image paths → blob URLs ──────────────────────────────────────
  const resolveSessionImages = useCallback(
    async (session: ChatSession): Promise<Record<string, string>> => {
      if (!token) return {};
      const map: Record<string, string> = {};
      for (const msg of session.messages) {
        if (msg.image_url && !map[msg.image_url]) {
          const blobUrl = await toAuthenticatedBlobUrl(msg.image_url, token);
          if (blobUrl) map[msg.image_url] = blobUrl;
        }
      }
      return map;
    },
    [token]
  );

  // ── Load sidebar history ──────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const data = await apiClient.get("/history", token);
      if (data.success) setChatSessions(data.data as ChatSession[]);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Load messages when URL chatId changes ─────────────────────────────────
  useEffect(() => {
    if (!urlChatId || !token) {
      setMessages([]);
      loadedChatIdRef.current = null;
      return;
    }
    if (loadedChatIdRef.current === urlChatId) return;

    (async () => {
      try {
        const data = await apiClient.get(`/chats/${urlChatId}`, token);
        if (data.success) {
          const session = data.data as ChatSession;
          const imageMap = await resolveSessionImages(session);
          setMessages(sessionToMessages(session, imageMap));
          loadedChatIdRef.current = urlChatId;
        }
      } catch {
        setMessages([]);
        loadedChatIdRef.current = null;
        navigate("/", { replace: true });
      }
    })();
  }, [urlChatId, token, navigate, resolveSessionImages]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleNewChat() {
    loadedChatIdRef.current = null;
    setMessages([]);
    setQuestion("");
    setImage(null);
    setSidebarOpen(false);
    navigate("/");
  }

  function handleSelectChat(session: ChatSession) {
    setSidebarOpen(false);
    loadedChatIdRef.current = null;
    navigate(`/chat/${session.chat_id}`);
  }

  async function handleRenameChat(chatId: string, newTitle: string) {
    if (!token) return;
    await apiClient.patch(`/chats/${chatId}/rename`, { title: newTitle }, token);
    setChatSessions((prev) =>
      prev.map((c) => c.chat_id === chatId ? { ...c, title: newTitle } : c)
    );
  }

  async function handleDeleteChat(chatId: string) {
    if (!token) return;
    await apiClient.delete(`/chats/${chatId}`, token);
    setChatSessions((prev) => prev.filter((c) => c.chat_id !== chatId));
    if (selectedChatId === chatId) {
      loadedChatIdRef.current = null;
      setMessages([]);
      navigate("/");
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSubmit(text?: string) {
    if (isLoading || !token) return;
    const messageText = text ?? question;
    if (!messageText.trim() && !image) return;

    setIsLoading(true);
    setStreamingStarted(false); // FIX 1: reset on each new send
    streamingIdxRef.current = -1;

    const chatId = selectedChatId ?? uuidv4();

    if (!selectedChatId) {
      loadedChatIdRef.current = chatId;
      navigate(`/chat/${chatId}`, { replace: true });
    }

    const localImageObjectUrl = image ? URL.createObjectURL(image) : undefined;
    const userMessage: ChatMessageModel = {
      message: messageText,
      role: ChatMessageRoleType.USER,
      chat_id: chatId,
      generation_type: image
        ? ChatMessageGenerationType.IMAGE_UNDERSTANDING
        : ChatMessageGenerationType.TEXT,
      ...(localImageObjectUrl ? { chat_uploaded_files: [{ objectUrl: localImageObjectUrl }] } : {}),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    const capturedImage = image;
    setImage(null);

    const contextForApi = [...messages, userMessage].map((msg) => ({
      role: msg.role === ChatMessageRoleType.USER ? "user" : "assistant",
      content: msg.message,
    }));

    try {
      let fetchBody: BodyInit;
      const fetchHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };

      if (capturedImage) {
        const formData = new FormData();
        formData.append("question", messageText);
        formData.append("use_rag", "true");
        formData.append("context", JSON.stringify(contextForApi));
        formData.append("image", capturedImage);
        fetchBody = formData;
      } else {
        fetchBody = JSON.stringify({ question: messageText, use_rag: true, context: contextForApi });
        fetchHeaders["Content-Type"] = "application/json";
      }

      const res = await fetch(`${API_BASE}/chats/${chatId}/stream`, {
        method: "POST", headers: fetchHeaders, body: fetchBody,
      });

      if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);

      // Insert placeholder assistant message
      const placeholder: ChatMessageModel = {
        message: "",
        role: ChatMessageRoleType.ASSISTANT,
        chat_id: chatId,
        generation_type: ChatMessageGenerationType.TEXT,
        is_streaming: true,
      };
      setMessages((prev) => {
        const next = [...prev, placeholder];
        streamingIdxRef.current = next.length - 1;
        return next;
      });

      // isLoading stays true while streaming so the timer keeps running.
      // ThinkingMessage is hidden via streamingStarted flag instead.

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();

        // ── Reader closed: all tokens have arrived ──────────────────────────
        // Flip is_streaming → false RIGHT NOW so icons appear immediately.
        // The backend "done" event (which carries UQ metadata) may still be
        // in the buffer below — it will patch the message silently after.
        if (done) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          const finalElapsed = elapsedRef.current;

          setMessages((prev) => {
            const idx = streamingIdxRef.current;
            if (idx < 0 || idx >= prev.length) return prev;
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              generation_time_seconds: finalElapsed,
              is_streaming: false,
            };
            return updated;
          });

          setIsLoading(false);
          setStreamingStarted(false);
          streamingIdxRef.current = -1;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: any;
          try { event = JSON.parse(line.slice(6).trim()); } catch { continue; }

          if (event.type === "token") {
            // First token — hide ThinkingMessage immediately
            if (!streamingStarted) setStreamingStarted(true);

            setMessages((prev) => {
              const idx = streamingIdxRef.current;
              if (idx < 0 || idx >= prev.length) return prev;
              const updated = [...prev];
              updated[idx] = { ...updated[idx], message: updated[idx].message + event.content };
              return updated;
            });

          } else if (event.type === "done") {
            // UQ pass finished — patch metadata onto the message (icons already visible)
            // Stop the timer here too in case the done event arrives before reader closes
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            const finalElapsed = elapsedRef.current;

            setMessages((prev) => {
              const idx = streamingIdxRef.current;
              if (idx < 0 || idx >= prev.length) return prev;
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                message:                              event.message,
                total_reliability:                    event.total_reliability,
                total_entropy:                        event.total_entropy,
                total_collision_entropy:              event.total_collision_entropy,
                total_reliability_with_hidden_layers: event.total_reliability_with_hidden_layers,
                generation_time_seconds:              event.generation_time_seconds ?? finalElapsed,
                token_data:                           event.token_data ?? [],
                // Keep is_streaming false (already set above, or set it here if
                // done event somehow arrives before reader closes)
                is_streaming: false,
              };
              return updated;
            });

            setChatSessions((prev) => {
              const newMsg: HistoryMessage = {
                question:                messageText,
                response:                event.message,
                timestamp:               new Date().toISOString(),
                image_url:               event.image_url ?? null,
                generation_time_seconds: event.generation_time_seconds ?? finalElapsed,
                total_reliability:       event.total_reliability,
                total_entropy:           event.total_entropy,
                total_collision_entropy: event.total_collision_entropy,
              };
              const idx = prev.findIndex((c) => c.chat_id === chatId);
              if (idx !== -1) {
                const up = { ...prev[idx], messages: [...prev[idx].messages, newMsg], last_updated: newMsg.timestamp };
                return [up, ...prev.filter((_, i) => i !== idx)];
              }
              return [{ chat_id: chatId, title: messageText.slice(0, 40), last_updated: newMsg.timestamp, messages: [newMsg] }, ...prev];
            });

            setIsLoading(false);
            setStreamingStarted(false);
            streamingIdxRef.current = -1;

          } else if (event.type === "error") {
            setMessages((prev) => {
              const idx = streamingIdxRef.current;
              if (idx < 0 || idx >= prev.length) return prev;
              const updated = [...prev];
              updated[idx] = { ...updated[idx], message: "Sorry, there was an error. Please try again.", is_streaming: false };
              return updated;
            });
            setIsLoading(false);
            setStreamingStarted(false);
            streamingIdxRef.current = -1;
          }
        }
      }

    } catch (err) {
      console.error("Stream error:", err);
      setMessages((prev) => {
        const idx = streamingIdxRef.current;
        if (idx >= 0 && idx < prev.length) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], message: "Sorry, there was an error. Please try again.", is_streaming: false };
          return updated;
        }
        return [...prev, {
          message: "Sorry, there was an error. Please try again.",
          role: ChatMessageRoleType.ASSISTANT,
          chat_id: urlChatId ?? "",
          generation_type: ChatMessageGenerationType.TEXT,
        }];
      });
    } finally {
      setIsLoading(false);
      setStreamingStarted(false);
      streamingIdxRef.current = -1;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  // FIX 1: show ThinkingMessage only when loading AND streaming hasn't started yet
  const showThinking = isLoading && !streamingStarted;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chatSessions}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        isLoading={historyLoading}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 shrink-0 pr-3">
          <Button
            variant="ghost" size="icon"
            className="ml-2 mt-1 shrink-0"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
          >
            <PanelLeftIcon className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <Header />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {user && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user.username}
              </span>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-scroll flex flex-col gap-4 px-4 pt-4"
          ref={messagesContainerRef}
        >
          {messages.length === 0 && !isLoading && <Overview />}
          {messages.map((msg, i) => (
            <PreviewMessage key={i} message={msg} />
          ))}
          {/* FIX 1: only show spinner during RAG/prefill, not during token streaming */}
          {showThinking && <ThinkingMessage elapsedSeconds={elapsedSeconds} />}
          <div ref={messagesEndRef} className="shrink-0 min-h-[24px]" />
        </div>

        <div className="shrink-0 flex mx-auto px-4 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          <ChatInput
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            image={image}
            setImage={setImage}
          />
        </div>
      </div>
    </div>
  );
}
