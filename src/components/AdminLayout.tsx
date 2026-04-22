import { ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ContactRound,
  Wallet,
  Trophy,
  LogOut,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/promoters", label: "Promoters", icon: Users },
  { to: "/admin/leads", label: "Leads", icon: ContactRound },
  { to: "/admin/saques", label: "Saques PIX", icon: Wallet },
  { to: "/admin/ranking", label: "Ranking", icon: Trophy },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 py-4 flex items-center gap-2 border-b">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm leading-none">Painel ADM</p>
              <p className="text-[10px] text-muted-foreground">Administração total</p>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={it.to}
                      end={it.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2 ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-muted"
                        }`
                      }
                    >
                      <it.icon className="w-4 h-4" />
                      {!collapsed && <span>{it.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface Props {
  children?: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <header className="h-14 md:h-16 bg-background/95 backdrop-blur border-b flex items-center justify-between gap-2 px-3 md:px-5 xl:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-1 md:gap-2 min-w-0">
              <SidebarTrigger />
              <div className="flex items-center gap-1.5 md:hidden min-w-0">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-sm truncate">ADM</span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground hidden lg:block max-w-[220px] truncate">
                {user.email}
              </span>
              <Button onClick={signOut} variant="outline" size="sm" className="px-2 sm:px-3">
                <LogOut className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden bg-muted/20">
            <div className="mx-auto w-full max-w-[1480px] p-3 sm:p-4 md:p-6 xl:p-8">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
