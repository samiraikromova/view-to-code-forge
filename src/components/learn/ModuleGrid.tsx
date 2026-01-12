import { useState } from "react";
import { ModuleCard, ModuleCardData } from "./ModuleCard";
import { BookOpen, Loader2 } from "lucide-react";
import { Module } from "./LearnSidebar";
import { useAccess } from "@/hooks/useAccess";
import { BookCallModal } from "@/components/payments/BookCallModal";

interface ModuleGridProps {
  modules: Module[];
  onModuleSelect: (moduleId: string) => void;
  isLoading?: boolean;
  contentType: "recordings" | "materials";
}

// Fanbases product IDs for modules - admin should set these
const FANBASES_PRODUCT_URLS: Record<string, string> = {
  'steal-my-script': 'https://fanbases.com/checkout/rRJZp',
  'bump-offer': 'https://fanbases.com/checkout/bump-offer-id',
  'outreach-guide': 'https://fanbases.com/checkout/outreach-id',
  'sales-calls': 'https://fanbases.com/checkout/sales-calls-id',
  'onboarding-and-fulfillment': 'https://fanbases.com/checkout/onboarding-id',
  'automation': 'https://fanbases.com/checkout/automation-id',
};

export function ModuleGrid({ modules, onModuleSelect, isLoading, contentType }: ModuleGridProps) {
  const { checkModuleAccess, refreshAccess, hasDashboardAccess } = useAccess();
  const [showBookCallModal, setShowBookCallModal] = useState(false);

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

  const handleModuleClick = (module: ModuleCardData) => {
    if (module.isLocked) {
      if (module.requiresCall) {
        // Show book a call modal for call recordings
        setShowBookCallModal(true);
      } else if (module.id && FANBASES_PRODUCT_URLS[module.id]) {
        // Redirect to Fanbases checkout page
        window.open(FANBASES_PRODUCT_URLS[module.id], '_blank');
      } else {
        // Fallback: redirect to generic Fanbases page
        window.open('https://fanbases.com/checkout', '_blank');
      }
    } else {
      onModuleSelect(module.id);
    }
  };

  // Transform modules to ModuleCardData with real access checks
  const moduleCards: ModuleCardData[] = modules.map((module) => {
    const accessInfo = checkModuleAccess(module.id);
    const isLocked = !accessInfo.hasAccess;
    
    let unlockMessage: string | undefined;
    if (isLocked) {
      if (accessInfo.requiresCall) {
        unlockMessage = "Book a call to unlock";
      } else if (accessInfo.price) {
        unlockMessage = `Unlock for $${accessInfo.price}`;
      } else {
        unlockMessage = "Locked";
      }
    }

    return {
      id: module.id,
      title: module.title,
      description: module.lessons[0]?.description || undefined,
      thumbnailUrl: undefined,
      totalLessons: module.lessons.length,
      completedLessons: module.lessons.filter(l => l.completed).length,
      isLocked,
      unlockMessage,
      requiresCall: accessInfo.requiresCall,
      price: accessInfo.price,
    };
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {contentType === "recordings" ? "Call Recordings" : "Classroom"}
          </h1>
          <p className="text-muted-foreground">
            {contentType === "recordings" 
              ? "Access all recorded sessions and calls"
              : "Your complete training library"
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleCards.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onClick={() => handleModuleClick(module)}
            />
          ))}
        </div>
      </div>

      {/* Book Call Modal for Call Recordings */}
      <BookCallModal
        isOpen={showBookCallModal}
        onClose={() => setShowBookCallModal(false)}
        title="Unlock Call Recordings"
        description="Call recordings are only available to coaching clients. Book a strategy call to get access to all recordings and coaching content."
      />
    </div>
  );
}
