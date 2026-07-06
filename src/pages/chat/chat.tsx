import { flushSync } from 'react-dom'
import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChatMessageGenerationType,
  ChatMessageModel,
  ChatMessageRoleType,
  ResponseVersion,
  SignImage,
  TokenData,
  FeedbackType,
} from "../../interfaces/interfaces";
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import { Sidebar, ChatSession, HistoryMessage } from "@/components/custom/sidebar";
import { ThemeToggle } from "@/components/custom/theme-toggle";
import { ModeSwitch, ChatMode, MODES } from "@/components/custom/mode-switch";
import { v4 as uuidv4 } from "uuid";
import { PanelLeftIcon, LogOutIcon, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiClient, API_BASE, streamSSE } from "@/lib/apiClient";
import { toast } from "sonner";

// ── Countries ──────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "uae",   name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "qatar", name: "Qatar",                 flag: "🇶🇦" },
]

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

    const rawVersions: ResponseVersion[] = (m as any).versions ?? []
    const versions: ResponseVersion[] = rawVersions.length > 0
      ? rawVersions
      : [{
        version_num: 1,
        message: m.response,
        token_data: (m as any).token_data ?? [],
        total_reliability: m.total_reliability,
        total_entropy: m.total_entropy,
        total_collision_entropy: m.total_collision_entropy,
        total_reliability_with_hidden_layers: (m as any).total_reliability_with_hidden_layers ?? 0,
        total_glu: (m as any).total_glu ?? 0,
        total_logtoku: (m as any).total_logtoku ?? 0,
        generation_time_seconds: m.generation_time_seconds,
        rag_sources: (m as any).rag_sources ?? [],
        feedback: (m as any).feedback ?? null,
      }]

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
        message_id: (m as any).message_id,
        message: m.response,
        role: ChatMessageRoleType.ASSISTANT,
        chat_id: session.chat_id,
        generation_type: ChatMessageGenerationType.TEXT,
        total_reliability: m.total_reliability,
        total_entropy: m.total_entropy,
        total_collision_entropy: m.total_collision_entropy,
        total_reliability_with_hidden_layers: (m as any).total_reliability_with_hidden_layers ?? 0,
        total_glu: (m as any).total_glu ?? 0,
        total_logtoku: (m as any).total_logtoku ?? 0,
        generation_time_seconds: m.generation_time_seconds != null ? Number(m.generation_time_seconds) : null,
        images: ((m as any).images ?? m.sign_images)?.map((img: SignImage) => ({
          ...img,
          resolvedUrl: imageUrlMap[img.url] ?? undefined,
        })),
        token_data: (m as any).token_data ?? [],
        rag_sources: (m as any).rag_sources ?? [],
        versions,
        activeVersionIdx: versions.length - 1,
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
  // const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar — persisted across navigation and page refreshes.
  // Defaults to open; only the explicit toggle button should change this.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem("salama-sidebar-open");
    return stored === null ? true : stored === "true";
  });
  useEffect(() => {
    localStorage.setItem("salama-sidebar-open", String(sidebarOpen));
  }, [sidebarOpen]);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Chat mode — persisted to localStorage
  const [mode, setMode] = useState<ChatMode>(() => (localStorage.getItem("salama-mode") as ChatMode) || "ask");
  useEffect(() => { localStorage.setItem("salama-mode", mode); }, [mode]);

  // Current conversation
  const [messages, setMessages] = useState<ChatMessageModel[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  // Which assistant message index is currently being regenerated (-1 = none)
  const [regeneratingIdx, setRegeneratingIdx] = useState(-1)

  // Country — resets on every new chat, persists for the life of one chat
  const [country, setCountry] = useState<string | null>(null)

  const loadedChatIdRef = useRef<string | null>(null);
  const streamingIdxRef = useRef<number>(-1);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => { elapsedRef.current = elapsedSeconds }, [elapsedSeconds]);

  const selectedChatId = urlChatId ?? null;

  // ── Timer lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0);
      elapsedRef.current = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => +(s + 0.1).toFixed(1));
      }, 100)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLoading]);

  // ── Image resolution ──────────────────────────────────────────────────────
  const resolveSessionImages = useCallback(
    async (session: ChatSession): Promise<Record<string, string>> => {
      if (!token) return {};
      const map: Record<string, string> = {};
      for (const msg of session.messages) {
        // Resolve user-uploaded image
        if (msg.image_url && !map[msg.image_url]) {
          const blobUrl = await toAuthenticatedBlobUrl(msg.image_url, token);
          if (blobUrl) map[msg.image_url] = blobUrl;
        }
        // Resolve AI response sign images
        const signImgs = (msg as any).images ?? msg.sign_images;
        if (signImgs?.length) {
          for (const img of signImgs) {
            if (img.url && !map[img.url]) {
              const blobUrl = await toAuthenticatedBlobUrl(img.url, token);
              if (blobUrl) map[img.url] = blobUrl;
            }
          }
        }
      }
      return map;
    },
    [token]
  );

  // ── Load history ──────────────────────────────────────────────────────────
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

  // ── Load chat on URL change ───────────────────────────────────────────────
  useEffect(() => {
    if (!urlChatId || !token) {
      setMessages([]);
      loadedChatIdRef.current = null;
      return;
    }
    if (loadedChatIdRef.current === urlChatId) return;

    // Reset country when switching to a different existing chat
    setCountry(null);

    (async () => {
      try {
        const data = await apiClient.get(`/chats/${urlChatId}`, token);
        if (data.success) {
          const session = data.data as ChatSession;
          const imageMap = await resolveSessionImages(session);
          setMessages(sessionToMessages(session, imageMap));
          setCountry((data.data as any).country ?? null);
          loadedChatIdRef.current = urlChatId;
        }
      } catch {
        setMessages([]);
        loadedChatIdRef.current = null;
        navigate("/", { replace: true });
      }
    })();
  }, [urlChatId, token, navigate, resolveSessionImages]);

  async function handleFeedback(
    messageId: string,
    versionNum: number,
    type: FeedbackType | null,   // null = clear/toggle off
    reason?: string,
    customReason?: string
  ) {
    // Find current feedback to detect toggle-off
    const currentMsg = messages.find(m => m.message_id === messageId)
    const currentVer = currentMsg?.versions?.find(v => v.version_num === versionNum)
    const isTogglingOff = type !== null && currentVer?.feedback?.feedback_type === type && reason === undefined

    try {
      if (type === null || isTogglingOff) {
        // User clicked the already-active button — remove feedback
        await apiClient.delete(
          `/chats/${selectedChatId}/messages/${messageId}/feedback?version_num=${versionNum}`,
          token
        );
        setMessages(prev => prev.map(m => {
          if (m.message_id !== messageId) return m;
          const versions = (m.versions ?? []).map(v =>
            v.version_num === versionNum ? { ...v, feedback: null } : v
          );
          return { ...m, versions };
        }));
      } else {
        await apiClient.post(
          `/chats/${selectedChatId}/messages/${messageId}/feedback`,
          { feedback_type: type, version_num: versionNum, reason, custom_reason: customReason },
          token
        );
        setMessages(prev => prev.map(m => {
          if (m.message_id !== messageId) return m;
          const versions = (m.versions ?? []).map(v =>
            v.version_num === versionNum
              ? { ...v, feedback: { feedback_type: type, reason, custom_reason: customReason } }
              : v
          );
          return { ...m, versions };
        }));
        toast.success("Thanks for your feedback!");
      }
    } catch {
      toast.error("Couldn't save feedback, please try again.");
    }
  }

  // ── Sidebar handlers ──────────────────────────────────────────────────────
  function handleNewChat() {
    loadedChatIdRef.current = null;
    setMessages([]);
    setQuestion("");
    setImage(null);
    setCountry(null);
    // setSidebarOpen(false);
    navigate("/");
  }

  function handleSelectChat(session: ChatSession) {
    // setSidebarOpen(false);
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

  // ── Version switcher ──────────────────────────────────────────────────────
  function handleVersionChange(msgIdx: number, versionIdx: number) {
    setMessages((prev) => {
      const updated = [...prev]
      const msg = updated[msgIdx]
      const versions = msg.versions ?? []
      if (versionIdx < 0 || versionIdx >= versions.length) return prev
      const ver = versions[versionIdx]
      updated[msgIdx] = {
        ...msg,
        activeVersionIdx: versionIdx,
        message: ver.message,
        token_data: ver.token_data,
        generation_time_seconds: ver.generation_time_seconds,
        total_reliability: ver.total_reliability,
        total_entropy: ver.total_entropy,
        total_collision_entropy: ver.total_collision_entropy,
        total_reliability_with_hidden_layers: ver.total_reliability_with_hidden_layers,
        total_glu: ver.total_glu,
        total_logtoku: ver.total_logtoku,
        rag_sources: (ver as any).rag_sources ?? [],
      }
      return updated
    })
  }

  // ── Regenerate ────────────────────────────────────────────────────────────
  async function handleRegenerate(msgIdx: number) {
    if (isLoading || regeneratingIdx !== -1 || !token) return

    const assistantMsg = messages[msgIdx]
    if (!assistantMsg || assistantMsg.role !== ChatMessageRoleType.ASSISTANT) return

    const userMsg = messages.slice(0, msgIdx)
      .reverse()
      .find((m) => m.role === ChatMessageRoleType.USER)
    if (!userMsg) return

    const chatId = selectedChatId ?? assistantMsg.chat_id
    const messageId = assistantMsg.message_id

    if (!messageId) {
      console.warn("No message_id on assistant message — cannot regenerate via versioned endpoint")
      return
    }

    const userMsgIdx = messages.slice(0, msgIdx).map((m) => m.role).lastIndexOf(ChatMessageRoleType.USER)
    const contextForApi = messages
      .slice(0, userMsgIdx)
      .map((m) => ({
        role: m.role === ChatMessageRoleType.USER ? "user" : "assistant",
        content: m.message,
      }))

    setRegeneratingIdx(msgIdx)

    let streamingText = ""

    try {
      const res = await fetch(
        `${API_BASE}/chats/${chatId}/messages/${messageId}/regenerate/stream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: userMsg.message,
            country: country ?? "qatar",
            use_rag: true,
            context: contextForApi,
          }),
        }
      )

      if (!res.ok || !res.body) throw new Error(`Regenerate stream failed: ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          setRegeneratingIdx(-1)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          let event: any
          try { event = JSON.parse(line.slice(6).trim()) } catch { continue }

          if (event.type === "token") {
            streamingText += event.content
            setMessages((prev) => {
              const updated = [...prev]
              const msg = updated[msgIdx]
              const existingVersions = msg.versions ?? []
              const isPlaceholder =
                existingVersions.length > 0 &&
                (existingVersions[existingVersions.length - 1] as any)._streaming

              const streamingVersion: ResponseVersion & { _streaming?: boolean } = {
                version_num: (existingVersions[existingVersions.length - 1]?.version_num ?? 0) + (isPlaceholder ? 0 : 1),
                message: streamingText,
                token_data: [],
                _streaming: true,
              }

              const newVersions = isPlaceholder
                ? [...existingVersions.slice(0, -1), streamingVersion]
                : [...existingVersions, streamingVersion]

              updated[msgIdx] = {
                ...msg,
                versions: newVersions,
                activeVersionIdx: newVersions.length - 1,
                message: streamingText,
              }
              return updated
            })

          } else if (event.type === "done") {
            const newVersion: ResponseVersion = {
              version_num: event.version_num,
              message: event.message,
              token_data: event.token_data ?? [],
              total_reliability: event.total_reliability,
              total_entropy: event.total_entropy,
              total_collision_entropy: event.total_collision_entropy,
              total_reliability_with_hidden_layers: event.total_reliability_with_hidden_layers,
              total_glu: event.total_glu ?? 0,
              total_logtoku: event.total_logtoku ?? 0,
              generation_time_seconds: event.generation_time_seconds,
              rag_sources: event.rag_sources ?? [],
            }

            setMessages((prev) => {
              const updated = [...prev]
              const msg = updated[msgIdx]
              const cleanVersions = (msg.versions ?? []).filter((v) => !(v as any)._streaming)
              const finalVersions = [...cleanVersions, newVersion]

              updated[msgIdx] = {
                ...msg,
                versions: finalVersions,
                activeVersionIdx: finalVersions.length - 1,
                message: newVersion.message,
                token_data: newVersion.token_data,
                generation_time_seconds: newVersion.generation_time_seconds,
                total_reliability: newVersion.total_reliability,
                total_entropy: newVersion.total_entropy,
                total_collision_entropy: newVersion.total_collision_entropy,
                total_reliability_with_hidden_layers: newVersion.total_reliability_with_hidden_layers,
                total_glu: newVersion.total_glu ?? 0,
                total_logtoku: newVersion.total_logtoku ?? 0,
                rag_sources: (newVersion as any).rag_sources ?? [],
              }
              return updated
            })

            setRegeneratingIdx(-1)
            streamingText = ""

          } else if (event.type === "error") {
            setMessages((prev) => {
              const updated = [...prev]
              const msg = updated[msgIdx]
              const cleanVersions = (msg.versions ?? []).filter((v) => !(v as any)._streaming)
              const prevIdx = cleanVersions.length - 1
              const prevVer = cleanVersions[prevIdx]
              updated[msgIdx] = {
                ...msg,
                versions: cleanVersions,
                activeVersionIdx: prevIdx,
                message: prevVer?.message ?? msg.message,
              }
              return updated
            })
            setRegeneratingIdx(-1)
            streamingText = ""
          }
        }
      }
    } catch (err) {
      console.error("Regenerate error:", err)
      setMessages((prev) => {
        const updated = [...prev]
        const msg = updated[msgIdx]
        const cleanVersions = (msg.versions ?? []).filter((v) => !(v as any)._streaming)
        const prevIdx = cleanVersions.length - 1
        const prevVer = cleanVersions[prevIdx]
        updated[msgIdx] = {
          ...msg,
          versions: cleanVersions,
          activeVersionIdx: prevIdx,
          message: prevVer?.message ?? msg.message,
        }
        return updated
      })
      setRegeneratingIdx(-1)
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSubmit(text?: string) {
    if (isLoading || !token) return;
    const messageText = text ?? question;

    if (mode === "read") {
      if (!image) { toast.error("Attach a sign photo to identify it."); return; }
    } else if (mode === "name") {
      if (!messageText.trim()) { toast.error("Describe the sign you're looking for."); return; }
    } else {
      if (!messageText.trim() && !image) return;
    }

    setIsLoading(true);
    streamingIdxRef.current = -1;

    const chatId = selectedChatId ?? uuidv4();
    const isNewChat = !selectedChatId;

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

    const placeholder: ChatMessageModel = {
      message: "",
      role: ChatMessageRoleType.ASSISTANT,
      chat_id: chatId,
      generation_type: ChatMessageGenerationType.TEXT,
      is_streaming: true,
      versions: [],
      activeVersionIdx: 0,
    };

    streamingIdxRef.current = messages.length + 1;
    setMessages((prev) => [...prev, userMessage, placeholder]);

    setQuestion("");
    const capturedImage = image;
    setImage(null);

    const contextForApi = [...messages, userMessage].map((msg) => ({
      role: msg.role === ChatMessageRoleType.USER ? "user" : "assistant",
      content: msg.message,
    }));

    async function resolveImages(imgs: SignImage[] | undefined): Promise<SignImage[]> {
      if (!imgs?.length) return [];
      return Promise.all(imgs.map(async (img) => ({
        ...img,
        resolvedUrl: await toAuthenticatedBlobUrl(img.url, token!),
      })));
    }

    function pushToSidebar(msg: ChatMessageModel & { generation_time_seconds?: number }) {
      setChatSessions((prev) => {
        const newMsg: HistoryMessage = {
          question: messageText,
          response: msg.message,
          timestamp: new Date().toISOString(),
          image_url: null,
          generation_time_seconds: msg.generation_time_seconds ?? null,
          total_reliability: msg.total_reliability,
          total_entropy: msg.total_entropy,
          total_collision_entropy: msg.total_collision_entropy,
          total_reliability_with_hidden_layers: msg.total_reliability_with_hidden_layers,
          sign_images: msg.images,
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
        form.append("country", country ?? "qatar")
        if (messageText.trim()) form.append("question", messageText);
        const payload = await apiClient.postForm(`/chats/${chatId}/identify-sign`, form, token);
        const assistantData = payload.data as ChatMessageModel & { generation_time_seconds?: number };
        assistantData.images = await resolveImages(assistantData.images);

        // Wrap in versioning structure so regenerate works consistently
        const v1: ResponseVersion = {
          version_num: 1,
          message: assistantData.message,
          token_data: assistantData.token_data ?? [],
          total_reliability: assistantData.total_reliability,
          total_entropy: assistantData.total_entropy,
          total_collision_entropy: assistantData.total_collision_entropy,
          total_reliability_with_hidden_layers: assistantData.total_reliability_with_hidden_layers ?? 0,
          total_glu: (assistantData as any).total_glu ?? 0,
          total_logtoku: (assistantData as any).total_logtoku ?? 0,
          generation_time_seconds: assistantData.generation_time_seconds ?? 0,
        };
        setMessages((prev) => {
          const idx = streamingIdxRef.current;
          if (idx >= 0 && idx < prev.length) {
            const updated = [...prev];
            updated[idx] = { ...assistantData, versions: [v1], activeVersionIdx: 0, is_streaming: false };
            return updated;
          }
          return [...prev, { ...assistantData, versions: [v1], activeVersionIdx: 0 }];
        });
        pushToSidebar(assistantData);
        if (isNewChat && country) {
          apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => {})
        }

      } else if (mode === "name") {
        // ── Name the sign → find-sign (BGE-M3 catalog search, no LLM) ──────
        const payload = await apiClient.post(`/chats/${chatId}/find-sign`, { question: messageText, country: country ?? "qatar" }, token);
        const assistantData = payload.data as ChatMessageModel & { generation_time_seconds?: number };
        assistantData.images = await resolveImages(assistantData.images);

        const v1: ResponseVersion = {
          version_num: 1,
          message: assistantData.message,
          token_data: assistantData.token_data ?? [],
          total_reliability: assistantData.total_reliability,
          total_entropy: assistantData.total_entropy,
          total_collision_entropy: assistantData.total_collision_entropy,
          total_reliability_with_hidden_layers: assistantData.total_reliability_with_hidden_layers ?? 0,
          total_glu: (assistantData as any).total_glu ?? 0,
          total_logtoku: (assistantData as any).total_logtoku ?? 0,
          generation_time_seconds: assistantData.generation_time_seconds ?? 0,
        };
        setMessages((prev) => {
          const idx = streamingIdxRef.current;
          if (idx >= 0 && idx < prev.length) {
            const updated = [...prev];
            updated[idx] = { ...assistantData, versions: [v1], activeVersionIdx: 0, is_streaming: false };
            return updated;
          }
          return [...prev, { ...assistantData, versions: [v1], activeVersionIdx: 0 }];
        });
        pushToSidebar(assistantData);
        if (isNewChat && country) {
          apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => {})
        }

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

        // Wrap in versioning structure so regenerate works consistently
        const v1: ResponseVersion = {
          version_num: 1,
          message: assistantData.message,
          token_data: assistantData.token_data ?? [],
          total_reliability: assistantData.total_reliability,
          total_entropy: assistantData.total_entropy,
          total_collision_entropy: assistantData.total_collision_entropy,
          total_reliability_with_hidden_layers: assistantData.total_reliability_with_hidden_layers ?? 0,
          total_glu: (assistantData as any).total_glu ?? 0,
          total_logtoku: (assistantData as any).total_logtoku ?? 0,
          generation_time_seconds: assistantData.generation_time_seconds ?? 0,
        };
        setMessages((prev) => {
          const idx = streamingIdxRef.current;
          if (idx >= 0 && idx < prev.length) {
            const updated = [...prev];
            updated[idx] = { ...assistantData, versions: [v1], activeVersionIdx: 0, is_streaming: false };
            return updated;
          }
          return [...prev, { ...assistantData, versions: [v1], activeVersionIdx: 0 }];
        });
        pushToSidebar(assistantData);
        if (isNewChat && country) {
          apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => {})
        }

      } else {
        // ── Ask text-only → SSE token-by-token streaming ─────────────────────
        let streamText = "";
        let seenFirst = false;

        for await (const event of streamSSE(
          `/chats/${chatId}/stream`,
          { chat_id: chatId, question: messageText, country: country ?? "qatar", use_rag: true, context: contextForApi },
          token
        )) {
          if (event.type === "token") {
            streamText += (event.content as string) ?? "";

            if (!seenFirst) {
              seenFirst = true;
              streamingAdded = true;
              // First token: update the placeholder in-place via streamingIdxRef
              setMessages((prev) => {
                const idx = streamingIdxRef.current;
                if (idx < 0 || idx >= prev.length) return prev;
                const updated = [...prev];
                updated[idx] = { ...updated[idx], message: streamText };
                return updated;
              });
            } else {
              setMessages((prev) => {
                const idx = streamingIdxRef.current;
                if (idx < 0 || idx >= prev.length) return prev;
                const updated = [...prev];
                updated[idx] = { ...updated[idx], message: streamText };
                return updated;
              });
            }

          } else if (event.type === "done") {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            const finalElapsed = elapsedRef.current;

            // Build version 1 from the completed response
            const v1: ResponseVersion = {
              version_num: 1,
              message: (event.message as string) ?? streamText,
              token_data: (event.token_data as TokenData[]) ?? [],
              total_reliability: event.total_reliability as number | undefined,
              total_entropy: event.total_entropy as number | undefined,
              total_collision_entropy: event.total_collision_entropy as number | undefined,
              total_reliability_with_hidden_layers: event.total_reliability_with_hidden_layers as number | undefined,
              total_glu: (event.total_glu as number) ?? 0,
              total_logtoku: (event.total_logtoku as number) ?? 0,
              generation_time_seconds: (event.generation_time_seconds as number) ?? finalElapsed,
              rag_sources: (event.rag_sources as any[]) ?? [],
            };

            const doneMsg: ChatMessageModel & { generation_time_seconds?: number } = {
              message: v1.message,
              role: ChatMessageRoleType.ASSISTANT,
              chat_id: (event.chat_id as string) ?? chatId,
              generation_type: (event.generation_type as ChatMessageGenerationType) ?? ChatMessageGenerationType.TEXT,
              message_id: event.message_id as string | undefined,
              token_data: v1.token_data,
              total_reliability: v1.total_reliability,
              total_entropy: v1.total_entropy,
              total_collision_entropy: v1.total_collision_entropy,
              total_reliability_with_hidden_layers: v1.total_reliability_with_hidden_layers,
              total_glu: v1.total_glu,
              total_logtoku: v1.total_logtoku,
              generation_time_seconds: v1.generation_time_seconds,
              rag_sources: (event.rag_sources as any[]) ?? [],
              is_streaming: false,
              versions: [v1],
              activeVersionIdx: 0,
              images: [],
            };

            flushSync(() => {
              setMessages((prev) => {
                const idx = streamingIdxRef.current;
                if (idx >= 0 && idx < prev.length) {
                  const updated = [...prev];
                  updated[idx] = doneMsg;
                  return updated;
                }
                // Edge case: done fired before any token (seenFirst still false)
                streamingAdded = true;
                setIsLoading(false);
                return [...prev, doneMsg];
              });
            });

            setChatSessions((prev) => {
              const newMsg: HistoryMessage = {
                question: messageText,
                response: doneMsg.message,
                timestamp: new Date().toISOString(),
                image_url: (event.image_url as string) ?? null,
                generation_time_seconds: doneMsg.generation_time_seconds ?? elapsedRef.current,
                total_reliability: doneMsg.total_reliability,
                total_entropy: doneMsg.total_entropy,
                total_collision_entropy: doneMsg.total_collision_entropy,
              };
              const idx = prev.findIndex((c) => c.chat_id === chatId);
              if (idx !== -1) {
                const up = { ...prev[idx], messages: [...prev[idx].messages, newMsg], last_updated: newMsg.timestamp };
                return [up, ...prev.filter((_, i) => i !== idx)];
              }
              return [{ chat_id: chatId, title: messageText.slice(0, 40), last_updated: newMsg.timestamp, messages: [newMsg] }, ...prev];
            });

            pushToSidebar(doneMsg);
            setIsLoading(false);
            streamingIdxRef.current = -1;
            if (isNewChat && country) {
              apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => {})
            }
            break;

          } else if (event.type === "error") {
            setMessages((prev) => {
              const idx = streamingIdxRef.current;
              if (idx < 0 || idx >= prev.length) return prev;
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                message: "Sorry, there was an error. Please try again.",
                is_streaming: false,
              };
              return updated;
            });
            setIsLoading(false);
            streamingIdxRef.current = -1;
            throw new Error((event.content as string) ?? "Generation failed");
          }
        }
      }

    } catch (err) {
      console.error("Stream/API error:", err);

      setMessages((prev) => {
        const idx = streamingIdxRef.current;

        // If we have a streaming placeholder in-place, overwrite it
        if (idx >= 0 && idx < prev.length) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            message: "Sorry, there was an error processing your request. Please try again.",
            is_streaming: false,
          };
          return updated;
        }

         // Otherwise remove any partially-added streaming message and append error
        const base = streamingAdded ? prev.slice(0, -1) : prev;
        return [
          ...base,
          {
            message: "Sorry, there was an error processing your request. Please try again.",
            role: ChatMessageRoleType.ASSISTANT,
            chat_id: chatId ?? urlChatId ?? "",
            generation_type: ChatMessageGenerationType.TEXT,
          } as ChatMessageModel,
        ];
      });
    } finally {
      setIsLoading(false);
      streamingIdxRef.current = -1;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const empty = messages.length === 0 && !isLoading;
  const streamingPlaceholder = messages.find((m) => (m as any).is_streaming);
  const showThinking = isLoading && !streamingPlaceholder?.message;
  const activeCountry = COUNTRIES.find(c => c.code === country)
  // Selectable in the header until the chat actually starts; then fixed for
  // the rest of this chat (matches what's already sent to the backend once
  // messages exist — see the `isNewChat && country` patch calls above).
  const countryLocked = !empty

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

          {/* Country selector — a pill in the header. Changeable up until the
              first message is sent; locked (padlock, no dropdown) after. */}
          {countryLocked ? (
            activeCountry && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 99,
                background: "var(--surface-2)", border: "1px solid var(--line)",
                fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)",
                marginLeft: 4, flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{activeCountry.code.toUpperCase()}</span>
                <span>{activeCountry.name}</span>
                <Lock size={11} style={{ color: "var(--ink-3)" }} />
              </div>
            )
          ) : (
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 4, flexShrink: 0 }}>
              <select
                value={country ?? ""}
                onChange={e => setCountry(e.target.value || null)}
                style={{
                  appearance: "none",
                  padding: "4px 26px 4px 10px",
                  borderRadius: 99,
                  border: `1px solid ${country ? "var(--line)" : "var(--road)"}`,
                  background: country ? "var(--surface-2)" : "transparent",
                  color: country ? "var(--ink-2)" : "var(--road)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="">Select country</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", right: 8, pointerEvents: "none", color: country ? "var(--ink-3)" : "var(--road)" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          )}
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

        <div
          style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 40, paddingTop: empty ? 0 : 16 }}
          ref={messagesContainerRef}
        >
          {empty && (
            <>
              <Overview
                mode={mode}
                country={country}
                countries={COUNTRIES}
                onSelectCountry={(code) => setCountry(code || null)}
                onSuggest={(text) => handleSubmit(text)}
                onAttachImage={(file) => setImage(file)}
              />
            </>
          )}
          {messages.map((msg, i) => (
            <PreviewMessage
              key={i}
              message={msg}
              onRegenerate={
                msg.role === ChatMessageRoleType.ASSISTANT
                  ? () => handleRegenerate(i)
                  : undefined
              }
              isRegenerating={regeneratingIdx === i}
              onVersionChange={
                msg.role === ChatMessageRoleType.ASSISTANT
                  ? (vIdx) => handleVersionChange(i, vIdx)
                  : undefined
              }
              onFeedback={handleFeedback}
            />
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
            isLoading={isLoading || regeneratingIdx !== -1 || !country}
            image={image}
            setImage={setImage}
            placeholder={country ? MODES[mode].placeholder : "Select a country above to start chatting..."}
            emphasizeAttach={mode === "read"}
          />
        </div>
      </div>
    </div>
  );
}