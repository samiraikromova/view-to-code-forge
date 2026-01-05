import { useState } from "react";
import { X, Search, Star, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { deleteThread, updateThreadTitle, starThread } from "@/api/chat/chatApi";
import { toast } from "sonner";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatHistoryPanel({
  isOpen,
  onClose,
  chats,
  setChats,
  currentChatId,
  onChatSelect,
  onNewChat,
}: ChatHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleRenameChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setEditingChatId(chatId);
      setEditValue(chat.title);
    }
  };

  const saveChatRename = async (chatId: string) => {
    if (editValue.trim()) {
      const success = await updateThreadTitle(chatId, editValue.trim());
      if (success) {
        setChats(
          chats.map((chat) =>
            chat.id === chatId ? { ...chat, title: editValue.trim() } : chat
          )
        );
      } else {
        toast.error("Failed to rename chat");
      }
    }
    setEditingChatId(null);
    setEditValue("");
  };

  const cancelChatRename = () => {
    setEditingChatId(null);
    setEditValue("");
  };

  const handleDeleteChat = async (chatId: string) => {
    const success = await deleteThread(chatId);
    if (success) {
      setChats(chats.filter((chat) => chat.id !== chatId));
    } else {
      toast.error("Failed to delete chat");
    }
  };

  const handleStarChat = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      const newStarred = !chat.starred;
      const success = await starThread(chatId, newStarred);
      if (success) {
        setChats(
          chats.map((c) => (c.id === chatId ? { ...c, starred: newStarred } : c))
        );
      } else {
        toast.error("Failed to update star");
      }
    }
  };

  const filterChats = (chatList: Chat[]) => {
    if (!searchQuery) return chatList;
    return chatList.filter((chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const starredChats = filterChats(chats.filter((c) => c.starred));
  const recentChats = filterChats(chats.filter((c) => !c.starred));

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 h-full w-80 bg-surface border-r border-border z-50 animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Chat History</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-3">
          <Button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full justify-center gap-2 bg-primary text-primary-foreground hover:bg-accent-hover"
          >
            New Chat
          </Button>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Starred Chats */}
            {starredChats.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground px-2 mb-2">
                  Favorites
                </div>
                {starredChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChatId === chat.id}
                    isEditing={editingChatId === chat.id}
                    editValue={editValue}
                    onEditValueChange={setEditValue}
                    onSelect={() => {
                      onChatSelect(chat.id);
                      onClose();
                    }}
                    onRename={() => handleRenameChat(chat.id)}
                    onSaveRename={() => saveChatRename(chat.id)}
                    onCancelRename={cancelChatRename}
                    onDelete={() => handleDeleteChat(chat.id)}
                    onStar={() => handleStarChat(chat.id)}
                  />
                ))}
              </div>
            )}

            {/* Recent Chats */}
            {recentChats.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground px-2 mb-2">
                  Recent
                </div>
                {recentChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChatId === chat.id}
                    isEditing={editingChatId === chat.id}
                    editValue={editValue}
                    onEditValueChange={setEditValue}
                    onSelect={() => {
                      onChatSelect(chat.id);
                      onClose();
                    }}
                    onRename={() => handleRenameChat(chat.id)}
                    onSaveRename={() => saveChatRename(chat.id)}
                    onCancelRename={cancelChatRename}
                    onDelete={() => handleDeleteChat(chat.id)}
                    onStar={() => handleStarChat(chat.id)}
                  />
                ))}
              </div>
            )}

            {starredChats.length === 0 && recentChats.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No chats found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onSelect: () => void;
  onRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onStar: () => void;
}

function ChatItem({
  chat,
  isActive,
  isEditing,
  editValue,
  onEditValueChange,
  onSelect,
  onRename,
  onSaveRename,
  onCancelRename,
  onDelete,
  onStar,
}: ChatItemProps) {
  if (isEditing) {
    return (
      <div className="px-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveRename();
            if (e.key === "Escape") onCancelRename();
          }}
          onBlur={onSaveRename}
          className="w-full rounded bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1 rounded-lg hover:bg-surface-hover transition-colors px-2 py-1.5">
      <button
        onClick={onSelect}
        className={cn(
          "flex-1 flex items-center gap-2 text-left text-sm truncate",
          isActive ? "text-accent font-medium" : "text-muted-foreground"
        )}
      >
        {chat.starred && (
          <Star className="h-3 w-3 fill-accent text-accent flex-shrink-0" />
        )}
        <span className="truncate">{chat.title}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-surface text-muted-foreground"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right">
          <DropdownMenuItem onClick={onStar}>
            <Star className="mr-2 h-3 w-3" />
            {chat.starred ? "Unstar" : "Star"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-3 w-3" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete}>
            <Trash2 className="mr-2 h-3 w-3" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
