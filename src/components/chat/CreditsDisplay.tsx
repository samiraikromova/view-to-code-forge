import { Coins } from "lucide-react";

export function CreditsDisplay() {
  const credits = 50993.74;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <Coins className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{credits.toLocaleString()} credits</span>
    </div>
  );
}