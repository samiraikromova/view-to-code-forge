import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowLeft, Sparkles } from "lucide-react";

const PaymentRequiredPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Payment Required</h1>
            <p className="text-muted-foreground">
              To access the platform, you need an active subscription. 
              Choose a plan that works for you and get started today.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => window.open('https://leveragedcreator.ai/pricing', '_blank')}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              View Pricing Plans
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/auth/login")}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRequiredPage;
