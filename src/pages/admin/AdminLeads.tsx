import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CalendarIcon,
  CheckCircle2,
  Eye,
  FileDown,
  Loader2,
  Pencil,
  Plus,
  Search,
  Target,
  TrendingUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];
type LeadKind = Database["public"]["Enums"]["lead_kind"];

const STATUSES: LeadStatus[] = [
  "coletado",
  "contatado",
  "respondido",
  "vendido",
  "prospectado",
  "negociando",
  "fechado",
];

const STATUS_META: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  coletado: {
    label: "Coletado",
    className: "bg-muted text-foreground hover:bg-muted",
  },
  contatado: {
    label: "Contatado",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20",
  },
  respondido: {
    label: "Respondido",
    className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20",
  },
  prospectado: {
    label: "Prospectado",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20",
  },
  negociando: {
    label: "Negociando",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20",
  },
  vendido: {
    label: "Vendido",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20",
  },
  fechado: {
    label: "Fechado",
    className: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/25",
  },
};

const isConverted = (s: string) => s === "vendido" || s === "fechado";

/* ======================== Página ======================== */

export default function AdminLeads() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [pdvLeadIds, setPdvLeadIds] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // filtros
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // modais
  const [detailLead, setDetailLead] = useState<LeadRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: ls, error: le }, { data: ps }, { data: pls }] =
      await Promise.all([
        supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("profiles").select("id, full_name"),
        supabase.from("pdv_leads").select("lead_id"),
      ]);
    if (le) toast.error(le.message);
    setLeads((ls ?? []) as LeadRow[]);
    setProfiles(
      Object.fromEntries((ps ?? []).map((p) => [p.id, p.full_name ?? "—"])),
    );
    setPdvLeadIds(
      new Set(
        (pls ?? [])
          .map((r) => r.lead_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ----- Origem (Manual / PDV / Campanha) ----- */
  const originOf = (l: LeadRow): "manual" | "pdv" | "campanha" => {
    if (pdvLeadIds.has(l.id)) return "pdv";
    return "manual";
  };

  /* ----- Filtros ----- */
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterKind !== "all" && l.kind !== filterKind) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (filterOrigin !== "all" && originOf(l) !== filterOrigin) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit =
          l.name?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.vehicle_plate?.toLowerCase().includes(q) ||
          l.company_cnpj?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      const created = new Date(l.created_at);
      if (dateFrom) {
        const f = new Date(dateFrom);
        f.setHours(0, 0, 0, 0);
        if (created < f) return false;
      }
      if (dateTo) {
        const t = new Date(dateTo);
        t.setHours(23, 59, 59, 999);
        if (created > t) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, pdvLeadIds, search, filterKind, filterStatus, filterOrigin, dateFrom, dateTo]);

  /* ----- Stats ----- */
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    let total = leads.length;
    let today = 0;
    let converted = 0;
    leads.forEach((l) => {
      if (new Date(l.created_at).toDateString() === todayStr) today++;
      if (isConverted(l.status)) converted++;
    });
    const rate = total > 0 ? (converted / total) * 100 : 0;
    return { total, today, converted, rate };
  }, [leads]);

  /* ----- Ações ----- */
  const removeLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lead excluído");
    load();
  };

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const openCreate = () => {
    setEditingLead(null);
    setFormOpen(true);
  };
  const openEdit = (l: LeadRow) => {
    setEditingLead(l);
    setFormOpen(true);
  };

  /* ----- Exportação PDF ----- */
  const exportPDF = async (range: "today" | "month" | "all") => {
    try {
      const now = new Date();
      let scope: LeadRow[] = leads;
      let rangeLabel = "Todos os Leads";

      if (range === "today") {
        const todayStr = now.toDateString();
        scope = leads.filter(
          (l) => new Date(l.created_at).toDateString() === todayStr,
        );
        rangeLabel = "Leads de Hoje";
      } else if (range === "month") {
        const m = now.getMonth();
        const y = now.getFullYear();
        scope = leads.filter((l) => {
          const d = new Date(l.created_at);
          return d.getMonth() === m && d.getFullYear() === y;
        });
        rangeLabel = `Leads de ${format(now, "MMMM 'de' yyyy", { locale: ptBR })}`;
      }

      if (scope.length === 0) {
        toast.error("Nenhum lead no período selecionado");
        return;
      }

      // Buscar nome da marca
      const { data: settings } = await supabase
        .from("app_settings")
        .select("brand_name")
        .eq("id", 1)
        .maybeSingle();
      const brandName = settings?.brand_name ?? "Plataforma";

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const generatedAt = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(brandName, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(rangeLabel, 40, 58);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Gerado em ${generatedAt}`, pageWidth - 40, 40, { align: "right" });
      doc.text(`Total: ${scope.length} lead(s)`, pageWidth - 40, 54, {
        align: "right",
      });
      doc.setTextColor(0);

      // Tabela
      const rows = scope.map((l) => [
        l.name ?? "—",
        l.phone ?? "—",
        l.kind.toUpperCase(),
        STATUS_META[l.status]?.label ?? l.status,
        profiles[l.user_id] ?? "—",
        format(new Date(l.captured_at ?? l.created_at), "dd/MM/yyyy HH:mm", {
          locale: ptBR,
        }),
      ]);

      autoTable(doc, {
        startY: 80,
        head: [["Lead", "Telefone", "Tipo", "Status", "Promotor", "Captura"]],
        body: rows,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 40, right: 40, bottom: 40 },
        didDrawPage: () => {
          const pageNum = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(
            `${brandName} • Relatório de Leads`,
            40,
            pageHeight - 20,
          );
          doc.text(
            `Página ${pageNum}`,
            pageWidth - 40,
            pageHeight - 20,
            { align: "right" },
          );
          doc.setTextColor(0);
        },
      });

      const fileName = `leads-${range}-${format(now, "yyyy-MM-dd-HHmm")}.pdf`;
      doc.save(fileName);
      toast.success(`${scope.length} leads exportados`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    }
  };


  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Leads</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestão completa de todos os leads da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Período do relatório</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportPDF("today")}>
                Leads de hoje
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPDF("month")}>
                Leads do mês atual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPDF("all")}>
                Todos os leads
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Leads"
          value={stats.total.toLocaleString("pt-BR")}
          icon={<Users className="w-4 h-4" />}
          tone="default"
        />
        <StatCard
          label="Hoje"
          value={stats.today.toLocaleString("pt-BR")}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="info"
        />
        <StatCard
          label="Convertidos"
          value={stats.converted.toLocaleString("pt-BR")}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Taxa Conversão"
          value={`${stats.rate.toFixed(1)}%`}
          icon={<Target className="w-4 h-4" />}
          tone="warning"
        />
      </div>

      {/* ---------- Filtros ---------- */}
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2">
          <div className="relative lg:col-span-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, telefone, placa ou CNPJ…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="lg:col-span-2">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterKind} onValueChange={setFilterKind}>
            <SelectTrigger className="lg:col-span-1">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="lg:col-span-2">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="pdv">PDV</SelectItem>
              <SelectItem value="campanha">Campanha</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex gap-2 lg:col-span-3">
            <DatePickerButton
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="De"
            />
            <DatePickerButton
              value={dateTo}
              onChange={setDateTo}
              placeholder="Até"
            />
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearDates}
                aria-label="Limpar datas"
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ---------- Tabela ---------- */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Data Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => {
              const origin = originOf(l);
              return (
                <TableRow key={l.id} className="hover:bg-muted/40">
                  <TableCell>
                    <p className="font-medium text-sm">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.phone ?? "Sem telefone"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        l.kind === "b2b"
                          ? "border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10"
                          : "border-cyan-500/40 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10"
                      }
                    >
                      {l.kind.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {origin === "pdv"
                        ? "PDV"
                        : origin === "campanha"
                          ? "Campanha"
                          : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "border-transparent",
                        STATUS_META[l.status].className,
                      )}
                    >
                      {STATUS_META[l.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {l.value != null ? formatBRL(l.value) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(l.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailLead(l)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(l)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Excluir lead "{l.name}"?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeLead(l.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* ---------- Modal: Detalhes ---------- */}
      <LeadDetailDialog
        lead={detailLead}
        promoterName={detailLead ? profiles[detailLead.user_id] ?? "—" : ""}
        origin={detailLead ? originOf(detailLead) : "manual"}
        onClose={() => setDetailLead(null)}
        onEdit={(l) => {
          setDetailLead(null);
          openEdit(l);
        }}
      />

      {/* ---------- Modal: Criar/Editar ---------- */}
      <LeadFormDialog
        open={formOpen}
        lead={editingLead}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />
    </div>
  );
}

/* ======================== Componentes auxiliares ======================== */

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "default" | "info" | "success" | "warning";
}) {
  const toneClass = {
    default: "bg-muted text-foreground",
    info: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  }[tone];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
        </div>
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            toneClass,
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function DatePickerButton({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex-1 justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
          {value ? (
            format(value, "dd/MM/yyyy", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ======================== Modal: Detalhes ======================== */

function LeadDetailDialog({
  lead,
  promoterName,
  origin,
  onClose,
  onEdit,
}: {
  lead: LeadRow | null;
  promoterName: string;
  origin: "manual" | "pdv" | "campanha";
  onClose: () => void;
  onEdit: (l: LeadRow) => void;
}) {
  if (!lead) return null;
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Lead</DialogTitle>
          <DialogDescription>
            Informações completas do lead capturado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <Field label="Nome" value={lead.name} />
          <Field label="Telefone" value={lead.phone ?? "—"} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <Badge
                variant="outline"
                className={
                  lead.kind === "b2b"
                    ? "border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10 mt-1"
                    : "border-cyan-500/40 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 mt-1"
                }
              >
                {lead.kind.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                className={cn(
                  "border-transparent mt-1",
                  STATUS_META[lead.status].className,
                )}
              >
                {STATUS_META[lead.status].label}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {origin === "pdv"
                  ? "PDV"
                  : origin === "campanha"
                    ? "Campanha"
                    : "Manual"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comissão</p>
              <p className="font-semibold mt-1 tabular-nums">
                {lead.value != null ? formatBRL(lead.value) : "—"}
              </p>
            </div>
          </div>

          {lead.kind === "b2c" && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <Field label="Veículo" value={lead.vehicle_model ?? "—"} />
              <Field label="Placa" value={lead.vehicle_plate ?? "—"} />
            </div>
          )}

          {lead.kind === "b2b" && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <Field label="CNPJ" value={lead.company_cnpj ?? "—"} />
              <Field
                label="Frota"
                value={lead.fleet_size ? String(lead.fleet_size) : "—"}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <Field label="Cidade" value={lead.city ?? "—"} />
            <Field label="Promoter" value={promoterName} />
          </div>

          <Field
            label="Criado em"
            value={format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          />

          {lead.photo_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Foto</p>
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={lead.photo_url}
                  alt="Foto do lead"
                  className="w-full max-h-64 object-cover"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => onEdit(lead)} className="gap-2">
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5 break-words">{value}</p>
    </div>
  );
}

/* ======================== Modal: Criar/Editar ======================== */

type FormState = {
  name: string;
  phone: string;
  kind: LeadKind;
  vehicle_model: string;
  vehicle_plate: string;
  company_cnpj: string;
  fleet_size: string;
  city: string;
  status: LeadStatus;
  value: string;
};

const emptyForm = (): FormState => ({
  name: "",
  phone: "",
  kind: "b2c",
  vehicle_model: "",
  vehicle_plate: "",
  company_cnpj: "",
  fleet_size: "",
  city: "",
  status: "coletado",
  value: "",
});

function LeadFormDialog({
  open,
  lead,
  onClose,
  onSaved,
}: {
  open: boolean;
  lead: LeadRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (lead) {
      setForm({
        name: lead.name,
        phone: lead.phone ?? "",
        kind: lead.kind,
        vehicle_model: lead.vehicle_model ?? "",
        vehicle_plate: lead.vehicle_plate ?? "",
        company_cnpj: lead.company_cnpj ?? "",
        fleet_size: lead.fleet_size != null ? String(lead.fleet_size) : "",
        city: lead.city ?? "",
        status: lead.status,
        value: lead.value != null ? String(lead.value) : "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, lead]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setBusy(true);
    try {
      const valueNum = form.value
        ? Number(form.value.replace(",", "."))
        : null;
      const fleet = form.fleet_size ? Number(form.fleet_size) : null;

      if (lead) {
        const { error } = await supabase
          .from("leads")
          .update({
            name: form.name.trim(),
            phone: form.phone || null,
            kind: form.kind,
            vehicle_model: form.kind === "b2c" ? form.vehicle_model || null : null,
            vehicle_plate: form.kind === "b2c"
              ? form.vehicle_plate?.toUpperCase() || null
              : null,
            company_cnpj: form.kind === "b2b" ? form.company_cnpj || null : null,
            fleet_size: form.kind === "b2b" ? fleet : null,
            city: form.city || null,
            status: form.status,
            value: valueNum,
          })
          .eq("id", lead.id);
        if (error) throw error;
        toast.success("Lead atualizado");
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sessão expirada");
        const payload: LeadInsert = {
          user_id: u.user.id,
          name: form.name.trim(),
          phone: form.phone || null,
          kind: form.kind,
          vehicle_model: form.kind === "b2c" ? form.vehicle_model || null : null,
          vehicle_plate: form.kind === "b2c"
            ? form.vehicle_plate?.toUpperCase() || null
            : null,
          company_cnpj: form.kind === "b2b" ? form.company_cnpj || null : null,
          fleet_size: form.kind === "b2b" ? fleet : null,
          city: form.city || null,
          status: form.status,
          value: valueNum,
        };
        const { error } = await supabase.from("leads").insert(payload);
        if (error) throw error;
        toast.success("Lead criado");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lead ? "Editar Lead" : "Novo Lead"}
          </DialogTitle>
          <DialogDescription>
            {lead
              ? "Atualize as informações do lead."
              : "Preencha as informações para cadastrar um novo lead."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </div>

          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Cidade"
            />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              value={form.kind}
              onValueChange={(v) => set("kind", v as LeadKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as LeadStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.kind === "b2c" && (
            <>
              <div>
                <Label htmlFor="vehicle">Veículo</Label>
                <Input
                  id="vehicle"
                  value={form.vehicle_model}
                  onChange={(e) => set("vehicle_model", e.target.value)}
                  placeholder="Ex: Civic, HB20…"
                />
              </div>
              <div>
                <Label htmlFor="plate">Placa</Label>
                <Input
                  id="plate"
                  value={form.vehicle_plate}
                  onChange={(e) =>
                    set("vehicle_plate", e.target.value.toUpperCase())
                  }
                  placeholder="ABC1D23"
                  maxLength={8}
                  className="font-mono tracking-widest"
                />
              </div>
            </>
          )}

          {form.kind === "b2b" && (
            <>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.company_cnpj}
                  onChange={(e) => set("company_cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label htmlFor="fleet">Tamanho da frota</Label>
                <Input
                  id="fleet"
                  type="number"
                  min={0}
                  value={form.fleet_size}
                  onChange={(e) => set("fleet_size", e.target.value)}
                  placeholder="Ex: 25"
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <Label htmlFor="value">Valor da comissão (R$)</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min={0}
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {lead ? "Salvar alterações" : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
