import type { CreateQuoteInput, CreateSupplierInput, DataSourceInfo, DeleteQuoteInput, Item, Necessity, Quote, QuotesWorkspace, SelectQuoteInput, Store, Supplier, TechnicalStatus, UpdateItemInput, UpdateQuoteInput, UpdateStoreInput } from "@/domain/entities";

export interface OperationsRepository {
  getSourceInfo(): Promise<DataSourceInfo>;
  listStores(): Promise<Store[]>;
  listItems(): Promise<Item[]>;
  listNecessities(): Promise<Necessity[]>;
  getTechnicalStatus(): Promise<TechnicalStatus>;
  getQuotesWorkspace(): Promise<QuotesWorkspace>;
  createSupplier(input: CreateSupplierInput): Promise<{ supplier: Supplier }>;
  createQuote(input: CreateQuoteInput): Promise<{ quote: Quote }>;
  updateQuote(input: UpdateQuoteInput): Promise<{ quote: Quote }>;
  deleteQuote(input: DeleteQuoteInput): Promise<{ id: string }>;
  selectQuote(input: SelectQuoteInput): Promise<{ quote: Quote }>;
  updateStore(input: UpdateStoreInput): Promise<{ store: Store }>;
  updateItem(input: UpdateItemInput): Promise<{ item: Item }>;
}
