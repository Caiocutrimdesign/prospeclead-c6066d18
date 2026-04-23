import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { resolveUiRole, getUiRoleMeta } from "@/lib/roleMapping";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Trophy,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ---------- Tipos ---------- */
interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  created_at: string;
}
interface ProfileRow {
  id: string;
  full_name: string | null;
}
interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

/* ---------- Helpers ---------- */
const FUNNEL_STEPS = [
  { key: "captados", label: "Captados", color: "hsl(262, 83%, 65%)", statuses: ["coletado", "prospectado"] },
  { key: "qualificados", label: "Qualif. IA", color: "hsl(150, 70%, 45%)", statuses: ["contatado", "respondido"] },
  { key: "agendados", label: "Agendados", color: "hsl(38, 92%, 55%)", statuses: ["negociando"] },
  { key: "instalados", label: "Instalados", color: "hsl(0, 80%, 60%)", statuses: ["vendido", "fechado"] },
];

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfPrevMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function pct(curr: number, prev: number) {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return 100;
  return Math.round(((curr - prev) / prev) * 100);
}
function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}
function periodLabel() {
  const d = new Date();
  const month = d.toLocaleDateString("pt-BR", { month: "long" });
  return `${month.charAt(0).toUpperCase() + month.slice(1)}/${d.getFullYear()}`;
}
function getInitials(name?: string | null) {
  const s = (name || "U").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

/* ---------- Página ---------- */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isAdmin, isRh } = useRole();
  const uiRole = resolveUiRole({ isAdmin, isRh });
  const roleMeta = getUiRoleMeta(uiRole);

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    const [{ data: leadsData }, { data: profilesData }, { data: wdData }] =
      await Promise.all([
        supabase
          .from("leads")
          .select("id,user_id,name,status,created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("profiles").select("id,full_name"),
        supabase
          .from("wallet_withdrawals")
          .select("id,amount,status,created_at"),
      ]);
    setLeads((leadsData ?? []) as LeadRow[]);
    setProfiles((profilesData ?? []) as ProfileRow[]);
    setWithdrawals((wdData ?? []) as WithdrawalRow[]);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ---------- Métricas ---------- */
  const monthStart = useMemo(startOfMonth, []);
  const prevMonthStart = useMemo(startOfPrevMonth, []);

  const leadsThisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart);
  const leadsPrevMonth = leads.filter((l) => {
    const d = new Date(l.created_at);
    return d >= prevMonthStart && d < monthStart;
  });
  const closedThisMonth = leadsThisMonth.filter(
    (l) => l.status === "vendido" || l.status === "fechado",
  ).length;
  const closedPrevMonth = leadsPrevMonth.filter(
    (l) => l.status === "vendido" || l.status === "fechado",
  ).length;
  const pendingWithdrawals = withdrawals.filter(
    (w) => w.status === "pendente" || w.status === "aprovado",
  ).length;

  /* ---------- Funil mensal ---------- */
  const funnelData = FUNNEL_STEPS.map((step) => ({
    label: step.label,
    total: leadsThisMonth.filter((l) => step.statuses.includes(l.status)).length,
    fill: step.color,
  }));

  /* ---------- Origem dos leads (donut) ---------- */
  const originData = useMemo(() => {
    // Como não há campo "origem" no schema, classificamos como "Manual" (default)
    // e deixamos preparado caso futuramente exista um campo `source`.
    const total = leadsThisMonth.length;
    return [
      { name: "Manual", value: total, color: "hsl(262, 83%, 65%)" },
    ].filter((d) => d.value > 0);
  }, [leadsThisMonth]);

  /* ---------- Top 3 promotores ---------- */
  const topPromoters = useMemo(() => {
    const counts = new Map<string, number>();
    leadsThisMonth.forEach((l) =>
      counts.set(l.user_id, (counts.get(l.user_id) ?? 0) + 1),
    );
    const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
    return Array.from(counts.entries())
      .map(([id, total]) => ({
        id,
        name: nameById.get(id) || "Sem nome",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [leadsThisMonth, profiles]);

  /* ---------- Ações Recentes ---------- */
  const recentActions = useMemo(() => {
    const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
    const fromLeads = leads.slice(0, 6).map((l) => ({
      id: `lead-${l.id}`,
      icon: Users,
      iconClass: "bg-primary/10 text-primary",
      title: `Novo lead capturado — ${l.name}`,
      subtitle: nameById.get(l.user_id) || "Promoter",
      time: l.created_at,
    }));
    const fromWds = withdrawals.slice(0, 4).map((w) => ({
      id: `wd-${w.id}`,
      icon: AlertTriangle,
      iconClass: "bg-warning/10 text-warning",
      title: `Saque ${w.status} aguardando ação`,
      subtitle: "Financeiro",
      time: w.created_at,
    }));
    return [...fromLeads, ...fromWds]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [leads, withdrawals, profiles]);

  const newLeadsPct = pct(leadsThisMonth.length, leadsPrevMonth.length);
  const closedPct = pct(closedThisMonth, closedPrevMonth);

  return (
    <div className="space-y-6">
      {/* Banner de boas-vindas */}
      <Card className="p-5 rounded-xl border border-accent/40 bg-accent/30 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-14 w-14 ring-2 ring-background">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-lg md:text-xl font-bold flex items-center gap-2">
              Olá, {profile?.full_name?.split(" ")[0] || "Admin"}!{" "}
              <span aria-hidden>👋</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Logado como{" "}
              <span className="font-semibold text-foreground">
                {roleMeta.label}
              </span>
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`h-8 px-3 text-xs font-bold ${roleMeta.badgeClass}`}
        >
          {roleMeta.label}
        </Badge>
      </Card>

      {/* Título + Atualizar */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Global</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Período:{" "}
            <span className="font-semibold text-foreground">{periodLabel()}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
          <span className="text-muted-foreground tabular-nums">
            {refreshedAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </Button>
      </div>

      {/* 4 cards de métrica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Novos Leads (Mês)"
          value={leadsThisMonth.length}
          icon={Users}
          iconClass="bg-primary/10 text-primary"
          deltaPct={newLeadsPct}
          deltaLabel="vs mês anterior"
        />
        <MetricCard
          label="Vendas Fechadas"
          value={closedThisMonth}
          icon={TrendingUp}
          iconClass="bg-success/10 text-success"
          deltaPct={closedPct}
          deltaLabel={
            closedPrevMonth === 0
              ? "sem dados do mês anterior"
              : "vs mês anterior"
          }
        />
        <MetricCard
          label="MRR Adicionado"
          value="—"
          icon={DollarSign}
          iconClass="bg-accent text-accent-foreground"
          deltaPct={null}
          deltaLabel="sem dados do mês anterior"
        />
        <MetricCard
          label="Saques Pendentes"
          value={pendingWithdrawals}
          icon={AlertTriangle}
          iconClass="bg-warning/10 text-warning"
          deltaPct={null}
          deltaLabel={
            pendingWithdrawals === 0
              ? "sem pendências"
              : "aguardando aprovação"
          }
        />
      </div>

      {/* Origem dos Leads + Funil Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <Card className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold mb-4">Origem dos Leads</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-[180px] h-[180px] shrink-0">
              {originData.length === 0 ? (
                <div className="w-full h-full rounded-full border-[18px] border-muted flex items-center justify-center text-xs text-muted-foreground">
                  Sem dados
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={originData}
                        dataKey="value"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {originData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold">100%</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {originData.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum lead neste mês.
                </p>
              ) : (
                originData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: d.color }}
                      />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {d.value}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Funil */}
        <Card className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold mb-4">Funil Mensal de Conversão</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {funnelData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Parceiros + Ações Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            Top 3 Parceiros do Mês
          </h3>
          {topPromoters.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Sem capturas neste mês.
            </p>
          ) : (
            <ul className="space-y-2">
              {topPromoters.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <MedalBadge rank={i + 1} />
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                      {getInitials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">Promoter</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{p.total}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      leads
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Ações Recentes
            </h3>
            <span className="flex items-center gap-1.5 text-[11px] text-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              Ao vivo
            </span>
          </div>
          {recentActions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Nenhuma atividade recente.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentActions.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.iconClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight truncate">
                        {a.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {relTime(a.time)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */
function MetricCard({
  label,
  value,
  icon: Icon,
  iconClass,
  deltaPct,
  deltaLabel,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  iconClass: string;
  deltaPct: number | null;
  deltaLabel: string;
}) {
  let DeltaIcon = Minus;
  let deltaTone = "text-muted-foreground";
  if (deltaPct !== null) {
    if (deltaPct > 0) {
      DeltaIcon = ArrowUp;
      deltaTone = "text-success";
    } else if (deltaPct < 0) {
      DeltaIcon = ArrowDown;
      deltaTone = "text-destructive";
    }
  }

  return (
    <Card className="p-5 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-extrabold mt-3 tabular-nums">{value}</p>
      <div className="flex items-center gap-1.5 mt-2 text-[11px]">
        {deltaPct !== null && (
          <span className={`flex items-center gap-0.5 font-semibold ${deltaTone}`}>
            <DeltaIcon className="w-3 h-3" />
            {Math.abs(deltaPct)}%
          </span>
        )}
        <span className="text-muted-foreground">{deltaLabel}</span>
      </div>
    </Card>
  );
}

function MedalBadge({ rank }: { rank: number }) {
  const config = [
    { bg: "bg-warning text-warning-foreground", emoji: "🥇" },
    { bg: "bg-muted text-foreground", emoji: "🥈" },
    { bg: "bg-[hsl(var(--bronze))] text-white", emoji: "🥉" },
  ][rank - 1];
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${config.bg}`}
      aria-label={`#${rank}`}
    >
      <span aria-hidden>{config.emoji}</span>
    </div>
  );
}
