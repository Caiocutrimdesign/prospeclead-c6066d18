import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Visit = Database["public"]["Tables"]["visits"]["Row"];

export default function Agenda() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (!user) return;
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    supabase.from("visits").select("*").eq("user_id", user.id)
      .gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString())
      .order("scheduled_at").then(({ data }) => setVisits(data || []));
  }, [user]);

  const done = visits.filter((v) => v.status === "concluida").length;
  const pct = visits.length ? Math.round((done / visits.length) * 100) : 0;
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
        <h1 className="text-2xl font-bold">Visitas de hoje</h1>
      </div>

      <Card className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{done}/{visits.length} concluídas</span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </Card>

      {visits.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhuma visita agendada para hoje</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visits.map((v) => (
            <Card key={v.id} className="p-4 flex items-center gap-3">
              <div className="text-center w-14 shrink-0">
                <p className="text-xs text-muted-foreground">
                  {new Date(v.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{v.place_name}</p>
                {v.address && <p className="text-xs text-muted-foreground truncate">{v.address}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                v.status === "concluida" ? "bg-success/15 text-success" :
                v.status === "em_andamento" ? "bg-warning/15 text-warning" :
                "bg-muted text-muted-foreground"
              }`}>{v.status.replace("_", " ")}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
