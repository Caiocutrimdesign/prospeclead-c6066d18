import React, { useState, useMemo } from "react";
import { format, differenceInDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  TrendingUp,
  Target,
  AlertCircle,
  Search,
  Filter,
  Calendar as LucideCalendar,
  Phone,
  User,
  MessageSquare,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  MoreHorizontal,
  Flame,
  Snowflake,
  ChevronRight,
  ArrowRight,
  Plus,
  CheckCircle2,
  FileText,
  History,
  X,
  LayoutGrid,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ============================================================
   TYPES & CONSTANTS
   ============================================================ */

const COLUMNS = [
  { id: "novo", title: "Novo Lead", color: "bg-blue-500/10 border-blue-200" },
  { id: "ia", title: "Qualificado pela IA", color: "bg-purple-500/10 border-purple-200" },
  { id: "contato", title: "Contato Realizado", color: "bg-amber-500/10 border-amber-200" },
  { id: "visita", title: "Visita Agendada", color: "bg-indigo-500/10 border-indigo-200" },
  { id: "proposta", title: "Proposta Enviada", color: "bg-cyan-500/10 border-cyan-200" },
  { id: "fechado", title: "Instalado / Fechado", color: "bg-emerald-500/10 border-emerald-200" },
  { id: "perdido", title: "Perdido / Sem Interesse", color: "bg-slate-500/10 border-slate-200" },
];

const MOCK_PROMOTERS = [
  { id: "p1", name: "Caio Cutrim", avatar: "" },
  { id: "p2", name: "Ana Silva", avatar: "" },
  { id: "p3", name: "Carlos Oliveira", avatar: "" },
];

const INITIAL_LEADS = [
  {
    id: "l1",
    name: "João Pereira",
    phone: "(11) 98888-7777",
    promoterId: "p1",
    column: "novo",
    enteredAt: subDays(new Date(), 2),
    priority: "Quente",
    hasPendingTask: true,
    history: [{ date: subDays(new Date(), 2), from: "", to: "novo", reason: "Lead capturado via Landing Page" }],
    notes: "Interessado em plano solar residencial.",
  },
  {
    id: "l2",
    name: "Maria Souza",
    phone: "(21) 97777-6666",
    promoterId: "p2",
    column: "ia",
    enteredAt: subDays(new Date(), 8),
    priority: "Frio",
    hasPendingTask: false,
    history: [
      { date: subDays(new Date(), 8), from: "", to: "novo", reason: "Entrada manual" },
      { date: subDays(new Date(), 5), from: "novo", to: "ia", reason: "Qualificação automática concluída" },
    ],
    notes: "Aguardando confirmação de endereço.",
  },
  {
    id: "l3",
    name: "Posto Shell - Centro",
    phone: "(31) 96666-5555",
    promoterId: "p1",
    column: "visita",
    enteredAt: subDays(new Date(), 1),
    priority: "Quente",
    hasPendingTask: true,
    history: [
      { date: subDays(new Date(), 4), from: "", to: "novo", reason: "Indicação" },
      { date: subDays(new Date(), 3), from: "novo", to: "contato", reason: "Primeiro contato telefônico" },
      { date: subDays(new Date(), 1), from: "contato", to: "visita", reason: "Visita agendada para vistoria" },
    ],
    notes: "Cliente corporativo com alto potencial.",
  },
  {
    id: "l4",
    name: "Ricardo Lima",
    phone: "(11) 95555-4444",
    promoterId: "p3",
    column: "proposta",
    enteredAt: subDays(new Date(), 10),
    priority: "Quente",
    hasPendingTask: false,
    history: [
      { date: subDays(new Date(), 10), from: "contato", to: "proposta", reason: "Orçamento enviado via PDF" },
    ],
    notes: "Analisando custo-benefício.",
  },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function AdminKanban() {
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [search, setSearch] = useState("");
  const [filterPromoter, setFilterPromoter] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showLost, setShowLost] = useState(true);

  // DnD & Modal States
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ leadId: string, toColumn: string } | null>(null);
  const [moveReason, setMoveReason] = useState("");
  const [createFollowup, setCreateFollowup] = useState(false);

  // Drawer State
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Computed Stats
  const stats = useMemo(() => {
    const activeLeads = leads.filter(l => l.column !== "perdido");
    const stuckLeads = activeLeads.filter(l => differenceInDays(new Date(), l.enteredAt) > 7).length;
    
    const colCounts = COLUMNS.map(col => ({
      id: col.id,
      title: col.title,
      count: leads.filter(l => l.column === col.id).length
    }));
    const bottleneck = [...colCounts].sort((a, b) => b.count - a.count)[0];

    return {
      totalActive: activeLeads.length,
      stuckLeads,
      convRate: "12.4%", // Mocked
      bottleneck: bottleneck?.title || "Nenhuma",
    };
  }, [leads]);

  // Filtering
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (!showLost && l.column === "perdido") return false;
      if (filterPromoter !== "all" && l.promoterId !== filterPromoter) return false;
      if (filterPriority !== "all" && l.priority !== filterPriority) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, search, filterPromoter, filterPriority, showLost]);

  /* ----- HANDLERS ----- */

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggingLeadId(leadId);
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === leadId);
    
    if (lead && lead.column !== toColumnId) {
      setMoveTarget({ leadId, toColumn: toColumnId });
      setMoveReason("");
      setCreateFollowup(false);
    }
  };

  const confirmMove = () => {
    if (!moveTarget) return;
    if (!moveReason.trim()) {
      toast.error("Por favor, informe o motivo da mudança.");
      return;
    }

    setLeads(prev => prev.map(l => {
      if (l.id === moveTarget.leadId) {
        return {
          ...l,
          column: moveTarget.toColumn,
          enteredAt: new Date(),
          history: [
            ...l.history,
            { date: new Date(), from: l.column, to: moveTarget.toColumn, reason: moveReason }
          ],
          hasPendingTask: createFollowup ? true : l.hasPendingTask
        };
      }
      return l;
    }));

    if (createFollowup) {
      toast.success("Movimentação registrada e tarefa de follow-up criada!");
    } else {
      toast.success("Movimentação registrada com sucesso!");
    }

    setMoveTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">Gestão visual do pipeline de leads e oportunidades.</p>
        </div>
      </div>

      {/* ---------- METRICS ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Leads Ativos" value={stats.totalActive} icon={Users} />
        <MetricCard 
          label="Parados > 7 dias" 
          value={stats.stuckLeads} 
          icon={AlertCircle} 
          badge={stats.stuckLeads > 0 ? { text: "Alerta", color: "bg-red-500" } : undefined} 
        />
        <MetricCard label="Conversão Semanal" value={stats.convRate} icon={TrendingUp} />
        <MetricCard label="Gargalo Atual" value={stats.bottleneck} icon={Target} subtext="Coluna com mais leads" />
      </div>

      {/* ---------- FILTERS ---------- */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome do lead..." 
              className="pl-9" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex gap-3">
            <Select value={filterPromoter} onValueChange={setFilterPromoter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Responsáveis</SelectItem>
                {MOCK_PROMOTERS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="Quente">Quente 🔥</SelectItem>
                <SelectItem value="Frio">Frio ❄️</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
              <span className="text-xs font-medium">Ocultar Perdidos</span>
              <Checkbox checked={!showLost} onCheckedChange={(val) => setShowLost(!val)} />
            </div>
          </div>
        </div>
      </Card>

      {/* ---------- KANBAN BOARD ---------- */}
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex gap-4 p-1">
          {COLUMNS.map(col => {
            if (!showLost && col.id === "perdido") return null;
            const colLeads = filteredLeads.filter(l => l.column === col.id);
            return (
              <div 
                key={col.id} 
                className="flex-shrink-0 w-80 flex flex-col h-[calc(100vh-400px)] min-h-[500px]"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div className={cn("p-3 rounded-t-xl border-t border-x font-semibold flex items-center justify-between", col.color)}>
                  <span className="text-sm truncate">{col.title}</span>
                  <Badge variant="secondary" className="bg-white/50 text-[10px]">{colLeads.length}</Badge>
                </div>
                <div className="flex-1 bg-muted/20 border-x border-b rounded-b-xl overflow-hidden">
                  <ScrollArea className="h-full px-3 py-4">
                    <div className="space-y-3">
                      {colLeads.map(lead => (
                        <LeadCard 
                          key={lead.id} 
                          lead={lead} 
                          onDragStart={onDragStart} 
                          onClick={() => { setSelectedLead(lead); setDrawerOpen(true); }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ---------- MODALS & DRAWERS ---------- */}
      
      {/* MOVEMENT MOTIVATION MODAL */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => !open && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Movimentação</DialogTitle>
            <DialogDescription>
              Você está movendo o lead para a coluna <b>{COLUMNS.find(c => c.id === moveTarget?.toColumn)?.title}</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reason">O que motivou essa mudança? *</Label>
              <Textarea 
                id="reason" 
                placeholder="Ex: Cliente demonstrou interesse no orçamento e solicitou visita." 
                value={moveReason}
                onChange={e => setMoveReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center space-x-2 bg-muted/40 p-3 rounded-lg border">
              <Checkbox id="followup" checked={createFollowup} onCheckedChange={(v) => setCreateFollowup(!!v)} />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="followup" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Criar tarefa de follow-up automaticamente?
                </label>
                <p className="text-xs text-muted-foreground">Será agendada uma tarefa vinculada a este promotor.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveTarget(null)}>Cancelar</Button>
            <Button onClick={confirmMove}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LEAD DETAIL DRAWER */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-6 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn(
                selectedLead?.priority === "Quente" ? "border-orange-500 text-orange-600" : "border-blue-500 text-blue-600"
              )}>
                {selectedLead?.priority === "Quente" ? <Flame className="w-3 h-3 mr-1" /> : <Snowflake className="w-3 h-3 mr-1" />}
                {selectedLead?.priority}
              </Badge>
              <Badge variant="secondary">{COLUMNS.find(c => c.id === selectedLead?.column)?.title}</Badge>
            </div>
            <SheetTitle className="text-2xl">{selectedLead?.name}</SheetTitle>
            <SheetDescription className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> {selectedLead?.phone}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-8">
            {/* DETAILS */}
            <div className="grid grid-cols-2 gap-6">
              <DetailItem icon={User} label="Responsável" value={MOCK_PROMOTERS.find(p => p.id === selectedLead?.promoterId)?.name} />
              <DetailItem icon={LucideCalendar} label="Data de Entrada" value={selectedLead && format(selectedLead.enteredAt, "dd/MM/yyyy")} />
              <DetailItem icon={Clock} label="Tempo na Coluna" value={`${selectedLead && differenceInDays(new Date(), selectedLead.enteredAt)} dias`} />
              <DetailItem icon={CheckCircle2} label="Tarefas Pendentes" value={selectedLead?.hasPendingTask ? "Sim" : "Não"} />
            </div>

            {/* ANNOTATIONS */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Anotações Livres</Label>
              <Card className="p-3 bg-muted/20 text-sm italic">
                {selectedLead?.notes || "Nenhuma anotação disponível."}
              </Card>
              <Button variant="outline" size="sm" className="w-full gap-2"><Pencil className="w-3.5 h-3.5" /> Editar Anotações</Button>
            </div>

            {/* HISTORY */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2"><History className="w-4 h-4" /> Histórico de Movimentações</Label>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {selectedLead?.history.map((item: any, i: number) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-primary uppercase">{format(item.date, "dd MMM, HH:mm", { locale: ptBR })}</p>
                        {item.from && <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="line-through">{item.from}</span> <ArrowRight className="w-3 h-3" /> <span>{item.to}</span></div>}
                      </div>
                      <p className="text-sm font-medium">{item.to === "novo" ? "Entrada no Funil" : `Muda para ${COLUMNS.find(c => c.id === item.to)?.title}`}</p>
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">{item.reason}</p>
                    </div>
                  </div>
                )).reverse()}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t mt-6 flex flex-col gap-2">
            <Button className="w-full gap-2"><Plus className="w-4 h-4" /> Criar Tarefa</Button>
            <Button variant="outline" className="w-full gap-2"><Pencil className="w-4 h-4" /> Editar Lead</Button>
            <Button variant="ghost" className="w-full" onClick={() => setDrawerOpen(false)}>Fechar</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function MetricCard({ label, value, icon: Icon, badge, subtext }: any) {
  return (
    <Card className="p-4 flex items-center justify-between">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          {badge && <Badge className={cn("text-[8px] h-4 px-1 leading-none uppercase", badge.color)}>{badge.text}</Badge>}
        </div>
        <p className="text-2xl font-bold truncate">{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
      </div>
      <div className="p-3 bg-primary/10 rounded-xl">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </Card>
  );
}

function LeadCard({ lead, onDragStart, onClick }: any) {
  const daysInCol = differenceInDays(new Date(), lead.enteredAt);
  const isStuck = daysInCol > 7 && lead.column !== "fechado" && lead.column !== "perdido";
  const promoter = MOCK_PROMOTERS.find(p => p.id === lead.promoterId);

  return (
    <div 
      draggable 
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className={cn(
        "bg-background p-4 rounded-xl border-2 border-transparent shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all group",
        isStuck && "bg-red-50/50 dark:bg-red-950/10 border-red-200/50"
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <p className="font-bold text-sm leading-snug group-hover:text-primary transition-colors">{lead.name}</p>
          {lead.priority === "Quente" ? (
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
          ) : (
            <Snowflake className="w-4 h-4 text-blue-400 shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" />
          {lead.phone}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 border">
              <AvatarImage src={promoter?.avatar} />
              <AvatarFallback className="text-[8px]">{promoter?.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">{promoter?.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {lead.hasPendingTask && (
              <span title="Tarefa pendente">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              </span>
            )}
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted", isStuck && "bg-red-500 text-white")}>
              {daysInCol}d
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
