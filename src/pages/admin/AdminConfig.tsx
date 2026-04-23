import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Upload,
  Eye,
  EyeOff,
  Save,
  Wifi,
  WifiOff,
  CheckCircle2,
  Sparkles,
  HardDrive,
  Loader2,
  TestTube2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type PlanTier = "free" | "pro" | "enterprise";

type Settings = {
  brand_name: string;
  brand_logo_url: string | null;
  primary_color: string;
  plan: PlanTier;

  whatsapp_connected: boolean;
  whatsapp_phone_id: string | null;
  whatsapp_webhook_url: string | null;
  whatsapp_token: string | null;

  payment_gateway_connected: boolean;
  payment_pix_key: string | null;
  payment_api_key: string | null;

  commission_sale_percent: number;
  commission_capture_fixed: number;
  commission_goal_bonus: number;

  limit_max_promoters: number;
  limit_max_leads_month: number;
};

const DEFAULT_SETTINGS: Settings = {
  brand_name: "Minha Marca",
  brand_logo_url: null,
  primary_color: "#2563eb",
  plan: "free",
  whatsapp_connected: false,
  whatsapp_phone_id: null,
  whatsapp_webhook_url: null,
  whatsapp_token: null,
  payment_gateway_connected: false,
  payment_pix_key: null,
  payment_api_key: null,
  commission_sale_percent: 5,
  commission_capture_fixed: 2,
  commission_goal_bonus: 100,
  limit_max_promoters: 50,
  limit_max_leads_month: 5000,
};

const PLAN_META: Record<PlanTier, { label: string; cls: string }> = {
  free: { label: "Free", cls: "bg-muted text-muted-foreground border-border" },
  pro: { label: "Pro", cls: "bg-primary/10 text-primary border-primary/30" },
  enterprise: {
    label: "Enterprise",
    cls: "bg-success/10 text-success border-success/30",
  },
};

