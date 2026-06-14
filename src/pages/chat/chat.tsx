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
    if (!messageText.trim() && !image) return;

    setIsLoading(true);

    const chatId = selectedChatId ?? uuidv4();

    if (!selectedChatId) {
      // Pre-mark as loaded so the URL-change effect skips the GET
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

    // Context = previous turns only; current question goes in `question` field
    const contextForApi = messages.map((msg) => ({
      role: msg.role === ChatMessageRoleType.USER ? "user" : "assistant",
      content: msg.message,
    }));

    try {
      let payload: any;
      if (capturedImage) {
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("question", messageText);
        formData.append("use_rag", "true");
        formData.append("context", JSON.stringify(contextForApi));
        formData.append("image", capturedImage);
        payload = await apiClient.postForm(`/generate_response`, formData, token);
      } else {
        payload = await apiClient.post(
          `/generate_response`,
          { chat_id: chatId, question: messageText, use_rag: true, context: contextForApi },
          token
        );
      }

      const assistantData = payload.data as ChatMessageModel & {
        generation_time_seconds?: number;
      };

      // Resolve sign image URLs to authenticated blob URLs
      if (assistantData.images && assistantData.images.length > 0) {
        const resolvedImages: SignImage[] = await Promise.all(
          assistantData.images.map(async (img) => {
            const resolvedUrl = await toAuthenticatedBlobUrl(img.url, token);
            return { ...img, resolvedUrl };
          })
        );
        assistantData.images = resolvedImages;
      }

      setMessages((prev) => [...prev, assistantData]);

      // Update sidebar optimistically
      setChatSessions((prev) => {
        const newMsg: HistoryMessage = {
          question:                          messageText,
          response:                          assistantData.message,
          timestamp:                         new Date().toISOString(),
          image_url:                         null,
          generation_time_seconds:           assistantData.generation_time_seconds ?? null,
          total_reliability:                 assistantData.total_reliability,
          total_entropy:                     assistantData.total_entropy,
          total_collision_entropy:           assistantData.total_collision_entropy,
          total_reliability_with_hidden_layers: assistantData.total_reliability_with_hidden_layers,
          sign_images:                       assistantData.images,
        };
        const idx = prev.findIndex((c) => c.chat_id === chatId);
        if (idx !== -1) {
          const updated = {
            ...prev[idx],
            messages:     [...prev[idx].messages, newMsg],
            last_updated: newMsg.timestamp,
          };
          return [updated, ...prev.filter((_, i) => i !== idx)];
        }
        return [{
          chat_id:      chatId,
          title:        messageText.slice(0, 40),
          last_updated: newMsg.timestamp,
          messages:     [newMsg],
        }, ...prev];
      });

    } catch (err) {
      console.error("API error:", err);
      setMessages((prev) => [...prev, {
        message: "Sorry, there was an error processing your request. Please try again.",
        role: ChatMessageRoleType.ASSISTANT,
        chat_id: chatId,
        generation_type: ChatMessageGenerationType.TEXT,
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
        {/* Top bar — Header lives here, always mounted */}
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

        {/* Messages */}
        <div
          className="flex-1 overflow-y-scroll flex flex-col gap-4 px-4 pt-4"
          ref={messagesContainerRef}
        >
          {messages.length === 0 && !isLoading && <Overview />}
          {messages.map((msg, i) => (
            <PreviewMessage key={i} message={msg} />
          ))}
          {isLoading && <ThinkingMessage elapsedSeconds={elapsedSeconds} />}
          <div ref={messagesEndRef} className="shrink-0 min-h-[24px]" />
        </div>

        {/* Input */}
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
