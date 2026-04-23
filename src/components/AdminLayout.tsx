import { ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useProfile } from "@/hooks/useProfile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/prospeclead-logo.png";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/promoters", label: "Promotores", icon: Users },
  { to: "/admin/leads", label: "Leads", icon: ContactRound },
  { to: "/admin/saques", label: "Saques", icon: Wallet },
  { to: "/admin/ranking", label: "Ranking", icon: Trophy },
];

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useRole();

  // Mapeamento de role para o badge mostrado na UI.
  // O enum atual no banco é: admin | promoter | rh. Tratamos `admin` como ADMIN_MASTER.
  const roleLabel = isAdmin ? "ADMIN_MASTER" : "MANAGER";

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="px-3 py-4 flex items-center gap-2 border-b">
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Shield className="w-4 h-4" />
            </div>
          ) : (
            <img
              src={logo}
              alt="ProspecLead"
              className="h-8 w-auto object-contain"
            />
          )}
        </div>

        {/* Avatar + Nome + Badge de role */}
        {!collapsed && (
          <div className="px-3 py-3 border-b flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(profile?.full_name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight truncate">
                {profile?.full_name || user?.email?.split("@")[0] || "Usuário"}
              </p>
              <Badge
                variant="outline"
                className="mt-1 h-5 px-1.5 text-[10px] font-bold bg-primary/10 text-primary border-primary/30"
              >
                <Shield className="w-2.5 h-2.5 mr-1" />
                {roleLabel}
              </Badge>
            </div>
          </div>
        )}

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

      <SidebarFooter className="border-t p-2">
        <Button
          onClick={signOut}
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair do Sistema</span>}
        </Button>
      </SidebarFooter>
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
