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
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const diffDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  // Format the end date
  const formattedEndDate = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Display logic - show minutes when less than 1 hour, hours+minutes when less than 1 day
  let timeRemaining: string;
  if (totalMinutes <= 0) {
    timeRemaining = "Expires soon";
  } else if (totalHours < 1) {
    // Less than 1 hour - show only minutes
    timeRemaining = `${totalMinutes}m left`;
  } else if (diffDays < 1) {
    // Less than 1 day - show hours and minutes
    timeRemaining = remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m left` : `${totalHours}h left`;
  } else if (diffDays === 1) {
    // 1 day + hours + minutes
    const timePart = remainingHours > 0 
      ? (remainingMinutes > 0 ? `${remainingHours}h ${remainingMinutes}m` : `${remainingHours}h`)
      : (remainingMinutes > 0 ? `${remainingMinutes}m` : '');
    timeRemaining = timePart ? `1 day ${timePart} left` : "1 day left";
  } else {
    // Multiple days + hours + minutes
    const timePart = remainingHours > 0 
      ? (remainingMinutes > 0 ? `${remainingHours}h ${remainingMinutes}m` : `${remainingHours}h`)
      : (remainingMinutes > 0 ? `${remainingMinutes}m` : '');
    timeRemaining = timePart ? `${diffDays} days ${timePart} left` : `${diffDays} days left`;
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
