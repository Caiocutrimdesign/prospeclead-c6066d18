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
import LeadDetail from "./pages/LeadDetail";
import Frentista from "./pages/Frentista";
import ProspeccaoB2B from "./pages/ProspeccaoB2B";
import Carteira from "./pages/Carteira";
import CheckIn from "./pages/CheckIn";
import Agenda from "./pages/Agenda";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Rede from "./pages/Rede";
import RedeNovo from "./pages/RedeNovo";
import PdvCapture from "./pages/PdvCapture";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPromoters from "./pages/admin/AdminPromoters";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminSaques from "./pages/admin/AdminSaques";
import AdminRanking from "./pages/admin/AdminRanking";

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
              <Route path="/leads/novo" element={<AppLayout wide><LeadNew /></AppLayout>} />
              <Route path="/leads/:id" element={<AppLayout><LeadDetail /></AppLayout>} />
              <Route path="/frentista" element={<Frentista />} />
              <Route path="/prospeccao-b2b" element={<AppLayout wide><ProspeccaoB2B /></AppLayout>} />
              <Route path="/carteira" element={<AppLayout><Carteira /></AppLayout>} />
              <Route path="/checkin" element={<AppLayout><CheckIn /></AppLayout>} />
              <Route path="/agenda" element={<AppLayout><Agenda /></AppLayout>} />
              <Route path="/perfil" element={<AppLayout><Profile /></AppLayout>} />
              <Route path="/rede" element={<AppLayout wide><Rede /></AppLayout>} />
              <Route path="/rede/novo" element={<AppLayout wide><RedeNovo /></AppLayout>} />
              <Route path="/pdv/:code" element={<PdvCapture />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="promoters" element={<AdminPromoters />} />
                <Route path="leads" element={<AdminLeads />} />
                <Route path="saques" element={<AdminSaques />} />
                <Route path="ranking" element={<AdminRanking />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProspectingTimerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
