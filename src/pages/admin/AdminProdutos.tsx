import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Package, Plus, Search, Pencil, Ban, Upload, Image as ImageIcon,
  Box, Layers, Repeat, CheckCircle2, XCircle, RefreshCw, DollarSign,
  Trash2,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductKind = "hardware" | "assinatura" | "pacote";
type BillingCycle = "once" | "monthly" | "annual";

interface Product {
  id: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  price: number;
  commission_percent: number;
  image_url: string | null;
  active: boolean;
  franchise: string | null;
  billing_cycle: BillingCycle;
  adhesion_fee: number;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  kind: "hardware" as ProductKind,
  price: "",
  commission_percent: "30",
  active: true,
  image_url: "",
  franchise: "",
  billing_cycle: "once" as BillingCycle,
  adhesion_fee: "0",
};

const KIND_META: Record<ProductKind, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  hardware: {
    label: "Hardware",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
    icon: Box,
  },
  assinatura: {
    label: "Plano / Adesão",
    cls: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
    icon: Repeat,
  },
  pacote: {
    label: "Pacote",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    icon: Layers,
  },
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  once: "Único",
  monthly: "Monthly",
  annual: "Annual",
};

export default function AdminProdutos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "all">("active");
  const [filterFranchise, setFilterFranchise] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [confirmToggle, setConfirmToggle] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar produtos");
    else setItems((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.active).length;
    const inactive = items.filter((i) => !i.active).length;
    const hardware = items.filter((i) => i.kind === "hardware").length;
    const maxComm = items
      .filter((i) => i.active)
      .reduce((m, i) => Math.max(m, (Number(i.price) * Number(i.commission_percent)) / 100), 0);
    return { active, inactive, hardware, maxComm };
  }, [items]);

  const franchises = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.franchise && set.add(i.franchise));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (filterKind !== "all" && p.kind !== filterKind) return false;
      if (filterStatus === "active" && !p.active) return false;
      if (filterStatus === "inactive" && p.active) return false;
      if (filterFranchise !== "all") {
        if (filterFranchise === "__global__" && p.franchise) return false;
        if (filterFranchise !== "__global__" && p.franchise !== filterFranchise) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.franchise ?? "").toLowerCase().includes(q) &&
          !(p.description ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [items, search, filterKind, filterStatus, filterFranchise]);

  const totalCommission = useMemo(
    () => filtered.reduce((s, p) => s + (Number(p.price) * Number(p.commission_percent)) / 100, 0),
    [filtered],
  );
  const maxFilteredCommission = useMemo(
    () => filtered.reduce((m, p) => Math.max(m, (Number(p.price) * Number(p.commission_percent)) / 100), 0),
    [filtered],
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      kind: p.kind,
      price: String(p.price),
      commission_percent: String(p.commission_percent),
      active: p.active,
      image_url: p.image_url ?? "",
      franchise: p.franchise ?? "",
      billing_cycle: p.billing_cycle,
      adhesion_fee: String(p.adhesion_fee),
    });
    setImageFile(null);
    setOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 4 MB");
      return;
    }
    setImageFile(f);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (error) {
      toast.error("Falha ao enviar imagem");
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const price = parseFloat(form.price.replace(",", "."));
    const commission = parseFloat(form.commission_percent.replace(",", "."));
    const adhesion = parseFloat(form.adhesion_fee.replace(",", ".") || "0");
    if (Number.isNaN(price) || price < 0) { toast.error("Preço inválido"); return; }
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      toast.error("Comissão deve estar entre 0 e 100"); return;
    }
    if (Number.isNaN(adhesion) || adhesion < 0) { toast.error("Adesão inválida"); return; }

    setSaving(true);
    let image_url = form.image_url || null;
    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (!url) { setSaving(false); return; }
      image_url = url;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      kind: form.kind,
      price,
      commission_percent: commission,
      active: form.active,
      image_url,
      franchise: form.franchise.trim() || null,
      billing_cycle: form.billing_cycle,
      adhesion_fee: adhesion,
    };

    const op = editing
      ? supabase.from("products").update(payload).eq("id", editing.id)
      : supabase.from("products").insert({ ...payload, created_by: user?.id ?? null });

    const { error } = await op;
    if (error) toast.error(editing ? "Erro ao atualizar" : "Erro ao criar produto");
    else {
      toast.success(editing ? "Produto atualizado" : "Produto criado");
      setOpen(false);
      load();
    }
    setSaving(false);
  };

  const toggleActive = async () => {
    if (!confirmToggle) return;
    const { error } = await supabase
      .from("products")
      .update({ active: !confirmToggle.active })
      .eq("id", confirmToggle.id);
    if (error) toast.error("Erro ao alterar status");
    else {
      toast.success(confirmToggle.active ? "Produto desativado" : "Produto ativado");
      load();
    }
    setConfirmToggle(null);
  };

  return (
    <div className="space-y-5">
      {/* Header com gradiente */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-primary/5 to-background px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl tracking-tight">
                Catálogo e Comissionamento
              </h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                Gerencie produtos, planos e comissões de 30% para o PDV
              </p>
            </div>
          </div>
          <Button onClick={openNew} size="lg" className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Novo Produto
          </Button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Produtos Ativos"
          value={stats.active}
          tone="success"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Inativos"
          value={stats.inactive}
          tone="muted"
          icon={<XCircle className="w-5 h-5 text-destructive" />}
        />
        <StatCard
          label="Hardware"
          value={stats.hardware}
          tone="info"
          icon={<Box className="w-5 h-5" />}
        />
        <StatCard
          label="Maior Comissão"
          value={formatBRL(stats.maxComm)}
          subtitle="por venda única"
          tone="default"
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      {/* Filtros */}
      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou franquia…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/30 border-0 focus-visible:ring-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedStatus value={filterStatus} onChange={setFilterStatus} />

            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📦 Todos os tipos</SelectItem>
                <SelectItem value="hardware">🛰️ Hardware</SelectItem>
                <SelectItem value="assinatura">🔁 Plano / Adesão</SelectItem>
                <SelectItem value="pacote">📚 Pacote</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterFranchise} onValueChange={setFilterFranchise}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Franquias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌎 Todas as franquias</SelectItem>
                <SelectItem value="__global__">Global (sem franquia)</SelectItem>
                {franchises.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={load} aria-label="Recarregar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={openNew} hasItems={items.length > 0} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Produto</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Franquia</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Preço / Adesão</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Comissão %</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                      <span className="inline-flex items-center gap-1">💰 Valor Comissão</span>
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const commValue = (Number(p.price) * Number(p.commission_percent)) / 100;
                    const meta = KIND_META[p.kind];
                    const Icon = meta.icon;
                    return (
                      <TableRow key={p.id} className="border-b">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm leading-tight">{p.name}</div>
                              {p.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-[240px] mt-0.5">
                                  {p.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1 font-medium", meta.cls)}>
                            <Icon className="w-3 h-3" /> {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.franchise ? (
                            <span className="text-sm">{p.franchise}</span>
                          ) : (
                            <span className="text-sm italic text-muted-foreground">Global</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">{formatBRL(Number(p.price))}</div>
                          {p.kind === "assinatura" ? (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              + Adesão {formatBRL(Number(p.adhesion_fee))}
                            </div>
                          ) : (
                            <Badge variant="outline" className="mt-1 text-[10px] py-0 px-1.5 bg-muted text-muted-foreground border-border uppercase">
                              {CYCLE_LABEL[p.billing_cycle]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30 font-semibold"
                          >
                            {Number(p.commission_percent).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 font-bold"
                          >
                            {formatBRL(commValue)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                              Inativo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => openEdit(p)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => setConfirmToggle(p)}
                              aria-label={p.active ? "Desativar" : "Ativar"}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Footer da tabela */}
            <div className="border-t bg-muted/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{filtered.length}</span> produto{filtered.length === 1 ? "" : "s"} exibido{filtered.length === 1 ? "" : "s"} (de {items.length} total)
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  💰 <span className="text-muted-foreground">Maior comissão ativa:</span>
                  <span className="font-bold">{formatBRL(maxFilteredCommission)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-muted-foreground">Total comissão filtrada:</span>
                  <span className="font-bold text-success">{formatBRL(totalCommission)}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal Criar/Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Rastreador Conect GPS Pro"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes do produto…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as ProductKind })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="assinatura">Plano / Adesão</SelectItem>
                    <SelectItem value="pacote">Pacote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Franquia</Label>
                <Input
                  value={form.franchise}
                  onChange={(e) => setForm({ ...form, franchise: e.target.value })}
                  placeholder="Global, Rastremix, …"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Ciclo de cobrança</Label>
                <Select
                  value={form.billing_cycle}
                  onValueChange={(v) => setForm({ ...form, billing_cycle: v as BillingCycle })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Único</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>% Comissão *</Label>
                <Input
                  type="number" step="0.01" min="0" max="100"
                  value={form.commission_percent}
                  onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Adesão (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.adhesion_fee}
                  onChange={(e) => setForm({ ...form, adhesion_fee: e.target.value })}
                  placeholder="0,00"
                  disabled={form.kind !== "assinatura"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                  {imageFile ? (
                    <img src={URL.createObjectURL(imageFile)} alt="preview" className="h-full w-full object-cover" />
                  ) : form.image_url ? (
                    <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {imageFile ? "Trocar" : "Enviar imagem"}
                    </span>
                  </Button>
                </label>
                {(imageFile || form.image_url) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setImageFile(null); setForm({ ...form, image_url: "" }); }}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Status</Label>
                <p className="text-xs text-muted-foreground">{form.active ? "Visível e disponível" : "Oculto do catálogo"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{form.active ? "Ativo" : "Inativo"}</span>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação ativar/desativar */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(o) => !o && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.active ? "Desativar produto?" : "Ativar produto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.active
                ? `${confirmToggle?.name} será ocultado do catálogo. Você pode reativar a qualquer momento.`
                : `${confirmToggle?.name} voltará a aparecer no catálogo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={toggleActive}>
              {confirmToggle?.active ? "Desativar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* --------------- helpers --------------- */

function StatCard({
  label, value, subtitle, icon, tone,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  tone: "success" | "muted" | "info" | "default";
}) {
  const ring =
    tone === "success" ? "border-success/30 bg-success/5" :
    tone === "info" ? "border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/5" :
    tone === "muted" ? "border-border bg-card" :
    "border-border bg-card";

  return (
    <Card className={cn("p-5 border-2", ring)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-2 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="text-muted-foreground shrink-0">{icon}</div>
      </div>
    </Card>
  );
}

function SegmentedStatus({
  value, onChange,
}: { value: "active" | "inactive" | "all"; onChange: (v: "active" | "inactive" | "all") => void }) {
  const opts: { v: "active" | "inactive" | "all"; label: string; icon: string }[] = [
    { v: "active", label: "Ativos", icon: "✅" },
    { v: "inactive", label: "Inativos", icon: "🔴" },
    { v: "all", label: "Todos", icon: "🌐" },
  ];
  return (
    <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded transition-all",
            value === o.v
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="mr-1">{o.icon}</span>{o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ onCreate, hasItems }: { onCreate: () => void; hasItems: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">
        {hasItems ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        {hasItems ? "Tente ajustar os filtros ou a busca." : "Comece adicionando seu primeiro produto ao catálogo."}
      </p>
      {!hasItems && (
        <Button onClick={onCreate} className="mt-5">
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      )}
    </div>
  );
}
