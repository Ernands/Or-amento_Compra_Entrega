import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/auth-context";
import { createOperationsRepository, createPublicOperationsRepository } from "@/data/repositories/create-operations-repository";
import type { CreateQuoteInput, CreateSupplierInput, DeleteQuoteInput, QuotesWorkspace, SelectQuoteInput, UpdateQuoteInput } from "@/domain/entities";

type WorkspaceState =
  | { status: "loading" }
  | { status: "success"; data: QuotesWorkspace }
  | { status: "error"; message: string };

export function useQuotesWorkspace() {
  const { accessMode, bootstrap, credential, refreshBootstrap } = useAuth();
  const repository = useMemo(() => accessMode === "visitor" ? createPublicOperationsRepository() : credential ? createOperationsRepository(credential) : null, [accessMode, credential]);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<WorkspaceState>({ status: "loading" });

  useEffect(() => {
    if (!repository) return;
    let active = true;
    repository.getQuotesWorkspace()
      .then((data) => { if (active) setState({ status: "success", data }); })
      .catch((error: unknown) => { if (active) setState({ status: "error", message: error instanceof Error ? error.message : "Não foi possível carregar as cotações." }); });
    return () => { active = false; };
  }, [bootstrap?.source.checkedAt, reloadKey, repository]);

  const refresh = useCallback(() => {
    setState({ status: "loading" });
    setReloadKey((value) => value + 1);
  }, []);

  const afterWrite = useCallback(async () => {
    setState({ status: "loading" });
    await refreshBootstrap();
    setReloadKey((value) => value + 1);
  }, [refreshBootstrap]);

  const createSupplier = useCallback(async (input: CreateSupplierInput) => {
    if (!repository) throw new Error("Sessão não encontrada.");
    const result = await repository.createSupplier(input);
    await afterWrite();
    return result.supplier;
  }, [afterWrite, repository]);

  const createQuote = useCallback(async (input: CreateQuoteInput) => {
    if (!repository) throw new Error("Sessão não encontrada.");
    await repository.createQuote(input);
    await afterWrite();
  }, [afterWrite, repository]);

  const updateQuote = useCallback(async (input: UpdateQuoteInput) => {
    if (!repository) throw new Error("Sessão não encontrada.");
    await repository.updateQuote(input);
    await afterWrite();
  }, [afterWrite, repository]);

  const deleteQuote = useCallback(async (input: DeleteQuoteInput) => {
    if (!repository) throw new Error("Sessão não encontrada.");
    await repository.deleteQuote(input);
    await afterWrite();
  }, [afterWrite, repository]);

  const selectQuote = useCallback(async (input: SelectQuoteInput) => {
    if (!repository) throw new Error("Sessão não encontrada.");
    await repository.selectQuote(input);
    await afterWrite();
  }, [afterWrite, repository]);

  return { state, refresh, createSupplier, createQuote, updateQuote, deleteQuote, selectQuote };
}
