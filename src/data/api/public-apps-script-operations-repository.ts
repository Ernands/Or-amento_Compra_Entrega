import { PublicAppsScriptClient } from "@/data/api/apps-script-client";
import type { ViewBootstrapPayload } from "@/data/api/apps-script-operations-repository";
import type { OperationsRepository } from "@/data/repositories/operations-repository";
import type { DataSourceInfo, Item, Necessity, Quote, QuotesWorkspace, Store, Supplier } from "@/domain/entities";

interface PublicBootstrapPayload {
  source: Pick<DataSourceInfo, "kind" | "status" | "readOnly" | "checkedAt" | "message">;
  stores: Array<Pick<Store, "id" | "name" | "city" | "state" | "status">>;
  items: Array<Pick<Item, "id" | "operationalCode" | "group" | "area" | "name" | "definitionStatus" | "duplicateOperationalCode">>;
  necessities: Array<Pick<Necessity, "id" | "storeId" | "itemId" | "quantity" | "priority" | "status">>;
  activeQuoteNecessityIds: string[];
}

interface PublicQuotesPayload {
  suppliers: Array<Pick<Supplier, "id" | "name">>;
  quotes: Array<Pick<Quote, "id" | "necessityId" | "storeId" | "itemId" | "supplierId" | "quantity" | "total" | "leadTimeDays" | "status" | "selected">>;
  checkedAt: string;
}

export class PublicAppsScriptOperationsRepository implements OperationsRepository {
  private bootstrapPromise?: Promise<ViewBootstrapPayload>;

  constructor(private readonly client: PublicAppsScriptClient) {}

  getBootstrap(): Promise<ViewBootstrapPayload> {
    this.bootstrapPromise ??= this.client.call<PublicBootstrapPayload>("publicBootstrap").then(hydratePublicBootstrap);
    return this.bootstrapPromise;
  }

  async getSourceInfo() { return (await this.getBootstrap()).source; }
  async listStores() { return (await this.getBootstrap()).stores; }
  async listItems() { return (await this.getBootstrap()).items; }
  async listNecessities() { return (await this.getBootstrap()).necessities; }

  async getQuotesWorkspace(): Promise<QuotesWorkspace> {
    return hydratePublicQuotes(await this.client.call<PublicQuotesPayload>("publicQuotesWorkspace"));
  }

  async getTechnicalStatus(): Promise<never> { throw authRequired(); }
  async createSupplier(): Promise<never> { throw authRequired(); }
  async createQuote(): Promise<never> { throw authRequired(); }
  async updateQuote(): Promise<never> { throw authRequired(); }
  async deleteQuote(): Promise<never> { throw authRequired(); }
  async selectQuote(): Promise<never> { throw authRequired(); }
  async updateStore(): Promise<never> { throw authRequired(); }
  async updateItem(): Promise<never> { throw authRequired(); }
}

function hydratePublicBootstrap(payload: PublicBootstrapPayload): ViewBootstrapPayload {
  return {
    source: {
      kind: payload.source.kind,
      label: "Modo visitante",
      status: payload.source.status,
      readOnly: true,
      checkedAt: payload.source.checkedAt,
      message: payload.source.message,
    },
    stores: payload.stores.map((store) => ({
      id: store.id, code: store.id, name: store.name, city: store.city, state: store.state, status: store.status,
      region: "", manager: "", email: "", phone: "", address: "", notes: "", version: 0,
    })),
    items: payload.items.map((item) => ({
      id: item.id, operationalCode: item.operationalCode, group: item.group, area: item.area, name: item.name,
      definitionStatus: item.definitionStatus, duplicateOperationalCode: item.duplicateOperationalCode,
      specification: "", defaultQuantity: 1, active: true, route1: "", route2: "", route3: "", notes: "", version: 0,
    })),
    necessities: payload.necessities.map((necessity) => ({
      id: necessity.id, storeId: necessity.storeId, itemId: necessity.itemId, quantity: necessity.quantity,
      priority: necessity.priority, status: necessity.status, version: 0,
    })),
    activeQuoteNecessityIds: payload.activeQuoteNecessityIds,
  };
}

function hydratePublicQuotes(payload: PublicQuotesPayload): QuotesWorkspace {
  return {
    suppliers: payload.suppliers.map((supplier) => ({
      id: supplier.id, name: supplier.name, taxId: "", city: "", state: "", contact: "", phone: "", email: "",
      rating: null, active: true, lastPurchase: "", notes: "", website: "", version: 0,
    })),
    quotes: payload.quotes.map((quote) => ({
      id: quote.id, necessityId: quote.necessityId, storeId: quote.storeId, itemId: quote.itemId,
      supplierId: quote.supplierId, quantity: quote.quantity, total: quote.total, leadTimeDays: quote.leadTimeDays,
      status: quote.status, selected: quote.selected, origin: "", unitPrice: 0, freight: 0, otherCosts: 0,
      paymentMethod: "", proposalValidUntil: "", link: "", supplierRating: null, quoteDate: "", responsible: "",
      notes: "", version: 0, active: true,
    })),
    routes: [],
    options: { statuses: [], origins: [], paymentMethods: [] },
    permissions: { view: true, create: false, edit: false, delete: false, select: false, createSupplier: false },
    checkedAt: payload.checkedAt,
  };
}

function authRequired(): Error {
  return new Error("Entre com Google para realizar alterações.");
}
