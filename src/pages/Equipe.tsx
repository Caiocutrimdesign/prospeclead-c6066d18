import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Store, Medal, Fuel } from "lucide-react";

interface Promoter {
  id: string;
  full_name: string;
  leads: number;
  earnings: number;
  isMe?: boolean;
}

interface PartnerPdv {
  id: string;
  name: string;
  manager: string;
  leads: number;
  earnings: number;
  isMine?: boolean;
  kind?: "fuel" | "store";
}

// Dados mock fiéis aos prints — apenas visualização
const MOCK_PROMOTERS: Promoter[] = [
  { id: "1", full_name: "Carlos Ferreira", leads: 47, earnings: 2350 },
  { id: "2", full_name: "Ana Paula Silva", leads: 42, earnings: 2100 },
  { id: "3", full_name: "Rodrigo Santos", leads: 38, earnings: 1900 },
  { id: "4", full_name: "Fernanda Lima", leads: 31, earnings: 1550 },
  { id: "5", full_name: "João Almeida", leads: 27, earnings: 1350 },
  { id: "6", full_name: "Mariana Costa", leads: 22, earnings: 1100 },
  { id: "7", full_name: "Carlos Mendonça", leads: 18, earnings: 900, isMe: true },
];

const MOCK_PARTNERS: PartnerPdv[] = [
  { id: "1", name: "Posto Ipiranga Centro", manager: "Carlos Ferreira", leads: 63, earnings: 3100, kind: "fuel" },
  { id: "2", name: "Posto BR Avenida", manager: "Ana Paula Silva", leads: 51, earnings: 2500, kind: "fuel" },
  { id: "3", name: "Lava-Jato Express", manager: "Você", leads: 44, earnings: 2200, isMine: true, kind: "store" },
  { id: "4", name: "Posto Shell Marginal", manager: "Rodrigo Santos", leads: 38, earnings: 1900, kind: "fuel" },
  { id: "5", name: "Auto Center Norte", manager: "Você", leads: 32, earnings: 1600, isMine: true, kind: "store" },
  { id: "6", name: "Posto Petrobras Sul", manager: "Fernanda Lima", leads: 26, earnings: 1300, kind: "fuel" },
  { id: "7", name: "Oficina São Jorge", manager: "—", leads: 19, earnings: 950, kind: "store" },
];

