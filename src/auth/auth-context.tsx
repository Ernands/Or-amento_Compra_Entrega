import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { AppsScriptClient } from "@/data/api/apps-script-client";
import type { BootstrapPayload, ViewBootstrapPayload } from "@/data/api/apps-script-operations-repository";
import { createPublicOperationsRepository } from "@/data/repositories/create-operations-repository";
import type { SessionUser } from "@/domain/entities";

export type AccessMode = "authenticated" | "visitor" | "snapshot";

interface AuthContextValue {
  accessMode: AccessMode | null;
  credential: string | null;
  user: SessionUser | null;
  bootstrap: ViewBootstrapPayload | null;
  bootstrapLoading: boolean;
  bootstrapError: string;
  developmentMode: boolean;
  signingIn: boolean;
  enteringVisitor: boolean;
  signInError: string;
  signIn: (credential: string) => Promise<void>;
  enterVisitor: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const snapshotUser: SessionUser = {
  id: "LOCAL_SNAPSHOT",
  name: "Modo de desenvolvimento",
  email: "snapshot local",
  profile: "CONSULTA",
  allowedStoreIds: "TODAS",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const endpoint = import.meta.env.VITE_APPS_SCRIPT_URL?.trim();
  const developmentMode = !endpoint || !import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [accessMode, setAccessMode] = useState<AccessMode | null>(developmentMode ? "snapshot" : null);
  const [credential, setCredential] = useState<string | null>(developmentMode ? "LOCAL_SNAPSHOT" : null);
  const [user, setUser] = useState<SessionUser | null>(developmentMode ? snapshotUser : null);
  const [bootstrap, setBootstrap] = useState<ViewBootstrapPayload | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [enteringVisitor, setEnteringVisitor] = useState(false);
  const [signInError, setSignInError] = useState("");

  const signIn = useCallback(async (token: string) => {
    if (!endpoint) {
      setSignInError("A URL do Apps Script não está configurada.");
      return;
    }
    setSigningIn(true);
    setSignInError("");
    try {
      const result = await new AppsScriptClient(endpoint, token).call<BootstrapPayload>("bootstrap", {});
      setBootstrap(result);
      setBootstrapError("");
      setUser(result.user);
      setCredential(token);
      setAccessMode("authenticated");
    } catch (error) {
      setBootstrap(null);
      setUser(null);
      setCredential(null);
      setSignInError(error instanceof Error ? error.message : "Não foi possível validar seu acesso.");
    } finally {
      setSigningIn(false);
    }
  }, [endpoint]);

  const enterVisitor = useCallback(async () => {
    if (!endpoint) {
      setSignInError("A URL do Apps Script não está configurada.");
      return;
    }
    setEnteringVisitor(true);
    setSignInError("");
    try {
      const result = await createPublicOperationsRepository().getBootstrap();
      setBootstrap(result);
      setBootstrapError("");
      setUser(null);
      setCredential(null);
      setAccessMode("visitor");
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Não foi possível abrir o modo visitante.");
    } finally {
      setEnteringVisitor(false);
    }
  }, [endpoint]);

  const refreshBootstrap = useCallback(async () => {
    if (!endpoint || accessMode === "snapshot") return;
    setBootstrapLoading(true);
    setBootstrapError("");
    try {
      const result = accessMode === "visitor"
        ? await createPublicOperationsRepository().getBootstrap()
        : await new AppsScriptClient(endpoint, credential || "").call<BootstrapPayload>("bootstrap", {});
      setBootstrap(result);
      if (accessMode !== "visitor") setUser((result as BootstrapPayload).user);
    } catch (error) {
      setBootstrapError(error instanceof Error ? error.message : "Não foi possível atualizar os dados.");
    } finally {
      setBootstrapLoading(false);
    }
  }, [accessMode, credential, endpoint]);

  const signOut = useCallback(() => {
    window.google?.accounts.id.disableAutoSelect();
    setCredential(null);
    setUser(null);
    setBootstrap(null);
    setBootstrapError("");
    setSignInError("");
    setAccessMode(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    accessMode,
    credential,
    user,
    bootstrap,
    bootstrapLoading,
    bootstrapError,
    developmentMode,
    signingIn,
    enteringVisitor,
    signInError,
    signIn,
    enterVisitor,
    refreshBootstrap,
    signOut,
  }), [accessMode, bootstrap, bootstrapError, bootstrapLoading, credential, developmentMode, enterVisitor, enteringVisitor, refreshBootstrap, signIn, signInError, signOut, signingIn, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
