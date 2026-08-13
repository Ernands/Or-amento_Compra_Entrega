export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: ApiErrorPayload;
  requestId?: string;
}

export type PublicAppsScriptAction = "publicBootstrap" | "publicQuotesWorkspace";

export class AppsScriptApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppsScriptApiError";
  }
}

export class AppsScriptClient {
  constructor(
    private readonly endpoint: string,
    private readonly credential: string,
  ) {}

  async call<T>(action: string, payload: object = {}): Promise<T> {
    return callAppsScript<T>(this.endpoint, { action, credential: this.credential, payload });
  }
}

export class PublicAppsScriptClient {
  constructor(private readonly endpoint: string) {}

  async call<T>(action: PublicAppsScriptAction, payload: object = {}): Promise<T> {
    return callAppsScript<T>(this.endpoint, { action, payload });
  }
}

async function callAppsScript<T>(endpoint: string, body: object): Promise<T> {
  const response = await fetch(buildRequestUrl(endpoint), {
    method: "POST",
    redirect: "follow",
    cache: "no-store",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new AppsScriptApiError(
        "HTTP_404",
        "A implantação do Apps Script não foi encontrada ou o redirecionamento expirou. Atualize os dados antes de tentar novamente para evitar uma cotação duplicada.",
      );
    }
    throw new AppsScriptApiError("HTTP_ERROR", `O backend respondeu com HTTP ${response.status}.`);
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new AppsScriptApiError("INVALID_RESPONSE", "O backend retornou uma resposta inválida.");
  }

  if (!envelope.ok || envelope.data === undefined) {
    throw new AppsScriptApiError(
      envelope.error?.code ?? "UNKNOWN_ERROR",
      envelope.error?.message ?? "Não foi possível concluir a operação.",
      envelope.requestId,
      envelope.error?.details,
    );
  }
  return envelope.data;
}

let requestSequence = 0;

function buildRequestUrl(endpoint: string): string {
  const url = new URL(endpoint);
  requestSequence += 1;
  url.searchParams.set("requestId", `${Date.now()}-${requestSequence}`);
  return url.toString();
}
