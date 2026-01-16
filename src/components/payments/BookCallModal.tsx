import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Phone, Lock, Mail } from 'lucide-react';

interface BookCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  bookingUrl?: string;
}

export function BookCallModal({
  isOpen,
  onClose,
  title = "Book a Call to Unlock",
  description = "This content is only available to coaching clients. Book a strategy call to get access.",
  bookingUrl = "https://calendly.com/leveraged-creator"
}: BookCallModalProps) {
  // Check if bookingUrl is an email address
  const isEmail = bookingUrl?.includes('@') && !bookingUrl?.startsWith('http');
  
  const handleBookCall = () => {
    if (isEmail) {
      // Open email client
      window.open(`mailto:${bookingUrl}?subject=Booking Request`, '_blank');
    } else {
      // Open URL
      window.open(bookingUrl, '_blank');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              {isEmail ? (
                <Mail className="h-6 w-6 text-primary" />
              ) : (
                <Phone className="h-6 w-6 text-primary" />
              )}
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-surface/50 rounded-lg p-4 border border-border space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Exclusive Coaching Content</p>
                <p className="text-sm text-muted-foreground">
                  Get access to advanced strategies, call recordings, and personalized guidance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {isEmail ? (
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              ) : (
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isEmail ? 'Contact Us' : '1-on-1 Strategy Call'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isEmail 
                    ? 'Reach out to discuss your goals and see if the coaching program is right for you.'
                    : 'Book a call to discuss your goals and see if the coaching program is right for you.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
          <Button onClick={handleBookCall} className="gap-2">
            {isEmail ? (
              <>
                <Mail className="h-4 w-4" />
                Send Email
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Book a Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
