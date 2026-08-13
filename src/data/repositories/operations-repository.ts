import type { DataSourceInfo, Item, Necessity, Store, TechnicalStatus, UpdateItemInput, UpdateStoreInput } from "@/domain/entities";

export interface OperationsRepository {
  getSourceInfo(): Promise<DataSourceInfo>;
  listStores(): Promise<Store[]>;
  listItems(): Promise<Item[]>;
  listNecessities(): Promise<Necessity[]>;
  getTechnicalStatus(): Promise<TechnicalStatus>;
  updateStore(input: UpdateStoreInput): Promise<{ store: Store }>;
  updateItem(input: UpdateItemInput): Promise<{ item: Item }>;
}
