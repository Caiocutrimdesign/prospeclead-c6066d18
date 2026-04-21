import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProspectingTimer } from "@/hooks/useProspectingTimer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Car, Truck } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const payload: LeadInsert = {
      user_id: user.id,
      kind,
      name: form.name,
      phone: form.phone || null,
      value: form.value ? Number(form.value.replace(",", ".")) : null,
      status: kind === "b2c" ? "coletado" : "prospectado",
      ...(kind === "b2c"
        ? { vehicle_model: form.vehicle_model || null, vehicle_plate: form.vehicle_plate?.toUpperCase() || null }
        : { company_cnpj: form.company_cnpj || null, fleet_size: form.fleet_size ? Number(form.fleet_size) : null, city: form.city || null }),
    };
    const { error } = await supabase.from("leads").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      registerActivity();
      toast.success("Lead cadastrado!");
      navigate(`/leads?tab=${kind}`);
    }
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/leads"><ArrowLeft className="w-5 h-5" /></Link></Button>
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

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Salvando..." : "Cadastrar lead"}
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
