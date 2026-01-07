import { BookOpen } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { ModuleGrid } from "./ModuleGrid";
import { LessonListPanel } from "./LessonListPanel";
import { Module } from "./LearnSidebar";

interface LearnInterfaceProps {
  selectedModuleId: string | null;
  lessonId: string | null;
  modules: Module[];
  contentType: "recordings" | "materials";
  isLoading?: boolean;
  onModuleSelect: (moduleId: string | null) => void;
  onLessonSelect: (lessonId: string) => void;
  onAskAI?: (lessonId: string) => void;
  onVideoComplete?: (lessonId: string) => void;
}

export const LearnInterface = ({ 
  selectedModuleId,
  lessonId, 
  modules, 
  contentType, 
  isLoading,
  onModuleSelect,
  onLessonSelect,
  onAskAI, 
  onVideoComplete 
}: LearnInterfaceProps) => {
  // If no module is selected, show the grid view
  if (!selectedModuleId) {
    return (
      <ModuleGrid
        modules={modules}
        onModuleSelect={onModuleSelect}
        isLoading={isLoading}
        contentType={contentType}
      />
    );
  }

  // Find the selected module
  const selectedModule = modules.find(m => m.id === selectedModuleId);
  
  if (!selectedModule) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Module Not Found
            </h2>
            <p className="text-muted-foreground">
              The selected module could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get the selected lesson
  const selectedLesson = lessonId 
    ? selectedModule.lessons.find(l => l.id === lessonId)
    : selectedModule.lessons[0]; // Default to first lesson

  // Auto-select first lesson if none selected
  if (!lessonId && selectedModule.lessons.length > 0) {
    // Use effect would be better, but for simplicity we'll just show the first lesson
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Lesson List Panel */}
      <LessonListPanel
        module={selectedModule}
        currentLessonId={lessonId || selectedModule.lessons[0]?.id || null}
        onLessonSelect={onLessonSelect}
        onBack={() => onModuleSelect(null)}
      />
      
      {/* Video Player Area */}
      <div className="flex-1 overflow-y-auto border-l border-border/30">
        {selectedLesson ? (
          <div className="max-w-[1000px] mx-auto px-8 py-8">
            <VideoPlayer 
              lesson={selectedLesson} 
              contentType={contentType} 
              onAskAI={onAskAI} 
              onVideoComplete={onVideoComplete}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md px-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <BookOpen className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Select a Lesson
                </h2>
                <p className="text-muted-foreground">
                  Choose a lesson from the sidebar to start learning.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
