import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Package, Plus, Search, Pencil, Trash2, ImageIcon, Repeat, Box, Layers, Upload,
} from "lucide-react";
import { formatBRL } from "@/lib/format";

type ProductKind = "hardware" | "assinatura" | "pacote";

interface Product {
  id: string;
  name: string;
  description: string | null;
  kind: ProductKind;
  price: number;
  commission_percent: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  kind: "hardware" as ProductKind,
  price: "",
  commission_percent: "",
  active: true,
  image_url: "",
};

export default function AdminProdutos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar produtos");
    } else {
      setItems((data ?? []) as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.active).length;
    const pacotes = items.filter((i) => i.kind === "pacote").length;
    const assinaturas = items.filter((i) => i.kind === "assinatura").length;
    return { total, active, pacotes, assinaturas };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (filterKind !== "all" && p.kind !== filterKind) return false;
      if (filterStatus === "active" && !p.active) return false;
      if (filterStatus === "inactive" && p.active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.description ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, search, filterKind, filterStatus]);

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
    if (Number.isNaN(price) || price < 0) {
      toast.error("Preço inválido");
      return;
    }
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      toast.error("Comissão deve estar entre 0 e 100");
      return;
    }

    setSaving(true);
    let image_url = form.image_url || null;
    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (!url) {
        setSaving(false);
        return;
      }
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
    };

    if (editing) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar");
      else {
        toast.success("Produto atualizado");
        setOpen(false);
        load();
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert({ ...payload, created_by: user?.id ?? null });
      if (error) toast.error("Erro ao criar produto");
      else {
        toast.success("Produto criado");
        setOpen(false);
        load();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Produto excluído");
      load();
    }
    setConfirmDelete(null);
  };

  const kindLabel = (k: ProductKind) =>
    k === "hardware" ? "Hardware" : k === "assinatura" ? "Assinatura" : "Pacote";

  const kindIcon = (k: ProductKind) =>
    k === "hardware" ? <Box className="h-3 w-3" /> :
    k === "assinatura" ? <Repeat className="h-3 w-3" /> :
    <Layers className="h-3 w-3" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de produtos, planos e pacotes comissionados
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Sensor IoT Pro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Descrição</Label>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes do produto…"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(v) => setForm({ ...form, kind: v as ProductKind })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="assinatura">Assinatura</SelectItem>
                      <SelectItem value="pacote">Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border">
                    <Switch
                      checked={form.active}
                      onCheckedChange={(v) => setForm({ ...form, active: v })}
                    />
                    <span className="text-sm">{form.active ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">% Comissão *</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.commission_percent}
                    onChange={(e) =>
                      setForm({ ...form, commission_percent: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagem</Label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                    {imageFile ? (
                      <img
                        src={URL.createObjectURL(imageFile)}
                        alt="preview"
                        className="h-full w-full object-cover"
                      />
                    ) : form.image_url ? (
                      <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {imageFile ? "Trocar" : "Enviar imagem"}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || uploading}>
                {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar produto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Ativos" value={stats.active} icon={<Box className="h-4 w-4" />} accent="text-emerald-600" />
        <StatCard label="Pacotes" value={stats.pacotes} icon={<Layers className="h-4 w-4" />} />
        <StatCard label="Assinaturas" value={stats.assinaturas} icon={<Repeat className="h-4 w-4" />} />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="assinatura">Assinatura</SelectItem>
                <SelectItem value="pacote">Pacote</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} produto{filtered.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={openNew} hasItems={items.length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {p.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          {kindIcon(p.kind)} {kindLabel(p.kind)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatBRL(p.price)}</TableCell>
                      <TableCell>{Number(p.commission_percent).toFixed(2)}%</TableCell>
                      <TableCell>
                        {p.active ? (
                          <Badge>Ativo</Badge>
                        ) : (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDelete(p)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label, value, icon, accent,
}: { label: string; value: number; icon: React.ReactNode; accent?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${accent ?? ""}`}>{value}</p>
          </div>
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate, hasItems }: { onCreate: () => void; hasItems: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">
        {hasItems ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        {hasItems
          ? "Tente ajustar os filtros ou a busca."
          : "Comece adicionando seu primeiro produto ao catálogo."}
      </p>
      {!hasItems && (
        <Button onClick={onCreate} className="mt-4">
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      )}
    </div>
  );
}
