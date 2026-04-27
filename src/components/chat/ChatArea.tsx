import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatLead } from "./LeadList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User } from "lucide-react";

interface ChatMessage {
  id: number;
  session_id: string;
  message: {
    type: "human" | "ai";
    content: string;
  };
  hora_data_mensagem: string;
}

interface ChatAreaProps {
  lead: ChatLead | null;
}

export function ChatArea({ lead }: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lead || !lead.phone) {
      setMessages([]);
      return;
    }

    // Usaremos o telefone do lead como session_id, limpando formatação caso necessário
    // Depende de como o n8n salva. Normalmente é o número com DDI.
    const sessionId = lead.phone.replace(/\D/g, "");

    async function loadMessages() {
      setLoading(true);
      const { data, error } = await supabase
        .from("n8n_chat_histories")
        .select("*")
        .eq("session_id", sessionId)
        .order("hora_data_mensagem", { ascending: true })
        .limit(200);

      if (!error && data) {
        setMessages(data as any);
      }
      setLoading(false);
      scrollToBottom();
    }

    loadMessages();

    // Inscrição em tempo real para novas mensagens (Realtime)
    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "n8n_chat_histories",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as any]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lead]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  if (!lead) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 h-full">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/50">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-medium text-foreground/80 mb-2">Caixa de Entrada</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Selecione um contato na lista lateral para visualizar o histórico de conversas gerado pelo n8n.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E5DDD5]/20 dark:bg-muted/10">
      {/* Header do Chat */}
      <div className="px-6 py-4 bg-background border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold">{lead.name}</h3>
            <p className="text-xs text-muted-foreground">{lead.phone || "Sem número"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-success"></span>
          <span className="text-xs text-muted-foreground">Monitorando via n8n</span>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Carregando mensagens...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-background/80 backdrop-blur px-4 py-2 rounded-lg text-sm text-muted-foreground border border-border/50">
              Nenhuma mensagem encontrada para o número {lead.phone}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isAI = msg.message.type === "ai";
            const dateStr = msg.hora_data_mensagem 
              ? format(new Date(msg.hora_data_mensagem), "HH:mm", { locale: ptBR })
              : "";

            return (
              <div 
                key={msg.id || index} 
                className={`flex w-full ${isAI ? "justify-start" : "justify-end"}`}
              >
                <div 
                  className={`max-w-[70%] sm:max-w-[60%] rounded-2xl p-3 flex flex-col shadow-sm border ${
                    isAI 
                      ? "bg-background border-border rounded-tl-none" 
                      : "bg-[#E7FCD7] dark:bg-primary/20 border-transparent text-foreground rounded-tr-none"
                  }`}
                >
                  {isAI && (
                    <span className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Assistente AI
                    </span>
                  )}
                  {!isAI && (
                    <span className="text-xs font-semibold opacity-70 mb-1 flex items-center justify-end gap-1">
                      <User className="w-3 h-3" /> {lead.name}
                    </span>
                  )}
                  
                  <span className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.message.content}
                  </span>
                  
                  {dateStr && (
                    <span className={`text-[10px] mt-1 text-right block opacity-60`}>
                      {dateStr}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Falso (Apenas Leitura) */}
      <div className="p-4 bg-background border-t border-border shrink-0">
        <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm text-center border border-border/50 border-dashed">
          Este painel é de apenas leitura. O n8n gerencia as conversas automaticamente no WhatsApp.
        </div>
      </div>
    </div>
  );
}
