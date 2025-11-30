import { useState } from "react";
import { PanelLeft, Plus, User, ChevronDown, ChevronRight, Settings, Pencil, Trash2, FolderInput, Folder as FolderIcon, FolderPlus, UserIcon, Sparkles, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  folderId?: string;
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

export function Sidebar({ currentChatId, onChatSelect, onNewChat }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Chat state
  const [chats, setChats] = useState<Chat[]>([
    { id: "1", title: "Marketing campaign ideas" },
    { id: "2", title: "Video script review" },
    { id: "3", title: "Client proposal draft" },
    { id: "4", title: "Social media strategy" },
    { id: "5", title: "Ad copy variations" },
  ]);
  
  // Folder state
  const [folders, setFolders] = useState<Folder[]>([
    { id: "work", name: "Work", isOpen: true },
    { id: "personal", name: "Personal", isOpen: true },
  ]);
  
  // Editing states
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  // Chat operations
  const handleRenameChat = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const saveChatRename = () => {
    if (editingChatId && editingTitle.trim()) {
      setChats(chats.map(chat => 
        chat.id === editingChatId ? { ...chat, title: editingTitle.trim() } : chat
      ));
    }
    setEditingChatId(null);
    setEditingTitle("");
  };

  const cancelChatRename = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
  };

  const handleMoveToFolder = (chatId: string, folderId: string | null) => {
    setChats(chats.map(chat => 
      chat.id === chatId ? { ...chat, folderId: folderId || undefined } : chat
    ));
  };

  // Folder operations
  const handleCreateFolder = () => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: "New Folder",
      isOpen: true,
    };
    setFolders([...folders, newFolder]);
    setEditingFolderId(newFolder.id);
    setEditingFolderName(newFolder.name);
  };

  const handleRenameFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
  };

  const saveFolderRename = () => {
    if (editingFolderId && editingFolderName.trim()) {
      setFolders(folders.map(folder => 
        folder.id === editingFolderId ? { ...folder, name: editingFolderName.trim() } : folder
      ));
    }
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const cancelFolderRename = () => {
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const handleDeleteFolder = (folderId: string) => {
    // Move chats back to uncategorized
    setChats(chats.map(chat => 
      chat.folderId === folderId ? { ...chat, folderId: undefined } : chat
    ));
    setFolders(folders.filter(folder => folder.id !== folderId));
  };

  const toggleFolder = (folderId: string) => {
    setFolders(folders.map(folder => 
      folder.id === folderId ? { ...folder, isOpen: !folder.isOpen } : folder
    ));
  };

  // Get chats by category
  const getChatsInFolder = (folderId: string) => chats.filter(chat => chat.folderId === folderId);
  const getUncategorizedChats = () => chats.filter(chat => !chat.folderId);

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface transition-all duration-300 overflow-y-auto flex-shrink-0",
        isCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 rounded-lg hover:bg-surface-hover"
        >
          <PanelLeft className="h-4 w-4 text-muted-foreground" />
        </Button>
        {!isCollapsed && <span className="text-sm font-medium text-muted-foreground">Leveraged Creator</span>}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        {!isCollapsed ? (
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        ) : (
          <Button
            onClick={onNewChat}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-surface-hover"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Chat List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          {/* Folders */}
          {folders.map((folder) => (
            <Collapsible key={folder.id} open={folder.isOpen} onOpenChange={() => toggleFolder(folder.id)}>
              <div className="flex items-center gap-1 py-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:bg-surface-hover">
                    {folder.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    {editingFolderId === folder.id ? (
                      <Input
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={saveFolderRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveFolderRename();
                          if (e.key === "Escape") cancelFolderRename();
                        }}
                        autoFocus
                        className="h-6 text-xs flex-1 bg-muted/50"
                      />
                    ) : (
                      <div className="flex items-center gap-1 flex-1 text-xs text-muted-foreground cursor-pointer">
                        <FolderIcon className="h-3 w-3" />
                        <span>{folder.name}</span>
                      </div>
                    )}
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleRenameFolder(folder.id, folder.name)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleDeleteFolder(folder.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
              
              <CollapsibleContent className="pl-6 space-y-1">
                {getChatsInFolder(folder.id).map((chat) => (
                  <ContextMenu key={chat.id}>
                    <ContextMenuTrigger asChild>
                      {editingChatId === chat.id ? (
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={saveChatRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveChatRename();
                            if (e.key === "Escape") cancelChatRename();
                          }}
                          autoFocus
                          className="h-7 text-xs bg-muted/50"
                        />
                      ) : (
                        <button
                          onClick={() => onChatSelect(chat.id)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors truncate",
                            currentChatId === chat.id
                              ? "bg-surface-hover text-foreground"
                              : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                          )}
                        >
                          {chat.title}
                        </button>
                      )}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleRenameChat(chat.id, chat.title)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>
                          <FolderInput className="mr-2 h-4 w-4" />
                          Move to folder
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          <ContextMenuItem onClick={() => handleMoveToFolder(chat.id, null)}>
                            Uncategorized
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          {folders.map((f) => (
                            <ContextMenuItem
                              key={f.id}
                              onClick={() => handleMoveToFolder(chat.id, f.id)}
                            >
                              {f.name}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => handleDeleteChat(chat.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Recent/Uncategorized chats */}
          <div className="py-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs text-muted-foreground font-medium">Recent</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateFolder}
                className="h-6 w-6 text-muted-foreground hover:bg-surface-hover"
                title="New Folder"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {getUncategorizedChats().map((chat) => (
                <ContextMenu key={chat.id}>
                  <ContextMenuTrigger asChild>
                    {editingChatId === chat.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={saveChatRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveChatRename();
                          if (e.key === "Escape") cancelChatRename();
                        }}
                        autoFocus
                        className="h-7 text-xs bg-muted/50"
                      />
                    ) : (
                      <button
                        onClick={() => onChatSelect(chat.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors truncate",
                          currentChatId === chat.id
                            ? "bg-surface-hover text-foreground"
                            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                        )}
                      >
                        {chat.title}
                      </button>
                    )}
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleRenameChat(chat.id, chat.title)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <FolderInput className="mr-2 h-4 w-4" />
                        Move to folder
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        {folders.map((f) => (
                          <ContextMenuItem
                            key={f.id}
                            onClick={() => handleMoveToFolder(chat.id, f.id)}
                          >
                            {f.name}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleDeleteChat(chat.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className="mt-auto border-t border-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700">
              <User className="h-4 w-4 text-white" />
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
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700">
              <User className="h-4 w-4 text-white" />
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
          </div>
        )}
      </div>
    </div>
  );
}