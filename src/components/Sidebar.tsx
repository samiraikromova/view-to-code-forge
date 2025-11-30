import { useState } from "react";
import { PanelLeft, Plus, CreditCard, User, LogOut, MoreVertical, Star, Search, UserIcon, Sparkles, Trash2, Pencil, X, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
interface Chat {
  id: string;
  title: string;
  starred: boolean;
}
interface SidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}
export function Sidebar({
  currentChatId,
  onChatSelect,
  onNewChat,
  chats,
  setChats,
  isCollapsed,
  onCollapsedChange
}: SidebarProps) {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const handleRenameChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setEditingChatId(chatId);
      setEditValue(chat.title);
    }
  };
  const saveChatRename = (chatId: string) => {
    if (editValue.trim()) {
      setChats(chats.map(chat => chat.id === chatId ? {
        ...chat,
        title: editValue.trim()
      } : chat));
    }
    setEditingChatId(null);
    setEditValue("");
  };
  const cancelChatRename = () => {
    setEditingChatId(null);
    setEditValue("");
  };
  const handleDeleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
  };
  const handleStarChat = (chatId: string) => {
    setChats(chats.map(chat => chat.id === chatId ? {
      ...chat,
      starred: !chat.starred
    } : chat));
  };
  const getRecentChats = () => {
    return chats.filter(chat => !chat.starred);
  };
  const getStarredChats = () => {
    return chats.filter(chat => chat.starred);
  };
  const filterChats = (chatList: Chat[]) => {
    if (!searchQuery) return chatList;
    return chatList.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()));
  };
  return <div className={cn("flex h-full flex-col border-r border-border bg-surface transition-all duration-300 flex-shrink-0", isCollapsed ? "w-14" : "w-64")}>
      {/* Header */}
      <div className="flex items-center border-b border-border/50 px-4 py-3">
        {!isCollapsed ? <>
          <Button variant="ghost" size="icon" onClick={() => setIsSearchModalOpen(true)} className="h-8 w-8 text-muted-foreground hover:bg-surface-hover">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => onCollapsedChange(!isCollapsed)} className="h-8 w-8 text-muted-foreground hover:bg-surface-hover ml-auto">
            <PanelLeft className="h-5 w-5" />
            </Button>
        </> : <Button variant="ghost" size="icon" onClick={() => onCollapsedChange(!isCollapsed)} className="h-8 w-8 text-muted-foreground hover:bg-surface-hover mx-auto">
            <PanelLeft className="h-5 w-5" />
          </Button>}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        {!isCollapsed ? <Button onClick={onNewChat} className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-accent-hover">
            <Plus className="h-4 w-4" />
            New Chat
          </Button> : <Button onClick={onNewChat} size="icon" className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-accent-hover mx-auto">
            <Plus className="h-4 w-4" />
          </Button>}
      </div>

      {/* Chat List - Only show when expanded */}
      {!isCollapsed && <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
          {/* Favorites Chats */}
          {getStarredChats().length > 0 && <div className="space-y-0.5">
              {!isCollapsed && <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Favorites</div>
                </div>}
              {filterChats(getStarredChats()).map(chat => <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-surface-hover transition-colors px-1">
                  {editingChatId === chat.id ? <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => {
              if (e.key === "Enter") saveChatRename(chat.id);
              if (e.key === "Escape") cancelChatRename();
            }} onBlur={() => saveChatRename(chat.id)} className="flex-1 rounded bg-surface px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" autoFocus /> : <>
                  <button onClick={() => onChatSelect(chat.id)} className={cn("flex flex-1 items-center justify-start truncate text-xs text-left px-2 py-1.5", currentChatId === chat.id ? "text-accent font-medium" : "text-muted-foreground")}>
                    <Star className="mr-1 h-3 w-3 fill-accent text-accent flex-shrink-0" />
                    {chat.title}
                  </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-transparent">
                          <MoreVertical className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStarChat(chat.id)}>
                            <Star className="mr-2 h-3 w-3" />
                            Unstar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRenameChat(chat.id)}>
                            <Pencil className="mr-2 h-3 w-3" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteChat(chat.id)}>
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>}
                </div>)}
            </div>}

          {/* Recent Chats */}
          <div className="space-y-0.5">
            {!isCollapsed && <div className="flex items-center justify-between px-2 py-1.5">
                <div className="text-xs font-medium text-muted-foreground">Recent</div>
              </div>}
            {filterChats(getRecentChats()).map(chat => <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-surface-hover transition-colors px-1">
                {editingChatId === chat.id ? <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => {
              if (e.key === "Enter") saveChatRename(chat.id);
              if (e.key === "Escape") cancelChatRename();
            }} onBlur={() => saveChatRename(chat.id)} className="flex-1 rounded bg-surface px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" autoFocus /> : <>
                    <button onClick={() => onChatSelect(chat.id)} className={cn("flex-1 justify-start truncate text-xs text-left px-2 py-1.5", currentChatId === chat.id ? "text-accent font-medium" : "text-muted-foreground")}>
                      {chat.title}
                    </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-transparent">
                        <MoreVertical className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStarChat(chat.id)}>
                          <Star className="mr-2 h-3 w-3" />
                          Star
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRenameChat(chat.id)}>
                          <Pencil className="mr-2 h-3 w-3" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteChat(chat.id)}>
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>}
              </div>)}
          </div>
          </div>
        </ScrollArea>}

      {/* User Profile */}
      <div className="mt-auto border-t border-border">
        {!isCollapsed ? <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-3 w-full hover:bg-surface-hover transition-colors cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-medium">C</span>
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="truncate text-xs font-medium text-foreground">Cameron</p>
                  <p className="truncate text-xs text-muted-foreground">50,993 credits</p>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-muted-foreground">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground">
                <CreditCard className="mr-2 h-4 w-4" />
                Top up credits
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> : <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-2 p-3 w-full hover:bg-surface-hover transition-colors cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-medium">C</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-muted-foreground">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground">
                <CreditCard className="mr-2 h-4 w-4" />
                Top up credits
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
      </div>

      {/* Search Modal */}
      <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Search Chats</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search all chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2 text-sm rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" autoFocus />
            {searchQuery && <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6">
                <X className="h-4 w-4" />
              </Button>}
          </div>
          <ScrollArea className="max-h-96">
            <div className="space-y-1">
              {filterChats([...getStarredChats(), ...getRecentChats()]).map(chat => <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-surface-hover transition-colors p-2 cursor-pointer" onClick={() => {
              onChatSelect(chat.id);
              setIsSearchModalOpen(false);
              setSearchQuery("");
            }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {chat.starred && <Star className="h-3 w-3 fill-accent text-accent" />}
                      <span className="text-sm text-foreground">{chat.title}</span>
                    </div>
                  </div>
                </div>)}
              {filterChats([...getStarredChats(), ...getRecentChats()]).length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">
                  No chats found
                </div>}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>;
}