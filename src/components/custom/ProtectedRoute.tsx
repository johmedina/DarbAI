/**
 * ProtectedRoute.tsx
 * src/components/custom/ProtectedRoute.tsx
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/images/logo.png";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show logo + spinner while token is being verified so the logo
    // never disappears on reload — same visual as the app header
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background">
        <img src={logo} alt="Salama" className="brand-logo h-16 w-auto" />
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
