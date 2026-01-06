import { ArrowLeft, Play, Check, Circle } from "lucide-react";
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
    <div className="w-80 flex-shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all modules
        </button>
        
        <h2 className="font-semibold text-foreground text-lg line-clamp-2 mb-3">
          {module.title}
        </h2>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {module.lessons.length} complete</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
      
      {/* Lesson List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
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
        "w-full text-left p-3 rounded-lg transition-all duration-200 group",
        isActive 
          ? "bg-primary/10 border border-primary/30" 
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
          lesson.completed 
            ? "bg-primary text-primary-foreground" 
            : isActive 
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
        )}>
          {lesson.completed ? (
            <Check className="w-3.5 h-3.5" />
          ) : isActive ? (
            <Play className="w-3 h-3" />
          ) : (
            <span className="text-xs font-medium">{index}</span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-sm font-medium line-clamp-2 transition-colors",
            isActive ? "text-primary" : "text-foreground group-hover:text-primary"
          )}>
            {lesson.title}
          </h4>
          
          {lesson.duration && (
            <span className="text-xs text-muted-foreground mt-1 block">
              {lesson.duration}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
