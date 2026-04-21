// Edge function pública (sem JWT) para garantir a existência da conta de RH padrão.
// É idempotente: se a conta já existe, apenas garante o papel 'rh'.
// Pode ser invocada do front-end (tela de login) sem credenciais.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Conta de RH padrão (solicitada pelo cliente).
const RH_EMAIL = "rh@facilitcorp.com";
const RH_PASSWORD = "Facilit018@";
const RH_NAME = "RH Facilit Corp";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Verifica se já existe um usuário com este e-mail
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      return json({ error: listErr.message }, 500);
    }

    let userId = list.users.find(
      (u) => u.email?.toLowerCase() === RH_EMAIL.toLowerCase(),
    )?.id;

    // 2. Se não existe, cria o usuário já confirmado
    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin
        .createUser({
          email: RH_EMAIL,
          password: RH_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: RH_NAME },
        });
      if (createErr || !created.user) {
        return json(
          { error: createErr?.message ?? "Falha ao criar usuário RH" },
          400,
        );
      }
      userId = created.user.id;
    } else {
      // Garante que a senha é a esperada (caso alguém tenha alterado)
      await admin.auth.admin.updateUserById(userId, {
        password: RH_PASSWORD,
        email_confirm: true,
      });
    }

    // 3. Garante o papel 'rh' (mantendo o 'promoter' criado pelo trigger)
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "rh" });
    if (roleErr && !`${roleErr.message}`.toLowerCase().includes("duplicate")) {
      console.error("rh role insert error", roleErr);
    }

    return json({ ok: true, user_id: userId, email: RH_EMAIL });
  } catch (e) {
    console.error("rh-bootstrap error", e);
    return json({ error: (e as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
