import { useState } from "react";
import { ModuleCard, ModuleCardData } from "./ModuleCard";
import { BookOpen, Loader2 } from "lucide-react";
import { Module } from "./LearnSidebar";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";
import { BookCallModal } from "@/components/payments/BookCallModal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ModuleGridProps {
  modules: Module[];
  onModuleSelect: (moduleId: string) => void;
  isLoading?: boolean;
  contentType: "recordings" | "materials";
}

export function ModuleGrid({ modules, onModuleSelect, isLoading, contentType }: ModuleGridProps) {
  const { checkModuleAccess, refreshAccess, hasDashboardAccess } = useAccess();
  const { user, profile } = useAuth();
  const [showBookCallModal, setShowBookCallModal] = useState(false);
  const [selectedBookingUrl, setSelectedBookingUrl] = useState<string | undefined>(undefined);
  const [selectedModuleName, setSelectedModuleName] = useState<string>("");

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
                : "Course materials will appear here once they're available."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleModuleClick = async (module: ModuleCardData & { bookingUrl?: string; productId?: string }) => {
    if (module.isLocked) {
      if (module.requiresCall) {
        setSelectedBookingUrl(module.bookingUrl);
        setSelectedModuleName(module.title);
        setShowBookCallModal(true);
      } else if (module.productId) {
        // Use fanbases-checkout edge function to get full URL with prefill
        try {
          // Build success URL - Fanbases will append payment_intent and redirect_status params
          const successParams = new URLSearchParams();
          successParams.set('product_type', 'module');
          successParams.set('internal_reference', module.productId);
          const successUrl = `${window.location.origin}/payment-confirm?${successParams.toString()}`;
          
          const { data, error } = await supabase.functions.invoke('fanbases-checkout', {
            body: {
              action: 'create_checkout',
              internal_reference: module.productId,
              success_url: successUrl,
              cancel_url: `${window.location.origin}/chat?payment=cancelled`,
              base_url: window.location.origin,
            },
          });

          if (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to open checkout');
            return;
          }

          const checkoutUrl = data?.checkout_url || data?.payment_link;
          if (checkoutUrl) {
            window.open(checkoutUrl, '_blank');
          } else {
            toast.error('Failed to get checkout link');
          }
        } catch (err) {
          console.error('Module checkout error:', err);
          toast.error('Something went wrong');
        }
      }
    } else {
      onModuleSelect(module.id);
    }
  };

  // Transform modules to ModuleCardData with real access checks based on access_type
  const moduleCards: ModuleCardData[] = modules.map((module) => {
    // Pass access_type and productId from the module to checkModuleAccess
    const accessInfo = checkModuleAccess(module.id, module.accessType, module.productId);
    const isLocked = !accessInfo.hasAccess;

    let unlockMessage: string | undefined;
    if (isLocked) {
      if (accessInfo.requiresCall) {
        unlockMessage = "Book a call to unlock";
      } else if (module.priceCents) {
        unlockMessage = `Unlock for $${(module.priceCents / 100).toFixed(0)}`;
      } else if (accessInfo.fanbasesCheckoutUrl) {
        unlockMessage = "Click to unlock";
      } else {
        unlockMessage = undefined; // Free modules shouldn't show unlock message
      }
    }

    return {
      id: module.id,
      title: module.title,
      description: module.lessons[0]?.description || undefined,
      thumbnailUrl: undefined,
      totalLessons: module.lessons.length,
      completedLessons: module.lessons.filter((l) => l.completed).length,
      isLocked,
      unlockMessage,
      requiresCall: accessInfo.requiresCall,
      fanbasesCheckoutUrl: accessInfo.fanbasesCheckoutUrl,
      productId: module.productId || module.id,
      priceCents: module.priceCents,
      bookingUrl: module.bookingUrl,
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
            {contentType === "recordings" ? "Access all recorded sessions and calls" : "Your complete training library"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleCards.map((module) => (
            <ModuleCard key={module.id} module={module} onClick={() => handleModuleClick(module)} />
          ))}
        </div>
      </div>

      {/* Book Call Modal for Call Recordings */}
      <BookCallModal
        isOpen={showBookCallModal}
        onClose={() => setShowBookCallModal(false)}
        title={`Unlock ${selectedModuleName}`}
        description="This content is only available to coaching clients. Book a strategy call to get access."
        bookingUrl={selectedBookingUrl}
      />
    </div>
  );
}
