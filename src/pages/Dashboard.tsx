import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Briefcase,
  ContactRound,
  Wallet,
  Fuel,
  Store,
  Calendar,
  Shield,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  MoreVertical,
  LogOut,
  Pencil,
  Info,
  User as UserIcon,
  Building2,
} from "lucide-react";

interface Stats {
  total: number;
  b2cCount: number;
  b2bCount: number;
  walletAmount: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useRole();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    b2cCount: 0,
    b2bCount: 0,
    walletAmount: 0,
  });
  const [activeCheckin, setActiveCheckin] = useState<{ location_name: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: leads } = await supabase
        .from("leads")
        .select("kind")
        .eq("user_id", user.id);
      if (leads) {
        const b2cCount = leads.filter((l) => l.kind === "b2c").length;
        const b2bCount = leads.filter((l) => l.kind === "b2b").length;
        setStats((s) => ({
          ...s,
          total: leads.length,
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

      // Saldo carteira (somatório de transações)
      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("user_id", user.id);
      const wallet = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
      setStats((s) => ({ ...s, walletAmount: wallet }));
    })();
  }, [user]);

  const dailyGoal = profile?.daily_goal ?? 100;
  const firstName = (profile?.full_name ?? "Promoter").split(" ")[0];
  const initials = firstName.slice(0, 2).toUpperCase();
  const locationName =
    activeCheckin?.location_name ?? profile?.current_location ?? "Estacionamento Carrefour";

  // Missões
  const [missions, setMissions] = useState([false, false, false]);
  const toggleMission = (i: number) =>
    setMissions((m) => m.map((v, idx) => (idx === i ? !v : v)));
  const missionsList = [
    { label: `M1: Coletar ${dailyGoal} contatos`, progress: 5 },
    { label: "M2: 100 fotos de placa → R$ 2,00/lead", progress: 0 },
    { label: "M3: Converter 10% da lista em vendas", progress: 0 },
  ];
  const missionsDone = missions.filter(Boolean).length;

  return (
    <div className="pb-4 bg-muted/20 min-h-screen">
      {/* Header azul "ProspecLead" */}
      <header className="bg-[hsl(217_91%_55%)] text-white px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          {/* Lado esquerdo - logo + local */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg leading-tight">ProspecLead</h1>
            <button className="flex items-center gap-1 text-xs mt-0.5 hover:opacity-90">
              <span className="text-sm leading-none">📍</span>
              <span className="truncate max-w-[160px] font-medium">{locationName}</span>
              <Pencil className="w-3 h-3 opacity-90" />
            </button>
          </div>

          {/* Avatar + nome */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 hover:opacity-90 transition shrink-0">
                <Avatar className="w-9 h-9 ring-2 ring-white/40">
                  <AvatarFallback className="bg-[hsl(220_50%_30%)] text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight">
                  <p className="text-sm font-bold flex items-center gap-1">
                    {firstName} <ChevronDown className="w-3 h-3" />
                  </p>
                  <p className="text-[10px] opacity-90">Promotor</p>
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

          {/* Calendário */}
          <Link
            to="/agenda"
            className="w-9 h-9 rounded-lg hover:bg-white/15 transition flex items-center justify-center shrink-0"
            aria-label="Agenda"
          >
            <Calendar className="w-5 h-5" />
          </Link>

          {/* Menu 3 pontos */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-9 h-9 rounded-lg hover:bg-white/15 transition flex items-center justify-center shrink-0"
                aria-label="Mais opções"
              >
                <MoreVertical className="w-5 h-5" />
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

      <div className="px-4 pt-3 space-y-3">
        {/* AÇÕES RÁPIDAS */}
        <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground text-center pt-1">
          AÇÕES RÁPIDAS
        </p>

        {/* Botão 1 - MODO PROMOTER (verde brilhante) */}
        <Link
          to="/leads/novo"
          className="bg-gradient-to-br from-[hsl(145_65%_45%)] to-[hsl(150_60%_38%)] text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md"
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6" strokeWidth={3} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold text-lg leading-tight tracking-wide">MODO PROMOTER</p>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/50 bg-white/10">
                PRINCIPAL
              </span>
            </div>
            <p className="text-xs opacity-95">Novo Lead · Cadastro de placa</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Botão 2 - Prospecção B2B (azul escuro) */}
        <Link
          to="/prospeccao-b2b"
          className="relative bg-gradient-to-br from-[hsl(220_70%_25%)] via-[hsl(220_70%_15%)] to-[hsl(220_70%_10%)] text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md"
        >
          <span className="absolute -top-2 right-3 bg-[hsl(217_91%_55%)] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-md">
            {stats.b2bCount} empresas
          </span>
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">Prospecção B2B</p>
            <p className="text-xs opacity-90">Frotas · Empresas · Mineração</p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-80 shrink-0" />
        </Link>

        {/* Botão 3 - Meus Leads (roxo escuro) com pills */}
        <Link
          to="/leads"
          className="bg-gradient-to-br from-[hsl(250_75%_30%)] via-[hsl(255_75%_22%)] to-[hsl(260_70%_18%)] text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <ContactRound className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">Meus Leads</p>
            <p className="text-xs opacity-90 truncate">B2C e B2B · Histórico completo</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(145_60%_45%)] text-white whitespace-nowrap inline-flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> B2C {stats.b2cCount}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(217_91%_55%)] text-white whitespace-nowrap inline-flex items-center gap-1">
              <Building2 className="w-3 h-3" /> B2B {stats.b2bCount}
            </span>
          </div>
        </Link>

        {/* Botão 4 - Minha Carteira (marrom dourado) */}
        <Link
          to="/carteira"
          className="relative bg-gradient-to-br from-[hsl(35_55%_35%)] via-[hsl(35_60%_25%)] to-[hsl(35_70%_18%)] text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md"
        >
          <span className="absolute -top-2 right-3 bg-[hsl(38_92%_55%)] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-md">
            {formatBRL(stats.walletAmount)}
          </span>
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">Minha Carteira</p>
            <p className="text-xs opacity-90">Extrato · Comissões · Saque PIX</p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-80 shrink-0" />
        </Link>

        {/* Botão 5 - Modo Frentista (verde escuro) */}
        <Link
          to="/frentista"
          className="bg-gradient-to-br from-[hsl(140_50%_25%)] via-[hsl(145_55%_18%)] to-[hsl(150_55%_15%)] text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Fuel className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">Modo Frentista</p>
            <p className="text-xs opacity-90">Cadastro via PDV · Foto da placa</p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-80 shrink-0" />
        </Link>

        {/* Botão 6 - Gerenciar Parceiros PDV (cinza claro com borda verde) */}
        <Link
          to="/rede"
          className="bg-[hsl(140_40%_96%)] border-2 border-[hsl(145_50%_75%)] text-foreground rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition"
        >
          <div className="w-12 h-12 rounded-xl bg-[hsl(145_55%_85%)] flex items-center justify-center shrink-0">
            <Store className="w-6 h-6 text-[hsl(145_60%_35%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">Gerenciar Parceiros PDV</p>
            <p className="text-xs text-muted-foreground">Lojas · Postos · QR Code · Renda Passiva</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </Link>

        {/* Atalho ADM (apenas se admin) */}
        {isAdmin && (
          <Link
            to="/admin"
            className="bg-gradient-to-br from-[hsl(262_70%_45%)] to-[hsl(262_75%_35%)] text-white rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base leading-tight">Painel ADM</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/50 bg-white/10">
                  ADMIN
                </span>
              </div>
              <p className="text-xs opacity-90">Gerenciar tudo</p>
            </div>
            <ChevronRight className="w-5 h-5 opacity-80 shrink-0" />
          </Link>
        )}

        {/* SUPORTE COMERCIAL */}
        <div className="flex items-center gap-3 px-2 pt-3">
          <div className="flex-1 h-px bg-border" />
          <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">
            SUPORTE COMERCIAL
          </p>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Link
          to="/agenda"
          className="block bg-gradient-to-br from-[hsl(217_91%_55%)] to-[hsl(220_91%_45%)] text-white rounded-2xl p-4 hover:opacity-95 active:scale-[0.98] transition shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0 text-3xl">
              👔
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight">Falar com Francisco Vale Jr</p>
              <p className="text-xs opacity-90">Executivo Comercial · Telensat</p>
              <p className="text-xs opacity-90 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Agendar reunião de 30 min
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* MISSÕES FIXAS DO DIA */}
        <Card className="p-4 bg-[hsl(210_40%_96%)] border-[hsl(217_91%_85%)] mt-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[hsl(217_91%_45%)] flex items-center gap-2 text-sm">
              <Info className="w-4 h-4" /> Missões Fixas do Dia
            </h3>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[hsl(217_91%_92%)] text-[hsl(217_91%_45%)]">
              {missionsDone}/3 concluídas
            </span>
          </div>
          <div className="space-y-3">
            {missionsList.map((m, i) => (
              <div key={i} className="space-y-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={missions[i]}
                    onCheckedChange={() => toggleMission(i)}
                    className="rounded-sm"
                  />
                  <span
                    className={`text-sm ${
                      missions[i] ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {m.label}
                  </span>
                </label>
                <Progress
                  value={missions[i] ? 100 : m.progress}
                  className="h-1 ml-7"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
