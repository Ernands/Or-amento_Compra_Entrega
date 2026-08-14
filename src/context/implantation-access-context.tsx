import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/auth-context";
import { ImplantationRepository } from "@/data/api/apps-script-implantation-repository";
import type { ImplantationCapabilities } from "@/domain/implantation-operational";

interface ImplantationAccessContextValue {
  capabilities: ImplantationCapabilities | null;
  loading: boolean;
  error: string;
  repository: ImplantationRepository | null;
  refreshCapabilities: () => Promise<void>;
}

const ImplantationAccessContext = createContext<ImplantationAccessContextValue | null>(null);

export function ImplantationAccessProvider({ children }: { children: React.ReactNode }) {
  const { accessMode, credential } = useAuth();
  const repository = useMemo(() => accessMode === "authenticated" && credential ? new ImplantationRepository(credential) : null, [accessMode, credential]);
  const [capabilities, setCapabilities] = useState<ImplantationCapabilities | null>(null);
  const [loading, setLoading] = useState(Boolean(repository));
  const [error, setError] = useState("");

  const refreshCapabilities = useCallback(async () => {
    if (!repository) {
      setCapabilities(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setCapabilities(await repository.capabilities());
    } catch (caught) {
      setCapabilities(null);
      setError(caught instanceof Error ? caught.message : "Não foi possível verificar o acesso à Implantação.");
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    if (!repository) return;
    let active = true;
    repository.capabilities().then((result) => {
      if (active) setCapabilities(result);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : "Não foi possível verificar o acesso à Implantação.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [repository]);

  const value = useMemo(() => ({ capabilities, loading, error, repository, refreshCapabilities }), [capabilities, error, loading, refreshCapabilities, repository]);
  return <ImplantationAccessContext.Provider value={value}>{children}</ImplantationAccessContext.Provider>;
}

export function useImplantationAccess() {
  const context = useContext(ImplantationAccessContext);
  if (!context) throw new Error("useImplantationAccess deve ser usado dentro de ImplantationAccessProvider.");
  return context;
}
