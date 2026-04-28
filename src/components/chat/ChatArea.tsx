import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatLead } from "./LeadList";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Wifi, WifiOff, MessageSquareOff, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface RawMessage {
  type: "human" | "ai";
  content: string;
}

interface ChatMessage {
  id: number;
  session_id: string;
  message: RawMessage;
  hora_data_mensagem: string;
}

interface ChatAreaProps {
  lead: ChatLead | null;
}

// ─────────────────────────────────────────────
// Session ID variations (n8n may store in many formats)
// Ex: "98984987587", "5598984987587", "+5598984987587",
//     "98984987587@s.whatsapp.net", "5598984987587@c.us"
// ─────────────────────────────────────────────
function buildSessionVariants(rawPhone: string): string[] {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return [];

  const variants = new Set<string>();

  // As-is (digits only)
  variants.add(digits);

  // With Brazil DDI 55
  if (!digits.startsWith("55")) {
    variants.add("55" + digits);
  } else {
    // Also try without DDI
    variants.add(digits.slice(2));
  }

  // With + prefix
  variants.add("+" + digits);
  if (!digits.startsWith("55")) {
    variants.add("+55" + digits);
  }

  // WhatsApp suffixes
  for (const d of [...variants]) {
    variants.add(d + "@s.whatsapp.net");
    variants.add(d + "@c.us");
    variants.add(d + "@g.us");
  }

  return [...variants];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatTime(dateStr: string): string {
  try { return format(new Date(dateStr), "HH:mm", { locale: ptBR }); }
  catch { return ""; }
}

function formatDateSeparator(dateStr: string): string {
  try { return format(new Date(dateStr), "EEEE, dd 'de' MMMM", { locale: ptBR }); }
  catch { return ""; }
}

function isSameDay(a: string, b: string): boolean {
  try {
    const da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate();
  } catch { return false; }
}

// ─────────────────────────────────────────────
// Empty / No Messages state
// ─────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 h-full select-none">
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner">
          <Bot className="w-9 h-9 text-primary/50" />
        </div>
        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-background flex items-center justify-center">
          <Wifi className="w-3 h-3 text-emerald-500" />
        </span>
      </div>
      <h3 className="text-lg font-semibold text-foreground/80 mb-1">Caixa de Entrada</h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
        Selecione um contato na lista lateral para visualizar o histórico de conversas monitorado pelo n8n.
      </p>
    </div>
  );
}

