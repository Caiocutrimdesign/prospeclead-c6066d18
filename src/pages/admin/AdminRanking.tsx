import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Row = {
  user_id: string;
  full_name: string;
  level: string;
  monthly_earnings: number;
  total_leads: number;
  vendidos: number;
};

export default function AdminRanking() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: leads }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, level, monthly_earnings"),
        supabase.from("leads").select("user_id, status"),
      ]);
      const map = new Map<string, Row>();
      (profiles ?? []).forEach((p) =>
        map.set(p.id, {
          user_id: p.id,
          full_name: p.full_name ?? "—",
          level: p.level ?? "BRONZE",
          monthly_earnings: Number(p.monthly_earnings ?? 0),
          total_leads: 0,
          vendidos: 0,
        }),
      );
      (leads ?? []).forEach((l) => {
        const r = map.get(l.user_id);
        if (!r) return;
        r.total_leads += 1;
        if (l.status === "vendido" || l.status === "fechado") r.vendidos += 1;
      });
      const arr = Array.from(map.values()).sort(
        (a, b) => b.monthly_earnings - a.monthly_earnings,
      );
      setRows(arr);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-warning" /> Ranking de Promoters
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Ordenado por ganhos no mês.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <Card
              key={r.user_id}
              className={`p-4 flex items-center gap-4 ${
                i < 3 ? "border-2" : ""
              } ${i === 0 ? "border-gold" : i === 1 ? "border-silver" : i === 2 ? "border-bronze" : ""}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  i === 0
                    ? "bg-warning text-white"
                    : i === 1
                    ? "bg-muted-foreground text-white"
                    : i === 2
                    ? "bg-bronze text-white"
                    : "bg-muted text-foreground"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{r.full_name}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    <Medal className="w-3 h-3 mr-0.5" />
                    {r.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.total_leads} leads · {r.vendidos} convertidos
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">
                  {formatBRL(r.monthly_earnings)}
                </p>
                <p className="text-[10px] text-muted-foreground">no mês</p>
              </div>
            </Card>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem promoters cadastrados ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
