import { AlertTriangle, CheckCircle2, FileSpreadsheet, GitBranch, Server } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { RefreshButton } from "@/components/app/refresh-button";
import { SourceBanner } from "@/components/app/source-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEV_SPREADSHEET_ID,
  DEV_SPREADSHEET_NAME,
  SOURCE_SPREADSHEET_GID,
} from "@/config/sheets";
import { useOperations } from "@/context/operations-context";

export function DiagnosticPage() {
  const { source, dashboard, loading, error, refresh } = useOperations();
  if (loading && !dashboard) return <LoadingPanel />;
  if (error || !source || !dashboard) return <ErrorPanel message={error || "Dados indisponíveis."} retry={refresh} />;
  const live = source.kind === "apps-script";
  const checks = [
    {
      ok: true,
      label: "Planilha DEV nativa localizada",
      detail: `${DEV_SPREADSHEET_NAME} · ID ${DEV_SPREADSHEET_ID}`,
    },
    { ok: true, label: "Estrutura normalizada encontrada", detail: `${dashboard.metrics.stores} lojas, ${dashboard.metrics.items} itens e ${dashboard.metrics.necessities} necessidades` },
    { ok: live, label: live ? "Apps Script conectado" : "Apps Script ainda não publicado", detail: live ? "Chamadas HTTPS autenticadas estão ativas." : "Configure VITE_APPS_SCRIPT_URL depois de publicar o Web App." },
    { ok: false, label: "Preparação técnica pendente", detail: "Execute diagnoseSpreadsheet() e, com backup automático, setupTechnicalColumns() no Apps Script DEV." },
  ];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integração" title="Diagnóstico da base" description="Verificações somente leitura da planilha e do ambiente DEV." actions={<RefreshButton />} />
      <SourceBanner source={source} />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Resultado da inspeção</CardTitle>
            <CardDescription>Origem XLSX preservada · GID informado: {SOURCE_SPREADSHEET_GID}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checks.map((check) => (
              <div key={check.label} className="flex gap-3 rounded-lg border p-4">
                {check.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card className="shadow-none">
            <CardHeader>
              <FileSpreadsheet className="size-6 text-primary" />
              <CardTitle>Para ativar dados ao vivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Configure a Script Property SPREADSHEET_ID com o ID da DEV.</p>
              <p>2. Execute o diagnóstico e prepare as colunas técnicas.</p>
              <p>3. Cadastre um usuário DEV e publique o Web App.</p>
              <p>4. Adicione a URL e o Client ID às variables do GitHub Actions.</p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex gap-2"><GitBranch className="size-5 text-primary" /><Server className="size-5 text-primary" /></div>
              <CardTitle>Publicação</CardTitle>
            </CardHeader>
            <CardContent><p className="text-sm leading-relaxed text-muted-foreground">GitHub Actions compila a SPA e GitHub Pages publica os arquivos estáticos. O Apps Script permanece como backend autenticado.</p></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