function NoMessages({ phone, sessionId }: { phone: string | null; sessionId: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 select-none px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
        <MessageSquareOff className="w-7 h-7 text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Sem mensagens encontradas</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Buscado como: <code className="bg-muted px-1 rounded text-[10px]">{sessionId}</code>
        </p>
        <p className="text-[10px] text-muted-foreground/40 mt-2 max-w-xs">
          Verifique se o n8n está salvando mensagens em <strong>n8n_chat_histories</strong> com este número no campo <strong>session_id</strong>.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Date separator
// ─────────────────────────────────────────────
function DateSeparator({ dateStr }: { dateStr: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2 select-none">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">
        {formatDateSeparator(dateStr)}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────
function MessageBubble({ msg, leadName }: { msg: ChatMessage; leadName: string }) {
  const isAI = msg.message?.type === "ai";
  const content = msg.message?.content ?? "(mensagem sem conteúdo)";
  const timeStr = msg.hora_data_mensagem ? formatTime(msg.hora_data_mensagem) : "";

  return (
    <div className={cn("flex w-full items-end gap-2 mb-1", isAI ? "justify-start" : "justify-end")}>
      {/* Avatar — AI */}
      {isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center shadow-sm mb-1">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className={cn("group relative max-w-[72%] sm:max-w-[60%] flex flex-col", isAI ? "items-start" : "items-end")}>
        {/* Sender label */}
        <span className={cn("text-[10px] font-semibold mb-1 px-1 flex items-center gap-1", isAI ? "text-violet-500" : "text-emerald-600")}>
          {isAI ? <><Bot className="w-2.5 h-2.5" /> Assistente Ray</> : <><User className="w-2.5 h-2.5" /> {leadName}</>}
        </span>

        {/* Bubble */}
        <div className={cn(
          "relative px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words",
          isAI
            ? "bg-background border border-border text-foreground rounded-2xl rounded-tl-none"
            : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl rounded-tr-none"
        )}>
          {content}
        </div>

        {/* Timestamp */}
        {timeStr && (
          <span className="text-[9px] mt-1 px-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {timeStr}
          </span>
        )}
      </div>

      {/* Avatar — Human */}
      {!isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm mb-1">
          <User className="w-3.5 h-3.5 text-emerald-600" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function ChatArea({ lead }: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [resolvedSessionId, setResolvedSessionId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    }, 80);
  }, []);

  useEffect(() => {
    if (!lead?.phone) {
      setMessages([]);
      setConnected(false);
      setResolvedSessionId("");
      return;
    }

    const variants = buildSessionVariants(lead.phone);
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function findSessionAndLoad() {
      setLoading(true);
      setMessages([]);
      setResolvedSessionId(variants[0]);

      // Try each variant until we find one that has messages
      let found: ChatMessage[] = [];
      let foundSession = variants[0];

      for (const variant of variants) {
        if (cancelled) return;
        const { data } = await supabase
          .from("n8n_chat_histories")
          .select("*")
          .eq("session_id", variant)
          .order("hora_data_mensagem", { ascending: true })
          .limit(300);

        if (data && data.length > 0) {
          found = data as unknown as ChatMessage[];
          foundSession = variant;
          break;
        }
      }

      if (cancelled) return;

      setMessages(found);
      setResolvedSessionId(foundSession);
      setLoading(false);
      scrollToBottom(false);

      // Subscribe to realtime using resolved session_id
      activeChannel = supabase
        .channel(`chat_rt_${foundSession.replace(/[^a-zA-Z0-9]/g, "_")}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "n8n_chat_histories",
            filter: `session_id=eq.${foundSession}`,
          },
          (payload) => {
            if (!cancelled) {
              setMessages((prev) => [...prev, payload.new as unknown as ChatMessage]);
              scrollToBottom(true);
            }
          }
        )
        .subscribe((status) => {
          if (!cancelled) setConnected(status === "SUBSCRIBED");
        });
    }

    findSessionAndLoad();

    return () => {
      cancelled = true;
      if (activeChannel) supabase.removeChannel(activeChannel);
      setConnected(false);
    };
  }, [lead, scrollToBottom]);

  if (!lead) return <EmptyState />;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Header ─────────────────────────────── */}
      <div className="px-5 py-3.5 bg-background border-b border-border flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary text-sm">
              {lead.name.substring(0, 2).toUpperCase()}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              connected ? "bg-emerald-500" : "bg-muted-foreground/40"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{lead.name}</h3>
            <div className="flex items-center gap-1.5">
              <Hash className="w-2.5 h-2.5 text-muted-foreground/50" />
              <p className="text-[11px] text-muted-foreground leading-tight font-mono">
                {resolvedSessionId || lead.phone || "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {connected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            : <WifiOff className="w-3.5 h-3.5 text-muted-foreground/50" />}
          <span className={cn("text-[10px] font-medium", connected ? "text-emerald-600" : "text-muted-foreground/50")}>
            {connected ? "Ao vivo" : "Conectando..."}
          </span>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ background: "radial-gradient(ellipse at top, hsl(var(--muted)/0.15) 0%, transparent 70%)" }}
      >
        {loading ? (
          <div className="flex flex-col gap-4 pt-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn("flex gap-2 animate-pulse", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <div className="w-7 h-7 rounded-full bg-muted shrink-0 self-end" />
                <div className={cn("h-12 rounded-2xl bg-muted", i % 2 === 0 ? "w-48" : "w-36")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <NoMessages phone={lead.phone} sessionId={resolvedSessionId} />
        ) : (
          <>
            {messages.map((msg, index) => {
              const showSeparator =
                index === 0 ||
                !isSameDay(messages[index - 1].hora_data_mensagem, msg.hora_data_mensagem);
              return (
                <div key={msg.id ?? index}>
                  {showSeparator && <DateSeparator dateStr={msg.hora_data_mensagem} />}
                  <MessageBubble msg={msg} leadName={lead.name} />
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Footer read-only ─────────────────────── */}
      <div className="px-5 py-3 bg-background border-t border-border shrink-0">
        <div className="flex items-center gap-2 bg-muted/40 border border-border/50 border-dashed rounded-xl px-4 py-2.5">
          <Bot className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <p className="text-xs text-muted-foreground/70 text-center flex-1">
            Painel somente leitura — o n8n gerencia as respostas automaticamente via WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
