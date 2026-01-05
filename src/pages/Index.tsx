import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  // Redirect to chat page
  useEffect(() => {
    navigate("/chat", { replace: true });
  }, [navigate]);

  return null;
};

export default Index;