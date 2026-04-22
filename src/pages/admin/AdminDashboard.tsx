import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import {
  Users,
  ContactRound,
  Wallet,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
} from "lucide-react";

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
        wds?.filter((w) => w.status === "pago")
          .reduce((s, w) => s + Number(w.amount), 0) ?? 0;
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
    <div className="px-4 pt-5 pb-4 space-y-4">
      {/* Saudação */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo,</p>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Admin <Shield className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão geral do sistema
          </p>
        </div>
      </div>

      {/* Card destaque - saldo total */}
      <Card className="p-5 bg-gradient-prospeclead text-primary-foreground space-y-1 text-center border-0">
        <p className="text-xs opacity-90 uppercase tracking-wide">
          Saldo total na carteira
        </p>
        <p className="text-3xl font-bold">{formatBRL(stats.totalCarteira)}</p>
        <p className="text-xs opacity-90">Soma de todas as promoters</p>
      </Card>

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          icon={Users}
          label="Promoters"
          value={String(stats.promoters)}
          color="text-primary"
        />
        <MiniStat
          icon={ContactRound}
          label="Leads totais"
          value={String(stats.leads)}
          color="text-foreground"
        />
        <MiniStat
          icon={TrendingUp}
          label="Leads hoje"
          value={String(stats.leadsHoje)}
          color="text-success"
        />
        <MiniStat
          icon={CheckCircle2}
          label="Convertidos"
          value={String(stats.vendidos)}
          color="text-success"
        />
      </div>

      {/* Saques resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-warning/10 border-warning/30">
          <Clock className="w-5 h-5 text-warning" />
          <p className="text-lg font-bold mt-2 tabular-nums">
            {formatBRL(stats.saquesPendentes)}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Saques aguardando pagamento
          </p>
        </Card>
        <Card className="p-4 bg-success/10 border-success/30">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <p className="text-lg font-bold mt-2 tabular-nums">
            {formatBRL(stats.saquesPagos)}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Total já pago via PIX
          </p>
        </Card>
      </div>

      {/* Ações rápidas - cards de gradiente */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground text-center my-3">
          AÇÕES RÁPIDAS
        </p>
        <div className="grid grid-cols-1 gap-3">
          <ActionCard
            to="/admin/promoters"
            icon={Users}
            title="Promoters"
            subtitle="Cadastros · Níveis · Status"
            gradient="bg-gradient-promoter"
            badge={`${stats.promoters} ativos`}
          />
          <ActionCard
            to="/admin/leads"
            icon={ContactRound}
            title="Leads"
            subtitle="B2C e B2B · Histórico completo"
            gradient="bg-gradient-leads"
            badge={`${stats.leads} no total`}
          />
          <ActionCard
            to="/admin/saques"
            icon={Wallet}
            title="Saques PIX"
            subtitle="Aprovar · Pagar · Rejeitar"
            gradient="bg-gradient-wallet"
            badge={formatBRL(stats.saquesPendentes)}
            tag="PENDENTES"
          />
          <ActionCard
            to="/admin/ranking"
            icon={Trophy}
            title="Ranking"
            subtitle="Top promoters · Performance"
            gradient="bg-gradient-b2b"
          />
        </div>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          Carregando dados...
        </p>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
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

function ActionCard({
  to,
  icon: Icon,
  title,
  subtitle,
  gradient,
  badge,
  tag,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  subtitle: string;
  gradient: string;
  badge?: string;
  tag?: string;
}) {
  return (
    <Link
      to={to}
      className={`${gradient} text-primary-foreground rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 active:scale-[0.98] transition shadow-md`}
    >
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-base leading-tight">{title}</p>
          {tag && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">
              {tag}
            </span>
          )}
        </div>
        <p className="text-xs opacity-90 truncate">{subtitle}</p>
      </div>
      {badge && (
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/20 shrink-0">
          {badge}
        </span>
      )}
      <ArrowRight className="w-5 h-5 opacity-80 shrink-0" />
    </Link>
  );
}
