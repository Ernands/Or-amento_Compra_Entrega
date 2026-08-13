import type { DataSourceInfo, Item, Necessity, Store } from "@/domain/entities";

export interface OperationsRepository {
  getSourceInfo(): Promise<DataSourceInfo>;
  listStores(): Promise<Store[]>;
  listItems(): Promise<Item[]>;
  listNecessities(): Promise<Necessity[]>;
}
