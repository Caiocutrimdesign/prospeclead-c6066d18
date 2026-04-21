import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import logo from "@/assets/prospeclead-logo.png";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Estado próprio para a aba ADM (não compartilha com signup comum)
  const [admEmail, setAdmEmail] = useState("");
  const [admPassword, setAdmPassword] = useState("");
  const [admName, setAdmName] = useState("");
  const [admToken, setAdmToken] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate("/", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Conta criada!");
      navigate("/", { replace: true });
    }
  };

  const handleAdmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (admToken.trim().length === 0) {
      toast.error("Informe o token de administrador");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-signup", {
      body: {
        email: admEmail,
        password: admPassword,
        full_name: admName,
        token: admToken,
      },
    });
    if (error || (data as any)?.error) {
      setBusy(false);
      const msg = (data as any)?.error ?? error?.message ?? "Erro ao cadastrar admin";
      toast.error(msg);
      return;
    }
    // Loga automaticamente o novo admin
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: admEmail,
      password: admPassword,
    });
    setBusy(false);
    if (signErr) {
      toast.success("Administrador criado! Faça login.");
    } else {
      toast.success("Administrador criado e logado!");
      navigate("/admin", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-prospeclead">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-3">
          <img
            src={logo}
            alt="ProspecLead - CRM gamificado para promoters"
            className="mx-auto w-40 h-auto object-contain"
          />
          <p className="text-sm text-muted-foreground">CRM gamificado para promoters</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            <TabsTrigger value="adm">ADM</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">E-mail</Label>
                <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Senha</Label>
                <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Criando..." : "Criar conta"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="adm">
            <form onSubmit={handleAdmSignUp} className="space-y-4 mt-4">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Cadastro restrito. Informe o <strong>token de administrador</strong> fornecido pela gestão para criar uma conta com acesso total ao painel ADM.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-name">Nome completo</Label>
                <Input id="adm-name" required value={admName} onChange={(e) => setAdmName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-email">E-mail</Label>
                <Input id="adm-email" type="email" required value={admEmail} onChange={(e) => setAdmEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-password">Senha</Label>
                <Input id="adm-password" type="password" required minLength={6} value={admPassword} onChange={(e) => setAdmPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-token">Token de administrador</Label>
                <Input
                  id="adm-token"
                  type="password"
                  required
                  placeholder="••••••"
                  value={admToken}
                  onChange={(e) => setAdmToken(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Validando token..." : "Criar Administrador"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
