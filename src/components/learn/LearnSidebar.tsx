import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContentToggle } from "./ContentToggle";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
}

interface LearnSidebarProps {
  currentLessonId: string | null;
  onLessonSelect: (lessonId: string) => void;
  contentType: "recordings" | "materials";
  onContentTypeChange: (type: "recordings" | "materials") => void;
  modules: Module[];
}

export const LearnSidebar = ({
  currentLessonId,
  onLessonSelect,
  contentType,
  onContentTypeChange,
  modules,
}: LearnSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allLessons = modules.flatMap(m => m.lessons);
  const filteredLessons = allLessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={cn(
        "h-screen bg-sidebar flex flex-col transition-all duration-300 border-r border-border",
        isCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!isCollapsed && (
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
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
                            {lesson.title}
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
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
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
                      onClick={() => onLessonSelect(lesson.id)}
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
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <Avatar className="h-8 w-8 bg-primary">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              U
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                User
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
