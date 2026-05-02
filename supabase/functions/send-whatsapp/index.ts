import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function para enviar mensagens via API do WhatsApp (Meta).
 * Substitui o n8n para envio de mensagens.
 */
Deno.serve(async (req) => {
  // Lidar com CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id, message, sender } = await req.json();

    if (!session_id || !message) {
      return new Response(
        JSON.stringify({ error: "session_id e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "924963413700361";
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "EAANJP9O0LwkBRUVUNT2v3hlwFvvVjTiHI2UpSrJZAtMgZBnatW7VnZCfYOGt2qI3LvATzepier1SCEW0id4ABZCKyaiefWWMyUWA5yZBFo2gjZAKWZC2qKW1cR1VZAdcVIul34KzmdNiYR3yeXpiESjZBwTQuNMPDw64bixDXR9UsWcC4urPKnXmM8W7ZCSTH30QZDZD";

    console.log(`Enviando mensagem direta via Meta para: ${session_id}`);

    // 1. Disparar requisição para a API da Meta
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: session_id.replace(/\D/g, ""), // Remove caracteres não numéricos
          type: "text",
          text: { body: message },
        }),
      }
    );

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("Erro na API da Meta:", metaResult);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar via Meta", details: metaResult }),
        { status: metaResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Salvar a mensagem enviada no histórico (tipo 'admin')
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: dbError } = await supabase
      .from("n8n_chat_histories")
      .insert({
        session_id: session_id,
        message: {
          type: "admin",
          content: message,
          meta_id: metaResult.messages?.[0]?.id
        },
        hora_data_mensagem: new Date().toISOString()
      });

    if (dbError) {
      console.error("Erro ao salvar mensagem do admin no banco:", dbError);
    }

    return new Response(
      JSON.stringify({ ok: true, result: metaResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Erro interno send-whatsapp:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});