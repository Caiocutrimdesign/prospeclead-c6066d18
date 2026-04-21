import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Medal, Target, TrendingUp, Wallet } from "lucide-react";
import { formatBRL } from "@/lib/format";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const name = profile?.full_name ?? "Promoter";

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Card className="p-6 text-center space-y-3">
        <Avatar className="w-20 h-20 mx-auto">
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Medal className={`w-4 h-4 ${profile?.level === "OURO" ? "text-gold" : profile?.level === "PRATA" ? "text-silver" : "text-bronze"}`} />
          Nível {profile?.level ?? "BRONZE"}
        </Badge>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Wallet} label="Ganho do mês" value={formatBRL(profile?.monthly_earnings ?? 0)} />
        <StatCard icon={Target} label="Meta diária" value={`${profile?.daily_goal ?? 100} leads`} />
        <StatCard icon={TrendingUp} label="Streak" value={`${profile?.streak_days ?? 0} dias`} />
        <StatCard icon={Medal} label="Nível" value={profile?.level ?? "BRONZE"} />
      </div>

      <Card className="p-4 space-y-1">
        <h3 className="font-semibold mb-2">Configurações</h3>
        <SettingRow label="Editar perfil" />
        <SettingRow label="Alterar meta diária" />
        <SettingRow label="Notificações" />
      </Card>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="w-4 h-4" /> Sair
      </Button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <Card className="p-4 space-y-1">
      <Icon className="w-5 h-5 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </Card>
  );
}

function SettingRow({ label }: { label: string }) {
  return (
    <button className="w-full text-left py-2.5 text-sm hover:bg-muted rounded-md px-2 transition">
      {label}
    </button>
  );
}
