import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { AppsScriptClient } from "@/data/api/apps-script-client";
import type { BootstrapPayload } from "@/data/api/apps-script-operations-repository";
import type { SessionUser } from "@/domain/entities";

interface AuthContextValue {
  credential: string | null;
  user: SessionUser | null;
  bootstrap: BootstrapPayload | null;
  bootstrapLoading: boolean;
  bootstrapError: string;
  developmentMode: boolean;
  signingIn: boolean;
  signInError: string;
  signIn: (credential: string) => Promise<void>;
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
  const [credential, setCredential] = useState<string | null>(developmentMode ? "LOCAL_SNAPSHOT" : null);
  const [user, setUser] = useState<SessionUser | null>(developmentMode ? snapshotUser : null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
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
    } catch (error) {
      setBootstrap(null);
      setUser(null);
      setCredential(null);
      setSignInError(error instanceof Error ? error.message : "Não foi possível validar seu acesso.");
    } finally {
      setSigningIn(false);
    }
  }, [endpoint]);

  const refreshBootstrap = useCallback(async () => {
    if (!endpoint || !credential || credential === "LOCAL_SNAPSHOT") return;
    setBootstrapLoading(true);
    setBootstrapError("");
    try {
      const result = await new AppsScriptClient(endpoint, credential).call<BootstrapPayload>("bootstrap", {});
      setBootstrap(result);
      setUser(result.user);
    } catch (error) {
      setBootstrapError(error instanceof Error ? error.message : "Não foi possível atualizar os dados.");
    } finally {
      setBootstrapLoading(false);
    }
  }, [credential, endpoint]);

  const signOut = useCallback(() => {
    window.google?.accounts.id.disableAutoSelect();
    setCredential(null);
    setUser(null);
    setBootstrap(null);
    setBootstrapError("");
    setSignInError("");
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    credential,
    user,
    bootstrap,
    bootstrapLoading,
    bootstrapError,
    developmentMode,
    signingIn,
    signInError,
    signIn,
    refreshBootstrap,
    signOut,
  }), [bootstrap, bootstrapError, bootstrapLoading, credential, developmentMode, refreshBootstrap, signIn, signInError, signOut, signingIn, user]);

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
