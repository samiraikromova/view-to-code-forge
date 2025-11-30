import { useState } from "react";
import { PanelLeft, Search, PlayCircle, CheckCircle2, UserIcon, Sparkles, CreditCard, LogOut, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentToggle } from "./ContentToggle";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { cn } from "@/lib/utils";
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
}

interface LearnSidebarProps {
  currentLessonId: string | null;
  onLessonSelect: (lessonId: string) => void;
  contentType: "recordings" | "materials";
  onContentTypeChange: (type: "recordings" | "materials") => void;
  modules: Module[];
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mode: "chat" | "learn";
  onModeChange: (mode: "chat" | "learn") => void;
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
  mode,
  onModeChange,
  onToggleLessonComplete,
}: LearnSidebarProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allLessons = modules.flatMap(m => m.lessons);
  const filteredLessons = allLessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        "h-screen bg-sidebar flex flex-col transition-all duration-300 border-r border-border",
        isCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="relative flex items-center justify-center gap-2 border-b border-border/50 px-4 py-3">
        {!isCollapsed ? (
          <>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-surface-hover absolute left-4"
                >
                  <Search className="h-5 w-5" />
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
          
          <ModeSwitcher currentMode={mode} onModeChange={onModeChange} />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(!isCollapsed)}
            className="h-8 w-8 text-muted-foreground hover:bg-surface-hover absolute right-4"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(!isCollapsed)}
            className="h-8 w-8 text-muted-foreground hover:bg-surface-hover mx-auto"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Content Toggle */}
      <ContentToggle
        contentType={contentType}
        onContentTypeChange={onContentTypeChange}
        isCollapsed={isCollapsed}
      />

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
      <div className="mt-auto border-t border-border">
        {!isCollapsed ? (
          <DropdownMenu>
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
          </DropdownMenu>
        ) : (
          <DropdownMenu>
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
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
