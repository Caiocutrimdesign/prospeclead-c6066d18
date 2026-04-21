import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

type Lead = {
  id: string;
  user_id: string;
  kind: "b2c" | "b2b";
  name: string;
  phone: string | null;
  vehicle_plate: string | null;
  status: string;
  value: number | null;
  created_at: string;
  city: string | null;
};

const STATUSES = [
  "coletado",
  "contatado",
  "respondido",
  "vendido",
  "prospectado",
  "negociando",
  "fechado",
];

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: ls }, { data: ps }] = await Promise.all([
      supabase
        .from("leads")
        .select("id,user_id,kind,name,phone,vehicle_plate,status,value,created_at,city")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setLeads((ls ?? []) as Lead[]);
    setProfiles(
      Object.fromEntries((ps ?? []).map((p) => [p.id, p.full_name ?? "—"])),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ status: status as any })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado");
      load();
    }
  };

  const removeLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Lead excluído");
      load();
    }
  };

  const filtered = leads.filter((l) => {
    if (filterKind !== "all" && l.kind !== filterKind) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.name?.toLowerCase().includes(q) &&
        !l.phone?.toLowerCase().includes(q) &&
        !l.vehicle_plate?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Todos os Leads</h1>
        <p className="text-sm text-muted-foreground">
          Visualize, edite ou exclua qualquer lead da base ({leads.length} no total).
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, telefone ou placa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterKind} onValueChange={setFilterKind}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="b2c">B2C</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Promoter</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  Nenhum lead
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <p className="font-medium text-sm">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.phone ?? l.vehicle_plate ?? "—"}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{profiles[l.user_id] ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={l.kind === "b2b" ? "default" : "secondary"}>
                    {l.kind.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={l.status}
                    onValueChange={(v) => updateStatus(l.id, v)}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {l.value ? formatBRL(l.value) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir lead "{l.name}"?</AlertDialogTitle>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
