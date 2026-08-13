import { AppsScriptClient } from "@/data/api/apps-script-client";
import type { OperationsRepository } from "@/data/repositories/operations-repository";
import type { DataSourceInfo, Item, Necessity, SessionUser, Store, UpdateItemInput, UpdateStoreInput } from "@/domain/entities";

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

  updateStore(input: UpdateStoreInput) {
    return this.client.call<{ store: Store }>("updateStore", input);
  }

  updateItem(input: UpdateItemInput) {
    return this.client.call<{ item: Item }>("updateItem", input);
  }
}
