import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { useProspectingTimer, formatTimer } from "@/hooks/useProspectingTimer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBRL } from "@/lib/format";
import {
  MapPin,
  Pause,
  Play,
  Square,
  Target,
  Flame,
  Medal,
  Plus,
  Building2,
  ContactRound,
  Wallet,
  Fuel,
  Store,
  Calendar,
  Shield,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Briefcase,
  MoreVertical,
  LogOut,
  Pencil,
  Info,
} from "lucide-react";

interface Stats {
  total: number;
  converted: number;
  todayEarnings: number;
  todayLeads: number;
  b2cCount: number;
  b2bCount: number;
  walletAmount: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useRole();
  const timer = useProspectingTimer();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    converted: 0,
    todayEarnings: 0,
    todayLeads: 0,
    b2cCount: 0,
    b2bCount: 0,
    walletAmount: 2,
  });
  const [activeCheckin, setActiveCheckin] = useState<{ location_name: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: leads } = await supabase
        .from("leads")
        .select("kind,status,value,created_at")
        .eq("user_id", user.id);
      if (leads) {
        const total = leads.length;
        const converted = leads.filter(
          (l) => l.status === "vendido" || l.status === "fechado",
        ).length;
        const todays = leads.filter((l) => new Date(l.created_at) >= today);
        const todayEarnings = todays.reduce(
          (sum, l) =>
            l.status === "vendido" || l.status === "fechado"
              ? sum + Number(l.value || 0)
              : sum,
          0,
        );
        const b2cCount = leads.filter((l) => l.kind === "b2c").length;
        const b2bCount = leads.filter((l) => l.kind === "b2b").length;
        setStats((s) => ({
          ...s,
          total,
          converted,
          todayEarnings,
          todayLeads: todays.length,
          b2cCount,
          b2bCount,
        }));
      }
      const { data: ck } = await supabase
        .from("checkins")
        .select("location_name")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveCheckin(ck);
    })();
  }, [user]);

  const dailyGoal = profile?.daily_goal ?? 100;
  const goalPct = Math.min(100, Math.round((stats.todayLeads / dailyGoal) * 100));
  const conversionRate = stats.total ? Math.round((stats.converted / stats.total) * 100) : 0;
  const firstName = (profile?.full_name ?? "Promoter").split(" ")[0];
  const initials = firstName.slice(0, 2).toUpperCase();
  const locationName =
    activeCheckin?.location_name ?? profile?.current_location ?? "Sem check-in";

  // Missões com progresso (estilo do print)
  const missions = [
    {
      label: `M1: Coletar ${dailyGoal} contatos`,
      current: stats.todayLeads,
      target: dailyGoal,
    },
    {
      label: "M2: 100 fotos de placa → R$ 2,00/lead",
      current: 0,
      target: 100,
    },
    {
      label: "M3: Converter 10% da lista em vendas",
      current: stats.total ? Math.round((stats.converted / stats.total) * 100) : 0,
      target: 10,
    },
  ];
  const missionsDone = missions.filter((m) => m.current >= m.target).length;

  return (
    <div className="pb-4">
      {/* Header azul "ProspecLead" */}
      <header className="bg-gradient-prospeclead text-primary-foreground px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-lg leading-tight">ProspecLead</h1>
            </div>
            <button className="flex items-center gap-1 text-xs opacity-95 mt-0.5 hover:opacity-100">
              <span className="text-base leading-none">📍</span>
              <span className="truncate max-w-[160px]">{locationName}</span>
              <Pencil className="w-3 h-3 opacity-80" />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 hover:opacity-90 transition">
                <Avatar className="w-8 h-8 ring-2 ring-white/40">
                  <AvatarFallback className="bg-white text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold">{firstName}</p>
                  <p className="text-[10px] opacity-90 flex items-center gap-0.5">
                    Promotor <ChevronDown className="w-3 h-3" />
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/perfil">Meu perfil</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <Shield className="w-4 h-4 mr-2" /> Painel ADM
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/agenda"
            className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 transition flex items-center justify-center"
            aria-label="Agenda"
          >
            <Calendar className="w-4 h-4" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 transition flex items-center justify-center"
                aria-label="Mais opções"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/checkin">Trocar local</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/carteira">Minha carteira</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/perfil">Configurações</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Local atual + timer (resumo) */}
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Local atual</p>
              <p className="font-semibold truncate">{locationName}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/checkin">Trocar</Link>
          </Button>
        </Card>

        {/* Timer */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  timer.running ? "bg-success animate-pulse-dot" : "bg-muted-foreground"
                }`}
              />
              <span className="text-sm font-medium">
                {timer.running ? "Em prospecção" : "Parado"}
              </span>
            </div>
            <span className="text-2xl font-mono font-bold tabular-nums">
              {formatTimer(timer.seconds)}
            </span>
          </div>
          <div className="flex gap-2">
            {!timer.running && timer.seconds === 0 && (
              <Button onClick={timer.start} className="flex-1" size="sm">
                <Play className="w-4 h-4" /> Iniciar
              </Button>
            )}
            {timer.running && (
              <Button onClick={timer.pause} variant="secondary" className="flex-1" size="sm">
                <Pause className="w-4 h-4" /> Pausar
              </Button>
            )}
            {!timer.running && timer.seconds > 0 && (
              <Button onClick={timer.resume} className="flex-1" size="sm">
                <Play className="w-4 h-4" /> Retomar
              </Button>
            )}
            {timer.seconds > 0 && (
              <Button onClick={timer.stop} variant="outline" className="flex-1" size="sm">
                <Square className="w-4 h-4" /> Encerrar
              </Button>
            )}
          </div>
        </Card>

        {/* Meta + streak */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm font-medium">Meta do dia</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.todayLeads}/{dailyGoal}
              </span>
            </div>
            <Progress value={goalPct} className="h-2" />
            <p className="text-xs text-muted-foreground">{goalPct}% concluído</p>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <Flame className="w-6 h-6 text-warning" />
            <p className="text-2xl font-bold mt-1">{profile?.streak_days ?? 0}</p>
            <p className="text-xs text-muted-foreground">dias seguidos</p>
          </Card>
        </div>

        {/* Ganho hoje */}
        <Card className="p-6 bg-gradient-promoter text-primary-foreground space-y-1 text-center border-0">
          <p className="text-sm opacity-90">GANHO HOJE</p>
          <p className="text-4xl font-bold">{formatBRL(stats.todayEarnings)}</p>
          <p className="text-sm opacity-90">Continue assim, {firstName}! 🚀</p>
        </Card>

        {/* Acumulado do mês */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Acumulado do mês</p>
            <p className="text-xl font-bold">{formatBRL(profile?.monthly_earnings ?? 0)}</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Medal
              className={`w-4 h-4 ${
                profile?.level === "OURO"
                  ? "text-gold"
                  : profile?.level === "PRATA"
                    ? "text-silver"
                    : "text-bronze"
              }`}
            />
            {profile?.level ?? "BRONZE"}
          </Badge>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.converted}</p>
            <p className="text-xs text-muted-foreground">Convertidos</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </Card>
        </div>

        {/* AÇÕES RÁPIDAS - cards horizontais empilhados, IDÊNTICOS AO PRINT */}
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground text-center">
            AÇÕES RÁPIDAS
          </p>

          <ActionRow
            to="/leads/novo"
            icon={Plus}
            title="MODO PROMOTER"
            subtitle="Novo Lead · Cadastro de placa"
            gradient="bg-gradient-promoter"
            tag="PRINCIPAL"
          />

          <ActionRow
            to="/prospeccao-b2b"
            icon={Briefcase}
            title="Prospecção B2B"
            subtitle="Frotas · Empresas · Mineração"
            gradient="bg-gradient-b2b"
            badge={`${stats.b2bCount} empresas`}
          />

          <ActionRow
            to="/leads"
            icon={ContactRound}
            title="Meus Leads"
            subtitle="B2C e B2B · Histórico completo"
            gradient="bg-gradient-leads-blue"
            pills={[
              { label: `B2C ${stats.b2cCount}`, color: "bg-success/40" },
              { label: `B2B ${stats.b2bCount}`, color: "bg-brand-blue/50" },
            ]}
          />

          <ActionRow
            to="/carteira"
            icon={Wallet}
            title="Minha Carteira"
            subtitle="Extrato · Comissões · Saque PIX"
            gradient="bg-gradient-wallet-dark"
            badge={formatBRL(stats.walletAmount)}
            badgeAccent
          />

          <ActionRow
            to="/frentista"
            icon={Fuel}
            title="Modo Frentista"
            subtitle="Cadastro via PDV · Foto da placa"
            gradient="bg-gradient-gas-green"
          />

          <ActionRow
            to="/rede"
            icon={Store}
            title="Gerenciar Parceiros PDV"
            subtitle="Lojas · Postos · QR Code · Renda Passiva"
            gradient="bg-gradient-pdv-light"
            light
          />

          {isAdmin && (
            <ActionRow
              to="/admin"
              icon={Shield}
              title="Painel ADM"
              subtitle="Gerenciar tudo"
              gradient="bg-gradient-promoter"
              tag="ADMIN"
            />
          )}
        </div>

        {/* SUPORTE COMERCIAL */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-2">
            <div className="flex-1 h-px bg-border" />
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              SUPORTE COMERCIAL
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Link
            to="/agenda"
            className="block bg-gradient-support text-primary-foreground rounded-2xl p-4 hover:opacity-95 active:scale-[0.98] transition shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                <span className="text-2xl">👔</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base leading-tight">
                  Falar com Francisco Vale Jr
                </p>
                <p className="text-xs opacity-90">Executivo Comercial · Telensat</p>
                <p className="text-xs opacity-90 mt-0.5">
                  📅 Agendar reunião de 30 min
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* MISSÕES FIXAS DO DIA com barras */}
        <Card className="p-4 space-y-3 bg-accent/30 border-primary/20">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Info className="w-4 h-4" /> Missões Fixas do Dia
            </h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {missionsDone}/3 concluídas
            </Badge>
          </div>
          <div className="space-y-3">
            {missions.map((m, i) => {
              const pct = Math.min(100, Math.round((m.current / m.target) * 100));
              return (
                <div key={i} className="space-y-1.5">
                  <p className="text-sm font-medium">{m.label}</p>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActionRow({
  to,
  icon: Icon,
  title,
  subtitle,
  gradient,
  tag,
  badge,
  badgeAccent,
  pills,
  light,
}: {
  to: string;
  icon: typeof Plus;
  title: string;
  subtitle: string;
  gradient: string;
  tag?: string;
  badge?: string;
  badgeAccent?: boolean;
  pills?: { label: string; color: string }[];
  light?: boolean;
}) {
  const textColor = light ? "text-foreground" : "text-primary-foreground";
  const iconBg = light ? "bg-success/20" : "bg-white/20";
  const subOpacity = light ? "text-muted-foreground" : "opacity-90";
  return (
    <Link
      to={to}
      className={`${gradient} ${textColor} rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md ${
        light ? "border border-success/30" : ""
      }`}
    >
      <div
        className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center backdrop-blur-sm shrink-0`}
      >
        <Icon className={`w-6 h-6 ${light ? "text-success" : ""}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-base leading-tight">{title}</p>
        <p className={`text-xs ${subOpacity} truncate`}>{subtitle}</p>
      </div>

      {pills && (
        <div className="flex flex-col gap-1.5 shrink-0">
          {pills.map((p) => (
            <span
              key={p.label}
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${p.color} text-white whitespace-nowrap`}
            >
              {p.label}
            </span>
          ))}
        </div>
      )}

      {tag && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 shrink-0">
          {tag}
        </span>
      )}

      {badge && !pills && (
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
            badgeAccent
              ? "bg-warning text-warning-foreground"
              : "bg-white/20 text-primary-foreground"
          }`}
        >
          {badge}
        </span>
      )}

      {!pills && !badge && !tag && (
        <ChevronRight
          className={`w-5 h-5 ${light ? "text-success" : "opacity-80"} shrink-0`}
        />
      )}
    </Link>
  );
}
