import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PanelLeft, Search, PlayCircle, CheckCircle2, UserIcon, Sparkles, CreditCard, LogOut, ChevronUp, TrendingUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  duration: string;
  completed?: boolean;
  description?: string;
  embedUrl?: string;
  transcript?: string;
  transcriptText?: string;
  summary?: string;
  transcriptUrl?: string;
  vdocipherId?: string;
  firefliesEmbedUrl?: string;
  overview?: string;
  keywords?: string[];
  callDate?: string;
  speakerCount?: number;
  durationFormatted?: string;
  accessType?: 'free' | 'tier_required' | 'purchase_required' | 'unlock_required';
  requiredTier?: string;
  productId?: string;
  files?: LessonFile[];
}

export interface LessonFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  storagePath: string;
  displayOrder: number;
}

interface LearnSidebarProps {
  currentLessonId: string | null;
  onLessonSelect: (lessonId: string) => void;
  contentType: "recordings" | "materials";
  onContentTypeChange: (type: "recordings" | "materials") => void;
  modules: Module[];
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onToggleLessonComplete: (lessonId: string) => void;
}

export const LearnSidebar = ({
  currentLessonId,
  onLessonSelect,
  contentType,
  onContentTypeChange,
  modules,
  isCollapsed,
  onCollapsedChange,
  onToggleLessonComplete,
}: LearnSidebarProps) => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userName = profile?.name || profile?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const userCredits = profile?.credits ?? 0;

  const allLessons = modules.flatMap(m => m.lessons);
  const filteredLessons = allLessons.filter(lesson => {
    const query = searchQuery.toLowerCase();
    return (
      lesson.title.toLowerCase().includes(query) ||
      lesson.description?.toLowerCase().includes(query) ||
      lesson.summary?.toLowerCase().includes(query)
    );
  });

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-accent/30 text-foreground rounded">{part}</mark>
        : part
    );
  };

  return (
    <div
      className={cn(
        "h-full bg-sidebar flex flex-col transition-all duration-300 border-r border-border flex-shrink-0",
        isCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-3">
        {!isCollapsed ? (
          <>
            {/* Search Button */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-surface-hover"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Search Lessons</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search for lessons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {filteredLessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          onLessonSelect(lesson.id);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-surface transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {lesson.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-accent" />
                          ) : (
                            <PlayCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {highlightMatch(lesson.title, searchQuery)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {lesson.duration}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(true)}
              className="h-8 w-8 text-muted-foreground hover:bg-surface-hover"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(false)}
            className="h-8 w-8 text-muted-foreground hover:bg-surface-hover mx-auto"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Modules and Lessons */}
      <div className="flex-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="space-y-4 p-3">
            {modules.map((module) => (
              <div key={module.id} className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {module.title}
                </div>
                <div className="space-y-0.5">
                  {module.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        onLessonSelect(lesson.id);
                        onToggleLessonComplete(lesson.id);
                      }}
                      className={cn(
                        "w-full group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors text-left",
                        currentLessonId === lesson.id
                          ? "bg-muted text-accent"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-accent" />
                      ) : (
                        <PlayCircle className="h-3 w-3 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{lesson.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {lesson.duration}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="border-t border-border flex-shrink-0">
        {!isCollapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-3 w-full hover:bg-surface-hover transition-colors cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-medium">{userInitial}</span>
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="truncate text-xs font-medium text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{typeof userCredits === 'number' ? userCredits.toFixed(2) : '0.00'} credits</p>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-muted-foreground">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/analytics")} className="text-muted-foreground">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/pricing/top-up")} className="text-muted-foreground">
                <CreditCard className="mr-2 h-4 w-4" />
                Top up credits
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-2 p-3 w-full hover:bg-surface-hover transition-colors cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-medium">{userInitial}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-muted-foreground">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/analytics")} className="text-muted-foreground">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/pricing/top-up")} className="text-muted-foreground">
                <CreditCard className="mr-2 h-4 w-4" />
                Top up credits
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
