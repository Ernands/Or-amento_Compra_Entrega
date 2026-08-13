import { AppsScriptClient } from "@/data/api/apps-script-client";
import type { OperationsRepository } from "@/data/repositories/operations-repository";
import type { CreateQuoteInput, CreateSupplierInput, DataSourceInfo, DeleteQuoteInput, Item, Necessity, Quote, QuotesWorkspace, ReopenQuoteInput, SelectQuoteInput, SessionUser, Store, Supplier, TechnicalStatus, UpdateItemInput, UpdateQuoteInput, UpdateStoreInput } from "@/domain/entities";

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
    const workspace = await this.client.call<QuotesWorkspace>("quotesWorkspace");
    return { ...workspace, schemaMode: workspace.schemaMode || "LEGACY" as const };
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
