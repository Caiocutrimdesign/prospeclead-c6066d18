/**
 * Mapeamento entre papéis do banco (app_role: admin | promoter | rh)
 * e os papéis de UI mais granulares herdados do projeto Next.js antigo.
 *
 * Esta camada existe APENAS para apresentação. O banco continua com os
 * 3 papéis originais (admin, promoter, rh) — qualquer mudança real de
 * permissão deve ser feita via migração no enum `app_role`.
 */

export type DbRole = "admin" | "promoter" | "rh";

export type UiRole =
  | "ADMIN_MASTER"
  | "MANAGER"
  | "FINANCIAL"
  | "PROMOTER";

interface UiRoleMeta {
  label: UiRole;
  /** Texto curto descritivo para tooltip ou subtítulo. */
  description: string;
  /** Classe Tailwind sugerida para badge (usa tokens semânticos). */
  badgeClass: string;
}

const UI_ROLE_META: Record<UiRole, UiRoleMeta> = {
  ADMIN_MASTER: {
    label: "ADMIN_MASTER",
    description: "Administração total",
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  MANAGER: {
    label: "MANAGER",
    description: "Gestão operacional",
    badgeClass: "bg-accent/10 text-accent-foreground border-accent/30",
  },
  FINANCIAL: {
    label: "FINANCIAL",
    description: "Financeiro / RH",
    badgeClass: "bg-success/10 text-success border-success/30",
  },
  PROMOTER: {
    label: "PROMOTER",
    description: "Promoter de campo",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

/**
 * Converte um papel do banco no papel de UI "padrão" mais alto.
 * Use quando você precisa de UM rótulo só (ex.: badge no header).
 */
export function dbRoleToUiRole(role: DbRole): UiRole {
  switch (role) {
    case "admin":
      // ADMIN_MASTER e MANAGER convivem no mesmo papel real.
      // Por padrão exibimos ADMIN_MASTER no topo.
      return "ADMIN_MASTER";
    case "rh":
      return "FINANCIAL";
    case "promoter":
    default:
      return "PROMOTER";
  }
}

/**
 * Resolve o papel de UI a partir das flags carregadas pelo hook `useRole`.
 * Prioridade: admin > rh > promoter.
 */
export function resolveUiRole(opts: {
  isAdmin: boolean;
  isRh: boolean;
}): UiRole {
  if (opts.isAdmin) return "ADMIN_MASTER";
  if (opts.isRh) return "FINANCIAL";
  return "PROMOTER";
}

export function getUiRoleMeta(role: UiRole): UiRoleMeta {
  return UI_ROLE_META[role];
}
