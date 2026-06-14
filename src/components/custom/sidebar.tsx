import { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Button } from "@/components/ui/button";
import {
  PlusIcon, MessageSquareIcon, ChevronLeftIcon,
  Trash2Icon, PencilIcon, CheckIcon, XIcon, MoreHorizontalIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SignImage } from "../../interfaces/interfaces";

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
  sign_images?: SignImage[];
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

// ── Delete confirmation ────────────────────────────────────────────────────────
function ConfirmDialog({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", padding: "1rem",
      }}
      // Stop clicks on the backdrop reaching document listeners
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <p className="text-sm font-semibold text-foreground mb-1">Delete this chat?</p>
        <p className="text-sm text-muted-foreground mb-5">
          This permanently deletes all messages and cannot be undone.
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

// ── Dropdown ───────────────────────────────────────────────────────────────────
function DropdownMenu({ anchorRect, onRename, onDelete, onClose }: {
  anchorRect: DOMRect;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Stable ref so listeners always call the latest onClose without re-registering
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    // We use a tiny delay so the pointerdown that *opened* the menu
    // (which fired before this effect ran) doesn't immediately close it.
    let active = false;
    const timerId = setTimeout(() => { active = true; }, 50);

    function handlePointerDown(e: PointerEvent) {
      if (!active) return;
      if (!ref.current?.contains(e.target as Node)) {
        onCloseRef.current();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }

    function handleResize() { onCloseRef.current(); }

    // All three listeners are added once and removed together in cleanup.
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    // This cleanup ALWAYS runs when the component unmounts (menu closes).
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  // Empty deps — register once on mount, clean up on unmount.
  // onClose changes are handled via onCloseRef above.
  }, []);

  return ReactDOM.createPortal(
    <div
      ref={ref}
      // Stop pointer events inside the menu from leaking to the document listener
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        minWidth: 160,
        zIndex: 99999,
        background: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        padding: "4px 0",
      }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        // Use onClick (not onPointerDown) so the menu's onPointerDown stopPropagation
        // doesn't swallow it, and we let the natural click fire.
        onClick={e => { e.stopPropagation(); onClose(); onRename(); }}
      >
        <PencilIcon className="h-3.5 w-3.5 opacity-60 shrink-0" />
        Rename
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
        onClick={e => { e.stopPropagation(); onClose(); onDelete(); }}
      >
        <Trash2Icon className="h-3.5 w-3.5 shrink-0" />
        Delete
      </button>
    </div>,
    document.body
  );
}

// ── Chat row ───────────────────────────────────────────────────────────────────
function ChatRow({ chat, isSelected, onSelect, onRename, onDelete }: {
  chat: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (t: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing]             = useState(false);
  const [draftTitle, setDraftTitle]       = useState(chat.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy]                   = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [anchorRect, setAnchorRect]       = useState<DOMRect | null>(null);
  const [hovered, setHovered]             = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dotRef   = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraftTitle(chat.title); }, [chat.title]);

  // closeMenu resets ALL menu-related state cleanly
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setAnchorRect(null);
  }, []);

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (menuOpen) { closeMenu(); return; }
    setAnchorRect(dotRef.current?.getBoundingClientRect() ?? null);
    setMenuOpen(true);
  }

  // cancelEdit: close rename input cleanly, no state leakage
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
    try {
      await onRename(t);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  const showDots = hovered || menuOpen || isSelected;

  return (
    <>
      {/* Delete confirmation — only mounted when needed */}
      {confirmDelete && (
        <ConfirmDialog
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
          }}
          onCancel={() => {
            setConfirmDelete(false);
            // Don't re-open menu after cancel — clean reset
          }}
        />
      )}

      {/* Dropdown — only mounted when open, unmounts on close (triggers cleanup) */}
      {menuOpen && anchorRect && (
        <DropdownMenu
          anchorRect={anchorRect}
          onRename={() => {
            closeMenu();
            setEditing(true);
          }}
          onDelete={() => {
            closeMenu();
            setConfirmDelete(true);
          }}
          onClose={closeMenu}
        />
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { if (!editing) onSelect(); }}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-lg px-2 py-2",
          "cursor-pointer select-none transition-colors duration-100",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <MessageSquareIcon className="h-4 w-4 shrink-0 opacity-50" />

        <div className="min-w-0 flex-1">
          {editing ? (
            <div
              className="flex items-center gap-1"
              // Stop row's onClick from firing while editing
              onClick={e => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { submitRename(); }
                  if (e.key === "Escape") { cancelEdit(e); }
                }}
                disabled={busy}
                className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={submitRename}
                disabled={busy}
                className="shrink-0 text-green-500 hover:text-green-400"
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={cancelEdit}
                className="shrink-0 text-muted-foreground hover:text-foreground"
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
                {" · "}{chat.messages.length} {chat.messages.length === 1 ? "msg" : "msgs"}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <button
            ref={dotRef}
            title="More options"
            onClick={openMenu}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "transition-opacity duration-100",
              showDots ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
}

// ── Sidebar shell ──────────────────────────────────────────────────────────────
export function Sidebar({
  isOpen, onClose, chats, selectedChatId,
  onSelectChat, onNewChat, onRenameChat, onDeleteChat, isLoading = false,
}: SidebarProps) {
  const groups = groupByTime(chats);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-73 flex-col border-r border-border bg-background",
        "transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-4">
          <span className="select-none text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Chats
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sidebar">
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="shrink-0 px-3 pb-2">
          <Button variant="outline" className="w-full justify-start gap-2 text-sm" onClick={onNewChat}>
            <PlusIcon className="h-4 w-4" /> New chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          {isLoading ? (
            <div className="mt-2 flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted"
                  style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="mt-12 flex flex-col items-center gap-2 px-4 text-center text-muted-foreground">
              <MessageSquareIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm">No conversations yet. Start chatting!</p>
            </div>
          ) : (
            <div className="mt-1 flex flex-col gap-4 pb-4">
              {groups.map(([label, groupChats]) => (
                <div key={label}>
                  <p className="mb-1 px-2 text-xs font-medium text-muted-foreground select-none">
                    {label}
                  </p>
                  <div className="flex flex-col gap-0.5">
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
        </ScrollArea>
      </aside>
    </>
  );
}
