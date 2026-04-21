import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useProspectingTimer, formatTimer } from "@/hooks/useProspectingTimer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatBRL } from "@/lib/format";
import {
  MapPin, Pause, Play, Square, Target, Flame, Medal, Plus, Building2, ContactRound,
  Wallet, Fuel, Store, Calendar,
} from "lucide-react";

interface Stats {
  total: number;
  converted: number;
  todayEarnings: number;
  todayLeads: number;
  b2cCount: number;
  b2bCount: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const timer = useProspectingTimer();
  const [stats, setStats] = useState<Stats>({ total: 0, converted: 0, todayEarnings: 0, todayLeads: 0, b2cCount: 0, b2bCount: 0 });
  const [activeCheckin, setActiveCheckin] = useState<{ location_name: string } | null>(null);
  const [missions, setMissions] = useState([false, false, false]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const { data: leads } = await supabase.from("leads").select("kind,status,value,created_at").eq("user_id", user.id);
      if (leads) {
        const total = leads.length;
        const converted = leads.filter((l) => l.status === "vendido" || l.status === "fechado").length;
        const todays = leads.filter((l) => new Date(l.created_at) >= today);
        const todayEarnings = todays.reduce((sum, l) => (l.status === "vendido" || l.status === "fechado" ? sum + Number(l.value || 0) : sum), 0);
        const b2cCount = leads.filter((l) => l.kind === "b2c").length;
        const b2bCount = leads.filter((l) => l.kind === "b2b").length;
        setStats({ total, converted, todayEarnings, todayLeads: todays.length, b2cCount, b2bCount });
      }
      const { data: ck } = await supabase.from("checkins").select("location_name").eq("user_id", user.id).is("ended_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
      setActiveCheckin(ck);
    })();
  }, [user]);

  const dailyGoal = profile?.daily_goal ?? 100;
  const goalPct = Math.min(100, Math.round((stats.todayLeads / dailyGoal) * 100));
  const conversionRate = stats.total ? Math.round((stats.converted / stats.total) * 100) : 0;
  const firstName = (profile?.full_name ?? "Promoter").split(" ")[0];

  const toggleMission = (i: number) => setMissions((m) => m.map((v, idx) => (idx === i ? !v : v)));
  const missionsDone = missions.filter(Boolean).length;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-2xl font-bold">{firstName}! 👋</h1>
        </div>
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {firstName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Location */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Local atual</p>
            <p className="font-semibold truncate">{activeCheckin?.location_name ?? "Sem check-in"}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/checkin">Trocar</Link></Button>
      </Card>

      {/* Timer */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${timer.running ? "bg-success animate-pulse-dot" : "bg-muted-foreground"}`} />
            <span className="text-sm font-medium">{timer.running ? "Em prospecção" : "Parado"}</span>
          </div>
          <span className="text-2xl font-mono font-bold tabular-nums">{formatTimer(timer.seconds)}</span>
        </div>
        <div className="flex gap-2">
          {!timer.running && timer.seconds === 0 && (
            <Button onClick={timer.start} className="flex-1" size="sm"><Play className="w-4 h-4" /> Iniciar</Button>
          )}
          {timer.running && (
            <Button onClick={timer.pause} variant="secondary" className="flex-1" size="sm"><Pause className="w-4 h-4" /> Pausar</Button>
          )}
          {!timer.running && timer.seconds > 0 && (
            <Button onClick={timer.resume} className="flex-1" size="sm"><Play className="w-4 h-4" /> Retomar</Button>
          )}
          {timer.seconds > 0 && (
            <Button onClick={timer.stop} variant="outline" className="flex-1" size="sm"><Square className="w-4 h-4" /> Encerrar</Button>
          )}
        </div>
      </Card>

      {/* Goal + streak */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm font-medium">Meta do dia</span>
            </div>
            <span className="text-sm text-muted-foreground">{stats.todayLeads}/{dailyGoal}</span>
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

      {/* Earnings */}
      <Card className="p-6 bg-gradient-promoter text-primary-foreground space-y-1 text-center">
        <p className="text-sm opacity-90">GANHO HOJE</p>
        <p className="text-4xl font-bold">{formatBRL(stats.todayEarnings)}</p>
        <p className="text-sm opacity-90">Continue assim, {firstName}! 🚀</p>
      </Card>

      {/* Monthly */}
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Acumulado do mês</p>
          <p className="text-xl font-bold">{formatBRL(profile?.monthly_earnings ?? 0)}</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Medal className={`w-4 h-4 ${profile?.level === "OURO" ? "text-gold" : profile?.level === "PRATA" ? "text-silver" : "text-bronze"}`} />
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

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold mb-3 px-1">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard to="/leads/novo" icon={Plus} title="Modo Promoter" subtitle="Novo Lead · Cadastro de placa" gradient="bg-gradient-promoter" tag="PRINCIPAL" full />
          <ActionCard to="/leads?tab=b2b" icon={Building2} title="Prospecção B2B" subtitle="Frotas · Empresas" gradient="bg-gradient-b2b" badge={`${stats.b2bCount} empresas`} />
          <ActionCard to="/leads" icon={ContactRound} title="Meus Leads" subtitle="B2C e B2B · Histórico" gradient="bg-gradient-leads" badge={`B2C ${stats.b2cCount} · B2B ${stats.b2bCount}`} />
          <ActionCard to="/perfil" icon={Wallet} title="Carteira" subtitle="Extrato · Saque PIX" gradient="bg-gradient-wallet" badge={formatBRL(profile?.monthly_earnings ?? 0)} />
          <ActionCard to="/leads/novo?modo=frentista" icon={Fuel} title="Modo Frentista" subtitle="PDV · Foto da placa" gradient="bg-gradient-gas" />
          <ActionCard to="/perfil" icon={Store} title="Parceiros PDV" subtitle="Lojas · QR Code" gradient="bg-gradient-pdv" />
        </div>
      </div>

      {/* Missions */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">📋 Missões fixas do dia</h3>
          <Badge variant="secondary">{missionsDone}/3</Badge>
        </div>
        <div className="space-y-2">
          {[
            { t: `Coletar ${dailyGoal} contatos`, r: "" },
            { t: "10 fotos de placa", r: "R$ 2,00/lead" },
            { t: "Converter 20% da lista", r: "" },
          ].map((m, i) => (
            <label key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
              <Checkbox checked={missions[i]} onCheckedChange={() => toggleMission(i)} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${missions[i] ? "line-through text-muted-foreground" : ""}`}>{m.t}</p>
                {m.r && <p className="text-xs text-success font-medium">{m.r}</p>}
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Agenda quick link */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Calendar className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-semibold">Agenda do dia</p>
            <p className="text-xs text-muted-foreground">Ver visitas planejadas</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/agenda">Abrir</Link></Button>
      </Card>
    </div>
  );
}

function ActionCard({
  to, icon: Icon, title, subtitle, gradient, tag, badge, full,
}: {
  to: string; icon: typeof Plus; title: string; subtitle: string; gradient: string;
  tag?: string; badge?: string; full?: boolean;
}) {
  return (
    <Link to={to} className={`${gradient} ${full ? "col-span-2" : ""} text-primary-foreground rounded-2xl p-4 flex flex-col gap-2 hover:opacity-95 active:scale-[0.98] transition`}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Icon className="w-5 h-5" />
        </div>
        {tag && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25">{tag}</span>}
      </div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-xs opacity-90">{subtitle}</p>
      </div>
      {badge && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 self-start">{badge}</span>}
    </Link>
  );
}
