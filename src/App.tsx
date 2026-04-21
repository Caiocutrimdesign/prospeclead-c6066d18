import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProspectingTimerProvider } from "@/hooks/useProspectingTimer";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import LeadsList from "./pages/LeadsList";
import LeadNew from "./pages/LeadNew";
import CheckIn from "./pages/CheckIn";
import Agenda from "./pages/Agenda";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProspectingTimerProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/leads" element={<AppLayout><LeadsList /></AppLayout>} />
              <Route path="/leads/novo" element={<AppLayout><LeadNew /></AppLayout>} />
              <Route path="/checkin" element={<AppLayout><CheckIn /></AppLayout>} />
              <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
              <Route path="/perfil" element={<AppLayout><Profile /></AppLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProspectingTimerProvider>
        </AuthProvider>
      </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
