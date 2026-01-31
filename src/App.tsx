import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Main from "./pages/Main";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import TopUp from "./pages/TopUp";
import PaymentConfirm from "./pages/PaymentConfirm";
import NotFound from "./pages/NotFound";

// Auth pages
import LoginPage from "./auth/LoginPage";
import SignupPage from "./auth/SignupPage";
import AccessDeniedPage from "./auth/AccessDeniedPage";
import ErrorPage from "./auth/ErrorPage";
import PaymentRequiredPage from "./auth/PaymentRequiredPage";
import ConfirmCallback from "./auth/ConfirmCallback";
import SignoutCallback from "./auth/SignoutCallback";

// Admin pages
import { AdminDashboard, AdminUsers, AdminCredits, AdminUsage, AdminSettings, AdminCoupons, AdminProjects, AdminPrompts, AdminLessons } from "./admin";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <Route path="/chat" element={<ProtectedRoute><Main /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/pricing/top-up" element={<ProtectedRoute><TopUp /></ProtectedRoute>} />
              <Route path="/payment-confirm" element={<PaymentConfirm />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/credits" element={<ProtectedRoute><AdminCredits /></ProtectedRoute>} />
              <Route path="/admin/usage" element={<ProtectedRoute><AdminUsage /></ProtectedRoute>} />
              <Route path="/admin/coupons" element={<ProtectedRoute><AdminCoupons /></ProtectedRoute>} />
              <Route path="/admin/projects" element={<ProtectedRoute><AdminProjects /></ProtectedRoute>} />
              <Route path="/admin/prompts" element={<ProtectedRoute><AdminPrompts /></ProtectedRoute>} />
              <Route path="/admin/lessons" element={<ProtectedRoute><AdminLessons /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
