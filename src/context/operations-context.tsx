import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "@/auth/auth-context";
import type { ViewBootstrapPayload } from "@/data/api/apps-script-operations-repository";
import { createOperationsRepository } from "@/data/repositories/create-operations-repository";
import type { CreateItemInput, DataSourceInfo, Item, Necessity, Store, TechnicalStatus, UpdateItemInput, UpdateStoreInput } from "@/domain/entities";
import { OperationsService, buildDashboard } from "@/services/operations-service";

type Dashboard = ReturnType<typeof buildDashboard>;

interface OperationsState {
  loading: boolean;
  error: string;
  source: DataSourceInfo | null;
  stores: Store[];
  items: Item[];
  necessities: Necessity[];
  dashboard: Dashboard | null;
  capabilities: { createItem: boolean; itemProductLink: boolean };
  refresh: () => void;
  getTechnicalStatus: () => Promise<TechnicalStatus>;
  updateStore: (input: UpdateStoreInput) => Promise<void>;
  createItem: (input: CreateItemInput) => Promise<void>;
  updateItem: (input: UpdateItemInput) => Promise<void>;
}

const OperationsContext = createContext<OperationsState | null>(null);

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const { accessMode, bootstrap, bootstrapError, bootstrapLoading, credential, developmentMode, refreshBootstrap } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<Omit<OperationsState, "refresh" | "getTechnicalStatus" | "updateStore" | "createItem" | "updateItem">>({
    loading: Boolean(credential), error: "", source: null, stores: [], items: [], necessities: [], dashboard: null, capabilities: { createItem: false, itemProductLink: false },
  });

  useEffect(() => {
    if (credential !== "LOCAL_SNAPSHOT") return;
    let active = true;
    const repository = createOperationsRepository(credential);
    const service = new OperationsService(repository);
    service.listAll()
      .then((result) => {
        if (!active) return;
        setState({ loading: false, error: "", ...result, capabilities: { createItem: false, itemProductLink: false } });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : "Não foi possível carregar os dados." }));
      });
    return () => { active = false; };
  }, [credential, refreshKey]);

  const refresh = useCallback(() => {
    if (developmentMode) setRefreshKey((key) => key + 1);
    else void refreshBootstrap();
  }, [developmentMode, refreshBootstrap]);
  const getTechnicalStatus = useCallback(async () => {
    if (accessMode === "visitor") throw new Error("Entre com Google para acessar o diagnóstico técnico.");
    if (!credential) throw new Error("Sessão não encontrada.");
    return createOperationsRepository(credential).getTechnicalStatus();
  }, [accessMode, credential]);
  const updateStore = useCallback(async (input: UpdateStoreInput) => {
    if (accessMode === "visitor") throw new Error("Entre com Google para realizar alterações.");
    if (!credential) throw new Error("Sessão não encontrada.");
    await createOperationsRepository(credential).updateStore(input);
    await refreshBootstrap();
  }, [accessMode, credential, refreshBootstrap]);
  const createItem = useCallback(async (input: CreateItemInput) => {
    if (accessMode === "visitor") throw new Error("Entre com Google para realizar alterações.");
    if (!credential) throw new Error("Sessão não encontrada.");
    await createOperationsRepository(credential).createItem(input);
    await refreshBootstrap();
  }, [accessMode, credential, refreshBootstrap]);
  const updateItem = useCallback(async (input: UpdateItemInput) => {
    if (accessMode === "visitor") throw new Error("Entre com Google para realizar alterações.");
    if (!credential) throw new Error("Sessão não encontrada.");
    await createOperationsRepository(credential).updateItem(input);
    await refreshBootstrap();
  }, [accessMode, credential, refreshBootstrap]);
  const resolvedState = bootstrap
    ? { ...stateFromBootstrap(bootstrap), loading: bootstrapLoading, error: bootstrapError }
    : state;
  return <OperationsContext.Provider value={{ ...resolvedState, refresh, getTechnicalStatus, updateStore, createItem, updateItem }}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error("useOperations deve ser usado dentro de OperationsProvider.");
  return context;
}

function stateFromBootstrap(bootstrap: ViewBootstrapPayload): Omit<OperationsState, "refresh" | "getTechnicalStatus" | "updateStore" | "createItem" | "updateItem"> {
  const { source, stores, items, necessities, activeQuoteNecessityIds } = bootstrap;
  return {
    loading: false,
    error: "",
    source,
    stores,
    items,
    necessities,
    dashboard: buildDashboard(stores, items, necessities, activeQuoteNecessityIds),
    capabilities: bootstrap.capabilities ?? { createItem: false, itemProductLink: false },
  };
}