export default function AdminConfig() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [storageMb, setStorageMb] = useState<number>(0);

  // Visibility toggles for masked secrets
  const [showWaToken, setShowWaToken] = useState(false);
  const [showPayKey, setShowPayKey] = useState(false);

  // Logo upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (data) {
      setSettings({ ...DEFAULT_SETTINGS, ...(data as unknown as Settings) });
    }
    // Estimativa simples de armazenamento (lead-photos + branding + kyc)
    try {
      const buckets = ["lead-photos", "branding", "kyc-documents"];
      let total = 0;
      for (const b of buckets) {
        const { data: list } = await supabase.storage.from(b).list("", { limit: 1000 });
        if (list) {
          total += list.reduce((s, f) => s + (f.metadata?.size ?? 0), 0);
        }
      }
      setStorageMb(total / (1024 * 1024));
    } catch {
      setStorageMb(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const persist = async (
    section: string,
    fields: Partial<Settings>,
  ) => {
    setSaving(section);
    const { error } = await supabase
      .from("app_settings")
      .update(fields)
      .eq("id", 1);
    setSaving(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Configurações salvas" });
    return true;
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem grande demais", description: "Máximo 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setUploading(false);
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    update("brand_logo_url", data.publicUrl);
    setUploading(false);
    toast({ title: "Logo enviado", description: "Lembre de salvar para aplicar." });
  };

  const testConnection = (label: string) => {
    toast({
      title: `Testando ${label}…`,
      description: "Conexão simulada. Configure as credenciais reais para validar.",
    });
  };

  const storageDisplay = useMemo(() => {
    if (storageMb < 1) return `${(storageMb * 1024).toFixed(0)} KB`;
    if (storageMb < 1024) return `${storageMb.toFixed(1)} MB`;
    return `${(storageMb / 1024).toFixed(2)} GB`;
  }, [storageMb]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <section className="rounded-lg border bg-card px-4 py-4 shadow-sm md:px-6 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Plataforma
            </p>
            <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-primary" />
              Configurações
            </h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              Gerencie marca, integrações, comissões e limites da plataforma.
            </p>
          </div>
          <Badge variant="outline" className={PLAN_META[settings.plan].cls}>
            <Sparkles className="w-3 h-3 mr-1" />
            Plano {PLAN_META[settings.plan].label}
          </Badge>
        </div>
      </section>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid md:grid-cols-4">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="limites">Limites</TabsTrigger>
        </TabsList>

        {/* GERAL */}
        <TabsContent value="geral">
          <Card className="p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="brand_name">Nome da marca/franquia</Label>
                <Input
                  id="brand_name"
                  value={settings.brand_name}
                  onChange={(e) => update("brand_name", e.target.value)}
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary_color"
                    value={settings.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    className="h-10 w-16 rounded-md border border-input cursor-pointer bg-transparent"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    maxLength={9}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Logo da marca</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                    {settings.brand_logo_url ? (
                      <img
                        src={settings.brand_logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-1" />
                      )}
                      Enviar logo
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG/JPG/SVG até 2MB.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={settings.plan}
                  onValueChange={(v) => update("plan", v as PlanTier)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={() =>
                  persist("geral", {
                    brand_name: settings.brand_name,
                    brand_logo_url: settings.brand_logo_url,
                    primary_color: settings.primary_color,
                    plan: settings.plan,
                  })
                }
                disabled={saving === "geral"}
              >
                {saving === "geral" ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* INTEGRAÇÕES */}
        <TabsContent value="integracoes">
          <div className="space-y-4">
            {/* WhatsApp */}
            <Card className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    WhatsApp Meta Cloud API
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Envio de mensagens via WhatsApp Business.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    settings.whatsapp_connected
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {settings.whatsapp_connected ? (
                    <>
                      <Wifi className="w-3 h-3 mr-1" /> Conectado
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 mr-1" /> Desconectado
                    </>
                  )}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    value={settings.whatsapp_phone_id ?? ""}
                    onChange={(e) => update("whatsapp_phone_id", e.target.value)}
                    placeholder="ex: 123456789012345"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={settings.whatsapp_webhook_url ?? ""}
                    onChange={(e) => update("whatsapp_webhook_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Token de acesso</Label>
                  <div className="relative">
                    <Input
                      type={showWaToken ? "text" : "password"}
                      value={settings.whatsapp_token ?? ""}
                      onChange={(e) => update("whatsapp_token", e.target.value)}
                      placeholder="EAA..."
                      className="pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWaToken((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showWaToken ? "Ocultar" : "Mostrar"}
                    >
                      {showWaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => testConnection("WhatsApp")}>
                  <TestTube2 className="w-4 h-4 mr-1" /> Testar conexão
                </Button>
                <Button
                  onClick={() =>
                    persist("whatsapp", {
                      whatsapp_phone_id: settings.whatsapp_phone_id,
                      whatsapp_webhook_url: settings.whatsapp_webhook_url,
                      whatsapp_token: settings.whatsapp_token,
                      whatsapp_connected: !!(
                        settings.whatsapp_phone_id && settings.whatsapp_token
                      ),
                    }).then((ok) => {
                      if (ok) {
                        update(
                          "whatsapp_connected",
                          !!(settings.whatsapp_phone_id && settings.whatsapp_token),
                        );
                      }
                    })
                  }
                  disabled={saving === "whatsapp"}
                >
                  {saving === "whatsapp" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
            </Card>

            {/* Gateway pagamento */}
            <Card className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Gateway de pagamento (PIX)</h3>
                  <p className="text-xs text-muted-foreground">
                    Processamento de pagamentos via PIX.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    settings.payment_gateway_connected
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {settings.payment_gateway_connected ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 mr-1" /> Inativo
                    </>
                  )}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input
                    value={settings.payment_pix_key ?? ""}
                    onChange={(e) => update("payment_pix_key", e.target.value)}
                    placeholder="email, CPF, telefone ou aleatória"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showPayKey ? "text" : "password"}
                      value={settings.payment_api_key ?? ""}
                      onChange={(e) => update("payment_api_key", e.target.value)}
                      placeholder="sk_..."
                      className="pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPayKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPayKey ? "Ocultar" : "Mostrar"}
                    >
                      {showPayKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => testConnection("Gateway de pagamento")}>
                  <TestTube2 className="w-4 h-4 mr-1" /> Testar conexão
                </Button>
                <Button
                  onClick={() =>
                    persist("pay", {
                      payment_pix_key: settings.payment_pix_key,
                      payment_api_key: settings.payment_api_key,
                      payment_gateway_connected: !!(
                        settings.payment_pix_key && settings.payment_api_key
                      ),
                    }).then((ok) => {
                      if (ok) {
                        update(
                          "payment_gateway_connected",
                          !!(settings.payment_pix_key && settings.payment_api_key),
                        );
                      }
                    })
                  }
                  disabled={saving === "pay"}
                >
                  {saving === "pay" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* COMISSÕES */}
        <TabsContent value="comissoes">
          <Card className="p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>% padrão por venda</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settings.commission_sale_percent}
                    onChange={(e) =>
                      update("commission_sale_percent", Number(e.target.value))
                    }
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor fixo por captura</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.commission_capture_fixed}
                    onChange={(e) =>
                      update("commission_capture_fixed", Number(e.target.value))
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bônus por meta atingida</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.commission_goal_bonus}
                    onChange={(e) =>
                      update("commission_goal_bonus", Number(e.target.value))
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={() =>
                  persist("comissoes", {
                    commission_sale_percent: settings.commission_sale_percent,
                    commission_capture_fixed: settings.commission_capture_fixed,
                    commission_goal_bonus: settings.commission_goal_bonus,
                  })
                }
                disabled={saving === "comissoes"}
              >
                {saving === "comissoes" ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* LIMITES */}
        <TabsContent value="limites">
          <Card className="p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máximo de promoters</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.limit_max_promoters}
                  onChange={(e) =>
                    update("limit_max_promoters", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de leads/mês</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.limit_max_leads_month}
                  onChange={(e) =>
                    update("limit_max_leads_month", Number(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Armazenamento usado</p>
                <p className="text-lg font-bold tabular-nums">{storageDisplay}</p>
              </div>
              <Button variant="outline" onClick={() => toast({ title: "Solicitação de upgrade enviada", description: "Nossa equipe entrará em contato." })}>
                <Sparkles className="w-4 h-4 mr-1" /> Solicitar upgrade
              </Button>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={() =>
                  persist("limites", {
                    limit_max_promoters: settings.limit_max_promoters,
                    limit_max_leads_month: settings.limit_max_leads_month,
                  })
                }
                disabled={saving === "limites"}
              >
                {saving === "limites" ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
