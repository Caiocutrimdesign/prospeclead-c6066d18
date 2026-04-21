import { useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProspectingTimer } from "@/hooks/useProspectingTimer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Car, Truck, Camera, MapPin, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
}

const ACCURACY_LIMIT_M = 100; // precisão mínima aceita

export default function LeadNew() {
  const { user } = useAuth();
  const { registerActivity } = useProspectingTimer();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = (params.get("tipo") as "b2c" | "b2b") || "b2c";
  const [kind, setKind] = useState<"b2c" | "b2b">(initial);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", vehicle_model: "", vehicle_plate: "", value: "",
    company_cnpj: "", fleet_size: "", city: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  // Foto da placa
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Localização em tempo real
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Foto muito grande (máx 8MB)");
      return;
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const captureLocation = (): Promise<Coords> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização indisponível neste dispositivo"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date().toISOString(),
          }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED)
            reject(new Error("Permita o acesso à localização para cadastrar"));
          else if (err.code === err.POSITION_UNAVAILABLE)
            reject(new Error("Não foi possível determinar sua localização"));
          else if (err.code === err.TIMEOUT)
            reject(new Error("Tempo esgotado capturando localização"));
          else reject(new Error("Erro ao obter localização"));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  const handleCaptureLocation = async () => {
    setLocating(true);
    try {
      const c = await captureLocation();
      setCoords(c);
      if (c.accuracy > ACCURACY_LIMIT_M) {
        toast.warning(`Precisão baixa (~${Math.round(c.accuracy)}m). Tente em local aberto.`);
      } else {
        toast.success(`Local capturado (~${Math.round(c.accuracy)}m)`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Regras obrigatórias para B2C: foto + GPS fresco
    if (kind === "b2c") {
      if (!photoFile) {
        toast.error("Tire a foto da placa para cadastrar");
        return;
      }
      if (!coords) {
        toast.error("Capture sua localização atual antes de cadastrar");
        return;
      }
      // Garante que o GPS é recente (até 5min)
      const ageMs = Date.now() - new Date(coords.capturedAt).getTime();
      if (ageMs > 5 * 60 * 1000) {
        toast.error("Localização expirou. Capture novamente.");
        return;
      }
    }

    setBusy(true);
    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("lead-photos")
          .upload(path, photoFile, { contentType: photoFile.type, upsert: false });
        if (upErr) throw upErr;
        photoUrl = path;
      }

      const payload: LeadInsert = {
        user_id: user.id,
        kind,
        name: form.name,
        phone: form.phone || null,
        value: form.value ? Number(form.value.replace(",", ".")) : null,
        status: kind === "b2c" ? "coletado" : "prospectado",
        photo_url: photoUrl,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        location_accuracy: coords?.accuracy ?? null,
        captured_at: coords?.capturedAt ?? null,
        ...(kind === "b2c"
          ? { vehicle_model: form.vehicle_model || null, vehicle_plate: form.vehicle_plate?.toUpperCase() || null }
          : {
              company_cnpj: form.company_cnpj || null,
              fleet_size: form.fleet_size ? Number(form.fleet_size) : null,
              city: form.city || null,
            }),
      };

      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;

      registerActivity();
      toast.success("Lead cadastrado!");
      navigate(`/leads?tab=${kind}`);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao cadastrar lead");
    } finally {
      setBusy(false);
    }
  };

  const accuracyOk = coords && coords.accuracy <= ACCURACY_LIMIT_M;

  return (
    <div className="pb-6">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/leads"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Novo lead</h1>
      </div>

      <div className="px-4 space-y-4">
        <Tabs value={kind} onValueChange={(v) => setKind(v as "b2c" | "b2b")}>
          <TabsList className="w-full">
            <TabsTrigger value="b2c" className="flex-1 gap-2"><Car className="w-4 h-4" /> B2C</TabsTrigger>
            <TabsTrigger value="b2b" className="flex-1 gap-2"><Truck className="w-4 h-4" /> B2B</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="p-4">
          <form onSubmit={submit} className="space-y-4">
            <Field label={kind === "b2c" ? "Nome completo" : "Nome da empresa"} required value={form.name} onChange={(v) => set("name", v)} />
            <Field label="Telefone / WhatsApp" value={form.phone} onChange={(v) => set("phone", v)} />

            {kind === "b2c" ? (
              <>
                <Field label="Modelo do veículo" value={form.vehicle_model} onChange={(v) => set("vehicle_model", v)} />
                <Field label="Placa" value={form.vehicle_plate} onChange={(v) => set("vehicle_plate", v)} placeholder="ABC1D23" maxLength={8} />
              </>
            ) : (
              <>
                <Field label="CNPJ" value={form.company_cnpj} onChange={(v) => set("company_cnpj", v)} placeholder="00.000.000/0000-00" />
                <Field label="Tamanho da frota" type="number" value={form.fleet_size} onChange={(v) => set("fleet_size", v)} />
                <Field label="Cidade / UF" value={form.city} onChange={(v) => set("city", v)} />
              </>
            )}

            <Field label="Valor estimado (R$)" type="text" inputMode="decimal" value={form.value} onChange={(v) => set("value", v)} />

            {/* Foto da placa */}
            <div className="space-y-2">
              <Label>
                Foto da placa {kind === "b2c" && <span className="text-destructive">*</span>}
              </Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPickPhoto}
                className="hidden"
              />
              {!photoPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {kind === "b2c" ? "Tirar foto da placa (obrigatório)" : "Tirar foto da placa"}
                </Button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border">
                  <img src={photoPreview} alt="Placa" className="w-full h-48 object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={clearPhoto}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/90 text-success-foreground text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Foto pronta
                  </div>
                </div>
              )}
              {kind === "b2c" && (
                <p className="text-[11px] text-muted-foreground">
                  Câmera ao vivo — foto deve ser tirada na hora do cadastro.
                </p>
              )}
            </div>

            {/* Localização em tempo real */}
            <div className="space-y-2">
              <Label>
                Local atual {kind === "b2c" && <span className="text-destructive">*</span>}
              </Label>
              {!coords ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={handleCaptureLocation}
                  disabled={locating}
                >
                  {locating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Capturando GPS…</>
                  ) : (
                    <><MapPin className="w-4 h-4 mr-2" /> Confirmar localização agora</>
                  )}
                </Button>
              ) : (
                <div className={`rounded-xl border p-3 space-y-2 ${accuracyOk ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className={`w-4 h-4 ${accuracyOk ? "text-success" : "text-warning"}`} />
                      Local confirmado
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ~{Math.round(coords.accuracy)}m
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={handleCaptureLocation}
                    disabled={locating}
                  >
                    {locating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MapPin className="w-3 h-3 mr-1" />}
                    Recapturar
                  </Button>
                </div>
              )}
              {kind === "b2c" && (
                <p className="text-[11px] text-muted-foreground">
                  GPS capturado em tempo real. Precisão ideal: até {ACCURACY_LIMIT_M}m.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-12" disabled={busy}>
              {busy ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</>) : "Cadastrar lead"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", placeholder, maxLength, inputMode }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string; maxLength?: number; inputMode?: "decimal" | "numeric" | "text";
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} type={type} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} />
    </div>
  );
}
