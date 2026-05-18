import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon, MessageSquareIcon, ChevronLeftIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface HistoryMessage {
  question: string;
  response: string;
  timestamp: string;
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
  isLoading?: boolean;
}

function formatRelativeTime(isoTimestamp: string): string {
  if (!isoTimestamp) return '';
  try {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function groupChatsByTime(chats: ChatSession[]): { label: string; chats: ChatSession[] }[] {
  const now = new Date();
  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const last7Days: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const chat of chats) {
    const date = new Date(chat.last_updated);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays < 1) today.push(chat);
    else if (diffDays < 2) yesterday.push(chat);
    else if (diffDays < 7) last7Days.push(chat);
    else older.push(chat);
  }

  const groups = [];
  if (today.length) groups.push({ label: 'Today', chats: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', chats: yesterday });
  if (last7Days.length) groups.push({ label: 'Previous 7 days', chats: last7Days });
  if (older.length) groups.push({ label: 'Older', chats: older });
  return groups;
}

export function Sidebar({
  isOpen,
  onClose,
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  isLoading = false,
}: SidebarProps) {
  const groups = groupChatsByTime(chats);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-background border-r border-border',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-4 pb-2 shrink-0">
          <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase select-none">
            Chats
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sidebar">
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* New chat button */}
        <div className="px-3 pb-2 shrink-0">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm"
            onClick={onNewChat}
          >
            <PlusIcon className="h-4 w-4" />
            New chat
          </Button>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1 px-2">
          {isLoading ? (
            <div className="flex flex-col gap-2 mt-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-muted animate-pulse"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 mt-12 text-muted-foreground px-4 text-center">
              <MessageSquareIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm">No conversations yet. Start chatting!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-1 pb-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 mb-1 text-xs font-medium text-muted-foreground select-none">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.chats.map((chat) => (
                      <ChatRow
                        key={chat.chat_id}
                        chat={chat}
                        isSelected={selectedChatId === chat.chat_id}
                        onSelect={() => onSelectChat(chat)}
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

function ChatRow({
  chat,
  isSelected,
  onSelect,
}: {
  chat: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left text-sm',
        'transition-colors duration-100',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
    >
      <MessageSquareIcon className="h-4 w-4 mt-0.5 shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium leading-tight text-foreground">
          {chat.title || 'Untitled chat'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(chat.last_updated)} · {chat.messages.length}{' '}
          {chat.messages.length === 1 ? 'message' : 'messages'}
        </p>
      </div>
    </button>
  );
}
