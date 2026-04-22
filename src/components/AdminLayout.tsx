import { ReactNode, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import {
  Shield,
  LogOut,
  ArrowLeft,
  MoreVertical,
  LayoutDashboard,
  Users,
  ContactRound,
  Wallet,
  Trophy,
  Calendar,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/promoters", label: "Promoters", icon: Users },
  { to: "/admin/leads", label: "Leads", icon: ContactRound },
  { to: "/admin/saques", label: "Saques PIX", icon: Wallet },
  { to: "/admin/ranking", label: "Ranking", icon: Trophy },
];

interface Props {
  children?: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const initials = (user.email ?? "AD").slice(0, 2).toUpperCase();
  const displayName = user.email?.split("@")[0] ?? "Admin";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-md mx-auto bg-background min-h-screen relative shadow-xl">
        {/* Header azul estilo ProspecLead */}
        <header className="bg-gradient-prospeclead text-primary-foreground sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 shrink-0" />
                <h1 className="font-bold text-base leading-tight truncate">
                  ProspecLead
                </h1>
              </div>
              <p className="text-[11px] opacity-90 truncate flex items-center gap-1">
                <span>📍</span>
                <span className="truncate">Painel Administrativo</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Avatar className="w-9 h-9 ring-2 ring-white/30">
                <AvatarFallback className="bg-white/20 text-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden xs:block leading-tight">
                <p className="text-xs font-bold truncate max-w-[80px]">
                  {displayName}
                </p>
                <p className="text-[10px] opacity-90">Admin</p>
              </div>

              <button
                onClick={() => navigate("/agenda")}
                className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 transition flex items-center justify-center"
                aria-label="Agenda"
              >
                <Calendar className="w-4 h-4" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 transition flex items-center justify-center"
                    aria-label="Mais opções"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao app
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMenuOpen(true)}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Menu ADM
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="pb-6">{children ?? <Outlet />}</main>

        {/* Menu lateral (drawer) opcional para navegação rápida */}
        {menuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex justify-end"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="bg-background w-72 max-w-[85%] h-full p-4 shadow-2xl animate-in slide-in-from-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Menu ADM
                </p>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted text-foreground"
                      }`
                    }
                  >
                    <it.icon className="w-4 h-4" />
                    <span>{it.label}</span>
                  </NavLink>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-3 justify-start"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/");
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao app
                </Button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
