import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "./BottomNav";
import InactivityOverlay from "./InactivityOverlay";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-md mx-auto bg-background min-h-screen pb-20 relative">
        {children}
        <BottomNav />
      </div>
      <InactivityOverlay />
    </div>
  );
}

