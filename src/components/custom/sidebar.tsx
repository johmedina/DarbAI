import { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Button } from "@/components/ui/button";
import {
  PlusIcon, MessageSquareIcon, ChevronLeftIcon,
  Trash2Icon, PencilIcon, CheckIcon, XIcon, MoreHorizontalIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
}

export interface ChatSession {
  chat_id: string;
  title: string;
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
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return ""; }
}

function groupByTime(chats: ChatSession[]) {
  const now = Date.now();
  const buckets: Record<string, ChatSession[]> = {
    Today: [], Yesterday: [], "Previous 7 days": [], Older: [],
  };
  for (const c of chats) {
    const d = Math.floor((now - new Date(c.last_updated).getTime()) / 86400000);
    if (d < 1) buckets["Today"].push(c);
    else if (d < 2) buckets["Yesterday"].push(c);
    else if (d < 7) buckets["Previous 7 days"].push(c);
    else buckets["Older"].push(c);
  }
  return Object.entries(buckets).filter(([, v]) => v.length > 0);
}

// ── Delete confirmation portal ─────────────────────────────────────────────────
function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", padding: "1rem",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <p className="text-sm font-semibold text-foreground mb-1">Delete this chat?</p>
        <p className="text-sm text-muted-foreground mb-5">
          This will permanently delete all messages. This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Dropdown portal ────────────────────────────────────────────────────────────
function DropdownMenu({
  anchorRect,
  onRename,
  onDelete,
  onClose,
}: {
  anchorRect: DOMRect;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("resize", onClose);
    // Use setTimeout so this listener is added AFTER the current event cycle,
    // preventing the triggering pointerdown from immediately closing the menu.
    const t = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown, true);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onClose);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const top   = anchorRect.bottom + 6;
  const right = window.innerWidth - anchorRect.right;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top,
        right,
        minWidth: 160,
        zIndex: 99999,
        backgroundColor: "var(--background, white)",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "0.5rem",
        boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
        padding: "4px 0",
      }}
    >
      <button
        style={{ display: "flex", width: "100%", alignItems: "center", gap: "8px", padding: "8px 12px", fontSize: "0.875rem", cursor: "pointer", background: "none", border: "none", textAlign: "left" }}
        className="text-foreground hover:bg-accent transition-colors"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          onRename();
        }}
      >
        <PencilIcon style={{ width: 14, height: 14, opacity: 0.6, flexShrink: 0 }} />
        Rename
      </button>
      <button
        style={{ display: "flex", width: "100%", alignItems: "center", gap: "8px", padding: "8px 12px", fontSize: "0.875rem", cursor: "pointer", background: "none", border: "none", textAlign: "left" }}
        className="text-destructive hover:bg-destructive/10 transition-colors"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          onDelete();
        }}
      >
        <Trash2Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
        Delete
      </button>
    </div>,
    document.body
  );
}

// ── Chat row ───────────────────────────────────────────────────────────────────
function ChatRow({
  chat,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing]             = useState(false);
  const [draftTitle, setDraftTitle]       = useState(chat.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy]                   = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [anchorRect, setAnchorRect]       = useState<DOMRect | null>(null);
  // React-state hover — works regardless of Tailwind config or Bootstrap conflicts
  const [isHovered, setIsHovered]         = useState(false);

  const inputRef  = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraftTitle(chat.title); }, [chat.title]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setAnchorRect(null);
  }, []);

  function handleDotPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (menuOpen) {
      closeMenu();
    } else {
      const rect = buttonRef.current?.getBoundingClientRect() ?? null;
      setAnchorRect(rect);
      setMenuOpen(true);
    }
  }

  async function submitRename() {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === chat.title) { setEditing(false); return; }
    setBusy(true);
    try { await onRename(trimmed); } finally { setBusy(false); setEditing(false); }
  }

  // Button is visible when: row is hovered, menu is open, or chat is selected
  const showDots = isHovered || menuOpen || isSelected;

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
          onRename={() => { setEditing(true); }}
          onDelete={() => { setConfirmDelete(true); }}
          onClose={closeMenu}
        />
      )}

      <div
        className={cn(
          "relative flex w-full items-center gap-1 rounded-lg px-2 py-2 text-sm",
          "cursor-pointer select-none transition-colors duration-100",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
        onClick={() => { if (!editing) onSelect(); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <MessageSquareIcon className="h-4 w-4 shrink-0 opacity-60" />

        <div className="min-w-0 flex-1" style={{ marginRight: showDots ? "2px" : "0" }}>
          {editing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename();
                  if (e.key === "Escape") { setDraftTitle(chat.title); setEditing(false); }
                }}
                disabled={busy}
                className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={submitRename}
                disabled={busy}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
                className="text-green-500 hover:text-green-400"
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setDraftTitle(chat.title); setEditing(false); }}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <p className="truncate text-xs font-medium leading-tight text-foreground">
                {chat.title || "Untitled chat"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {formatRelativeTime(chat.last_updated)}
                {" · "}{chat.messages.length}{" "}
                {chat.messages.length === 1 ? "msg" : "msgs"}
              </p>
            </>
          )}
        </div>

        {/* Three-dot button — shown on hover/selected/menu-open via React state */}
        {!editing && (
          <button
            ref={buttonRef}
            title="More options"
            onPointerDown={handleDotPointerDown}
            style={{
              // Inline styles so Bootstrap cannot override them
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              padding: 0,
              background: "none",
              // Visibility controlled by React state — no Tailwind group needed
              opacity: showDots ? 1 : 0,
              pointerEvents: showDots ? "auto" : "none",
              transition: "opacity 0.1s ease",
              color: "currentColor",
            }}
          >
            <MoreHorizontalIcon style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>
    </>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
export function Sidebar({
  isOpen,
  onClose,
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  isLoading = false,
}: SidebarProps) {
  const groups = groupByTime(chats);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background",
          "transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-4">
          <span className="select-none text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Chats
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sidebar">
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="shrink-0 px-3 pb-2">
          <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={onNewChat}>
            <PlusIcon className="h-4 w-4" />
            New chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          {isLoading ? (
            <div className="mt-2 flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
              <MessageSquareIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm">No conversations yet. Start chatting!</p>
            </div>
          ) : (
            <div className="mt-1 flex flex-col gap-4 pb-4">
              {groups.map(([label, groupChats]) => (
                <div key={label}>
                  <p className="mb-1 select-none px-2 text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="flex flex-col gap-0.5">
                    {groupChats.map((chat) => (
                      <ChatRow
                        key={chat.chat_id}
                        chat={chat}
                        isSelected={selectedChatId === chat.chat_id}
                        onSelect={() => onSelectChat(chat)}
                        onRename={(title) => onRenameChat(chat.chat_id, title)}
                        onDelete={() => onDeleteChat(chat.chat_id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>
    </>
  );
}
