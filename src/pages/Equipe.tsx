import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Construction, ArrowRight } from "lucide-react";

export default function Equipe() {
  return (
    <div className="pb-8 space-y-4">
      <div className="bg-gradient-pdv text-primary-foreground -mx-4 px-4 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Equipe</h1>
            <p className="text-xs opacity-80">Sua rede de promoters e parceiros</p>
          </div>
        </div>
      </div>

      <Card className="p-6 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-accent mx-auto flex items-center justify-center">
          <Construction className="w-8 h-8 text-warning" />
        </div>
        <div>
          <p className="font-semibold">Funcionalidade em construção</p>
          <p className="text-sm text-muted-foreground mt-1">
            Em breve você poderá acompanhar sua equipe e ver o desempenho de todos.
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Atalhos</p>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link to="/rede">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Minha Rede de PDVs
            </span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
