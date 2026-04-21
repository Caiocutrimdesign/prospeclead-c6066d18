import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Locate } from "lucide-react";
import { toast } from "sonner";

export default function CheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [busy, setBusy] = useState(false);

  const useCurrent = () => {
    if (!navigator.geolocation) return toast.error("Geolocalização indisponível");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Localização capturada"); },
      () => toast.error("Não foi possível obter localização")
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    // Close any open checkin
    await supabase.from("checkins").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id, location_name: name, latitude: coords.lat ?? null, longitude: coords.lng ?? null,
    });
    if (!error) await supabase.from("profiles").update({ current_location: name }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Check-in confirmado!"); navigate("/"); }
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/"><ArrowLeft className="w-5 h-5" /></Link></Button>
        <h1 className="text-xl font-bold">Check-in</h1>
      </div>

      <div className="px-4">
        <Card className="p-4 space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Local atual</Label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Posto Shell Av. Paulista" className="pl-9" />
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={useCurrent}>
              <Locate className="w-4 h-4" /> Usar localização atual
            </Button>
            {coords.lat && (
              <p className="text-xs text-muted-foreground text-center">
                {coords.lat.toFixed(5)}, {coords.lng?.toFixed(5)}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy || !name}>
              {busy ? "Confirmando..." : "Confirmar check-in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
