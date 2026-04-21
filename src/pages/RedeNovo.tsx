import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Fuel, Building2, User, Smartphone, MapPin, Rocket } from "lucide-react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default function RedeNovo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [manager, setManager] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("MA");
  const [reward, setReward] = useState("0.50");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Nome do PDV é obrigatório");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("pdvs")
      .insert({
        user_id: user.id,
        name: name.trim(),
        cnpj: cnpj.trim() || null,
        manager_name: manager.trim() || null,
        whatsapp: whatsapp.trim() || null,
        city: city.trim() || null,
        state: uf,
        reward_per_lead: Number(reward.replace(",", ".")) || 0.5,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Erro ao cadastrar");
      return;
    }
    toast.success("PDV cadastrado! QR Code gerado 🎉");
    navigate("/rede");
  };

  return (
    <div className="pb-8">
      {/* Header azul */}
      <div className="bg-gradient-pdv text-primary-foreground -mx-4 px-4 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/15 -ml-2">
            <Link to="/rede"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold leading-tight">Cadastrar Novo PDV</h1>
            <p className="text-xs opacity-80">Posto · Loja · Parceiro</p>
          </div>
        </div>
      </div>

      {/* Trophy banner */}
      <Card className="mt-4 p-4 bg-foreground text-background border-0 flex gap-3 items-start">
        <span className="text-3xl">🏆</span>
        <div>
          <p className="font-semibold text-sm">Construa sua Renda Passiva!</p>
          <p className="text-xs opacity-80 mt-0.5">
            Cada PDV cadastrado gera <span className="text-warning font-bold">R$ {Number(reward.replace(",", ".")).toFixed(2).replace(".", ",")}</span> por lead automaticamente, mesmo sem você estar presente.
          </p>
        </div>
      </Card>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {/* Dados do PDV */}
        <section className="space-y-3">
          <SectionTitle icon="⛽" color="text-destructive">Dados do PDV</SectionTitle>

          <Field icon={Building2} label="Nome do Posto / Loja *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Posto Shell Maiobão" required />
          </Field>

          <Field icon={Building2} label="CNPJ">
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" inputMode="numeric" />
          </Field>
        </section>

        {/* Responsável */}
        <section className="space-y-3">
          <SectionTitle icon="👤" color="text-primary">Responsável / Gerente</SectionTitle>

          <Field icon={User} label="Nome do Gerente / Dono *">
            <Input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Nome do responsável" required />
          </Field>

          <Field icon={Smartphone} label="WhatsApp *">
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(98) 99999-9999" inputMode="tel" required />
          </Field>
        </section>

        {/* Localização */}
        <section className="space-y-3">
          <SectionTitle icon="📍" color="text-primary">Localização</SectionTitle>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Field icon={MapPin} label="Cidade *">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" required />
              </Field>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">UF *</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Recompensa */}
        <section className="space-y-3">
          <SectionTitle icon="💰" color="text-success">Renda passiva por lead</SectionTitle>
          <Field icon={Fuel} label="Quanto cada lead pelo QR vai te creditar (R$)">
            <Input
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="0.50"
              inputMode="decimal"
            />
          </Field>
          <p className="text-[11px] text-muted-foreground px-1">
            Sugestão: R$ 0,50 por lead. O valor é creditado automaticamente na sua carteira sempre que alguém escanear o QR e enviar o contato.
          </p>
        </section>

        <Button
          type="submit"
          disabled={busy}
          className="w-full h-14 text-base font-bold gap-2 bg-success hover:bg-success/90 text-success-foreground"
        >
          <Rocket className="w-5 h-5" />
          {busy ? "Cadastrando..." : "CADASTRAR PDV E GERAR QR CODE"}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          Os dados são salvos com segurança e o QR é gerado automaticamente.
        </p>
      </form>
    </div>
  );
}

function SectionTitle({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <h2 className={`flex items-center gap-2 font-semibold ${color}`}>
      <span>{icon}</span> {children}
    </h2>
  );
}

function Field({ icon: Icon, label, children }: { icon: typeof Fuel; label: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Label className="absolute left-9 -top-2 px-1 bg-background text-[11px] text-muted-foreground z-10">
        {label}
      </Label>
      <div className="flex items-center border rounded-md bg-background h-11 px-3">
        <Icon className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
        <div className="flex-1 [&>*]:border-0 [&>*]:bg-transparent [&>*]:px-0 [&>*]:h-9 [&>*]:focus-visible:ring-0">
          {children}
        </div>
      </div>
    </div>
  );
}
