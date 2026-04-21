import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Users,
  Wallet,
  ContactRound,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { formatBRL } from "@/lib/format";

type Stats = {
  promoters: number;
  totalLeads: number;
  totalPaid: number;
  pendingWithdrawals: number;
  pendingAmount: number;
  monthEarnings: number;
};

export default function RhDashboard() {
  const [stats, setStats] = useState<Stats>({
    promoters: 0,
    totalLeads: 0,
    totalPaid: 0,
    pendingWithdrawals: 0,
    pendingAmount: 0,
    monthEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        { count: promoters },
        { count: totalLeads },
        { data: withdrawals },
        { data: profiles },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase
          .from("wallet_withdrawals")
          .select("amount, status"),
        supabase.from("profiles").select("monthly_earnings"),
      ]);

      const ws = withdrawals ?? [];
      const totalPaid = ws
        .filter((w) => w.status === "pago")
        .reduce((s, w) => s + Number(w.amount), 0);
      const pending = ws.filter(
        (w) => w.status === "pendente" || w.status === "aprovado",
      );
      const pendingAmount = pending.reduce((s, w) => s + Number(w.amount), 0);
      const monthEarnings = (profiles ?? []).reduce(
        (s, p) => s + Number(p.monthly_earnings ?? 0),
        0,
      );

      setStats({
        promoters: promoters ?? 0,
        totalLeads: totalLeads ?? 0,
        totalPaid,
        pendingWithdrawals: pending.length,
        pendingAmount,
        monthEarnings,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Dashboard RH</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral de promoters, resultados e pagamentos.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label="Promoters cadastradas"
          value={String(stats.promoters)}
          loading={loading}
        />
        <StatCard
          icon={<ContactRound className="w-5 h-5 text-primary" />}
          label="Leads totais"
          value={String(stats.totalLeads)}
          loading={loading}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-success" />}
          label="Ganhos do mês (todas)"
          value={formatBRL(stats.monthEarnings)}
          loading={loading}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-warning" />}
          label="Saques aguardando"
          value={String(stats.pendingWithdrawals)}
          loading={loading}
          accent="warning"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5 text-warning" />}
          label="Valor a pagar"
          value={formatBRL(stats.pendingAmount)}
          loading={loading}
          accent="warning"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
          label="Já pago via PIX"
          value={formatBRL(stats.totalPaid)}
          loading={loading}
          accent="success"
        />
      </div>

      <Card className="p-4 bg-muted/40">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Permissões deste perfil:</strong>{" "}
          você pode visualizar todas as promoters e resultados, e processar
          pagamentos PIX (aprovar / marcar como pago / rejeitar). Não é possível
          criar, editar ou excluir cadastros.
        </p>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  accent?: "warning" | "success";
}) {
  const accentCls =
    accent === "warning"
      ? "bg-warning/5 border-warning/30"
      : accent === "success"
        ? "bg-success/5 border-success/30"
        : "";
  return (
    <Card className={`p-4 ${accentCls}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums">
        {loading ? "…" : value}
      </p>
    </Card>
  );
}
