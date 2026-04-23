import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Target,
  DollarSign,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  phone: string | null;
  status: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
}

/* ---------- Helpers ---------- */
const STATUS_STYLE: Record<string, string> = {
  coletado: "bg-muted text-muted-foreground border-border",
  contatado: "bg-primary/10 text-primary border-primary/30",
  respondido: "bg-accent text-accent-foreground border-border",
  vendido: "bg-success/10 text-success border-success/30",
  fechado: "bg-success/10 text-success border-success/30",
  prospectado: "bg-primary/10 text-primary border-primary/30",
  negociando: "bg-warning/10 text-warning border-warning/30",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const todayLabel = () =>
  new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/* ---------- Página ---------- */
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [promotersCount, setPromotersCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ count: pc }, { data: leadsData }, { data: profilesData }] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase
            .from("leads")
            .select("id,user_id,name,phone,status,created_at")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase.from("profiles").select("id,full_name"),
        ]);
      setPromotersCount(pc ?? 0);
      setLeads((leadsData ?? []) as LeadRow[]);
      setProfiles((profilesData ?? []) as ProfileRow[]);
      setLoading(false);
    })();
  }, []);

  /* ---------- Métricas ---------- */
  const today = startOfDay(new Date());
  const startOfMonth = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const leadsHoje = leads.filter((l) => new Date(l.created_at) >= today).length;
  const conversions = leads.filter(
    (l) => l.status === "vendido" || l.status === "fechado",
  ).length;
  const conversionRate =
    leads.length > 0 ? Math.round((conversions / leads.length) * 100) : 0;

  /* ---------- Série últimos 7 dias ---------- */
  const last7Days = useMemo(() => {
    const days: { label: string; key: string; total: number }[] = [];
    const base = startOfDay(new Date());
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      days.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        total: 0,
      });
    }
    leads.forEach((l) => {
      const k = l.created_at.slice(0, 10);
      const slot = days.find((d) => d.key === k);
      if (slot) slot.total += 1;
    });
    return days;
  }, [leads]);

  /* ---------- Top 5 promoters do mês ---------- */
  const topPromoters = useMemo(() => {
    const counts = new Map<string, number>();
    leads
      .filter((l) => new Date(l.created_at) >= startOfMonth)
      .forEach((l) => counts.set(l.user_id, (counts.get(l.user_id) ?? 0) + 1));
    const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
    return Array.from(counts.entries())
      .map(([id, total]) => ({
        id,
        name: nameById.get(id) || "Sem nome",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [leads, profiles, startOfMonth]);

  /* ---------- Últimos 10 leads ---------- */
  const recent = leads.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {todayLabel()}
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Total de Promotores"
          value={promotersCount}
          tone="text-primary"
        />
        <MetricCard
          icon={Target}
          label="Leads Hoje"
          value={leadsHoje}
          tone="text-success"
        />
        <MetricCard
          icon={DollarSign}
          label="Conversões"
          value={conversions}
          tone="text-success"
        />
        <MetricCard
          icon={BarChart3}
          label="Taxa de Conversão"
          value={`${conversionRate}%`}
          tone="text-primary"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Linha — últimos 7 dias */}
        <Card className="p-5 rounded-xl shadow-sm border border-border bg-card">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Leads — últimos 7 dias</h2>
            <p className="text-xs text-muted-foreground">
              Capturados por dia
            </p>
          </div>
          <div className="h-[240px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="leadsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--success))"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--success))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fill="url(#leadsArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Barras — top 5 do mês */}
        <Card className="p-5 rounded-xl shadow-sm border border-border bg-card">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Top 5 promotores do mês</h2>
            <p className="text-xs text-muted-foreground">
              Por leads capturados
            </p>
          </div>
          {topPromoters.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
              Sem dados neste mês.
            </div>
          ) : (
            <div className="h-[240px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPromoters}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--foreground))",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="hsl(var(--primary))"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de leads recentes */}
      <Card className="rounded-xl shadow-sm border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-semibold">Últimos leads</h2>
          <p className="text-xs text-muted-foreground">
            10 capturas mais recentes
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-xs text-muted-foreground py-8"
                  >
                    {loading ? "Carregando..." : "Nenhum lead ainda."}
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wide ${
                          STATUS_STYLE[l.status] ?? STATUS_STYLE.coletado
                        }`}
                      >
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatDate(l.created_at)}{" "}
                      <span className="opacity-60">{formatTime(l.created_at)}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */
function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <Card className="p-5 rounded-xl shadow-sm border border-border bg-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-2 tabular-nums">{value}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
          <Icon className={`w-4 h-4 ${tone}`} />
        </div>
      </div>
    </Card>
  );
}
