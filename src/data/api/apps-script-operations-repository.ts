import { AppsScriptClient } from "@/data/api/apps-script-client";
import type { OperationsRepository } from "@/data/repositories/operations-repository";
import type { CreateQuoteInput, CreateSupplierInput, DataSourceInfo, Item, Necessity, Quote, QuotesWorkspace, SelectQuoteInput, SessionUser, Store, Supplier, TechnicalStatus, UpdateItemInput, UpdateQuoteInput, UpdateStoreInput } from "@/domain/entities";

export interface BootstrapPayload {
  source: DataSourceInfo;
  user: SessionUser;
  stores: Store[];
  items: Item[];
  necessities: Necessity[];
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

  getQuotesWorkspace() {
    return this.client.call<QuotesWorkspace>("quotesWorkspace");
  }

  createSupplier(input: CreateSupplierInput) {
    return this.client.call<{ supplier: Supplier }>("createSupplier", input);
  }

  createQuote(input: CreateQuoteInput) {
    return this.client.call<{ quote: Quote }>("createQuote", input);
  }

  updateQuote(input: UpdateQuoteInput) {
    return this.client.call<{ quote: Quote }>("updateQuote", input);
  }

  selectQuote(input: SelectQuoteInput) {
    return this.client.call<{ quote: Quote }>("selectQuote", input);
  }

  updateStore(input: UpdateStoreInput) {
    return this.client.call<{ store: Store }>("updateStore", input);
  }

  updateItem(input: UpdateItemInput) {
    return this.client.call<{ item: Item }>("updateItem", input);
  }
}
