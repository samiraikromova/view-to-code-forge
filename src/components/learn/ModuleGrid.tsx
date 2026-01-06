import { ModuleCard, ModuleCardData } from "./ModuleCard";
import { BookOpen, Loader2 } from "lucide-react";
import { Module } from "./LearnSidebar";

interface ModuleGridProps {
  modules: Module[];
  onModuleSelect: (moduleId: string) => void;
  isLoading?: boolean;
  contentType: "recordings" | "materials";
}

export function ModuleGrid({ modules, onModuleSelect, isLoading, contentType }: ModuleGridProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              No {contentType === "recordings" ? "Recordings" : "Courses"} Yet
            </h2>
            <p className="text-muted-foreground">
              {contentType === "recordings" 
                ? "Call recordings will appear here once they're available."
                : "Course materials will appear here once they're available."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Transform modules to ModuleCardData
  const moduleCards: ModuleCardData[] = modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.lessons[0]?.description || undefined,
    thumbnailUrl: undefined, // Can be added to Module type later
    totalLessons: module.lessons.length,
    completedLessons: module.lessons.filter(l => l.completed).length,
    isLocked: false,
    unlockMessage: undefined,
  }));

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {contentType === "recordings" ? "Call Recordings" : "Course Library"}
          </h1>
          <p className="text-muted-foreground">
            {contentType === "recordings" 
              ? "Access all recorded sessions and calls"
              : "Browse and learn from our curated course content"
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleCards.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onClick={() => onModuleSelect(module.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
