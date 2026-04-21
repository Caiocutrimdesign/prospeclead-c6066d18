import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useRole() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isRh, setIsRh] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setIsAdmin(false);
        setIsRh(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (cancelled) return;
      // Em caso de erro de rede/RLS transitório, não rebaixe os papéis já
      // conhecidos para evitar que o AdminLayout redirecione para "/" e o
      // usuário "perca" o painel administrativo enquanto o token é renovado.
      if (error) {
        console.warn("useRole: falha ao carregar papéis", error);
        setLoading(false);
        return;
      }
      const roles = (data ?? []).map((r) => r.role as string);
      setIsAdmin(roles.includes("admin"));
      setIsRh(roles.includes("rh"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Depende somente do id do usuário — assim TOKEN_REFRESHED (que troca a
    // referência do objeto `user`) não dispara um novo fetch desnecessário.
  }, [userId]);

  return { isAdmin, isRh, loading };
}
