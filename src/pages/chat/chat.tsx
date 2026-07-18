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
import { Header, LanguageToggle } from "@/components/custom/header";
import { Sidebar, ChatSession, HistoryMessage } from "@/components/custom/sidebar";
import { ThemeToggle } from "@/components/custom/theme-toggle";
import { ModeSwitch, ChatMode } from "@/components/custom/mode-switch";
import { v4 as uuidv4 } from "uuid";
import { PanelLeftIcon, LogOutIcon, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient, API_BASE, streamSSE, streamSSEForm } from "@/lib/apiClient";
import { toAuthenticatedBlobUrl } from "@/lib/imageCache";
import { toast } from "sonner";
// Generation state (messages/isLoading/streamingIdx/etc.) is kept here,
// keyed by chatId, instead of local useState — see chatRuntimeStore.ts for why.
import { getChatRuntime, setChatRuntime, clearChatRuntime, useChatRuntime, DRAFT_CHAT_KEY } from "@/lib/chatRuntimeStore";

// ── Countries ──────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "uae", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "qatar", name: "Qatar", flag: "🇶🇦" },
]

// ── Eager image window ───────────────────────────────────────────────────────
// Only the images belonging to the most recent EAGER_IMAGE_COUNT image-bearing
// messages start fetching immediately when a chat opens. Everything older is
// left for LazyImage to resolve on demand as the user scrolls up to it.
const EAGER_IMAGE_COUNT = 3;

function collectEagerImagePaths(session: ChatSession): Set<string> {
  const eager = new Set<string>();
  const msgs = session.messages;
  for (let i = msgs.length - 1; i >= 0 && eager.size < EAGER_IMAGE_COUNT; i--) {
    const m = msgs[i];
    if (m.image_url) eager.add(m.image_url);
    const signImgs = ((m as any).images ?? m.sign_images) as SignImage[] | undefined;
    if (signImgs?.length) {
      for (const img of signImgs) if (img.url) eager.add(img.url);
    }
  }
  return eager;
}

