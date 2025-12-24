import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const SignoutCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSignout = async () => {
      await supabase.auth.signOut();
      navigate('/');
    };

    handleSignout();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Signing out...</p>
      </div>
    </div>
  );
};

export default SignoutCallback;
