import { Clock } from "lucide-react";

interface TrialBadgeProps {
  trialEndsAt: string | null | undefined;
  variant?: "compact" | "full";
}

export function TrialBadge({ trialEndsAt, variant = "compact" }: TrialBadgeProps) {
  if (!trialEndsAt) return null;

  const now = new Date();
  const endDate = new Date(trialEndsAt);
  
  // Don't show if trial has ended
  if (endDate <= now) return null;

  const diffMs = endDate.getTime() - now.getTime();
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  // Format the end date
  const formattedEndDate = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Display logic - show hours when less than 1 day, otherwise show days + hours
  let timeRemaining: string;
  if (totalHours <= 0) {
    timeRemaining = "Expires soon";
  } else if (diffDays < 1) {
    // Less than 1 day - show only hours
    timeRemaining = `${totalHours}h left`;
  } else if (diffDays === 1) {
    // 1 day + hours
    timeRemaining = remainingHours > 0 ? `1 day ${remainingHours}h left` : "1 day left";
  } else {
    // Multiple days + hours
    timeRemaining = remainingHours > 0 ? `${diffDays} days ${remainingHours}h left` : `${diffDays} days left`;
  }

  if (variant === "full") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
        <Clock className="h-4 w-4 text-accent" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-accent">Free Trial</span>
          <span className="text-xs text-muted-foreground">
            {timeRemaining} · Ends {formattedEndDate}
          </span>
        </div>
      </div>
    );
  }

  // Compact variant (for dropdowns)
  return (
    <div className="flex items-center gap-2 text-xs">
      <Clock className="h-3 w-3 text-accent" />
      <span className="text-accent font-medium">Trial: {timeRemaining}</span>
    </div>
  );
}
