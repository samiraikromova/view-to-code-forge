import { Lock, Clock, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ModuleCardData {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  totalLessons: number;
  completedLessons: number;
  isLocked?: boolean;
  unlockMessage?: string;
  requiresCall?: boolean;
  priceCents?: number;
  fanbasesCheckoutUrl?: string;
}

interface ModuleCardProps {
  module: ModuleCardData;
  onClick: () => void;
}

export function ModuleCard({ module, onClick }: ModuleCardProps) {
  const progress = module.totalLessons > 0 
    ? Math.round((module.completedLessons / module.totalLessons) * 100) 
    : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-300",
        module.isLocked 
          ? "opacity-80 hover:opacity-100 hover:border-primary/30 cursor-pointer" 
          : "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
      )}
    >
      {/* Cover Image */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {module.thumbnailUrl ? (
          <img 
            src={module.thumbnailUrl} 
            alt={module.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <Play className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Locked Overlay */}
        {module.isLocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Lock className="w-8 h-8 text-muted-foreground" />
            {(module.unlockMessage || module.priceCents) && (
              <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-primary/90 transition-colors">
                {module.unlockMessage}
              </span>
            )}
          </div>
        )}
        
        {/* Hover Play Button */}
        {!module.isLocked && (
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium text-sm shadow-lg">
              <Play className="w-4 h-4" />
              Get Started
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-text-accent transition-colors">
          {module.title}
        </h3>
        
        {module.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {module.description}
          </p>
        )}
        
        {/* Lesson Count */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{module.totalLessons} lessons</span>
          {module.completedLessons > 0 && (
            <span className="text-primary">• {module.completedLessons} completed</span>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={progress} className="h-2" />
          <span className="text-xs text-muted-foreground">{progress}% complete</span>
        </div>
      </div>
    </button>
  );
}
