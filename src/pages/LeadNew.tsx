import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProspectingTimer } from "@/hooks/useProspectingTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CameraCapture from "@/components/CameraCapture";
import {
  ArrowLeft, Search, Camera, MapPin, Loader2, CheckCircle2,
  Wallet, Eye, Siren, MessageCircle, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
const ACCURACY_LIMIT_M = 100;

const PAINS = [
  { id: "patrimonio", icon: "💰", title: "Perder patrimônio", subtitle: "Medo de ter o carro roubado sem recuperação" },
  { id: "controle", icon: "👁", title: "Não saber quem dirige", subtitle: "Quer controlar filhos, funcionários e frota" },
  { id: "panico", icon: "🆘", title: "Acidente / Sequestro (Pânico)", subtitle: "Precisa de botão de emergência e suporte 24h" },
] as const;

export default function LeadNew() {
  const { user } = useAuth();
  const { registerActivity } = useProspectingTimer();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicle_model: "",
    plate: "",
    location: "",
    profession: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const [hasTracker, setHasTracker] = useState<"sim" | "nao" | null>(null);
  const [pain, setPain] = useState<string | null>(null);

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number; capturedAt: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);

  const [busy, setBusy] = useState(false);

  const onPhoto = (blob: Blob) => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoBlob(blob);
    setPhotoUrl(URL.createObjectURL(blob));
  };

  // Reverse geocoding via Nominatim (OpenStreetMap) — gratuito, sem chave
  const reverseGeocode = async (lat: number, lng: number) => {
    setResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt-BR`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      const a = data?.address ?? {};
      const road = a.road || a.pedestrian || a.path || "";
      const number = a.house_number ? `, ${a.house_number}` : "";
      const suburb = a.suburb || a.neighbourhood || a.quarter || "";
      const city = a.city || a.town || a.village || a.municipality || "";
      const parts = [[road + number].filter(Boolean).join(""), suburb, city].filter(Boolean);
      const pretty = parts.join(" - ") || data?.display_name || "";
      if (pretty) set("location", pretty);
    } catch {
      // silencioso
    } finally {
      setResolving(false);
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error("GPS indisponível");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setLocating(false);
        toast.success(`Local capturado (~${Math.round(pos.coords.accuracy)}m)`);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter localização");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Captura GPS + endereço automaticamente ao abrir a tela
  useEffect(() => {
    captureGPS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    if (!form.name.trim()) { toast.error("Informe o nome"); return false; }
    if (!form.phone.trim()) { toast.error("Informe o WhatsApp"); return false; }
    if (!form.vehicle_model.trim()) { toast.error("Informe o veículo"); return false; }
    if (!hasTracker) { toast.error("Marque se já tem rastreador"); return false; }
    if (!form.location.trim()) { toast.error("Informe a praça/local"); return false; }
    return true;
  };

  const save = async (action: "whatsapp" | "save") => {
    if (!user) return;
    if (!validate()) return;
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (photoBlob) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("lead-photos")
          .upload(path, photoBlob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        photoPath = path;
      }

      const payload: LeadInsert = {
        user_id: user.id,
        kind: "b2c",
        name: form.name,
        phone: form.phone || null,
        vehicle_model: form.vehicle_model || null,
        vehicle_plate: form.plate?.toUpperCase() || null,
        status: action === "save" ? "vendido" : "contatado",
        photo_url: photoPath,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location_accuracy: coords?.accuracy ?? null,
        captured_at: coords?.capturedAt ?? null,
        city: form.location,
      };
      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;

      registerActivity();

      if (action === "whatsapp" && form.phone) {
        const msg = encodeURIComponent(
          `Olá ${form.name.split(" ")[0]}! Vi seu ${form.vehicle_model} e tenho uma proposta de proteção veicular. Posso te explicar?`
        );
        const phone = form.phone.replace(/\D/g, "");
        window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
      }

      toast.success(action === "save" ? "Lead salvo como vendido!" : "Lead cadastrado!");
      navigate("/leads?tab=b2c");
    } catch (e: any) {
      console.error("Erro ao salvar lead:", e);
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-8">
      {/* Header azul (igual referência) */}
      <div className="bg-[hsl(var(--brand-blue))] text-white px-4 py-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Link to="/leads"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <h1 className="text-lg font-bold">📋 Novo Lead</h1>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Nome Completo */}
        <Field label="Nome Completo" icon="👤" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: João Silva" className="h-12" />
        </Field>

        {/* WhatsApp + botão buscar */}
        <Field label="WhatsApp" icon="📱" required>
          <div className="flex gap-2">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(11) 99999-9999"
              inputMode="tel"
              className="h-12 flex-1"
            />
            <Button
              type="button"
              size="icon"
              className="h-12 w-12 bg-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue))]/90"
              onClick={() => toast.info("Busca de contato em breve")}
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </Field>

        {/* Veículo */}
        <Field label="Veículo" icon="🚗" required>
          <Input
            value={form.vehicle_model}
            onChange={(e) => set("vehicle_model", e.target.value)}
            placeholder="Ex: Gol, Civic, HB20"
            className="h-12"
          />
        </Field>

        {/* Já tem rastreador? */}
        <Field label="Já tem rastreador?" icon="🔒" required>
          <div className="grid grid-cols-2 gap-3">
            {(["sim", "nao"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setHasTracker(opt)}
                className={`h-14 rounded-xl border-2 font-semibold capitalize transition ${
                  hasTracker === opt
                    ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue))]/10 text-[hsl(var(--brand-blue))]"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {opt === "nao" ? "Não" : "Sim"}
              </button>
            ))}
          </div>
        </Field>

        {/* Placa do Veículo + foto */}
        <Field label="Placa do Veículo" icon="🚘">
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-3 py-2 mb-2 text-xs text-foreground/80">
            📸 <strong>Tire foto AGORA</strong> — registro fotográfico melhora a qualidade do lead.
          </div>
          <div className="flex gap-2">
            <Input
              value={form.plate}
              onChange={(e) => set("plate", e.target.value.toUpperCase())}
              placeholder="Placa (opcional)"
              maxLength={8}
              className="h-14 flex-1 font-mono tracking-widest"
            />
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className={`h-14 w-20 rounded-xl flex flex-col items-center justify-center text-white shadow-md transition active:scale-95 ${
                photoBlob ? "bg-success" : "bg-[hsl(150,55%,28%)] hover:bg-[hsl(150,55%,32%)]"
              }`}
            >
              {photoBlob ? <CheckCheck className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              <span className="text-[10px] font-bold mt-0.5">{photoBlob ? "OK" : "FOTO"}</span>
            </button>
          </div>
          {photoUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border">
              <img src={photoUrl} alt="Placa" className="w-full max-h-48 object-cover" />
            </div>
          )}
        </Field>

        {/* Praça/Local removido — GPS continua sendo capturado em background */}

        {/* Profissão */}
        <Field label="Profissão do cliente" icon="💼">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">💼</span>
            <Input
              value={form.profession}
              onChange={(e) => set("profession", e.target.value)}
              placeholder="Ex: Policial, Médico, Empresário..."
              className="h-12 pl-9"
            />
          </div>
        </Field>

        {/* Maior dor */}
        <Field label="Maior dor do cliente" icon="🎯">
          <div className="space-y-2">
            {PAINS.map((p) => {
              const active = pain === p.id;
              const Icon = p.id === "patrimonio" ? Wallet : p.id === "controle" ? Eye : Siren;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPain(active ? null : p.id)}
                  className={`w-full text-left rounded-xl border-2 p-3 flex items-start gap-3 transition ${
                    active
                      ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue))]/5"
                      : "border-border bg-background hover:border-foreground/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    p.id === "panico" ? "bg-destructive/10 text-destructive" :
                    p.id === "controle" ? "bg-[hsl(var(--brand-blue))]/10 text-[hsl(var(--brand-blue))]" :
                    "bg-warning/10 text-warning"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            onClick={() => save("whatsapp")}
            disabled={busy}
            className="w-full h-14 text-base font-bold bg-success hover:bg-success/90 text-success-foreground rounded-xl"
          >
            {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-2" />}
            ENVIAR PRIMEIRA MENSAGEM
          </Button>
          <Button
            type="button"
            onClick={() => save("save")}
            disabled={busy}
            className="w-full h-14 text-base font-bold bg-warning hover:bg-warning/90 text-warning-foreground rounded-xl"
          >
            {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "✅"}
            <span className="ml-2">SALVAR E VENDER AGORA</span>
          </Button>
        </div>
      </div>

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onPhoto} />
    </div>
  );
}

function Field({
  label, icon, required, children,
}: {
  label: string; icon?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-sm font-semibold">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
