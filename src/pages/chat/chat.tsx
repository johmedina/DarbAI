/**
 * chat.tsx
 * src/pages/chat/chat.tsx
 */

import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { useState, useEffect, useCallback } from "react";
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

// ── Helper — build a full authenticated image src URL ─────────────────────────
// The backend serves images at /images/<path> and requires JWT.
// We can't put a Bearer token in an <img src> tag, so we fetch the image as a
// blob and create a local object URL instead.  These are cached per session in
// a module-level map so we don't re-fetch the same image.
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

// ── Convert a stored ChatSession → ChatMessageModel[] ─────────────────────────
// imageUrlMap maps backend /images/... path → local blob URL
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
      } as ChatMessageModel,
    ];
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Chat() {
  const { token, user, logout } = useAuth();
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [chatSessions, setChatSessions]     = useState<ChatSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [messages, setMessages]             = useState<ChatMessageModel[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [question, setQuestion]   = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage]         = useState<File | null>(null);

  // ── Resolve all image_url values in a session to local blob URLs ───────────
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

  // ── Load history ────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const data = await apiClient.get("/history", token);
      if (data.success) {
        setChatSessions(data.data as ChatSession[]);

        const savedId = localStorage.getItem("selectedChatId");
        if (savedId) {
          const found = (data.data as ChatSession[]).find(
            (c: ChatSession) => c.chat_id === savedId
          );
          if (found) {
            setSelectedChatId(savedId);
            const imageMap = await resolveSessionImages(found);
            setMessages(sessionToMessages(found, imageMap));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, resolveSessionImages]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── New chat ────────────────────────────────────────────────────────────
  function handleNewChat() {
    setSelectedChatId(null);
    setMessages([]);
    setQuestion("");
    setImage(null);
    localStorage.removeItem("selectedChatId");
    setSidebarOpen(false);
  }

  // ── Select chat from sidebar ────────────────────────────────────────────
  async function handleSelectChat(session: ChatSession) {
    setSelectedChatId(session.chat_id);
    localStorage.setItem("selectedChatId", session.chat_id);
    setSidebarOpen(false);
    // Resolve any images in this session before rendering
    const imageMap = await resolveSessionImages(session);
    setMessages(sessionToMessages(session, imageMap));
  }

  // ── Send message ────────────────────────────────────────────────────────────
  async function handleSubmit(text?: string) {
    if (isLoading || !token) return;
    const messageText = text ?? question;
    if (!messageText.trim() && !image) return;

    setIsLoading(true);

    const chatId = selectedChatId ?? uuidv4();
    if (!selectedChatId) {
      setSelectedChatId(chatId);
      localStorage.setItem("selectedChatId", chatId);
    }

    // Create a temporary local object URL so the image shows instantly in the UI
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
    setImage(null);

    const contextForApi = [...messages, userMessage].map((msg) => ({
      role: msg.role === ChatMessageRoleType.USER ? "user" : "assistant",
      content: msg.message,
    }));

    try {
      let payload: any;

      if (image) {
        const formData = new FormData();
        formData.append("question", messageText);
        formData.append("use_rag", "true");
        formData.append("chat_id", chatId);
        formData.append("context", JSON.stringify(contextForApi));
        formData.append("image", image);
        payload = await apiClient.postForm("/generate_response", formData, token);
      } else {
        payload = await apiClient.post(
          "/generate_response",
          { question: messageText, use_rag: true, context: contextForApi, chat_id: chatId },
          token
        );
      }

      const assistantData = payload.data as ChatMessageModel & { image_url?: string };
      setMessages((prev) => [...prev, assistantData]);

      // If the backend saved an image, resolve it to a blob URL and cache it
      // so it loads correctly if the user re-opens this chat from history.
      let resolvedImageUrl: string | undefined;
      if (assistantData.image_url) {
        resolvedImageUrl = await toAuthenticatedBlobUrl(assistantData.image_url, token);
        // Patch the user message already in state to use the persistent blob URL
        if (resolvedImageUrl) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg === userMessage
                ? { ...msg, chat_uploaded_files: [{ objectUrl: resolvedImageUrl }] }
                : msg
            )
          );
        }
      }

      // Optimistically update sidebar
      setChatSessions((prev) => {
        const newMsg: HistoryMessage = {
          question:          messageText,
          response:          assistantData.message,
          timestamp:         new Date().toISOString(),
          image_url:         assistantData.image_url ?? null,
          total_reliability: assistantData.total_reliability,
          total_entropy:     assistantData.total_entropy,
          total_collision_entropy: assistantData.total_collision_entropy,
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
      setMessages((prev) => [
        ...prev,
        {
          message: "Sorry, there was an error processing your request. Please try again.",
          role: ChatMessageRoleType.ASSISTANT,
          chat_id: chatId,
          generation_type: ChatMessageGenerationType.TEXT,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chatSessions}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
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
          <div className="flex-1"><Header /></div>
          <div className="flex items-center gap-2 mt-1">
            {user && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user.username}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out" title="Log out">
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-scroll flex flex-col gap-4 px-4 pt-4"
          ref={messagesContainerRef}
        >
          {messages.length === 0 && !isLoading && <Overview />}
          {messages.map((msg, i) => <PreviewMessage key={i} message={msg} />)}
          {isLoading && <ThinkingMessage />}
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
