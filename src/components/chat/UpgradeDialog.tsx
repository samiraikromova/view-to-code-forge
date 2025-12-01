import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { PLANS, SubscriptionTier } from "@/types/subscription";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
}

export function UpgradeDialog({ open, onOpenChange, currentTier }: UpgradeDialogProps) {
  const navigate = useNavigate();
  const starterPlan = PLANS.starter;
  const proPlan = PLANS.pro;

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/settings");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade to Access Premium Tools</DialogTitle>
          <DialogDescription>
            Premium tools are available on the Pro plan. Choose the plan that works best for you.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {/* Starter Plan */}
          <div className="rounded-xl border border-border bg-surface/50 p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold text-foreground">{starterPlan.name}</h3>
                {currentTier === "starter" && (
                  <Badge variant="outline" className="bg-accent/20 text-accent-foreground">
                    Current
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">${starterPlan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <ul className="space-y-3">
              {starterPlan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              variant="outline" 
              className="w-full"
              disabled={currentTier === "starter"}
            >
              {currentTier === "starter" ? "Current Plan" : "Downgrade"}
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 space-y-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3 mr-1" />
                Recommended
              </Badge>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{proPlan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">${proPlan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <ul className="space-y-3">
              {proPlan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleUpgrade}
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
