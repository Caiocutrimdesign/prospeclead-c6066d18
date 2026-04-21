import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { Users, ContactRound, Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

interface Stats {
  promoters: number;
  leads: number;
  leadsHoje: number;
  vendidos: number;
  saquesPendentes: number;
  saquesPagos: number;
  totalCarteira: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    promoters: 0,
    leads: 0,
    leadsHoje: 0,
    vendidos: 0,
    saquesPendentes: 0,
    saquesPagos: 0,
    totalCarteira: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [{ count: promoters }, { data: leads }, { data: wds }, { data: txs }] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("leads").select("id,status,created_at"),
          supabase.from("wallet_withdrawals").select("amount,status"),
          supabase.from("wallet_transactions").select("amount"),
        ]);
      const leadsHoje =
        leads?.filter((l) => new Date(l.created_at) >= today).length ?? 0;
      const vendidos =
        leads?.filter((l) => l.status === "vendido" || l.status === "fechado")
          .length ?? 0;
      const saquesPendentes =
        wds?.filter((w) => w.status === "pendente" || w.status === "aprovado")
          .reduce((s, w) => s + Number(w.amount), 0) ?? 0;
      const saquesPagos =
        wds?.filter((w) => w.status === "pago").reduce((s, w) => s + Number(w.amount), 0) ??
        0;
      const totalCarteira = txs?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
      setStats({
        promoters: promoters ?? 0,
        leads: leads?.length ?? 0,
        leadsHoje,
        vendidos,
        saquesPendentes,
        saquesPagos,
        totalCarteira,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Visão Geral</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Painel administrativo do sistema ProspecLead.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Promoters" value={stats.promoters} color="text-primary" />
        <StatCard icon={ContactRound} label="Leads totais" value={stats.leads} color="text-foreground" />
        <StatCard icon={TrendingUp} label="Leads hoje" value={stats.leadsHoje} color="text-success" />
        <StatCard icon={CheckCircle2} label="Convertidos" value={stats.vendidos} color="text-success" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BigCard
          icon={Wallet}
          label="Saldo total na carteira"
          value={formatBRL(stats.totalCarteira)}
          tone="bg-primary/5 border-primary/20"
        />
        <BigCard
          icon={Clock}
          label="Saques aguardando pagamento"
          value={formatBRL(stats.saquesPendentes)}
          tone="bg-warning/10 border-warning/30"
          badge="PENDENTE"
        />
        <BigCard
          icon={CheckCircle2}
          label="Total já pago"
          value={formatBRL(stats.saquesPagos)}
          tone="bg-success/10 border-success/30"
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground text-center">Carregando dados...</p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-4">
      <Icon className={`w-5 h-5 ${color}`} />
      <p className="text-2xl font-bold mt-2 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function BigCard({
  icon: Icon,
  label,
  value,
  tone,
  badge,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: string;
  badge?: string;
}) {
  return (
    <Card className={`p-5 border ${tone}`}>
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-foreground" />
        {badge && <Badge variant="outline">{badge}</Badge>}
      </div>
      <p className="text-2xl font-extrabold mt-3 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}
