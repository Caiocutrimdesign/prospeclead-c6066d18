import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Camera,
  MapPin,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SecureImage = ({ path, className, alt }: { path: string | null; className?: string; alt?: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setError(true);
      return;
    }
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    
    // Gerar Signed URL para garantir acesso mesmo em buckets privados
    const fetchSignedUrl = async () => {
      const { data, error } = await supabase.storage.from("lead-photos").createSignedUrl(cleanPath, 60 * 60);
      if (error || !data?.signedUrl) {
        console.error("Erro ao gerar URL da foto:", error);
        setError(true);
      } else {
        setUrl(data.signedUrl);
      }
    };
    
    fetchSignedUrl();
  }, [path]);

  if (error || !url) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-muted text-muted-foreground/30", className)}>
        <Camera className="w-6 h-6 mb-1" />
        <span className="text-[8px] font-bold">SEM FOTO</span>
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} onError={() => setError(true)} />;
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPraca, setFilterPraca] = useState("all");
  const [filterMedo, setFilterMedo] = useState("all");

  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar leads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead permanentemente?")) return;
    
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead excluído com sucesso!");
      loadLeads();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const nameVal = l.nome || l.name || "";
      const phoneVal = l.phone || "";
      const plateVal = l.placa || l.vehicle_plate || "";
      
      const matchesSearch = 
        nameVal.toLowerCase().includes(search.toLowerCase()) ||
        phoneVal.toLowerCase().includes(search.toLowerCase()) ||
        plateVal.toLowerCase().includes(search.toLowerCase());
      
      const pracaVal = l.praca || l.city || "all";
      const medoVal = l.medo || l.pain || "all";

      const matchesPraca = filterPraca === "all" || pracaVal === filterPraca;
      const matchesMedo = filterMedo === "all" || medoVal === filterMedo;

      return matchesSearch && matchesPraca && matchesMedo;
    });
  }, [leads, search, filterPraca, filterMedo]);

  const pracas = Array.from(new Set(leads.map(l => l.praca || l.city).filter(Boolean)));
  const medos = Array.from(new Set(leads.map(l => l.medo || l.pain).filter(Boolean)));

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Leads</h1>
          <p className="text-muted-foreground text-sm">Controle total dos leads captados em campo.</p>
        </div>
        <Button onClick={loadLeads} variant="outline" size="sm">
          Atualizar Dados
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 border-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, telefone ou placa..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 mt-3 text-muted-foreground shrink-0" />
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={filterPraca}
              onChange={(e) => setFilterPraca(e.target.value)}
            >
              <option value="all">Todas as Praças</option>
              {pracas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-3 text-muted-foreground shrink-0" />
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={filterMedo}
              onChange={(e) => setFilterMedo(e.target.value)}
            >
              <option value="all">Todos os Medos</option>
              {medos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden border-2">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Cliente</TableHead>
              <TableHead className="font-bold">Veículo</TableHead>
              <TableHead className="font-bold">Praça</TableHead>
              <TableHead className="font-bold">Medo</TableHead>
              <TableHead className="font-bold">Evidência</TableHead>
              <TableHead className="font-bold">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum lead encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((l) => {
                const isMoto = (l.veiculo || l.vehicle_model || "").toLowerCase().includes("moto") || l.vehicle_type === "moto";
                
                return (
                  <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                    {/* Cliente */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{l.nome || l.name || "Não informado"}</span>
                        <a 
                          href={`https://wa.me/${l.phone?.replace(/\D/g, "")}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {l.phone ? formatPhone(l.phone) : "S/ Tel"}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </TableCell>

                    {/* Veículo */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{l.vehicle_model || l.veiculo || l.vehicle || "—"}</span>
                          <Badge 
                            className={cn(
                              "text-[10px] uppercase font-bold px-1.5 h-4",
                              isMoto ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"
                            )}
                          >
                            {isMoto ? "Topy Pro" : "Rastremix"}
                          </Badge>
                        </div>
                        <span className="text-[10px] font-mono bg-muted px-1 rounded w-fit">
                          {l.vehicle_plate || l.placa || l.plate || "SEM PLACA"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Praça */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{l.city || l.location || l.praca || "—"}</span>
                    </TableCell>

                    {/* Medo */}
                    <TableCell>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {l.pain || l.pain_point || l.medo || "—"}
                      </span>
                    </TableCell>

                    {/* Evidência */}
                    <TableCell>
                      {l.photo_url ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-background shadow-sm hover:scale-110 transition cursor-pointer bg-muted">
                              <SecureImage path={l.photo_url} alt="Lead thumbnail" className="w-full h-full object-cover" />
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl p-1">
                            <SecureImage path={l.photo_url} alt="Lead full" className="w-full h-auto rounded-lg" />
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/30">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                    </TableCell>

                    {/* Data */}
                    <TableCell className="text-xs text-muted-foreground">
                      {l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" /> Editar Lead
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => handleDelete(l.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
