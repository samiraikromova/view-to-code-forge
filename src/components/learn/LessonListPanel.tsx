import { ArrowLeft, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Module, Lesson } from "./LearnSidebar";

interface LessonListPanelProps {
  module: Module;
  currentLessonId: string | null;
  onLessonSelect: (lessonId: string) => void;
  onBack: () => void;
}

export function LessonListPanel({ module, currentLessonId, onLessonSelect, onBack }: LessonListPanelProps) {
  const completedCount = module.lessons.filter(l => l.completed).length;
  const progress = module.lessons.length > 0 
    ? Math.round((completedCount / module.lessons.length) * 100) 
    : 0;

  return (
    <div className="w-72 flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All modules
        </button>
        
        <h2 className="font-semibold text-foreground text-base leading-tight mb-4">
          {module.title}
        </h2>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount}/{module.lessons.length} complete</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>
      
      {/* Lesson List */}
      <ScrollArea className="flex-1">
        <div className="px-3 pb-6">
          {module.lessons.map((lesson, index) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={index + 1}
              isActive={lesson.id === currentLessonId}
              onClick={() => onLessonSelect(lesson.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface LessonItemProps {
  lesson: Lesson;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function LessonItem({ lesson, index, isActive, onClick }: LessonItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 transition-all duration-150 flex items-center gap-3",
        isActive 
          ? "bg-primary/10 border-l-2 border-primary" 
          : "hover:bg-muted/30 border-l-2 border-transparent"
      )}
    >
      {/* Completion indicator */}
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {lesson.completed ? (
          <Check className="w-3.5 h-3.5 text-primary" />
        ) : (
          <span className="text-xs text-muted-foreground">{index}</span>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm leading-snug line-clamp-2",
          isActive ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {lesson.title}
        </span>
      </div>
    </button>
  );
}
