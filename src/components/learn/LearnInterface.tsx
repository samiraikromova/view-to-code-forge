import { BookOpen } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { Module } from "./LearnSidebar";

interface LearnInterfaceProps {
  lessonId: string | null;
  modules: Module[];
  contentType: "recordings" | "materials";
}

export const LearnInterface = ({ lessonId, modules, contentType }: LearnInterfaceProps) => {
  const allLessons = modules.flatMap(m => m.lessons);
  const selectedLesson = allLessons.find(l => l.id === lessonId);

  if (!selectedLesson) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Welcome to Learning
            </h2>
            <p className="text-muted-foreground">
              Select a lesson from the sidebar to start learning. Access{" "}
              {contentType === "recordings" ? "call recordings" : "course materials"}{" "}
              and track your progress.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-8 py-8">
        <VideoPlayer lesson={selectedLesson} />
      </div>
    </div>
  );
};
