import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatLead } from "./LeadList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, Wifi, WifiOff, MessageSquareOff } from "lucide-react";
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
// Helpers
// ─────────────────────────────────────────────
function formatTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), "HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

function formatDateSeparator(dateStr: string): string {
  try {
    return format(new Date(dateStr), "EEEE, dd 'de' MMMM", { locale: ptBR });
  } catch {
    return "";
  }
}

function isSameDay(a: string, b: string): boolean {
  try {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Empty / Loading states
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

function NoMessages({ phone }: { phone: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
        <MessageSquareOff className="w-7 h-7 text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Sem mensagens</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Nenhuma conversa encontrada para {phone || "este contato"}
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
  const isAI = msg.message.type === "ai";
  const timeStr = msg.hora_data_mensagem ? formatTime(msg.hora_data_mensagem) : "";

  return (
    <div className={cn("flex w-full items-end gap-2", isAI ? "justify-start" : "justify-end")}>
      {/* Avatar — AI side */}
      {isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center shadow-sm mb-1">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div
        className={cn(
          "group relative max-w-[72%] sm:max-w-[60%] flex flex-col",
          isAI ? "items-start" : "items-end"
        )}
      >
        {/* Sender label */}
        <span
          className={cn(
            "text-[10px] font-semibold mb-1 px-1 flex items-center gap-1",
            isAI ? "text-violet-500" : "text-emerald-600"
          )}
        >
          {isAI ? (
            <>
              <Bot className="w-2.5 h-2.5" />
              Assistente Ray
            </>
          ) : (
            <>
              <User className="w-2.5 h-2.5" />
              {leadName}
            </>
          )}
        </span>

        {/* Bubble */}
        <div
          className={cn(
            "relative px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words",
            isAI
              ? "bg-background border border-border text-foreground rounded-2xl rounded-tl-none"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl rounded-tr-none"
          )}
        >
          {msg.message.content}

          {/* Tail — AI */}
          {isAI && (
            <span className="absolute -left-[6px] top-0 w-3 h-3 overflow-hidden pointer-events-none">
              <span className="absolute top-0 left-0 w-4 h-4 rounded-bl-full bg-background border-b border-l border-border" />
            </span>
          )}
          {/* Tail — Human */}
          {!isAI && (
            <span className="absolute -right-[6px] top-0 w-3 h-3 overflow-hidden pointer-events-none">
              <span className="absolute top-0 right-0 w-4 h-4 rounded-br-full bg-emerald-500" />
            </span>
          )}
        </div>

        {/* Timestamp */}
        {timeStr && (
          <span
            className={cn(
              "text-[9px] mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              isAI ? "text-muted-foreground" : "text-muted-foreground"
            )}
          >
            {timeStr}
          </span>
        )}
      </div>

      {/* Avatar — Human side */}
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    }, 60);
  }, []);

  useEffect(() => {
    if (!lead?.phone) {
      setMessages([]);
      setConnected(false);
      return;
    }

    const sessionId = lead.phone.replace(/\D/g, "");

    // ── Load history ──────────────────────────
    async function loadMessages() {
      setLoading(true);
      const { data, error } = await supabase
        .from("n8n_chat_histories")
        .select("*")
        .eq("session_id", sessionId)
        .order("hora_data_mensagem", { ascending: true })
        .limit(300);

      if (!error && data) {
        setMessages(data as unknown as ChatMessage[]);
      }
      setLoading(false);
      scrollToBottom(false);
    }

    loadMessages();

    // ── Realtime subscription ─────────────────
    const channel = supabase
      .channel(`chat_realtime_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "n8n_chat_histories",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as unknown as ChatMessage]);
          scrollToBottom(true);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [lead, scrollToBottom]);

  if (!lead) return <EmptyState />;

  const sessionId = (lead.phone ?? "").replace(/\D/g, "");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Header ─────────────────────────────── */}
      <div className="px-5 py-3.5 bg-background border-b border-border flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary text-sm">
              {lead.name.substring(0, 2).toUpperCase()}
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                connected ? "bg-emerald-500" : "bg-muted-foreground/40"
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">{lead.name}</h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {lead.phone ? `+${sessionId}` : "Sem número"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-muted-foreground/50" />
          )}
          <span className={cn("text-[10px] font-medium", connected ? "text-emerald-600" : "text-muted-foreground/50")}>
            {connected ? "Ao vivo" : "Conectando..."}
          </span>
        </div>
      </div>

      {/* ── Messages ────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
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
          <NoMessages phone={lead.phone} />
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

      {/* ── Read-only footer ─────────────────────── */}
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
