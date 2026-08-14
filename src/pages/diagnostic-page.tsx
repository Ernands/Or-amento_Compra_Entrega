import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, GitBranch, RefreshCw, Server, XCircle } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { RefreshButton } from "@/components/app/refresh-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOperations } from "@/context/operations-context";
import type { TechnicalStatus, TechnicalTableStatus } from "@/domain/entities";
import { dateFormatter } from "@/lib/format";

type TechnicalRequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: TechnicalStatus }
  | { status: "error"; message: string };

export function DiagnosticPage() {
  const { source, dashboard, loading, error, refresh, getTechnicalStatus } = useOperations();
  const live = source?.kind === "apps-script";
  const { state: technicalState, loading: technicalLoading, refresh: refreshTechnicalStatus } = useTechnicalStatus(Boolean(live), getTechnicalStatus);
  const refreshAll = useCallback(() => {
    refresh();
    if (live) refreshTechnicalStatus();
  }, [live, refresh, refreshTechnicalStatus]);

  if (loading && !dashboard) return <LoadingPanel />;
  if (error || !source || !dashboard) return <ErrorPanel message={error || "Dados indisponíveis."} retry={refresh} />;

  const checks = [
    {
      ok: live,
      label: live ? "Apps Script conectado" : "Apps Script ainda não conectado",
      detail: live ? `Planilha autenticada: ${source.label} · ID ${source.spreadsheetId}` : "O diagnóstico técnico online requer o Web App autenticado.",
    },
    {
      ok: true,
      label: "Dados operacionais carregados",
      detail: `${dashboard.metrics.stores} lojas, ${dashboard.metrics.items} itens e ${dashboard.metrics.necessities} necessidades retornados pelo backend.`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integração"
        title="Diagnóstico da base"
        description="Verificações autenticadas e somente leitura da planilha e do ambiente DEV."
        actions={<RefreshButton onRefresh={refreshAll} refreshing={loading || technicalLoading} />}
      />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Resultado da inspeção</CardTitle>
            <CardDescription>Nenhuma preparação ou alteração da planilha é executada por esta página.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checks.map((check) => (
              <StatusRow key={check.label} ok={check.ok} label={check.label} detail={check.detail} />
            ))}
            <TechnicalSummary live={Boolean(live)} state={technicalState} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {!live ? (
            <Card className="shadow-none">
              <CardHeader>
                <FileSpreadsheet className="size-6 text-primary" />
                <CardTitle>Para ativar dados ao vivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Configure as Script Properties da implantação DEV.</p>
                <p>2. Cadastre um usuário DEV e publique o Web App.</p>
                <p>3. Configure a URL e o Client ID no GitHub Actions.</p>
                <p>4. Execute qualquer preparação somente pelo editor do Apps Script.</p>
              </CardContent>
            </Card>
          ) : null}
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex gap-2"><GitBranch className="size-5 text-primary" /><Server className="size-5 text-primary" /></div>
              <CardTitle>Publicação</CardTitle>
            </CardHeader>
            <CardContent><p className="text-sm leading-relaxed text-muted-foreground">GitHub Actions compila a SPA e GitHub Pages publica os arquivos estáticos. O Apps Script permanece como backend autenticado.</p></CardContent>
          </Card>
        </div>
      </div>
      {live && technicalState.status === "success" ? <TechnicalTables status={technicalState.data} /> : null}
    </div>
  );
}

function TechnicalSummary({ live, state }: { live: boolean; state: TechnicalRequestState }) {
  if (!live) {
    return <StatusRow ok={false} label="Diagnóstico técnico indisponível" detail="Conecte o Apps Script DEV para verificar as abas e colunas técnicas em tempo real." />;
  }
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="flex gap-3 rounded-lg border p-4">
        <RefreshCw className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
        <div><p className="text-sm font-medium">Verificando preparação técnica</p><p className="mt-1 text-xs text-muted-foreground">Lendo somente as linhas iniciais das abas configuradas.</p></div>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div><p className="text-sm font-medium">Falha no diagnóstico técnico</p><p className="mt-1 text-xs text-muted-foreground">{state.message}</p></div>
      </div>
    );
  }
  return state.data.ready
    ? <StatusRow ok label="Preparação técnica concluída" detail="Todas as abas e colunas técnicas obrigatórias foram verificadas." />
    : <StatusRow ok={false} label="Preparação técnica pendente" detail="Uma ou mais abas não foram localizadas ou ainda possuem colunas técnicas faltantes." />;
}

function TechnicalTables({ status }: { status: TechnicalStatus }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Abas verificadas</CardTitle>
        <CardDescription>Conferência realizada em {dateFormatter.format(new Date(status.checkedAt))}. Somente os cabeçalhos foram lidos.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {status.tables.map((table) => <TechnicalTable key={table.sheet} table={table} />)}
      </CardContent>
    </Card>
  );
}

function TechnicalTable({ table }: { table: TechnicalTableStatus }) {
  const ready = table.ok && table.missing.length === 0;
  return (
    <div className="flex gap-3 rounded-lg border p-4">
      {ready ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{table.sheet}</p>
        <p className="mt-1 text-xs text-muted-foreground">{table.headerRow ? `Cabeçalho na linha ${table.headerRow}.` : table.error || "Cabeçalho não localizado."}</p>
        {table.missing.length ? <p className="mt-1 text-xs text-amber-700">Faltando: {table.missing.join(", ")}</p> : <p className="mt-1 text-xs text-emerald-700">Colunas técnicas completas.</p>}
      </div>
    </div>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-lg border p-4">
      {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}
      <div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>
    </div>
  );
}

function useTechnicalStatus(enabled: boolean, load: () => Promise<TechnicalStatus>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<TechnicalRequestState>({ status: "idle" });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    load()
      .then((data) => { if (active) setState({ status: "success", data }); })
      .catch((error: unknown) => { if (active) setState({ status: "error", message: error instanceof Error ? error.message : "Não foi possível verificar a preparação técnica." }); });
    return () => { active = false; };
  }, [attempt, enabled, load]);

  const refresh = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, loading: enabled && (state.status === "idle" || state.status === "loading"), refresh };
}
