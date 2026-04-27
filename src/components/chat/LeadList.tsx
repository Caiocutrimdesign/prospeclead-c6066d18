import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface ChatLead {
  id: string;
  name: string;
  phone: string | null;
}

interface LeadListProps {
  selectedLeadId?: string;
  onSelectLead: (lead: ChatLead) => void;
}

export function LeadList({ selectedLeadId, onSelectLead }: LeadListProps) {
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadLeads() {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone")
        .order("created_at", { ascending: false })
        .limit(100); // Carrega os 100 mais recentes por simplicidade

      if (!error && data) {
        setLeads(data);
      }
      setLoading(false);
    }
    loadLeads();
  }, []);

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search))
  );

  return (
    <div className="flex flex-col h-full w-[300px] border-r border-border shrink-0 bg-background">
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold mb-4">Todas as Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando contatos...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum contato encontrado.
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredLeads.map((lead) => {
              const isSelected = selectedLeadId === lead.id;
              
              return (
                <button
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 border-b border-border/50 ${
                    isSelected ? "bg-muted" : ""
                  }`}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {lead.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {lead.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.phone || "Sem número"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
