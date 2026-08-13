import type { DataSourceInfo, Item, Necessity, Store, UpdateItemInput, UpdateStoreInput } from "@/domain/entities";

export interface OperationsRepository {
  getSourceInfo(): Promise<DataSourceInfo>;
  listStores(): Promise<Store[]>;
  listItems(): Promise<Item[]>;
  listNecessities(): Promise<Necessity[]>;
  updateStore(input: UpdateStoreInput): Promise<{ store: Store }>;
  updateItem(input: UpdateItemInput): Promise<{ item: Item }>;
}
