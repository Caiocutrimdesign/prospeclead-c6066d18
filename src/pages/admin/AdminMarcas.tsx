import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, RefreshCw, CheckCircle2, XCircle, Zap, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface BrandSettings {
  id: number;
  tenant_id: string;
  brand_name: string;
  brand_cnpj: string | null;
  brand_logo_url: string | null;
  plan: string;
  contact_email: string | null;
  updated_at: string;
  // Assumimos que a ausência de um campo 'active' explícito significa que todas estão ativas por enquanto
}

export default function AdminMarcas() {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<BrandSettings[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar marcas", { description: error.message });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBrands();
  };

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      (brand.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (brand.brand_cnpj || "").toLowerCase().includes(search.toLowerCase()) ||
      (brand.contact_email || "").toLowerCase().includes(search.toLowerCase());
    
    // Como não há campo 'active' real no banco, consideramos todas ativas por padrão,
    // mas deixamos o filtro preparado.
    const isActive = true; // placeholder para lógica futura
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);

    const matchesPlan = planFilter === "all" || brand.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalBrands = brands.length;
  // Placeholder metrics as we don't have an active flag yet
  const activeBrands = brands.length; 
  const inactiveBrands = 0;
  const enterpriseBrands = brands.filter(b => b.plan === "enterprise").length;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Marcas</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie franquias e operações white-label do sistema
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
          <Plus className="w-4 h-4" />
          Nova Marca
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-xl border border-border bg-[#5340C6] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{totalBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Total de Marcas</h3>
            <p className="text-[11px] opacity-80">franquias registradas</p>
          </div>
        </Card>
        
        <Card className="p-5 rounded-xl border border-border bg-[#43A047] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{activeBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Marcas Ativas</h3>
            <p className="text-[11px] opacity-80">em operação</p>
          </div>
        </Card>

        <Card className="p-5 rounded-xl border border-border bg-[#607D8B] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <XCircle className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{inactiveBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Inativas</h3>
            <p className="text-[11px] opacity-80">suspensas</p>
          </div>
        </Card>

        <Card className="p-5 rounded-xl border border-border bg-[#FF9800] text-white flex flex-col justify-between h-[100px] shadow-sm">
          <div className="flex items-center justify-between">
            <Zap className="w-5 h-5 opacity-80" />
            <span className="text-3xl font-bold">{enterpriseBrands}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Enterprise</h3>
            <p className="text-[11px] opacity-80">plano top</p>
          </div>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="shrink-0 bg-background"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Listagem de Marcas (ou Empty State) */}
      <Card className="rounded-xl border border-border bg-card shadow-sm min-h-[400px]">
        {loading && !isRefreshing ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/50">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1 text-foreground/80">Nenhuma marca encontrada</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Clique em "+ Nova Marca" para começar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Aqui você poderia implementar a tabela ou grid de marcas.
                Por enquanto vou deixar um grid básico ou listagem já que a imagem
                não mostrou como é a listagem preenchida. */}
            <div className="p-0">
               <table className="w-full text-sm text-left">
                 <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
                   <tr>
                     <th className="px-6 py-4 font-medium">Marca</th>
                     <th className="px-6 py-4 font-medium">CNPJ</th>
                     <th className="px-6 py-4 font-medium">Contato</th>
                     <th className="px-6 py-4 font-medium">Plano</th>
                     <th className="px-6 py-4 font-medium">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   {filteredBrands.map(brand => (
                     <tr key={brand.id} className="hover:bg-muted/30 transition-colors">
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           {brand.brand_logo_url ? (
                             <img src={brand.brand_logo_url} alt={brand.brand_name} className="w-8 h-8 rounded bg-background object-cover border" />
                           ) : (
                             <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                               {brand.brand_name.substring(0, 2).toUpperCase()}
                             </div>
                           )}
                           <span className="font-medium text-foreground">{brand.brand_name}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-muted-foreground">{brand.brand_cnpj || "—"}</td>
                       <td className="px-6 py-4 text-muted-foreground">{brand.contact_email || "—"}</td>
                       <td className="px-6 py-4 text-muted-foreground capitalize">
                          {brand.plan || "free"}
                       </td>
                       <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                            Ativa
                          </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
