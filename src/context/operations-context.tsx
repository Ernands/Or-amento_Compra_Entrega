import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "@/auth/auth-context";
import type { BootstrapPayload } from "@/data/api/apps-script-operations-repository";
import { createOperationsRepository } from "@/data/repositories/create-operations-repository";
import type { DataSourceInfo, Item, Necessity, Store, UpdateItemInput, UpdateStoreInput } from "@/domain/entities";
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
  refresh: () => void;
  updateStore: (input: UpdateStoreInput) => Promise<void>;
  updateItem: (input: UpdateItemInput) => Promise<void>;
}

const OperationsContext = createContext<OperationsState | null>(null);

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const { bootstrap, bootstrapError, bootstrapLoading, credential, developmentMode, refreshBootstrap } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<Omit<OperationsState, "refresh" | "updateStore" | "updateItem">>({
    loading: Boolean(credential), error: "", source: null, stores: [], items: [], necessities: [], dashboard: null,
  });

  useEffect(() => {
    if (credential !== "LOCAL_SNAPSHOT") return;
    let active = true;
    const repository = createOperationsRepository(credential);
    const service = new OperationsService(repository);
    service.listAll()
      .then((result) => {
        if (!active) return;
        setState({ loading: false, error: "", ...result });
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
  const updateStore = useCallback(async (input: UpdateStoreInput) => {
    if (!credential) throw new Error("Sessão não encontrada.");
    await createOperationsRepository(credential).updateStore(input);
    await refreshBootstrap();
  }, [credential, refreshBootstrap]);
  const updateItem = useCallback(async (input: UpdateItemInput) => {
    if (!credential) throw new Error("Sessão não encontrada.");
    await createOperationsRepository(credential).updateItem(input);
    await refreshBootstrap();
  }, [credential, refreshBootstrap]);
  const resolvedState = bootstrap
    ? { ...stateFromBootstrap(bootstrap), loading: bootstrapLoading, error: bootstrapError }
    : state;
  return <OperationsContext.Provider value={{ ...resolvedState, refresh, updateStore, updateItem }}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error("useOperations deve ser usado dentro de OperationsProvider.");
  return context;
}

function stateFromBootstrap(bootstrap: BootstrapPayload): Omit<OperationsState, "refresh" | "updateStore" | "updateItem"> {
  const { source, stores, items, necessities } = bootstrap;
  return {
    loading: false,
    error: "",
    source,
    stores,
    items,
    necessities,
    dashboard: buildDashboard(stores, items, necessities),
  };
}
