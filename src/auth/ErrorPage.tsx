import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

const ErrorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const errorMessage = searchParams.get('message') || 'An unexpected error occurred';
  const errorCode = searchParams.get('code') || 'unknown';

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
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            {errorCode !== 'unknown' && (
              <p className="text-xs text-muted-foreground">Error code: {errorCode}</p>
            )}
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
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

export default ErrorPage;
