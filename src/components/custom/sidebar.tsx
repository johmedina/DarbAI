import { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Button } from "@/components/ui/button";
import { PlusIcon, MessageSquareIcon, ChevronLeftIcon, Trash2Icon, PencilIcon, CheckIcon, XIcon, MoreHorizontalIcon } from "lucide-react";
import { SignImage } from "../../interfaces/interfaces";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/images/logo.png";
import logoWhite from "@/assets/images/logo-white.png";
import { useTheme } from "@/context/ThemeContext";
// import { ChatMode, MODES, MODE_ORDER } from "./mode-switch";
import { ChatMode, MODE_ORDER, getModes } from "./mode-switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ResponseVersion } from "../../interfaces/interfaces"
import { useLanguage } from "@/context/LanguageContext";

export interface HistoryMessage {
  question: string;
  response: string;
  timestamp: string;
  image_url?: string | null;
  generation_time_seconds?: number | null;
  total_reliability?: number;
  total_entropy?: number;
  total_collision_entropy?: number;
  total_reliability_with_hidden_layers?: number;
  images?: SignImage[];
  sign_images?: SignImage[];
  total_glu?: number;
  total_logtoku?: number;
  token_data?: any[];
  message_id?: string;
  versions?: ResponseVersion[];

}

export interface ChatSession {
  chat_id: string;
  title: string;
  mode?: ChatMode;
  last_updated: string;
  messages: HistoryMessage[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  selectedChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, newTitle: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  isLoading?: boolean;
  mode: ChatMode;
  onMode: (id: ChatMode) => void;
}

// function groupByTime(chats: ChatSession[]) {
//   const now = Date.now();
//   const { t } = useLanguage();
//   const today = t.sidebar.today;
//   const yesterday = t.sidebar.yesterday;
//   const last_week = t.sidebar.last_week;
//   const older = t.sidebar.older;
//   const buckets: Record<string, ChatSession[]> = {
//     today: [], yesterday: [], last_week: [], older: [],
//   };
//   for (const c of chats) {
//     const d = Math.floor((now - new Date(c.last_updated).getTime()) / 86400000);
//     if (d < 1) buckets.today.push(c);
//     else if (d < 2) buckets.yesterday.push(c);
//     else if (d < 7) buckets.last_week.push(c);
//     else buckets.older.push(c);
//   }
//   return Object.entries(buckets).filter(([, v]) => v.length > 0);
// }

function groupByTime(chats: ChatSession[]) {
  const now = Date.now();
  const { t } = useLanguage();

  const labels = {
    today: t.sidebar.today,
    yesterday: t.sidebar.yesterday,
    lastWeek: t.sidebar.last_week,
    older: t.sidebar.older,
  };

  const buckets: Record<string, ChatSession[]> = {
    [labels.today]: [],
    [labels.yesterday]: [],
    [labels.lastWeek]: [],
    [labels.older]: [],
  };

  for (const c of chats) {
    const days = Math.floor(
      (now - new Date(c.last_updated).getTime()) / 86_400_000
    );

    if (days < 1) buckets[labels.today].push(c);
    else if (days < 2) buckets[labels.yesterday].push(c);
    else if (days < 7) buckets[labels.lastWeek].push(c);
    else buckets[labels.older].push(c);
  }

  return Object.entries(buckets).filter(([, chats]) => chats.length > 0);
}

// ── Delete confirmation ─────────────────────────────────────────────────────────
function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(26,24,19,.4)", padding: "1rem",
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div style={{
        width: "100%", maxWidth: 360, borderRadius: 14,
        border: "1px solid var(--line)", background: "var(--surface)",
        padding: "22px 24px", boxShadow: "var(--shadow-lg)",
      }}>
        <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Delete this chat?</p>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 20 }}>
          This permanently deletes all messages and cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              height: 36, padding: "0 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 500,
              background: "transparent", border: "1px solid var(--line-2)", color: "var(--ink-2)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 36, padding: "0 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600,
              background: "var(--caution)", border: "none", color: "#fff", cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Dropdown ────────────────────────────────────────────────────────────────────
