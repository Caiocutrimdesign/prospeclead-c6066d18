/**
 * Helpers para abrir conversa no WhatsApp com mensagem pré-preenchida.
 * Usa o domínio universal `wa.me`, que funciona tanto no app quanto no WhatsApp Web.
 */

/** Mantém apenas dígitos e adiciona código do Brasil (55) quando faltar. */
export function normalizePhoneBR(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Se já vier com DDI (12 ou 13 dígitos começando por 55), mantém.
  if (digits.length >= 12 && digits.startsWith("55")) return digits;
  // Caso contrário, presume Brasil.
  return `55${digits}`;
}

interface WhatsAppMessageOptions {
  leadName?: string | null;
  senderName?: string | null;
  vehicleModel?: string | null;
  kind?: "b2c" | "b2b" | null;
}

/** Monta a mensagem padrão de primeiro contato. */
export function buildWhatsAppMessage(opts: WhatsAppMessageOptions): string {
  const firstName = (opts.leadName ?? "").trim().split(/\s+/)[0] || "tudo bem";
  const sender = (opts.senderName ?? "").trim() || "Equipe Telensat";

  if (opts.kind === "b2b") {
    return (
      `Olá ${firstName}! Aqui é ${sender}, da Telensat. ` +
      `Tudo bem? Gostaria de apresentar nossas soluções de rastreamento e gestão de frota ` +
      `para sua empresa. Posso te enviar uma proposta?`
    );
  }

  const vehicle = opts.vehicleModel?.trim();
  return (
    `Olá ${firstName}! Aqui é ${sender}, da Telensat. ` +
    `Vi seu interesse em rastreamento veicular${vehicle ? ` para o ${vehicle}` : ""} ` +
    `e queria te apresentar nossa solução. Posso te ajudar?`
  );
}

/** Retorna a URL completa do wa.me para o telefone informado. */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizePhoneBR(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** Abre o WhatsApp em uma nova aba com a mensagem pronta. */
export function openWhatsApp(
  phone: string | null | undefined,
  opts: WhatsAppMessageOptions,
): boolean {
  const url = buildWhatsAppUrl(phone, buildWhatsAppMessage(opts));
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
