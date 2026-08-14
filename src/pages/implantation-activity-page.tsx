import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Check, CircleOff, Lock, RotateCcw, Unlock } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { ActivityStatusBadge } from "@/components/implantation/activity-status-badge";
import { EvidencePendingNotice } from "@/components/implantation/evidence-pending-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { createImplantationRequestId } from "@/domain/implantation-operational";
import { useImplantationQuery } from "@/hooks/use-implantation-query";

export function ImplantationActivityPage() {
  const { id = "" } = useParams();
  const { repository } = useImplantationAccess();
  const loader = useCallback(() => repository!.activityDetail(id), [id, repository]);
  const query = useImplantationQuery(repository && id ? loader : null);
  const timelineLoader = useCallback(() => repository!.timeline(id), [id, repository]);
  const timeline = useImplantationQuery(repository && id ? timelineLoader : null);
  const [progressOverride, setProgressOverride] = useState<number | null>(null);
  const [responsibleOverride, setResponsibleOverride] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setActionError("");
    try { await action(); setProgressOverride(null); setResponsibleOverride(null); setObservation(""); await Promise.all([query.refresh(), timeline.refresh()]); }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : "Não foi possível atualizar a atividade."); }
    finally { setBusy(false); }
  }

  if (query.loading && !query.data) return <LoadingPanel />;
  if (query.error) return <ErrorPanel message={query.error} retry={query.refresh} />;
  if (!query.data || !repository) return null;
  const { activity, store, capabilities } = query.data;
  const progress = progressOverride ?? activity.progress;
  const responsible = responsibleOverride ?? activity.responsibleUserId;
  const askReason = (label: string) => window.prompt(`${label}. Informe o motivo:`)?.trim() || "";
  const invokeReason = (label: string, action: (reason: string) => Promise<unknown>) => { const reason = askReason(label); if (reason) void run(() => action(reason)); };
  const canUpdate = capabilities.updateActivity && !["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].includes(activity.status);
  const progressOptions = activity.status === "EM_ANDAMENTO" ? [25, 50, 75] : [0, 25, 50, 75];
  const loadMoreTimeline = async () => {
    if (timeline.data?.nextCursor === null || timeline.data?.nextCursor === undefined) return;
    setBusy(true);
    try {
      const next = await repository.timeline(id, timeline.data.nextCursor);
      timeline.setData({ ...next, items: [...timeline.data.items, ...next.items] });
    } finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <Button asChild variant="ghost" size="sm" className="-ml-3"><Link to={`/lojas/${store.id}?tab=implantacao`}><ArrowLeft />Voltar para a loja</Link></Button>
    <PageHeader eyebrow={`${store.name} · ${activity.phase}`} title={activity.action} description={`${activity.id} · Data-alvo ${activity.currentTargetDate}`} />
    {actionError ? <ErrorPanel message={actionError} retry={() => setActionError("")} /> : null}
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card className="shadow-none"><CardHeader><CardTitle>Atualização operacional</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm"><span className="font-medium">Progresso</span><select value={progress} onChange={(event) => setProgressOverride(Number(event.target.value))} disabled={!canUpdate || busy} className="h-9 w-full rounded-lg border bg-background px-3">{progressOptions.map((value) => <option key={value} value={value}>{value}%</option>)}</select></label><label className="space-y-1 text-sm"><span className="font-medium">Responsável</span><select value={responsible} onChange={(event) => setResponsibleOverride(event.target.value)} disabled={!canUpdate || busy} className="h-9 w-full rounded-lg border bg-background px-3"><option value="">Não atribuído</option>{query.data.eligibleUsers.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.profile}</option>)}</select></label></div>
          <label className="space-y-1 text-sm"><span className="font-medium">Observação</span><Textarea value={observation} onChange={(event) => setObservation(event.target.value)} disabled={!canUpdate || busy} placeholder="Registre o andamento da atividade" /></label>
          <Button disabled={!canUpdate || busy || (!observation.trim() && progress === activity.progress && responsible === activity.responsibleUserId)} onClick={() => void run(() => repository.updateActivity({ activityId: id, version: activity.version, progress, responsibleUserId: responsible, observation, requestId: createImplantationRequestId() }))}>Salvar atualização</Button>
        </CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle>Ações de status</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
          {canUpdate && activity.status !== "BLOQUEADO" ? <Button variant="outline" onClick={() => invokeReason("Bloquear atividade", (reason) => repository.blockActivity({ activityId: id, version: activity.version, reason, requestId: createImplantationRequestId() }))}><Lock />Bloquear</Button> : null}
          {canUpdate && activity.status === "BLOQUEADO" ? <Button variant="outline" onClick={() => invokeReason("Desbloquear atividade", (reason) => repository.unblockActivity({ activityId: id, version: activity.version, reason, requestId: createImplantationRequestId() }))}><Unlock />Desbloquear</Button> : null}
          {canUpdate && activity.status !== "BLOQUEADO" ? <Button variant="outline" onClick={() => invokeReason("Marcar como não aplicável", (reason) => repository.markNotApplicable({ activityId: id, version: activity.version, reason, requestId: createImplantationRequestId() }))}><CircleOff />Não aplicável</Button> : null}
          {canUpdate && activity.status === "EM_ANDAMENTO" ? <Button onClick={() => void run(() => repository.completeActivity({ activityId: id, version: activity.version, observation: observation || "Atividade concluída.", requestId: createImplantationRequestId() }))}><Check />Concluir</Button> : null}
          {capabilities.cancelActivity && !["CONCLUIDO", "CANCELADO", "BLOQUEADO", "NAO_APLICAVEL"].includes(activity.status) ? <Button variant="destructive" onClick={() => invokeReason("Cancelar atividade", (reason) => repository.cancelActivity({ activityId: id, version: activity.version, reason, requestId: createImplantationRequestId() }))}><Ban />Cancelar</Button> : null}
          {capabilities.reopenActivity && ["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].includes(activity.status) ? <Button variant="outline" onClick={() => invokeReason("Reabrir atividade", (reason) => repository.reopenActivity({ activityId: id, version: activity.version, reason, requestId: createImplantationRequestId() }))}><RotateCcw />Reabrir</Button> : null}
        </CardContent></Card>
        <EvidencePendingNotice />
      </div>
      <div className="space-y-4">
        <Card className="shadow-none"><CardContent className="space-y-4 p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium">Status</span><ActivityStatusBadge status={activity.status} /></div><div><div className="mb-2 flex justify-between text-sm"><span>Progresso</span><span>{activity.progress}%</span></div><Progress value={activity.progress} /></div><dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">Responsável</dt><dd>{activity.responsibleUserId || "Não atribuído"}</dd></div><div><dt className="text-muted-foreground">Papel padrão</dt><dd>{activity.defaultResponsibleRole}</dd></div><div><dt className="text-muted-foreground">Obrigatória</dt><dd>{activity.mandatory ? "Sim" : "Não"}</dd></div><div><dt className="text-muted-foreground">Crítica</dt><dd>{activity.critical ? "Sim" : "Não"}</dd></div></dl></CardContent></Card>
        {query.data.activeBlock ? <Card className="border-destructive/30 shadow-none"><CardHeader><CardTitle>Bloqueio ativo</CardTitle></CardHeader><CardContent><p className="text-sm">{query.data.activeBlock.reason}</p></CardContent></Card> : null}
      </div>
    </section>
    <Card className="shadow-none"><CardHeader><CardTitle>Linha do tempo</CardTitle></CardHeader><CardContent className="space-y-4">{timeline.loading && !timeline.data ? <LoadingPanel /> : timeline.error ? <ErrorPanel message={timeline.error} retry={timeline.refresh} /> : timeline.data?.items.length ? <>{timeline.data.items.map((item) => <article key={item.id} className="border-l-2 pl-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{item.type}</p><time className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</time></div><p className="mt-1 text-sm text-muted-foreground">{item.text}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{item.userId}</p></article>)}{timeline.data.nextCursor !== null ? <Button variant="outline" onClick={() => void loadMoreTimeline()} disabled={busy}>Carregar mais</Button> : null}</> : <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>}</CardContent></Card>
  </div>;
}

function formatDateTime(value: string) { if (!value) return ""; return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
