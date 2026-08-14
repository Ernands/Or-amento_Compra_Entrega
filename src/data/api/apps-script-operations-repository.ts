import { AppsScriptClient } from "@/data/api/apps-script-client";
import type { OperationsRepository } from "@/data/repositories/operations-repository";
import type { CreateQuoteInput, CreateSupplierInput, DataSourceInfo, DeleteQuoteInput, Item, Necessity, Quote, QuoteLine, QuotesWorkspace, ReopenQuoteInput, SelectQuoteInput, SessionUser, Store, Supplier, TechnicalStatus, UpdateItemInput, UpdateQuoteInput, UpdateStoreInput } from "@/domain/entities";

export interface ViewBootstrapPayload {
  source: DataSourceInfo;
  stores: Store[];
  items: Item[];
  necessities: Necessity[];
  activeQuoteNecessityIds?: string[];
}

export interface BootstrapPayload extends ViewBootstrapPayload {
  user: SessionUser;
}

export class AppsScriptOperationsRepository implements OperationsRepository {
  private bootstrapPromise?: Promise<BootstrapPayload>;

  constructor(private readonly client: AppsScriptClient) {}

  getBootstrap() {
    this.bootstrapPromise ??= this.client.call<BootstrapPayload>("bootstrap");
    return this.bootstrapPromise;
  }

  async getSourceInfo() {
    return (await this.getBootstrap()).source;
  }

  async listStores() {
    return (await this.getBootstrap()).stores;
  }

  async listItems() {
    return (await this.getBootstrap()).items;
  }

  async listNecessities() {
    return (await this.getBootstrap()).necessities;
  }

  getTechnicalStatus() {
    return this.client.call<TechnicalStatus>("technicalStatus");
  }

  async getQuotesWorkspace() {
    const workspace = await this.client.call<AuthenticatedQuotesWorkspacePayload>("quotesWorkspace");
    return normalizeAuthenticatedQuotesWorkspace(workspace);
  }

  createSupplier(input: CreateSupplierInput) {
    return this.client.call<{ supplier: Supplier }>("createSupplier", input);
  }

  createQuote(input: CreateQuoteInput) {
    return this.client.call<{ quote: Quote }>("createQuoteProposal", input);
  }

  updateQuote(input: UpdateQuoteInput) {
    return this.client.call<{ quote: Quote }>("updateQuoteProposal", input);
  }

  reopenQuote(input: ReopenQuoteInput) {
    return this.client.call<{ quote: Quote }>("reopenQuoteProposal", input);
  }

  deleteQuote(input: DeleteQuoteInput) {
    return this.client.call<{ id: string }>("deleteQuoteProposal", input);
  }

  selectQuote(input: SelectQuoteInput) {
    return this.client.call<{ quote: Quote }>("selectQuoteProposal", input);
  }

  updateStore(input: UpdateStoreInput) {
    return this.client.call<{ store: Store }>("updateStore", input);
  }

  updateItem(input: UpdateItemInput) {
    return this.client.call<{ item: Item }>("updateItem", input);
  }
}

type LegacyQuotePayload = Partial<Quote> & {
  necessityId?: string;
  storeId?: string;
  quantity?: number;
};

interface AuthenticatedQuotesWorkspacePayload extends Partial<Omit<QuotesWorkspace, "quotes">> {
  quotes?: LegacyQuotePayload[];
}

const readOnlyQuotePermissions = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  select: false,
  createSupplier: false,
} as const;

export function normalizeAuthenticatedQuotesWorkspace(payload: AuthenticatedQuotesWorkspacePayload): QuotesWorkspace {
  const schemaMode = payload.schemaMode === "GROUPED" ? "GROUPED" : "LEGACY";
  const permissions = schemaMode === "LEGACY"
    ? { ...readOnlyQuotePermissions, view: payload.permissions?.view ?? true }
    : { ...readOnlyQuotePermissions, ...payload.permissions };

  return {
    suppliers: Array.isArray(payload.suppliers) ? payload.suppliers : [],
    quotes: (Array.isArray(payload.quotes) ? payload.quotes : []).map(normalizeAuthenticatedQuote),
    routes: Array.isArray(payload.routes) ? payload.routes : [],
    options: {
      statuses: Array.isArray(payload.options?.statuses) ? payload.options.statuses : [],
      origins: Array.isArray(payload.options?.origins) ? payload.options.origins : [],
      paymentMethods: Array.isArray(payload.options?.paymentMethods) ? payload.options.paymentMethods : [],
    },
    permissions,
    schemaMode,
    checkedAt: payload.checkedAt || new Date().toISOString(),
  };
}

function normalizeAuthenticatedQuote(quote: LegacyQuotePayload): Quote {
  const legacyNecessityId = quote.necessityId || "";
  const legacyStoreId = quote.storeId || "";
  const legacyQuantity = finiteNumber(quote.quantity ?? quote.quantityTotal);
  const fallbackLine: QuoteLine = {
    id: quote.id || "",
    proposalId: quote.id || "",
    necessityId: legacyNecessityId,
    storeId: legacyStoreId,
    itemId: quote.itemId || "",
    unitPrice: finiteNumber(quote.unitPrice),
    quantity: legacyQuantity,
    subtotal: finiteNumber(quote.unitPrice) * legacyQuantity,
    version: finiteNumber(quote.version) || 1,
    active: quote.active ?? true,
  };
  const lines = Array.isArray(quote.lines) && quote.lines.length ? quote.lines : [fallbackLine];
  const necessityIds = Array.isArray(quote.necessityIds) && quote.necessityIds.length
    ? quote.necessityIds
    : lines.map((line) => line.necessityId).filter(Boolean);
  const storeIds = Array.isArray(quote.storeIds) && quote.storeIds.length
    ? quote.storeIds
    : lines.map((line) => line.storeId).filter(Boolean);
  const quantityTotal = finiteNumber(quote.quantityTotal) || lines.reduce((total, line) => total + finiteNumber(line.quantity), 0);
  const subtotalItems = finiteNumber(quote.subtotalItems) || lines.reduce((total, line) => total + finiteNumber(line.subtotal), 0);

  return {
    id: quote.id || "",
    itemId: quote.itemId || lines[0]?.itemId || "",
    supplierId: quote.supplierId || "",
    lines,
    necessityIds,
    storeIds,
    scopeSignature: quote.scopeSignature || lines
      .map((line) => `${line.necessityId}:${line.itemId}:${finiteNumber(line.quantity)}`)
      .sort()
      .join("|"),
    origin: quote.origin || "",
    unitPrice: finiteNumber(quote.unitPrice),
    quantityTotal,
    subtotalItems,
    freight: finiteNumber(quote.freight),
    otherCosts: finiteNumber(quote.otherCosts),
    total: finiteNumber(quote.total),
    paymentMethod: quote.paymentMethod || "",
    leadTimeDays: finiteNumber(quote.leadTimeDays),
    proposalValidUntil: quote.proposalValidUntil || "",
    link: quote.link || "",
    supplierRating: quote.supplierRating ?? null,
    status: quote.status || "RASCUNHO",
    selected: quote.selected ?? false,
    quoteDate: quote.quoteDate || "",
    responsible: quote.responsible || "",
    notes: quote.notes || "",
    version: finiteNumber(quote.version) || 1,
    active: quote.active ?? true,
  };
}

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