// ── Session → ChatMessageModel[] ──────────────────────────────────────────────
function sessionToMessages(session: ChatSession): ChatMessageModel[] {
  const eagerPaths = collectEagerImagePaths(session);
  const applyEager = (imgs?: SignImage[]): SignImage[] | undefined =>
    imgs?.map((img) => ({ ...img, eager: eagerPaths.has(img.url) }))

  return session.messages.flatMap((m: HistoryMessage) => {
    const rawVersions: ResponseVersion[] = (m as any).versions ?? []
    const baseVersions: ResponseVersion[] = rawVersions.length > 0
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
    // Backend versions carry raw sign_images with no `eager` flag — apply the
    // same eager window used for the top-level mirror so switching versions
    // doesn't force every one of that version's images to load immediately.
    const versions: ResponseVersion[] = baseVersions.map((v) => ({
      ...v,
      images: applyEager(v.images),
    }))

    return [
      {
        message: m.question,
        role: ChatMessageRoleType.USER,
        chat_id: session.chat_id,
        generation_type: m.image_url
          ? ChatMessageGenerationType.IMAGE_UNDERSTANDING
          : ChatMessageGenerationType.TEXT,
        ...(m.image_url
          ? { chat_uploaded_files: [{ remoteUrl: m.image_url, eager: eagerPaths.has(m.image_url) }] }
          : {}),
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
        images: applyEager((m as any).images ?? m.sign_images),
        token_data: (m as any).token_data ?? [],
        rag_sources: (m as any).rag_sources ?? [],
        follow_up_questions: (m as any).follow_up_questions ?? null,
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
  // NOTE: messages/isLoading/streamingIdx/elapsedSeconds/regeneratingIdx/country
  // used to be useState/useRef here. That made them effectively global, since
  // this component stays mounted across "/" <-> "/chat/:chatId" navigation —
  // whichever chat was on screen ended up sharing one bucket of generation
  // state with every other chat. They now live in the per-chatId runtime
  // store (chatRuntimeStore.ts) and are only *read* here via useChatRuntime.
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<File | null>(null);
  // Image attachment is only supported in "read" mode — drop any attached
  // image when switching away so it can't silently ride along with a
  // message submitted in another mode.
  useEffect(() => { if (mode !== "read") setImage(null); }, [mode]);

  const loadedChatIdRef = useRef<string | null>(null);

  const selectedChatId = urlChatId ?? null;
  // Which store slot this render should read/write. A chat that hasn't been
  // created yet (no id in the URL) shares the single "draft" slot; the first
  // submit mints a real chatId and hands off from draft -> chatId (see
  // handleSubmit) so it's never possible for two different chats to read the
  // same slot at once.
  const runtimeKey = selectedChatId ?? DRAFT_CHAT_KEY;
  const runtime = useChatRuntime(runtimeKey);
  const {
    messages,
    isLoading,
    elapsedSeconds,
    regeneratingIdx,
    country,
  } = runtime;

  // Convenience setters that always target *this render's* chat slot. Only
  // safe to use for UI-driven updates (e.g. the country dropdown, version
  // switcher) where "the chat currently on screen" is unambiguously correct.
  // Streaming callbacks below deliberately do NOT use these — they close
  // over the chatId captured when the request started instead, so they keep
  // targeting the right chat even if the user navigates away mid-stream.
  const setMessages = useCallback(
    (updater: ChatMessageModel[] | ((prev: ChatMessageModel[]) => ChatMessageModel[])) => {
      setChatRuntime(runtimeKey, (prev) => ({
        messages: typeof updater === "function" ? updater(prev.messages) : updater,
      }));
    },
    [runtimeKey]
  );
  const setCountry = useCallback(
    (code: string | null) => setChatRuntime(runtimeKey, { country: code }),
    [runtimeKey]
  );

  // Timer — mirrors elapsedSeconds into a ref so the interval callback (set
  // up once per generating chatId) always reads the freshest value without
  // needing to be in its own dependency array.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  useEffect(() => { elapsedRef.current = elapsedSeconds }, [elapsedSeconds]);

  // ── Timer lifecycle ───────────────────────────────────────────────────────
  // (moved) Previously this was a useEffect keyed on the page-level
  // `isLoading`, which is exactly the kind of "global" state that caused the
  // original leak — switching to another chat re-ran this effect against
  // whatever chat now happened to be mounted. The timer is now started and
  // stopped directly around the streaming calls in handleSubmit/
  // handleRegenerate, scoped to the chatId that request was made for. See
  // `startTimer`/`stopTimer` below.
  const startTimer = useCallback((chatId: string) => {
    setChatRuntime(chatId, { elapsedSeconds: 0 });
    elapsedRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      elapsedRef.current = +(elapsedRef.current + 0.1).toFixed(1);
      setChatRuntime(chatId, { elapsedSeconds: elapsedRef.current });
    }, 100);
  }, []);
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

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
      loadedChatIdRef.current = null;
      return;
    }
    if (loadedChatIdRef.current === urlChatId) return;

    // This chat is currently streaming (we navigated away and came back) —
    // its store slot already has the live messages/placeholder/timer, so
    // don't touch it. Refetching here would blow away the in-progress
    // response and reset isLoading, which is exactly the leak this store
    // exists to prevent.
    if (getChatRuntime(urlChatId).isLoading) {
      loadedChatIdRef.current = urlChatId;
      return;
    }

    // Reset country when switching to a different existing chat
    setChatRuntime(urlChatId, { country: null });

    (async () => {
      try {
        const data = await apiClient.get(`/chats/${urlChatId}`, token);
        if (data.success) {
          const session = data.data as ChatSession;
          // Render immediately with text — images resolve themselves lazily
          // (LazyImage), so opening a chat never blocks on image fetches.
          setChatRuntime(urlChatId, {
            messages: sessionToMessages(session),
            country: (data.data as any).country ?? null,
          });
          // Resync mode to this chat's stored mode so the selector never shows
          // a previous chat's mode. Old chats saved before mode tracking
          // existed fall back to "ask".
          setMode(((data.data as any).mode as ChatMode) || "ask");
          loadedChatIdRef.current = urlChatId;
        }
      } catch {
        setChatRuntime(urlChatId, { messages: [] });
        loadedChatIdRef.current = null;
        navigate("/", { replace: true });
      }
    })();
  }, [urlChatId, token, navigate]);

  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (!country || !token || messages.length > 0) return;   // only on the empty/new-chat screen
    setSuggestionsLoading(true);
    apiClient.get(`/suggested-questions?country=${country}`, token)
      .then(data => setSuggestedQuestions(data?.data?.questions ?? []))
      .catch(() => setSuggestedQuestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [country, token, messages.length]);

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
    // Reset only the draft slot. Do NOT touch the chat being left — it may
    // still be generating a response in the background, and this used to
    // call setMessages([])/setCountry(null) against whatever chat happened
    // to be mounted, which (now that state is chat-scoped) would have wiped
    // that chat's real messages instead of just clearing the screen.
    clearChatRuntime(DRAFT_CHAT_KEY);
    setQuestion("");
    setImage(null);
    // setSidebarOpen(false);
    navigate("/");
  }

  function handleSelectChat(session: ChatSession) {
    // setSidebarOpen(false);
    loadedChatIdRef.current = null;
    if (session.mode) setMode(session.mode);
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
    clearChatRuntime(chatId);
    if (selectedChatId === chatId) {
      loadedChatIdRef.current = null;
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
        images: ver.images ?? [],
      }
      return updated
    })
  }

  // ── Shared image resolution helpers (used by both send and regenerate) ───
  async function resolveImages(imgs: SignImage[] | undefined): Promise<SignImage[]> {
    if (!imgs?.length) return [];
    return Promise.all(imgs.map(async (img) => ({
      ...img,
      resolvedUrl: await toAuthenticatedBlobUrl(img.url, token!),
    })));
  }

  // Fetches suggested follow-up questions for a just-completed "Ask Salama"
  // response and attaches them to that message once ready. Non-blocking and
  // fails silently, matching the backend endpoint's own contract — the
  // message has already finished rendering by the time this resolves.
  // Takes an explicit chatId (rather than using the render-scoped
  // setMessages) because this can resolve well after the user has navigated
  // to a different chat — it must keep targeting the chat the question was
  // actually asked in.
  function fetchFollowUpQuestions(chatId: string, question: string, messageId: string | undefined) {
    if (!token || !messageId) return
    apiClient.post("/follow-up-questions", { question, country: country ?? "qatar", message_id: messageId }, token)
      .then((res) => {
        const questions: string[] = res?.data?.questions ?? []
        if (!questions.length) return
        setChatRuntime(chatId, (prevRuntime) => {
          const prev = prevRuntime.messages
          const idx = prev.findIndex((m) => m.message_id === messageId)
          if (idx === -1) return {}
          const updated = [...prev]
          updated[idx] = { ...updated[idx], follow_up_questions: questions }
          return { messages: updated }
        })
      })
      .catch(() => { })
  }

  // Recovers the original uploaded sign photo as a re-uploadable Blob, from
  // either the in-session object URL or (after a reload) the authenticated
  // remote path — needed to regenerate an "Identify the Sign" response.
  async function getOriginalSignImageBlob(userMsg: ChatMessageModel, authToken: string): Promise<Blob | null> {
    const file = userMsg.chat_uploaded_files?.[0];
    if (!file) return null;
    try {
      const objectUrl = file.objectUrl ?? (file.remoteUrl ? await toAuthenticatedBlobUrl(file.remoteUrl, authToken) : undefined);
      if (!objectUrl) return null;
      const res = await fetch(objectUrl);
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  }

  // ── Regenerate ────────────────────────────────────────────────────────────
  // A chat's mode is fixed for its whole lifetime (switching modes starts a
  // new chat — see ModeSwitch's onMode handler), so the current `mode` state
  // always matches the mode every message in `messages` was generated under.
  // Regenerate must therefore replay that same mode's flow/endpoint, not
  // always the "Ask Salama" one.
  async function handleRegenerate(msgIdx: number) {
    const assistantMsg = messages[msgIdx]
    if (!assistantMsg || assistantMsg.role !== ChatMessageRoleType.ASSISTANT) return

    const userMsg = messages.slice(0, msgIdx)
      .reverse()
      .find((m) => m.role === ChatMessageRoleType.USER)
    if (!userMsg) return

    const chatId = selectedChatId ?? assistantMsg.chat_id
    const messageId = assistantMsg.message_id

    // Guard against double-firing for *this* chat specifically — regenerating
    // in one chat must not block sending/regenerating in another.
    if (getChatRuntime(chatId).isLoading || getChatRuntime(chatId).regeneratingIdx !== -1 || !token) return

    const userMsgIdx = messages.slice(0, msgIdx).map((m) => m.role).lastIndexOf(ChatMessageRoleType.USER)
    const contextForApi = messages
      .slice(0, userMsgIdx)
      .map((m) => ({
        role: m.role === ChatMessageRoleType.USER ? "user" : "assistant",
        content: m.message,
      }))

    // Shared version bookkeeping — every mode below appends its result as a
    // new version of this same message row, so the version switcher/UI
    // behaves identically regardless of which flow produced it.
    // These all write via setChatRuntime(chatId, ...) rather than the
    // render-scoped setMessages — chatId is captured above once and reused
    // for every callback here, so this regenerate keeps updating the right
    // chat even if the user navigates elsewhere before it finishes.
    const applyStreamingText = (text: string) => {
      setChatRuntime(chatId, (prevRuntime) => {
        const prev = prevRuntime.messages
        const updated = [...prev]
        const msg = updated[msgIdx]
        const existingVersions = msg.versions ?? []
        const isPlaceholder =
          existingVersions.length > 0 &&
          (existingVersions[existingVersions.length - 1] as any)._streaming

        const streamingVersion: ResponseVersion & { _streaming?: boolean } = {
          version_num: (existingVersions[existingVersions.length - 1]?.version_num ?? 0) + (isPlaceholder ? 0 : 1),
          message: text,
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
          message: text,
        }
        return { messages: updated }
      })
    }

    const applyImages = (imgs: SignImage[]) => {
      setChatRuntime(chatId, (prevRuntime) => {
        const updated = [...prevRuntime.messages]
        updated[msgIdx] = { ...updated[msgIdx], images: imgs }
        return { messages: updated }
      })
    }

    const finalizeVersion = (
      version: Omit<ResponseVersion, "version_num"> & { version_num?: number },
      extra: Partial<ChatMessageModel> = {}
    ) => {
      setChatRuntime(chatId, (prevRuntime) => {
        const updated = [...prevRuntime.messages]
        const msg = updated[msgIdx]
        const cleanVersions = (msg.versions ?? []).filter((v) => !(v as any)._streaming)
        const newVersion: ResponseVersion = {
          ...version,
          version_num: version.version_num ?? (cleanVersions[cleanVersions.length - 1]?.version_num ?? 0) + 1,
        }
        const finalVersions = [...cleanVersions, newVersion]

        updated[msgIdx] = {
          ...msg,
          ...extra,
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
        return { messages: updated, regeneratingIdx: -1 }
      })
    }

    const revertOnFailure = () => {
      setChatRuntime(chatId, (prevRuntime) => {
        const updated = [...prevRuntime.messages]
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
        return { messages: updated, regeneratingIdx: -1 }
      })
    }

    setChatRuntime(chatId, { regeneratingIdx: msgIdx })

    try {
      if (mode === "read") {
  if (!messageId) {
    console.warn("No message_id on assistant message — cannot regenerate via versioned endpoint")
    setChatRuntime(chatId, { regeneratingIdx: -1 })
    return
  }
  const imageBlob = await getOriginalSignImageBlob(userMsg, token)
  if (!imageBlob) {
    toast.error("Original sign photo is unavailable — can't regenerate.")
    setChatRuntime(chatId, { regeneratingIdx: -1 })
    return
  }

  const form = new FormData()
  form.append("image", imageBlob, "sign.jpg")
  form.append("country", country ?? "qatar")
  if (userMsg.message?.trim()) form.append("question", userMsg.message)

  let streamText = ""
  for await (const event of streamSSEForm(
    `/chats/${chatId}/messages/${messageId}/regenerate-identify-sign/stream`,
    form,
    token
  )) {
    if (event.type === "token") {
      streamText += (event.content as string) ?? ""
      applyStreamingText(streamText)

    } else if (event.type === "done") {
      const resolvedImages = await resolveImages((event.sign_images as SignImage[]) ?? [])
      finalizeVersion({
        version_num: event.version_num as number | undefined,
        message: (event.message as string) ?? streamText,
        token_data: (event.token_data as TokenData[]) ?? [],
        total_reliability: event.total_reliability as number | undefined,
        total_entropy: event.total_entropy as number | undefined,
        total_collision_entropy: event.total_collision_entropy as number | undefined,
        total_reliability_with_hidden_layers: event.total_reliability_with_hidden_layers as number | undefined,
        total_glu: (event.total_glu as number) ?? 0,
        total_logtoku: (event.total_logtoku as number) ?? 0,
        generation_time_seconds: event.generation_time_seconds as number | undefined,
        images: resolvedImages,
      }, { images: resolvedImages })

    } else if (event.type === "error") {
      throw new Error((event.content as string) ?? "Sign identification failed")
    }
  }

} else if (mode === "name") {
  if (!messageId) {
    console.warn("No message_id on assistant message — cannot regenerate via versioned endpoint")
    setChatRuntime(chatId, { regeneratingIdx: -1 })
    return
  }
  let streamText = ""
  let resolvedImages: SignImage[] = []

  for await (const event of streamSSE(
    `/chats/${chatId}/messages/${messageId}/regenerate-find-sign/stream`,
    { question: userMsg.message, country: country ?? "qatar" },
    token
  )) {
    if (event.type === "matches") {
      resolvedImages = await resolveImages((event.sign_images as SignImage[]) ?? [])
      applyImages(resolvedImages)

    } else if (event.type === "token") {
      streamText += (event.content as string) ?? ""
      applyStreamingText(streamText)

    } else if (event.type === "done") {
      finalizeVersion({
        version_num: event.version_num as number | undefined,
        message: (event.message as string) ?? streamText,
        token_data: (event.token_data as TokenData[]) ?? [],
        total_reliability: event.total_reliability as number | undefined,
        total_entropy: event.total_entropy as number | undefined,
        total_collision_entropy: event.total_collision_entropy as number | undefined,
        total_reliability_with_hidden_layers: event.total_reliability_with_hidden_layers as number | undefined,
        total_glu: (event.total_glu as number) ?? 0,
        total_logtoku: (event.total_logtoku as number) ?? 0,
        generation_time_seconds: event.generation_time_seconds as number | undefined,
        images: resolvedImages,
      }, { images: resolvedImages })

    } else if (event.type === "error") {
      throw new Error((event.content as string) ?? "Sign search failed")
    }
  }

      } else {
        // ── Ask Salama → existing versioned regenerate endpoint (unchanged) ──
        if (!messageId) {
          console.warn("No message_id on assistant message — cannot regenerate via versioned endpoint")
          setChatRuntime(chatId, { regeneratingIdx: -1 })
          return
        }

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
        let streamingText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            setChatRuntime(chatId, { regeneratingIdx: -1 })
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
              applyStreamingText(streamingText)

            } else if (event.type === "done") {
              finalizeVersion({
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
              })
              fetchFollowUpQuestions(chatId, userMsg.message, messageId)
              streamingText = ""

            } else if (event.type === "error") {
              revertOnFailure()
              streamingText = ""
            }
          }
        }
      }
    } catch (err) {
      console.error("Regenerate error:", err)
      revertOnFailure()
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSubmit(text?: string) {
    const chatId = selectedChatId ?? uuidv4();
    const isNewChat = !selectedChatId;
    // A not-yet-created chat doesn't have its own store slot yet, so guard
    // against double-submits using the shared draft slot instead; an
    // existing chat guards against its own slot only — never the whole app.
    const guardKey = isNewChat ? DRAFT_CHAT_KEY : chatId;
    if (getChatRuntime(guardKey).isLoading || getChatRuntime(guardKey).submitting || !token) return;

    const messageText = text ?? question;

    if (mode === "read") {
      if (!image) { toast.error("Attach a sign photo to identify it."); return; }
    } else if (mode === "name") {
      if (!messageText.trim()) { toast.error("Describe the sign you're looking for."); return; }
    } else {
      if (!messageText.trim() && !image) return;
    }

    setChatRuntime(guardKey, { submitting: true });

    if (isNewChat) {
      // Hand off from the shared draft slot to this chat's own slot (carry
      // the country picked on the empty screen forward) before navigating,
      // so the draft is immediately free for whatever "New Chat" opens next
      // and this chat's generation state can never be confused with it.
      setChatRuntime(chatId, { country });
      clearChatRuntime(DRAFT_CHAT_KEY);
      loadedChatIdRef.current = chatId;
      navigate(`/chat/${chatId}`, { replace: true });
    }

    startTimer(chatId);
    setChatRuntime(chatId, { isLoading: true, submitting: true, streamingIdx: -1 });

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

    setChatRuntime(chatId, (prev) => ({
      messages: [...prev.messages, userMessage, placeholder],
      streamingIdx: messages.length + 1,
    }));

    setQuestion("");
    const capturedImage = image;
    setImage(null);

    const contextForApi = [...messages, userMessage].map((msg) => ({
      role: msg.role === ChatMessageRoleType.USER ? "user" : "assistant",
      content: msg.message,
    }));

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
        // ── Read the sign → identify-sign, streamed (SigLIP/GPT-4.1-mini match
        // + local-LLM grounded explanation streamed token-by-token) ──────────
        const form = new FormData();
        form.append("image", capturedImage);
        form.append("country", country ?? "qatar");
        if (messageText.trim()) form.append("question", messageText);

        let streamText = "";
        let resolvedSignImages: SignImage[] = [];

        for await (const event of streamSSEForm(
          `/chats/${chatId}/identify-sign`,
          form,
          token
        )) {
          if (event.type === "sign_image") {
            resolvedSignImages = await resolveImages([event.sign_image as SignImage]);
            setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
              const idx = prevRuntime.streamingIdx;
              if (idx < 0 || idx >= prev.length) return {};
              const updated = [...prev];
              updated[idx] = { ...updated[idx], images: resolvedSignImages };
              return { messages: updated };
            });

          } else if (event.type === "token") {
            streamText += (event.content as string) ?? "";
            streamingAdded = true;
            setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
              const idx = prevRuntime.streamingIdx;
              if (idx < 0 || idx >= prev.length) return {};
              const updated = [...prev];
              updated[idx] = { ...updated[idx], message: streamText };
              return { messages: updated };
            });

          } else if (event.type === "done") {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            const finalElapsed = elapsedRef.current;

            const currentImages = resolvedSignImages.length
              ? resolvedSignImages
              : await resolveImages((event.sign_images as SignImage[]) ?? []);

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
              images: currentImages,
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
              generation_time_seconds: v1.generation_time_seconds ?? undefined,
              is_streaming: false,
              versions: [v1],
              activeVersionIdx: 0,
              images: currentImages,
            };

            flushSync(() => {
              setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
                const idx = prevRuntime.streamingIdx;
                if (idx >= 0 && idx < prev.length) {
                  const updated = [...prev];
                  updated[idx] = doneMsg;
                  return { messages: updated };
                }
                streamingAdded = true;
                return { messages: [...prev, doneMsg] };
              });
            });

            pushToSidebar(doneMsg);
            stopTimer();
            setChatRuntime(chatId, { isLoading: false, submitting: false, streamingIdx: -1 });
            if (isNewChat && country) {
              apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => { });
            }
            if (isNewChat) {
              apiClient.patch(`/chats/${chatId}/mode`, { mode }, token).catch(() => { });
            }

            break;

          } else if (event.type === "error") {
            setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
              const idx = prevRuntime.streamingIdx;
              if (idx < 0 || idx >= prev.length) return {};
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                message: "Sorry, there was an error. Please try again.",
                is_streaming: false,
              };
              return { messages: updated };
            });
            stopTimer();
            setChatRuntime(chatId, { isLoading: false, submitting: false, streamingIdx: -1 });
            throw new Error((event.content as string) ?? "Sign identification failed");
          }
        }

      } else if (mode === "name") {
        // ── Name the sign → find-sign, streamed (combined name+description
        // search + local-LLM decision + local-LLM grounded explanation) ────
        let streamText = "";
        let resolvedSignImages: SignImage[] = [];

        for await (const event of streamSSE(
          `/chats/${chatId}/find-sign`,
          { question: messageText, country: country ?? "qatar", context: contextForApi },
          token
        )) {
          if (event.type === "matches") {
            resolvedSignImages = await resolveImages((event.sign_images as SignImage[]) ?? []);
            setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
              const idx = prevRuntime.streamingIdx;
              if (idx < 0 || idx >= prev.length) return {};
              const updated = [...prev];
              updated[idx] = { ...updated[idx], images: resolvedSignImages };
              return { messages: updated };
            });

          } else if (event.type === "token") {
            streamText += (event.content as string) ?? "";
            streamingAdded = true;
            setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
              const idx = prevRuntime.streamingIdx;
              if (idx < 0 || idx >= prev.length) return {};
              const updated = [...prev];
              updated[idx] = { ...updated[idx], message: streamText };
              return { messages: updated };
            });

          } else if (event.type === "done") {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            const finalElapsed = elapsedRef.current;

            const currentImages = resolvedSignImages.length
              ? resolvedSignImages
              : await resolveImages((event.sign_images as SignImage[]) ?? []);

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
              images: currentImages,
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
              generation_time_seconds: v1.generation_time_seconds ?? undefined,
              is_streaming: false,
              versions: [v1],
              activeVersionIdx: 0,
              images: currentImages,
            };

            flushSync(() => {
              setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
                const idx = prevRuntime.streamingIdx;
                if (idx >= 0 && idx < prev.length) {
                  const updated = [...prev];
                  updated[idx] = doneMsg;
                  return { messages: updated };
                }
                streamingAdded = true;
                return { messages: [...prev, doneMsg] };
              });
            });

            pushToSidebar(doneMsg);
            stopTimer();
            setChatRuntime(chatId, { isLoading: false, submitting: false, streamingIdx: -1 });
            if (isNewChat && country) {
              apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => { });
            }
            break;

          } else if (event.type === "error") {
            setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
              const idx = prevRuntime.streamingIdx;
              if (idx < 0 || idx >= prev.length) return {};
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                message: "Sorry, there was an error. Please try again.",
                is_streaming: false,
              };
              return { messages: updated };
            });
            stopTimer();
            setChatRuntime(chatId, { isLoading: false, submitting: false, streamingIdx: -1 });
            throw new Error((event.content as string) ?? "Sign search failed");
          }
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
        setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
          const idx = prevRuntime.streamingIdx;
          if (idx >= 0 && idx < prev.length) {
            const updated = [...prev];
            updated[idx] = { ...assistantData, versions: [v1], activeVersionIdx: 0, is_streaming: false };
            return { messages: updated };
          }
          return { messages: [...prev, { ...assistantData, versions: [v1], activeVersionIdx: 0 }] };
        });
        pushToSidebar(assistantData);
        if (isNewChat && country) {
          apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => { })
        }
        if (isNewChat) {
          apiClient.patch(`/chats/${chatId}/mode`, { mode }, token).catch(() => { })
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
          console.log("SSE event:", event.type, event);
          if (event.type === "token") {
            streamText += (event.content as string) ?? "";

            if (!seenFirst) {
              seenFirst = true;
              streamingAdded = true;
              // First token: update the placeholder in-place via streamingIdxRef
              setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
                const idx = prevRuntime.streamingIdx;
                if (idx < 0 || idx >= prev.length) return {};
                const updated = [...prev];
                updated[idx] = { ...updated[idx], message: streamText };
                return { messages: updated };
              });
            } else {
              setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
                const idx = prevRuntime.streamingIdx;
                if (idx < 0 || idx >= prev.length) return {};
                const updated = [...prev];
                updated[idx] = { ...updated[idx], message: streamText };
                return { messages: updated };
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
              generation_time_seconds: v1.generation_time_seconds ?? undefined,
              rag_sources: (event.rag_sources as any[]) ?? [],
              is_streaming: false,
              versions: [v1],
              activeVersionIdx: 0,
              images: [],
            };

            flushSync(() => {
              setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
                const idx = prevRuntime.streamingIdx;
                if (idx >= 0 && idx < prev.length && (prev[idx] as any).is_streaming) {
                  const updated = [...prev];
                  updated[idx] = doneMsg;
                  return { messages: updated };
                }
                // streamingIdxRef was stale (e.g. a fast response raced a
                // concurrent messages update) — find the live placeholder by
                // its flag instead of blindly appending a second bubble.
                const placeholderIdx = prev.findIndex((m) => (m as any).is_streaming);
                if (placeholderIdx !== -1) {
                  const updated = [...prev];
                  updated[placeholderIdx] = doneMsg;
                  return { messages: updated };
                }
                // Genuine edge case: done fired before any placeholder existed.
                streamingAdded = true;
                return { messages: [...prev, doneMsg], isLoading: false, submitting: false };
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
            stopTimer();
            setChatRuntime(chatId, { isLoading: false, submitting: false, streamingIdx: -1 });
            fetchFollowUpQuestions(chatId, messageText, doneMsg.message_id);
            if (isNewChat && country) {
              apiClient.patch(`/chats/${chatId}/country`, { country }, token).catch(() => { })
            }
            if (isNewChat) {
              apiClient.patch(`/chats/${chatId}/mode`, { mode }, token).catch(() => { })
            }
            break;

          } else if (event.type === "error") {
            setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
              const idx = prevRuntime.streamingIdx;
              if (idx < 0 || idx >= prev.length) return {};
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                message: "Sorry, there was an error. Please try again.",
                is_streaming: false,
              };
              return { messages: updated };
            });
            stopTimer();
            setChatRuntime(chatId, { isLoading: false, submitting: false, streamingIdx: -1 });
            throw new Error((event.content as string) ?? "Generation failed");
          }
        }
      }

    } catch (err) {
      console.error("Stream/API error:", err);

      setChatRuntime(chatId, (prevRuntime) => {
              const prev = prevRuntime.messages;
        const idx = prevRuntime.streamingIdx;

        // If we have a streaming placeholder in-place, overwrite it
        if (idx >= 0 && idx < prev.length) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            message: "Sorry, there was an error processing your request. Please try again.",
            is_streaming: false,
          };
          return { messages: updated };
        }

        // Otherwise remove any partially-added streaming message and append error
        const base = streamingAdded ? prev.slice(0, -1) : prev;
        return {
          messages: [
            ...base,
            {
              message: "Sorry, there was an error processing your request. Please try again.",
              role: ChatMessageRoleType.ASSISTANT,
              chat_id: chatId ?? urlChatId ?? "",
              generation_type: ChatMessageGenerationType.TEXT,
            } as ChatMessageModel,
          ],
        };
      });
    } finally {
      stopTimer();
      setChatRuntime(chatId, { isLoading: false, submitting: false, streamingIdx: -1 });
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

  const { t } = useLanguage();

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
            aria-label={"Toggle sidebar"}
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
                <option value="">{t.modal.select_country_option}</option>
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
          <LanguageToggle />

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
                suggestedQuestions={suggestedQuestions}
                suggestionsLoading={suggestionsLoading}
              />
            </>
          )}
          {messages.map((msg, i) => (
            <PreviewMessage
              // Keyed by chat_id + index rather than just index: switching to
              // a different chat must force a full remount of every message
              // (and its nested images) instead of reusing component
              // instances at the same list position — otherwise a stale
              // image from the previous chat can briefly render in the new
              // one. Stable within a single chat across streaming updates.
              key={`${msg.chat_id ?? "new"}-${i}`}
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
              onFollowUp={(q) => handleSubmit(q)}
              isLatestMessage={i === messages.length - 1}
            />
          ))}
          {showThinking && <ThinkingMessage elapsedSeconds={elapsedSeconds} />}
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
            placeholder={
              !country
                ? t.common.select_country_above
                : mode === "ask"
                  ? t.chat.placeholder_ask_in.replace('{country}', activeCountry?.name ?? t.common.your_country)
                  : (t.mode as any)[mode].placeholder
            }
            emphasizeAttach={mode === "read"}
            allowImage={mode === "read"}
          />
        </div>
      </div>
    </div>
  );
}