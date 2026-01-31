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
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  // Format the end date
  const formattedEndDate = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Display logic
  let timeRemaining: string;
  if (diffDays <= 0) {
    timeRemaining = diffHours > 0 ? `${diffHours}h left` : "Expires soon";
  } else if (diffDays === 1) {
    timeRemaining = "1 day left";
  } else {
    timeRemaining = `${diffDays} days left`;
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