export default function Equipe() {
  const { user } = useAuth();
  const [promoters] = useState<Promoter[]>(MOCK_PROMOTERS);
  const [partners] = useState<PartnerPdv[]>(MOCK_PARTNERS);
  const [myName, setMyName] = useState<string>("Você");

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.full_name) setMyName(data.full_name);
    })();
  }, [user]);

  const myPromoter = promoters.find((p) => p.isMe);
  const leaderLeads = promoters[0]?.leads ?? 0;
  const missingForFirst = myPromoter ? Math.max(0, leaderLeads - myPromoter.leads + 1) : 0;

  return (
    <div className="pb-28">
      {/* Header azul "Ranking" */}
      <div className="bg-gradient-to-b from-[hsl(217_91%_55%)] to-[hsl(217_91%_48%)] text-primary-foreground -mx-4 px-4 pt-6 pb-16 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-warning" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Ranking</h1>
            <p className="text-xs opacity-80">Mês atual · Atualizado agora</p>
          </div>
        </div>
      </div>

      {/* Tabs sobrepondo o header */}
      <div className="-mt-12">
        <Tabs defaultValue="promoters">
          <TabsList className="grid grid-cols-2 w-full bg-transparent h-auto p-0 gap-0 border-0">
            <TabsTrigger
              value="promoters"
              className="flex flex-col items-center gap-1 py-3 rounded-none bg-transparent text-white/80 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-white"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Promotores</span>
            </TabsTrigger>
            <TabsTrigger
              value="partners"
              className="flex flex-col items-center gap-1 py-3 rounded-none bg-transparent text-white/80 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-white"
            >
              <Store className="w-5 h-5" />
              <span className="text-sm font-medium">Parceiros PDV</span>
            </TabsTrigger>
          </TabsList>

          {/* PROMOTORES */}
          <TabsContent value="promoters" className="mt-4 space-y-2">
            {promoters.map((p, idx) => (
              <PromoterRow key={p.id} pos={idx + 1} promoter={p} />
            ))}

            {myPromoter && (
              <div className="fixed left-0 right-0 bottom-16 px-4 z-30">
                <Card className="bg-[hsl(217_91%_30%)] text-white border-0 p-3 flex items-center justify-between rounded-2xl shadow-elegant">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold shrink-0">
                      {promoters.findIndex((x) => x.isMe) + 1}º
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{myName}</p>
                      <p className="text-[11px] opacity-80">
                        Sua posição atual · {myPromoter.leads} leads
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] opacity-80">Faltam</p>
                    <p className="font-bold text-sm">{missingForFirst} leads</p>
                    <p className="text-[10px] opacity-80">p/ o 1º lugar</p>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* PARCEIROS PDV */}
          <TabsContent value="partners" className="mt-4 space-y-2">
            {/* Banner verde */}
            <Card className="bg-gradient-to-r from-[hsl(142_76%_36%)] to-[hsl(160_84%_39%)] text-white border-0 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold leading-tight">Top Parceiros PDV</p>
                <p className="text-xs opacity-90">Mês atual · Ordenado por leads capturados</p>
              </div>
            </Card>

            {partners.slice(0, 3).map((p, idx) => (
              <PartnerRow key={p.id} pos={idx + 1} partner={p} />
            ))}

            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">Demais PDVs</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {partners.slice(3).map((p, idx) => (
              <PartnerRow key={p.id} pos={idx + 4} partner={p} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MedalIcon({ pos }: { pos: number }) {
  if (pos === 1) return <Medal className="w-5 h-5" style={{ color: "hsl(var(--gold))" }} />;
  if (pos === 2) return <Medal className="w-5 h-5" style={{ color: "hsl(var(--silver))" }} />;
  if (pos === 3) return <Medal className="w-5 h-5" style={{ color: "hsl(var(--bronze))" }} />;
  return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">{pos}º</span>;
}

function podiumBg(pos: number, isMine?: boolean) {
  if (isMine) return "bg-success/10 border-success/30";
  if (pos === 1) return "bg-[hsl(48_100%_94%)] border-[hsl(48_100%_75%)]";
  if (pos === 2) return "bg-[hsl(0_0%_94%)] border-[hsl(0_0%_80%)]";
  if (pos === 3) return "bg-[hsl(30_70%_92%)] border-[hsl(30_70%_75%)]";
  return "bg-card border-border";
}

function PromoterRow({ pos, promoter }: { pos: number; promoter: Promoter }) {
  const initial = promoter.full_name.charAt(0).toUpperCase();
  return (
    <Card className={`p-3 border ${podiumBg(pos, promoter.isMe)} flex items-center gap-3`}>
      <div className="w-7 flex items-center justify-center shrink-0">
        <MedalIcon pos={pos} />
      </div>
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-sm truncate ${promoter.isMe ? "text-success" : ""}`}>
            {promoter.full_name}
          </p>
          {promoter.isMe && (
            <Badge className="bg-success text-success-foreground border-0 text-[10px] py-0 px-2">Você</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{promoter.leads} leads</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-bold text-sm ${promoter.isMe ? "text-success" : "text-foreground"}`}>
          R$ {promoter.earnings.toLocaleString("pt-BR")}
        </p>
        <p className="text-[10px] text-muted-foreground">este mês</p>
      </div>
    </Card>
  );
}

function PartnerRow({ pos, partner }: { pos: number; partner: PartnerPdv }) {
  return (
    <Card className={`p-3 border ${podiumBg(pos, partner.isMine)} flex items-center gap-3`}>
      <div className="w-7 flex items-center justify-center shrink-0">
        <MedalIcon pos={pos} />
      </div>
      <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center shrink-0">
        {partner.kind === "store" ? (
          <Store className="w-5 h-5 text-[hsl(var(--brand-blue))]" />
        ) : (
          <Fuel className="w-5 h-5 text-destructive" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{partner.name}</p>
          {partner.isMine && (
            <Badge className="bg-success text-success-foreground border-0 text-[10px] py-0 px-2">Sua Rede</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">Gerenciado por: {partner.manager}</p>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1 text-foreground">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="font-bold text-sm">{partner.leads}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">R$ {(partner.earnings / 1000).toFixed(1)}k</p>
      </div>
    </Card>
  );
}
