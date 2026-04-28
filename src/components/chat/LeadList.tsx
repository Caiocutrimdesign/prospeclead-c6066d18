import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, MessageCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface ChatLead {
  id: string;
  name: string;
  phone: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageType?: "human" | "ai";
}

interface LeadListProps {
  selectedLeadId?: string;
  onSelectLead: (lead: ChatLead) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM/yy", { locale: ptBR });
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function LeadList({ selectedLeadId, onSelectLead }: LeadListProps) {
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadLeads = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, phone, updated_at")
      .not("phone", "is", null)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (leadsError || !leadsData) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: chatData } = await supabase
      .from("n8n_chat_histories")
      .select("session_id, message, hora_data_mensagem")
      .order("hora_data_mensagem", { ascending: false })
      .limit(2000);

    const sessionMap = new Map<string, { content: string; at: string; type: "human" | "ai" }>();
    if (chatData) {
      for (const row of chatData) {
        const sid = row.session_id as string;
        if (!sessionMap.has(sid)) {
          const msg = row.message as { type: "human" | "ai"; content: string };
          sessionMap.set(sid, {
            content: msg?.content ?? "",
            at: row.hora_data_mensagem as string,
            type: msg?.type ?? "human",
          });
        }
      }
    }

    const enriched: ChatLead[] = leadsData.map((lead) => {
      const phone = (lead.phone ?? "").replace(/\D/g, "");
      const chatInfo = sessionMap.get(phone);
      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        lastMessage: chatInfo?.content,
        lastMessageAt: chatInfo?.at ?? lead.updated_at,
        lastMessageType: chatInfo?.type,
      };
    });

    enriched.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    setLeads(enriched);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    const channel = supabase
      .channel("leadlist_realtime_watcher")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "n8n_chat_histories" }, () => {
        loadLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadLeads]);

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search))
  );

  const withChat = filtered.filter((l) => l.lastMessage);
  const withoutChat = filtered.filter((l) => !l.lastMessage);

  return (
    <div className="flex flex-col h-full w-[320px] min-w-[280px] border-r border-border shrink-0 bg-background">
      <div className="px-4 pt-5 pb-4 border-b border-border shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight">Conversas</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => loadLeads(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato ou número..."
            className="pl-9 h-9 bg-muted/50 text-sm border-border/60"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum contato encontrado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tente outro nome ou número</p>
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            {withChat.length > 0 && (
              <>
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Com histórico
                </div>
                {withChat.map((lead) => (
                  <LeadItem key={lead.id} lead={lead} isSelected={selectedLeadId === lead.id} onSelect={onSelectLead} />
                ))}
              </>
            )}
            {withoutChat.length > 0 && (
              <>
                <div className="px-4 py-2 mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Sem interação ainda
                </div>
                {withoutChat.map((lead) => (
                  <LeadItem key={lead.id} lead={lead} isSelected={selectedLeadId === lead.id} onSelect={onSelectLead} />
                ))}
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function LeadItem({ lead, isSelected, onSelect }: { lead: ChatLead; isSelected: boolean; onSelect: (lead: ChatLead) => void }) {
  const avatarColor = getAvatarColor(lead.id);
  return (
    <button
      onClick={() => onSelect(lead)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150",
        "hover:bg-muted/60 active:bg-muted border-b border-border/40 last:border-0",
        isSelected && "bg-primary/5 border-l-[3px] border-l-primary"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11">
          <AvatarFallback className={cn("text-sm font-bold", avatarColor)}>
            {getInitials(lead.name)}
          </AvatarFallback>
        </Avatar>
        {lead.lastMessage && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1 mb-0.5">
          <p className={cn("text-sm truncate", isSelected ? "font-semibold text-primary" : "font-medium text-foreground")}>
            {lead.name}
          </p>
          {lead.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
              {formatRelativeTime(lead.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {lead.lastMessage
            ? (lead.lastMessageType === "ai" ? "🤖 " : "💬 ") + lead.lastMessage
            : lead.phone || "Sem número"}
        </p>
      </div>
    </button>
  );
}
