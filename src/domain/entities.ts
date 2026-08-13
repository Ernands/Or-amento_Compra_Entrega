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
  address: string;
  notes: string;
  version: number;
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
  route1: string;
  route2: string;
  route3: string;
  notes: string;
  version: number;
}

export interface Necessity {
  id: string;
  storeId: string;
  itemId: string;
  quantity: number;
  priority: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  status: NecessityStatus;
  version: number;
}

export interface UpdateStoreInput {
  id: string;
  version: number;
  changes: {
    name: string;
    city: string;
    state: string;
    capitalUf: string;
    address: string;
    manager: string;
    email: string;
    phone: string;
    status: string;
    notes: string;
  };
  reason?: string;
}

export interface UpdateItemInput {
  id: string;
  version: number;
  changes: {
    operationalCode: string;
    group: string;
    area: string;
    name: string;
    specification: string;
    defaultQuantity: number;
    definitionStatus: Item["definitionStatus"];
    active: boolean;
    route1: string;
    route2: string;
    route3: string;
    notes: string;
  };
  reason?: string;
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
  kind: "apps-script" | "official-snapshot" | "public";
  label?: string;
  status: "connected" | "snapshot" | "error";
  readOnly: boolean;
  spreadsheetId?: string;
  checkedAt: string;
  message: string;
}

export interface TechnicalTableStatus {
  sheet: string;
  ok: boolean;
  headerRow: number | null;
  missing: string[];
  error?: string;
}

export interface TechnicalStatus {
  ready: boolean;
  checkedAt: string;
  tables: TechnicalTableStatus[];
}

export type QuoteStatus = "RASCUNHO" | "EM_ANDAMENTO" | "RECEBIDA" | "SELECIONADA" | "DESCARTADA" | "EXPIRADA";

export interface Supplier {
  id: string;
  name: string;
  taxId: string;
  city: string;
  state: string;
  contact: string;
  phone: string;
  email: string;
  rating: number | null;
  active: boolean;
  lastPurchase: string;
  notes: string;
  website: string;
  version: number;
}

export interface Quote {
  id: string;
  itemId: string;
  supplierId: string;
  lines: QuoteLine[];
  necessityIds: string[];
  storeIds: string[];
  scopeSignature: string;
  origin: string;
  unitPrice: number;
  quantityTotal: number;
  subtotalItems: number;
  freight: number;
  otherCosts: number;
  total: number;
  paymentMethod: string;
  leadTimeDays: number;
  proposalValidUntil: string;
  link: string;
  supplierRating: number | null;
  status: QuoteStatus;
  selected: boolean;
  quoteDate: string;
  responsible: string;
  notes: string;
  version: number;
  active: boolean;
}

export interface QuoteLine {
  id: string;
  proposalId: string;
  necessityId: string;
  storeId: string;
  itemId: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  version: number;
  active: boolean;
}

export interface PurchaseRoute {
  id: string;
  itemId: string;
  order: number;
  originDestination: string;
  active: boolean;
  notes: string;
}

export interface QuotePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  select: boolean;
  createSupplier: boolean;
}

export interface QuoteOptions {
  statuses: Array<Exclude<QuoteStatus, "SELECIONADA" | "DESCARTADA" | "EXPIRADA">>;
  origins: string[];
  paymentMethods: string[];
}

export interface QuotesWorkspace {
  suppliers: Supplier[];
  quotes: Quote[];
  routes: PurchaseRoute[];
  options: QuoteOptions;
  permissions: QuotePermissions;
  schemaMode: "LEGACY" | "GROUPED";
  checkedAt: string;
}

export interface CreateSupplierInput {
  name: string;
  taxId: string;
  city: string;
  state: string;
  contact: string;
  phone: string;
  email: string;
  rating: number | null;
  active: boolean;
  notes: string;
  website: string;
}

export interface QuoteValuesInput {
  supplierId: string;
  origin: string;
  unitPrice: number;
  freight: number;
  otherCosts: number;
  paymentMethod: string;
  leadTimeDays: number;
  proposalValidUntil: string;
  link: string;
  status: Exclude<QuoteStatus, "SELECIONADA" | "DESCARTADA" | "EXPIRADA">;
  quoteDate: string;
  notes: string;
}

export interface CreateQuoteInput extends QuoteValuesInput {
  necessityIds: string[];
}

export interface UpdateQuoteInput {
  id: string;
  version: number;
  changes: QuoteValuesInput & { necessityIds: string[] };
  reason?: string;
}

export interface SelectQuoteInput {
  id: string;
  version: number;
  reason?: string;
}

export interface DeleteQuoteInput {
  id: string;
  version: number;
  reason?: string;
}

export interface ReopenQuoteInput {
  id: string;
  version: number;
  reason: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  profile: string;
  allowedStoreIds: string[] | "TODAS";
}
