import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, Shield } from "lucide-react";

interface CardSetupFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CardSetupFeeModal({ isOpen, onClose, onConfirm, isLoading }: CardSetupFeeModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">Add Payment Method</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              To securely save your card for future one-click purchases, a small verification fee of <strong className="text-foreground">$1.00</strong> is required.
            </p>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                This one-time fee helps us verify your card and enables seamless purchases without re-entering your details.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-accent hover:bg-accent-hover text-accent-foreground"
          >
            {isLoading ? "Processing..." : "Pay $1.00"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
