import type { RolUsuario } from "./local-db/schema";

export type AppPageId =
  | "inicio"
  | "compras"
  | "ventas"
  | "stock"
  | "reparto"
  | "caja"
  | "datos"
  | "reportes";

export type RoleAccess = {
  rol: RolUsuario;
  allowedPages: AppPageId[];
  defaultPage: AppPageId;
  canSeeMetrics: boolean;
  canSeeReports: boolean;
  canSeeCash: boolean;
  canSeeAllRoutes: boolean;
};

const accessByRole: Record<RolUsuario, RoleAccess> = {
  ADMINISTRADOR: {
    rol: "ADMINISTRADOR",
    allowedPages: ["inicio", "compras", "ventas", "stock", "reparto", "caja", "datos", "reportes"],
    defaultPage: "inicio",
    canSeeMetrics: true,
    canSeeReports: true,
    canSeeCash: true,
    canSeeAllRoutes: true,
  },
  VENDEDOR: {
    rol: "VENDEDOR",
    allowedPages: ["inicio", "compras", "ventas", "stock", "reparto", "datos"],
    defaultPage: "inicio",
    canSeeMetrics: false,
    canSeeReports: false,
    canSeeCash: false,
    canSeeAllRoutes: true,
  },
  REPARTIDOR: {
    rol: "REPARTIDOR",
    allowedPages: ["reparto"],
    defaultPage: "reparto",
    canSeeMetrics: false,
    canSeeReports: false,
    canSeeCash: false,
    canSeeAllRoutes: false,
  },
};

export function getRoleAccess(role: RolUsuario): RoleAccess {
  return accessByRole[role] ?? accessByRole.VENDEDOR;
}

export function canAccessPage(role: RolUsuario, page: AppPageId) {
  return getRoleAccess(role).allowedPages.includes(page);
}

export function resolvePageForRole(role: RolUsuario, page: AppPageId): AppPageId {
  const access = getRoleAccess(role);
  return access.allowedPages.includes(page) ? page : access.defaultPage;
}
