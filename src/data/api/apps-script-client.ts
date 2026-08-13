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
    const response = await fetch(this.endpoint, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, credential: this.credential, payload }),
    });

    if (!response.ok) {
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
}
