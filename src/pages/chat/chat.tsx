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
  SignImage,
  TokenData,
} from "../../interfaces/interfaces";
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import { Sidebar, ChatSession, HistoryMessage } from "@/components/custom/sidebar";
import { ThemeToggle } from "@/components/custom/theme-toggle";
import { ModeSwitch, ChatMode, MODES } from "@/components/custom/mode-switch";
import { v4 as uuidv4 } from "uuid";
import { PanelLeftIcon, LogOutIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiClient, API_BASE, streamSSE } from "@/lib/apiClient";
import { toast } from "sonner";

// ── Authenticated image loader ─────────────────────────────────────────────────
const _blobCache = new Map<string, string>();

//converts protected image URLs into usable blob URLs that can be displayed in a web page
async function toAuthenticatedBlobUrl(imagePath: string, token: string): Promise<string> {
  if (_blobCache.has(imagePath)) return _blobCache.get(imagePath)!; // performance optimization, doesnt fetch the same image twice
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
        total_reliability_with_hidden_layers: m.total_reliability_with_hidden_layers,
        generation_time_seconds: m.generation_time_seconds,
        images: m.sign_images,
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

  // Sidebar — persists across route changes because Chat never remounts
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [chatSessions, setChatSessions]     = useState<ChatSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Chat mode — persisted to localStorage
  const [mode, setMode] = useState<ChatMode>(() => (localStorage.getItem("salama-mode") as ChatMode) || "ask");
  useEffect(() => { localStorage.setItem("salama-mode", mode); }, [mode]);

  // Current conversation
  const [messages, setMessages]   = useState<ChatMessageModel[]>([]);
  const [question, setQuestion]   = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage]         = useState<File | null>(null);

  // Tracks which chatId is currently loaded in messages[]
  // Prevents double-fetching and the image-upload 404 race condition
  const loadedChatIdRef = useRef<string | null>(null);

  // Live generation timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedChatId = urlChatId ?? null;

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => +(s + 0.1).toFixed(1));
      }, 100);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLoading]);

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

  // ── Load sidebar history (runs once on mount / token change) ─────────────
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
    // No chatId in URL → new chat screen, clear messages
    if (!urlChatId || !token) {
      setMessages([]);
      loadedChatIdRef.current = null;
      return;
    }

    // Already loaded in state — skip fetch (prevents 404 race on new chats)
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
        // 403/404 — this chat doesn't belong to this user.
        // Clear messages and go to home WITHOUT remounting Chat.
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

    // Mode-specific validation
    if (mode === "read") {
      if (!image) { toast.error("Attach a sign photo to identify it."); return; }
    } else if (mode === "name") {
      if (!messageText.trim()) { toast.error("Describe the sign you're looking for."); return; }
    } else {
      if (!messageText.trim() && !image) return;
    }

    setIsLoading(true);

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
      generation_type: image !== null
        ? ChatMessageGenerationType.IMAGE_UNDERSTANDING
        : ChatMessageGenerationType.TEXT,
      ...(localImageObjectUrl ? { chat_uploaded_files: [{ objectUrl: localImageObjectUrl }] } : {}),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    const capturedImage = image;
    setImage(null);

    const contextForApi = messages.map((msg) => ({
      role: msg.role === ChatMessageRoleType.USER ? "user" : "assistant",
      content: msg.message,
    }));

    // Resolves relative sign image paths to authenticated blob URLs
    async function resolveImages(imgs: SignImage[] | undefined): Promise<SignImage[]> {
      if (!imgs?.length) return [];
      return Promise.all(imgs.map(async (img) => ({
        ...img,
        resolvedUrl: await toAuthenticatedBlobUrl(img.url, token!),
      })));
    }

    // Pushes the completed assistant message into the sidebar session list
    function pushToSidebar(msg: ChatMessageModel & { generation_time_seconds?: number }) {
      setChatSessions((prev) => {
        const newMsg: HistoryMessage = {
          question:                             messageText,
          response:                             msg.message,
          timestamp:                            new Date().toISOString(),
          image_url:                            null,
          generation_time_seconds:              msg.generation_time_seconds ?? null,
          total_reliability:                    msg.total_reliability,
          total_entropy:                        msg.total_entropy,
          total_collision_entropy:              msg.total_collision_entropy,
          total_reliability_with_hidden_layers: msg.total_reliability_with_hidden_layers,
          sign_images:                          msg.images,
        };
        const idx = prev.findIndex((c) => c.chat_id === chatId);
        if (idx !== -1) {
          const updated = { ...prev[idx], messages: [...prev[idx].messages, newMsg], last_updated: newMsg.timestamp };
          return [updated, ...prev.filter((_, i) => i !== idx)];
        }
        return [{ chat_id: chatId, title: (messageText || "Sign chat").slice(0, 40), last_updated: newMsg.timestamp, messages: [newMsg] }, ...prev];
      });
    }

    let streamingAdded = false;

    try {
      if (mode === "read" && capturedImage) {
        // ── Read the sign → identify-sign (SigLIP + GPT-4.1-mini, no LLM) ──
        const form = new FormData();
        form.append("image", capturedImage);
        if (messageText.trim()) form.append("question", messageText);
        const payload = await apiClient.postForm(`/chats/${chatId}/identify-sign`, form, token);
        const assistantData = payload.data as ChatMessageModel & { generation_time_seconds?: number };
        assistantData.images = await resolveImages(assistantData.images);
        setMessages((prev) => [...prev, assistantData]);
        pushToSidebar(assistantData);

      } else if (mode === "name") {
        // ── Name the sign → find-sign (BGE-M3 catalog search, no LLM) ──────
        const payload = await apiClient.post(`/chats/${chatId}/find-sign`, { question: messageText }, token);
        const assistantData = payload.data as ChatMessageModel & { generation_time_seconds?: number };
        assistantData.images = await resolveImages(assistantData.images);
        setMessages((prev) => [...prev, assistantData]);
        pushToSidebar(assistantData);

      } else if (capturedImage) {
        // ── Ask + image → non-streaming (streaming doesn't return sign images yet) ─
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("question", messageText);
        formData.append("use_rag", "true");
        formData.append("context", JSON.stringify(contextForApi));
        formData.append("image", capturedImage);
        const payload = await apiClient.postForm(`/generate_response`, formData, token);
        const assistantData = payload.data as ChatMessageModel & { generation_time_seconds?: number };
        assistantData.images = await resolveImages(assistantData.images);
        setMessages((prev) => [...prev, assistantData]);
        pushToSidebar(assistantData);

      } else {
        // ── Ask text-only → SSE token-by-token streaming ─────────────────────
        let streamText = "";
        let seenFirst = false;

        for await (const event of streamSSE(
          `/chats/${chatId}/stream`,
          { chat_id: chatId, question: messageText, use_rag: true, context: contextForApi },
          token
        )) {
          if (event.type === "token") {
            streamText += (event.content as string) ?? "";
            if (!seenFirst) {
              seenFirst = true;
              streamingAdded = true;
              setIsLoading(false);
              setMessages((prev) => [...prev, {
                message: streamText,
                role: ChatMessageRoleType.ASSISTANT,
                chat_id: chatId,
                generation_type: ChatMessageGenerationType.TEXT,
              } as ChatMessageModel]);
            } else {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [...prev.slice(0, -1), { ...last, message: streamText }];
              });
            }
          } else if (event.type === "done") {
            const doneMsg: ChatMessageModel & { generation_time_seconds?: number } = {
              message:                              (event.message as string) ?? streamText,
              role:                                 ChatMessageRoleType.ASSISTANT,
              chat_id:                              (event.chat_id as string) ?? chatId,
              generation_type:                      (event.generation_type as ChatMessageGenerationType) ?? ChatMessageGenerationType.TEXT,
              token_data:                           event.token_data as TokenData[] | undefined,
              total_reliability:                    event.total_reliability as number | undefined,
              total_entropy:                        event.total_entropy as number | undefined,
              total_collision_entropy:              event.total_collision_entropy as number | undefined,
              total_reliability_with_hidden_layers: event.total_reliability_with_hidden_layers as number | undefined,
              generation_time_seconds:              event.generation_time_seconds as number | undefined,
              images:                               [],
            };
            if (seenFirst) {
              setMessages((prev) => [...prev.slice(0, -1), doneMsg]);
            } else {
              streamingAdded = true;
              setIsLoading(false);
              setMessages((prev) => [...prev, doneMsg]);
            }
            pushToSidebar(doneMsg);
            break;
          } else if (event.type === "error") {
            throw new Error((event.content as string) ?? "Generation failed");
          }
        }
      }

    } catch (err) {
      console.error("API error:", err);
      setMessages((prev) => {
        const base = streamingAdded ? prev.slice(0, -1) : prev;
        return [...base, {
          message: "Sorry, there was an error processing your request. Please try again.",
          role: ChatMessageRoleType.ASSISTANT,
          chat_id: chatId,
          generation_type: ChatMessageGenerationType.TEXT,
        } as ChatMessageModel];
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const empty = messages.length === 0 && !isLoading;

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg)" }}>
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
        mode={mode}
        onMode={(id) => { setMode(id); handleNewChat(); }}
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            height: 58, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
            borderBottom: empty ? "1px solid transparent" : "1px solid var(--line)",
            transition: "border-color .2s",
          }}
        >
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
            style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--ink-2)", border: "1px solid transparent",
              background: "transparent", cursor: "pointer",
              transition: "background .15s, border-color .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
          >
            <PanelLeftIcon size={19} />
          </button>

          <Header />

          <ModeSwitch mode={mode} onMode={(id) => { setMode(id); handleNewChat(); }} />

          <div style={{ flex: 1 }} />

          <ThemeToggle />

          {user && (
            <span style={{ fontSize: 12.5, color: "var(--ink-3)", display: "none" }} className="sm:block">
              {user.username}
            </span>
          )}

          <button
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            style={{
              width: 36, height: 36, borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--ink-2)", border: "1px solid transparent",
              background: "transparent", cursor: "pointer",
              transition: "background .15s, border-color .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
          >
            <LogOutIcon size={18} />
          </button>
        </div>

        {/* Messages */}
        <div
          style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingTop: empty ? 0 : 16 }}
          ref={messagesContainerRef}
        >
          {empty && (
            <Overview
              mode={mode}
              onSuggest={(text) => handleSubmit(text)}
              onAttachImage={(file) => setImage(file)}
            />
          )}
          {messages.map((msg, i) => (
            <PreviewMessage key={i} message={msg} />
          ))}
          {isLoading && <ThinkingMessage elapsedSeconds={elapsedSeconds} />}
          <div ref={messagesEndRef} style={{ flexShrink: 0, minHeight: 24 }} />
        </div>

        {/* Input */}
        <div style={{ flexShrink: 0, padding: "10px 0 18px" }}>
          <ChatInput
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            image={image}
            setImage={setImage}
            placeholder={MODES[mode].placeholder}
            emphasizeAttach={mode === "read"}
          />
        </div>
      </div>
    </div>
  );
}
