import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CircleAlert, CircleCheckBig, Play } from "lucide-react";

import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { ActivityStatusBadge } from "@/components/implantation/activity-status-badge";
import { EvidencePendingNotice } from "@/components/implantation/evidence-pending-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { createImplantationRequestId, type ImplantationActivityView, type OpeningDatePreviewPayload } from "@/domain/implantation-operational";
import { useImplantationQuery } from "@/hooks/use-implantation-query";

export function StoreImplantationPanel({ storeId }: { storeId: string }) {
  const { repository } = useImplantationAccess();
  const loader = useCallback(() => repository!.storeDetail(storeId), [repository, storeId]);
  const query = useImplantationQuery(repository ? loader : null);
  const [plannedDate, setPlannedDate] = useState("");
  const [preview, setPreview] = useState<OpeningDatePreviewPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const effectiveDate = plannedDate || query.data?.store.plannedOpeningDate || "";
  const activities = query.data?.activities;
  const grouped = useMemo(() => {
    const groups = new Map<string, ImplantationActivityView[]>();
    (activities ?? []).forEach((activity) => groups.set(activity.phase, [...(groups.get(activity.phase) ?? []), activity]));
    return [...groups.entries()];
  }, [activities]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setActionError("");
    try { await action(); setPreview(null); setPlannedDate(""); await query.refresh(); }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : "Não foi possível concluir a operação."); }
    finally { setBusy(false); }
  }

  if (query.loading && !query.data) return <LoadingPanel />;
  if (query.error) return <ErrorPanel message={query.error} retry={query.refresh} />;
  if (!query.data || !repository) return null;
  const { store, implantation, capabilities, summary } = query.data;

  const defineDate = () => run(() => repository.setOpeningDate({ storeId, version: store.version, plannedOpeningDate: effectiveDate, requestId: createImplantationRequestId() }));
  const start = () => {
    if (!window.confirm(`Iniciar a implantação de ${store.name} e gerar as 30 atividades do Checklist Mestre?`)) return;
    void run(() => repository.start({ storeId, storeVersion: store.version, requestId: createImplantationRequestId() }));
  };
  const previewDate = async () => {
    setBusy(true); setActionError("");
    try { setPreview(await repository.previewDateChange(storeId, effectiveDate)); }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : "Não foi possível calcular a prévia."); }
    finally { setBusy(false); }
  };
  const applyDate = () => {
    if (!preview) return;
    const reason = window.prompt("Informe o motivo da reprogramação:")?.trim();
    if (!reason) return;
    const activityVersions = Object.fromEntries(preview.impacts.map((impact) => [impact.activityId, impact.version]));
    void run(() => repository.changeDate({ storeId, storeVersion: store.version, implantationVersion: preview.implantationVersion, plannedOpeningDate: preview.nextDate, reason, requestId: createImplantationRequestId(), activityVersions }));
  };

  return <div className="space-y-5">
    {actionError ? <ErrorPanel message={actionError} retry={() => setActionError("")} /> : null}
    <Card className="shadow-none"><CardContent className="space-y-4 p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-sm font-medium">Data planejada de inauguração</p><p className="text-xs text-muted-foreground">A data é obrigatória antes do início e ancora todas as datas-alvo.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="date" value={effectiveDate} onChange={(event) => setPlannedDate(event.target.value)} className="sm:w-44" disabled={!(implantation ? capabilities.previewOpeningDateChange : capabilities.setOpeningDate) || busy} />
          {!implantation ? <Button onClick={defineDate} disabled={!capabilities.setOpeningDate || !effectiveDate || busy}><CalendarClock />Salvar data</Button> : <Button onClick={() => void previewDate()} disabled={!capabilities.previewOpeningDateChange || !effectiveDate || effectiveDate === implantation.plannedOpeningDate || busy}><CalendarClock />Calcular prévia</Button>}
          {!implantation ? <Button variant="outline" onClick={start} disabled={!capabilities.start || !store.plannedOpeningDate || busy}><Play />Iniciar implantação</Button> : null}
        </div>
      </div>
      {preview ? <div className="rounded-lg border bg-muted/30 p-4 text-sm"><p className="font-medium">Prévia de reprogramação</p><p className="mt-1 text-muted-foreground">{preview.summary.changed} atividade(s) mudarão de data; {preview.summary.inProgressOrBlocked} está(ão) em andamento ou bloqueada(s). Concluídas, não aplicáveis e canceladas serão preservadas.</p><Button className="mt-3" onClick={applyDate} disabled={!capabilities.changePlannedOpeningDate || busy}>Confirmar reprogramação</Button></div> : null}
    </CardContent></Card>
    {!implantation ? <Card className="shadow-none"><CardContent className="p-6 text-center"><p className="font-medium">Implantação ainda não iniciada</p><p className="mt-1 text-sm text-muted-foreground">Nenhuma atividade foi criada para esta loja. A inicialização só acontece pelo botão explícito acima.</p></CardContent></Card> : <>
      <section className="grid gap-4 sm:grid-cols-3"><Card className="shadow-none"><CardContent className="p-5"><CircleCheckBig className="size-5 text-emerald-600" /><p className="mt-3 text-2xl font-semibold">{summary.completed}/{summary.total}</p><p className="text-sm text-muted-foreground">atividades concluídas</p></CardContent></Card><Card className="shadow-none"><CardContent className="p-5"><CircleAlert className="size-5 text-destructive" /><p className="mt-3 text-2xl font-semibold">{summary.blocked}</p><p className="text-sm text-muted-foreground">atividades bloqueadas</p></CardContent></Card><Card className="shadow-none"><CardContent className="p-5"><p className="text-sm font-medium">Progresso geral</p><p className="mt-2 text-2xl font-semibold">{summary.progress}%</p><Progress className="mt-3" value={summary.progress} /></CardContent></Card></section>
      <EvidencePendingNotice />
      {grouped.map(([phase, activities]) => <Card key={phase} className="overflow-hidden py-0 shadow-none"><CardContent className="p-0"><div className="border-b bg-muted/20 px-5 py-3"><h3 className="font-semibold">{phase}</h3></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="pl-5">Atividade</TableHead><TableHead>Data-alvo</TableHead><TableHead>Responsável</TableHead><TableHead>Progresso</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{activities.map((activity) => <TableRow key={activity.id}><TableCell className="pl-5"><p className="font-medium">{activity.action}</p><p className="font-mono text-xs text-muted-foreground">{activity.id}</p></TableCell><TableCell>{activity.currentTargetDate}</TableCell><TableCell>{activity.responsibleUserId || "—"}</TableCell><TableCell>{activity.progress}%</TableCell><TableCell><ActivityStatusBadge status={activity.status} /></TableCell><TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link to={`/implantacao/atividades/${activity.id}`}>Detalhes</Link></Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>)}
    </>}
  </div>;
}
