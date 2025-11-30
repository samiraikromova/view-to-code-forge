import { useState } from "react";
import { PanelLeft, Plus, FolderPlus, Settings, CreditCard, User, LogOut, MoreVertical, Star, Search, ChevronDown, UserIcon, Sparkles, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
interface Chat {
  id: string;
  title: string;
  folderId?: string | null;
  starred: boolean;
}
interface Folder {
  id: string;
  name: string;
  isOpen: boolean;
}
interface SidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}
export function Sidebar({
  currentChatId,
  onChatSelect,
  onNewChat
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chats, setChats] = useState<Chat[]>([{
    id: "1",
    title: "Marketing campaign ideas",
    folderId: null,
    starred: false
  }, {
    id: "2",
    title: "Video script review",
    folderId: null,
    starred: false
  }, {
    id: "3",
    title: "Product description help",
    folderId: null,
    starred: false
  }]);
  const [folders, setFolders] = useState<Folder[]>([{
    id: "work",
    name: "Work",
    isOpen: true
  }, {
    id: "personal",
    name: "Personal",
    isOpen: false
  }]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
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
  const handleMoveToFolder = (chatId: string, folderId: string | null) => {
    setChats(chats.map(chat => chat.id === chatId ? {
      ...chat,
      folderId
    } : chat));
  };
  const handleStarChat = (chatId: string) => {
    setChats(chats.map(chat => chat.id === chatId ? {
      ...chat,
      starred: !chat.starred
    } : chat));
  };
  const handleCreateFolder = () => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: "New Folder",
      isOpen: true
    };
    setFolders([...folders, newFolder]);
    setEditingFolderId(newFolder.id);
    setEditValue(newFolder.name);
  };
  const handleRenameFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setEditingFolderId(folderId);
      setEditValue(folder.name);
    }
  };
  const saveFolderRename = (folderId: string) => {
    if (editValue.trim()) {
      setFolders(folders.map(folder => folder.id === folderId ? {
        ...folder,
        name: editValue.trim()
      } : folder));
    }
    setEditingFolderId(null);
    setEditValue("");
  };
  const cancelFolderRename = () => {
    setEditingFolderId(null);
    setEditValue("");
  };
  const handleDeleteFolder = (folderId: string) => {
    setChats(chats.map(chat => chat.folderId === folderId ? {
      ...chat,
      folderId: null
    } : chat));
    setFolders(folders.filter(folder => folder.id !== folderId));
  };
  const toggleFolder = (folderId: string) => {
    setFolders(folders.map(folder => folder.id === folderId ? {
      ...folder,
      isOpen: !folder.isOpen
    } : folder));
  };
  const getChatsInFolder = (folderId: string) => {
    return chats.filter(chat => chat.folderId === folderId);
  };
  const getUncategorizedChats = () => {
    return chats.filter(chat => !chat.folderId && !chat.starred);
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
      <div className="flex items-center border-b border-border/50 p-4">
        {!isCollapsed ? <>
          <Button variant="ghost" size="icon" onClick={() => setIsSearchModalOpen(true)} className="h-8 w-8 text-muted-foreground hover:bg-surface-hover">
            <Search className="h-5 w-5" />
          </Button>
          
          <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-foreground">
            Leveraged Creator
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 text-muted-foreground hover:bg-surface-hover ml-auto">
            <PanelLeft className="h-5 w-5" />
            </Button>
        </> : <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 text-muted-foreground hover:bg-surface-hover mx-auto">
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
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
          {/* Folders */}
          {folders.map(folder => {
          const folderChats = filterChats(getChatsInFolder(folder.id));
          if (folderChats.length === 0 && searchQuery) return null;
          return <Collapsible key={folder.id} open={folder.isOpen} onOpenChange={() => toggleFolder(folder.id)}>
                <div className="group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                  {editingFolderId === folder.id ? <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => {
                if (e.key === "Enter") saveFolderRename(folder.id);
                if (e.key === "Escape") cancelFolderRename();
              }} onBlur={() => saveFolderRename(folder.id)} className="flex-1 rounded bg-surface px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" autoFocus /> : <>
                    <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
                      <ChevronDown className={cn("h-3 w-3 transition-transform", !folder.isOpen && "-rotate-90")} />
                      <span>{folder.name}</span>
                    </CollapsibleTrigger>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent">
                          <MoreVertical className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenameFolder(folder.id)}>
                            <Pencil className="mr-2 h-3 w-3" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteFolder(folder.id)}>
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>}
                </div>

                <CollapsibleContent>
                  <div className="ml-4 space-y-0.5">
                    {folderChats.map(chat => <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-surface-hover transition-colors px-1">
                        {editingChatId === chat.id ? <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => {
                    if (e.key === "Enter") saveChatRename(chat.id);
                    if (e.key === "Escape") cancelChatRename();
                  }} onBlur={() => saveChatRename(chat.id)} className="flex-1 rounded bg-surface px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" autoFocus /> : <>
                            <button onClick={() => onChatSelect(chat.id)} className={cn("flex-1 justify-start truncate text-xs text-left px-2 py-1.5", currentChatId === chat.id ? "text-accent font-medium" : "text-muted-foreground")}>
                              {chat.starred && <Star className="mr-1 h-3 w-3 fill-accent text-accent inline-block align-middle" />}
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
                                  {chat.starred ? "Unstar" : "Star"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRenameChat(chat.id)}>
                                  <Pencil className="mr-2 h-3 w-3" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteChat(chat.id)}>
                                  <Trash2 className="mr-2 h-3 w-3" />
                                  Delete
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {chat.folderId && <DropdownMenuItem onClick={() => handleMoveToFolder(chat.id, null)}>
                                        Remove from folder
                                      </DropdownMenuItem>}
                                    {folders.filter(f => f.id !== chat.folderId).map(f => <DropdownMenuItem key={f.id} onClick={() => handleMoveToFolder(chat.id, f.id)}>
                                          {f.name}
                                        </DropdownMenuItem>)}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>}
                      </div>)}
                  </div>
                </CollapsibleContent>
              </Collapsible>;
        })}

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
                    <button onClick={() => onChatSelect(chat.id)} className={cn("flex-1 justify-start truncate text-xs text-left px-2 py-1.5", currentChatId === chat.id ? "text-accent font-medium" : "text-muted-foreground")}>
                      <Star className="mr-1 h-3 w-3 fill-accent text-accent inline-block align-middle" />
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
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {chat.folderId && <DropdownMenuItem onClick={() => handleMoveToFolder(chat.id, null)}>
                                  Remove from folder
                                </DropdownMenuItem>}
                              {folders.filter(f => f.id !== chat.folderId).map(f => <DropdownMenuItem key={f.id} onClick={() => handleMoveToFolder(chat.id, f.id)}>
                                    {f.name}
                                  </DropdownMenuItem>)}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>}
                </div>)}
            </div>}

          {/* Uncategorized Chats */}
          <div className="space-y-0.5">
            {!isCollapsed && <div className="flex items-center justify-between px-2 py-1.5">
                <div className="text-xs font-medium text-muted-foreground">Recent</div>
                <Button variant="ghost" size="icon" onClick={handleCreateFolder} className="h-6 w-6 text-muted-foreground hover:bg-surface-hover" title="New Folder">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>}
            {filterChats(getUncategorizedChats()).map(chat => <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-surface-hover transition-colors px-1">
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
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {folders.map(f => <DropdownMenuItem key={f.id} onClick={() => handleMoveToFolder(chat.id, f.id)}>
                                {f.name}
                              </DropdownMenuItem>)}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>}
              </div>)}
          </div>
          </div>
        </ScrollArea>
      )}

      {/* User Profile */}
      <div className="mt-auto border-t border-border">
        {!isCollapsed ? <div className="flex items-center gap-3 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-sm font-medium">C</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium text-foreground">Cameron</p>
              <p className="truncate text-xs text-muted-foreground">50,993 credits</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-surface-hover">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
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
            </DropdownMenu>
          </div> : <div className="flex flex-col items-center gap-2 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-sm font-medium">C</span>
            </div>
          </div>}
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
              {filterChats([...getStarredChats(), ...folders.flatMap(f => getChatsInFolder(f.id)), ...getUncategorizedChats()]).map(chat => <div key={chat.id} className="group flex items-center gap-1 rounded-lg hover:bg-surface-hover transition-colors p-2 cursor-pointer" onClick={() => {
              onChatSelect(chat.id);
              setIsSearchModalOpen(false);
              setSearchQuery("");
            }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {chat.starred && <Star className="h-3 w-3 fill-accent text-accent" />}
                      <span className="text-sm text-foreground">{chat.title}</span>
                    </div>
                    {chat.folderId && <span className="text-xs text-muted-foreground">
                        {folders.find(f => f.id === chat.folderId)?.name}
                      </span>}
                  </div>
                </div>)}
              {filterChats([...getStarredChats(), ...folders.flatMap(f => getChatsInFolder(f.id)), ...getUncategorizedChats()]).length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">
                  No chats found
                </div>}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>;
}