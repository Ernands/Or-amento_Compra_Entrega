export type Profile = "ADMINISTRADOR" | "GESTOR" | "COMPRAS" | "RESPONSAVEL_LOJA" | "CONSULTA";
export type Action = "VER" | "CRIAR" | "EDITAR" | "APROVAR" | "CANCELAR" | "REABRIR" | "EXPORTAR";

export interface PermissionContext {
  storeId?: string;
  ownerId?: string;
}

export interface UserAccess {
  id: string;
  profile: Profile;
  active: boolean;
  allowedStoreIds: readonly string[] | "TODAS";
}

const profileActions: Record<Profile, readonly Action[]> = {
  ADMINISTRADOR: ["VER", "CRIAR", "EDITAR", "APROVAR", "CANCELAR", "REABRIR", "EXPORTAR"],
  GESTOR: ["VER", "APROVAR", "REABRIR", "EXPORTAR"],
  COMPRAS: ["VER", "CRIAR", "EDITAR", "EXPORTAR"],
  RESPONSAVEL_LOJA: ["VER", "CRIAR", "EDITAR", "EXPORTAR"],
  CONSULTA: ["VER", "EXPORTAR"],
};

export function can(user: UserAccess, action: Action, context: PermissionContext = {}): boolean {
  if (!user.active || !profileActions[user.profile].includes(action)) return false;
  if (!context.storeId || user.allowedStoreIds === "TODAS") return true;
  return user.allowedStoreIds.includes(context.storeId);
}
