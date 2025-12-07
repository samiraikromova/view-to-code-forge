import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
const Landing = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Welcome to Leveraged Creator</h1>
        <p className="text-lg text-muted-foreground max-w-xl mb-10">An AI platform designed for creators, freelancers and agency owners</p>
        <div className="flex gap-4">
          <Button onClick={() => navigate("/login")} className="px-8 py-6 text-lg rounded-xl">
            Log In
          </Button>
          <Button onClick={() => navigate("/signup")} variant="outline" className="px-8 py-6 text-lg rounded-xl">
            Sign Up
          </Button>
        </div>
      </div>
      <footer className="pb-8 text-muted-foreground text-sm">© 2024 Leveraged Creator</footer>
    </div>;
};
export default Landing;