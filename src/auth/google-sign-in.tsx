import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/auth/auth-context";

let initializedClientId = "";
let credentialHandler: ((credential: string) => void) | null = null;

export function GoogleSignIn() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptError, setScriptError] = useState("");
  const { signIn, signingIn, signInError } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    credentialHandler = (credential) => { void signIn(credential); };
    const render = () => {
      if (!active || !window.google || !containerRef.current) return;
      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          callback: ({ credential }) => credentialHandler?.(credential),
        });
        initializedClientId = clientId;
      }
      containerRef.current.replaceChildren();
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 320,
        locale: "pt-BR",
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google) render();
      else existing.addEventListener("load", render, { once: true });
      return () => {
        active = false;
        existing.removeEventListener("load", render);
      };
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => setScriptError("Não foi possível carregar o login do Google.");
    document.head.appendChild(script);
    return () => {
      active = false;
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId, signIn]);

  const error = scriptError || signInError;
  return (
    <div aria-busy={signingIn}>
      <div ref={containerRef} className={signingIn ? "pointer-events-none min-h-11 opacity-50" : "min-h-11"} />
      {signingIn ? <p className="mt-3 text-sm text-muted-foreground">Validando acesso e carregando dados…</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
