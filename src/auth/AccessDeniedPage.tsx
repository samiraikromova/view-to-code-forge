import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

const AccessDeniedPage = () => {
  const navigate = useNavigate();

  const handleTryDifferentAccount = async () => {
    // Sign out first, then redirect to login
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

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
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">
              Your account is not on the allow list. This may be because your subscription 
              has expired or you haven't completed the payment process.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = 'mailto:support@leveragedcreator.ai'}
              className="w-full gap-2"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTryDifferentAccount}
              className="w-full"
            >
              Try Different Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
