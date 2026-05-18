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
import { apiClient } from "@/lib/apiClient";

// ── Helper — convert stored session messages → ChatMessageModel[] ─────────────

function sessionToMessages(session: ChatSession): ChatMessageModel[] {
  return session.messages.flatMap((m: HistoryMessage) => [
    {
      message: m.question,
      role: ChatMessageRoleType.USER,
      chat_id: session.chat_id,
      generation_type: ChatMessageGenerationType.TEXT,
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
  ]);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Chat() {
  const { token, user, logout } = useAuth();
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  // Sidebar
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [chatSessions, setChatSessions]   = useState<ChatSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Conversation
  const [messages, setMessages]           = useState<ChatMessageModel[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Input
  const [question, setQuestion]   = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage]         = useState<File | null>(null);

  // ── Load history ────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      // Token is sent automatically — backend returns only this user's chats
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
            setMessages(sessionToMessages(found));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
  function handleSelectChat(session: ChatSession) {
    setSelectedChatId(session.chat_id);
    setMessages(sessionToMessages(session));
    localStorage.setItem("selectedChatId", session.chat_id);
    setSidebarOpen(false);
  }

  // ── Send message ────────────────────────────────────────────────────────
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

    const imageObjectUrl = image ? URL.createObjectURL(image) : undefined;

    const userMessage: ChatMessageModel = {
      message: messageText,
      role: ChatMessageRoleType.USER,
      chat_id: chatId,
      generation_type: image
        ? ChatMessageGenerationType.IMAGE_UNDERSTANDING
        : ChatMessageGenerationType.TEXT,
      ...(imageObjectUrl ? { chat_uploaded_files: [{ objectUrl: imageObjectUrl }] } : {}),
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
          {
            question: messageText,
            use_rag: true,
            context: contextForApi,
            chat_id: chatId,
          },
          token
        );
      }

      const assistantData = payload.data as ChatMessageModel;
      setMessages((prev) => [...prev, assistantData]);

      // Optimistically update sidebar
      setChatSessions((prev) => {
        const newMsg: HistoryMessage = {
          question: messageText,
          response: assistantData.message,
          timestamp: new Date().toISOString(),
          total_reliability: assistantData.total_reliability,
          total_entropy: assistantData.total_entropy,
          total_collision_entropy: assistantData.total_collision_entropy,
        };

        const idx = prev.findIndex((c) => c.chat_id === chatId);
        if (idx !== -1) {
          const updated = {
            ...prev[idx],
            messages: [...prev[idx].messages, newMsg],
            last_updated: newMsg.timestamp,
          };
          return [updated, ...prev.filter((_, i) => i !== idx)];
        }
        return [
          {
            chat_id: chatId,
            title: messageText.slice(0, 40),
            last_updated: newMsg.timestamp,
            messages: [newMsg],
          },
          ...prev,
        ];
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
        {/* Top bar */}
        <div className="flex items-center gap-2 shrink-0 pr-3">
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 mt-1 shrink-0"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
          >
            <PanelLeftIcon className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            <Header />
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-2 mt-1">
            {user && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user.username}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
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
          {isLoading && <ThinkingMessage />}
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
