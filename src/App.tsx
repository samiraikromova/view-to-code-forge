import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Auth pages
import LoginPage from "./auth/LoginPage";
import SignupPage from "./auth/SignupPage";
import AccessDeniedPage from "./auth/AccessDeniedPage";
import ErrorPage from "./auth/ErrorPage";
import PaymentRequiredPage from "./auth/PaymentRequiredPage";
import ConfirmCallback from "./auth/ConfirmCallback";
import SignoutCallback from "./auth/SignoutCallback";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            
            {/* Auth routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/access-denied" element={<AccessDeniedPage />} />
            <Route path="/auth/error" element={<ErrorPage />} />
            <Route path="/auth/payment-required" element={<PaymentRequiredPage />} />
            <Route path="/auth/confirm" element={<ConfirmCallback />} />
            <Route path="/auth/signout" element={<SignoutCallback />} />
            
            {/* Legacy routes redirect */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            
            {/* Protected routes */}
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
