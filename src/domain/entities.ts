export type NecessityStatus =
  | "PENDENTE_DEFINICAO"
  | "NAO_INICIADO"
  | "EM_COTACAO"
  | "AGUARDANDO_APROVACAO"
  | "APROVADO"
  | "COMPRADO"
  | "EM_TRANSPORTE"
  | "ENTREGUE"
  | "CONFERIDO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "DIVERGENCIA";

export interface Store {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  region: string;
  manager: string;
  email: string;
  phone: string;
  status: string;
}

export interface Item {
  id: string;
  operationalCode: string;
  group: string;
  area: string;
  name: string;
  specification: string;
  defaultQuantity: number;
  definitionStatus: "LIBERADO_PARA_COTACAO" | "PENDENTE_DEFINICAO";
  duplicateOperationalCode: boolean;
  active: boolean;
}

export interface Necessity {
  id: string;
  storeId: string;
  itemId: string;
  quantity: number;
  priority: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  status: NecessityStatus;
}

export interface DashboardMetrics {
  stores: number;
  items: number;
  necessities: number;
  pendingDefinition: number;
  quoted: number;
  awaitingApproval: number;
  approved: number;
  purchased: number;
  delivered: number;
  completed: number;
  divergences: number;
  duplicateCodeItems: number;
}

export interface StoreProgress {
  store: Store;
  total: number;
  pendingDefinition: number;
  quoted: number;
  approved: number;
  purchased: number;
  delivered: number;
  completed: number;
  progress: number;
}

export interface DataSourceInfo {
  kind: "apps-script" | "official-snapshot";
  label: string;
  status: "connected" | "snapshot" | "error";
  readOnly: boolean;
  spreadsheetId: string;
  modifiedAt: string;
  message: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  profile: string;
  allowedStoreIds: string[] | "TODAS";
}