function DropdownMenu({ anchorRect, onRename, onDelete, onClose }: {
  anchorRect: DOMRect;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const { t } = useLanguage();

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    let active = false;
    const timerId = setTimeout(() => { active = true; }, 50);

    function handlePointerDown(e: PointerEvent) {
      if (!active) return;
      if (!ref.current?.contains(e.target as Node)) onCloseRef.current();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    function handleResize() { onCloseRef.current(); }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return ReactDOM.createPortal(
    <div
      ref={ref}
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        minWidth: 160,
        zIndex: 99999,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        boxShadow: "var(--shadow-md)",
        padding: 4,
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onClose(); onRename(); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 9,
          padding: "8px 10px", borderRadius: 7, fontSize: 13.5, fontWeight: 500,
          color: "var(--ink)", background: "transparent", cursor: "pointer", textAlign: "start",
          border: "none", transition: "background .12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <PencilIcon size={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} /> {t.sidebar.rename}
      </button>
      <button
        onClick={e => { e.stopPropagation(); onClose(); onDelete(); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 9,
          padding: "8px 10px", borderRadius: 7, fontSize: 13.5, fontWeight: 500,
          color: "var(--caution)", background: "transparent", cursor: "pointer", textAlign: "start",
          border: "none", transition: "background .12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <Trash2Icon size={14} style={{ flexShrink: 0 }} /> {t.sidebar.delete}
      </button>
    </div>,
    document.body
  );
}

// ── Chat row ────────────────────────────────────────────────────────────────────
function ChatRow({ chat, isSelected, onSelect, onRename, onDelete }: {
  chat: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (t: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [hovered, setHovered] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dotRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraftTitle(chat.title); }, [chat.title]);

  const closeMenu = useCallback(() => { setMenuOpen(false); setAnchorRect(null); }, []);

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (menuOpen) { closeMenu(); return; }
    setAnchorRect(dotRef.current?.getBoundingClientRect() ?? null);
    setMenuOpen(true);
  }

  function cancelEdit(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setDraftTitle(chat.title);
    setEditing(false);
  }

  async function submitRename(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    const t = draftTitle.trim();
    if (!t || t === chat.title) { cancelEdit(); return; }
    setBusy(true);
    try { await onRename(t); } finally { setBusy(false); setEditing(false); }
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {menuOpen && anchorRect && (
        <DropdownMenu
          anchorRect={anchorRect}
          onRename={() => { closeMenu(); setEditing(true); }}
          onDelete={() => { closeMenu(); setConfirmDelete(true); }}
          onClose={closeMenu}
        />
      )}

      <div
        onClick={() => { if (!editing) onSelect(); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`histrow${isSelected ? " selected" : ""}${menuOpen ? " menu-open" : ""}`}
        style={{
          position: "relative", display: "flex", alignItems: "center",
          cursor: "pointer", userSelect: "none",
          background: hovered || isSelected ? "var(--surface-2)" : undefined,
        }}
      >
        <div
          style={{
            flex: 1, minWidth: 0, padding: "9px 10px",
            display: editing ? "none" : "flex", flexDirection: "column",
          }}
        >
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {chat.title || "Untitled chat"}
          </p>
        </div>

        {editing && (
          <div
            style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 4, padding: "2px 4px" }}
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") cancelEdit(e); }}
              disabled={busy}
              style={{
                flex: 1, minWidth: 0, padding: "7px 8px", borderRadius: 8,
                border: "1px solid var(--ink)", background: "var(--bg)",
                fontSize: 13.5, outline: "none", color: "var(--ink)",
                boxShadow: "0 0 0 3px rgba(26,24,19,.06)",
              }}
            />
            <button onClick={submitRename} disabled={busy} style={{ color: "var(--reliable)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <CheckIcon size={14} />
            </button>
            <button onClick={cancelEdit} style={{ color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <XIcon size={14} />
            </button>
          </div>
        )}

        {!editing && (
          <button
            ref={dotRef}
            title="More options"
            onClick={openMenu}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginRight: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--ink-2)", background: "transparent", border: "none", cursor: "pointer",
              opacity: hovered || menuOpen || isSelected ? 1 : 0,
              pointerEvents: hovered || menuOpen || isSelected ? "auto" : "none",
              transition: "opacity .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <MoreHorizontalIcon size={15} />
          </button>
        )}
      </div>
    </>
  );
}

// ── Sidebar shell ───────────────────────────────────────────────────────────────
export function Sidebar({
  isOpen, onClose, chats, selectedChatId,
  onSelectChat, onNewChat, onRenameChat, onDeleteChat, isLoading = false,
  mode, onMode,
}: SidebarProps) {
  const { user } = useAuth();
  const groups = groupByTime(chats);

  const initial = user?.username?.charAt(0).toUpperCase() ?? "?";
  const emailDomain = user?.email ? user.email.split("@")[1] ?? user.email : "";

  const { t, dir } = useLanguage();
  const { isDarkMode } = useTheme();
  const MODES = getModes(t);

  return (
    <>
      {/* Backdrop */}
      {/* <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 30,
          background: "rgba(26,24,19,.35)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity .25s",
        }}
      /> */}

      {/* Drawer */}
      {/* <aside style={{
        position: "fixed", inset: "0 auto 0 0", zIndex: 40, width: 270,
        background: "var(--surface)", borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
        transform: isOpen ? "none" : "translateX(-100%)",
        transition: "transform .3s cubic-bezier(.2,.8,.2,1)",
      }}> */}

      <aside
        style={{
          width: isOpen ? 270 : 0,
          minWidth: isOpen ? 270 : 0,
          flexShrink: 0,
          overflow: "hidden",
          background: "var(--surface)",
          borderRight: isOpen ? "1px solid var(--line)" : "1px solid transparent",
          transition: "width .28s cubic-bezier(.2,.8,.2,1), border-color .28s",
        }}
      >
        <div
          style={{
            width: 270,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            opacity: isOpen ? 1 : 0,
            transition: "opacity .18s ease",
          }}
        >

          {/* Header */}
          <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <img src={isDarkMode ? logoWhite : logo} alt="Salama" className="brand-logo" style={{ height: 22, width: "auto" }} />
            <button
              onClick={onClose}
              aria-label="Collapse sidebar"
              style={{
                width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink-2)", border: "1px solid transparent", background: "transparent", cursor: "pointer",
                transition: "background .15s, border-color .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <ChevronLeftIcon size={18} style={{ transform: dir === "rtl" ? "scaleX(-1)" : "none" }} />
            </button>
          </div>

          {/* New chat button */}
          <div style={{ padding: "0 12px 12px", flexShrink: 0 }}>
            <button
              onClick={onNewChat}
              style={{
                width: "100%", height: 42, borderRadius: 11,
                background: "var(--ink)", color: "var(--bg)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
                transition: "transform .12s",
              }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(.98)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = "none"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
            >
              <PlusIcon size={17} /> {t.sidebar.new_chat}
            </button>
          </div>

          {/* Modes */}
          <div style={{ padding: "0 12px 14px", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", padding: "2px 10px 8px" }}>
              {t.sidebar.modes}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {MODE_ORDER.map(id => {
                const { Icon, label, sub } = MODES[id];
                const active = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => onMode(id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 11, padding: "9px 10px",
                      borderRadius: 10, textAlign: "start", border: "none", cursor: "pointer",
                      background: active ? "var(--surface-2)" : "transparent",
                      outline: active ? "1px solid var(--line-2)" : "1px solid transparent",
                      transition: "background .12s",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface-2)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: active ? "var(--ink)" : "var(--surface)",
                      color: active ? "var(--road)" : "var(--ink-2)",
                      border: active ? "none" : "1px solid var(--line)",
                    }}>
                      <Icon size={16} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)" }}>{sub}</span>
                    </span>
                    {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--road)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* History list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px", minHeight: 0 }}>
            {isLoading ? (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ height: 36, borderRadius: 9, background: "var(--surface-2)", opacity: 1 - i * 0.15, animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", padding: "0 16px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.7L3 21l1.8-5.3A8.5 8.5 0 1 1 21 11.5z" /></svg>
                </div>
                <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No conversations yet. Start chatting!</p>
              </div>
            ) : (
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
                {groups.map(([label, groupChats]) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", padding: "6px 10px" }}>
                      {label}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {groupChats.map(chat => (
                        <ChatRow
                          key={chat.chat_id}
                          chat={chat}
                          isSelected={selectedChatId === chat.chat_id}
                          onSelect={() => onSelectChat(chat)}
                          onRename={title => onRenameChat(chat.chat_id, title)}
                          onDelete={() => onDeleteChat(chat.chat_id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User footer */}
          {user && (
            <div style={{
              borderTop: "1px solid var(--line)", padding: "12px",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: "var(--road)", color: "#1A1813",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 14,
              }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.username}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {emailDomain}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
