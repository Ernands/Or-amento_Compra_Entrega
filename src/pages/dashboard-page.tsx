import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, Building2, CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperations } from "@/context/operations-context";
import { integerFormatter } from "@/lib/format";

export function DashboardPage() {
  const { loading, error, source, dashboard, refresh } = useOperations();
  if (loading && !dashboard) return <LoadingPanel />;
  if (error || !source || !dashboard) return <ErrorPanel message={error || "Dados indisponíveis."} retry={refresh} />;
  const { metrics, stores, areas } = dashboard;
  return <div className="space-y-6">
    <PageHeader eyebrow="Visão executiva" title="Dashboard de implantação" description="Acompanhe a preparação das 27 lojas, do levantamento inicial à conferência da entrega." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
      <MetricCard label="Lojas" value={metrics.stores} helper="previstas no escopo oficial" icon={Building2} />
      <MetricCard label="Itens do catálogo" value={metrics.items} helper={`${metrics.duplicateCodeItems} afetados por códigos duplicados`} icon={Boxes} tone="yellow" />
      <MetricCard label="Necessidades" value={metrics.necessities} helper="relações loja × item" icon={ClipboardList} />
      <MetricCard label="Pendentes de definição" value={metrics.pendingDefinition} helper="bloqueadas antes da cotação" icon={AlertTriangle} tone="red" />
    </section>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{([
      { label: "Em cotação", value: metrics.quoted, icon: Clock3 },
      { label: "Aguardando aprovação", value: metrics.awaitingApproval, icon: Clock3 },
      { label: "Comprados", value: metrics.purchased, icon: CheckCircle2 },
      { label: "Concluídos", value: metrics.completed, icon: CheckCircle2 },
    ] satisfies Array<{ label: string; value: number; icon: LucideIcon }>).map(({ label, value, icon: Icon }) => <Card key={label} className="py-0 shadow-none"><CardContent className="flex items-center gap-3 p-4"><div className="grid size-9 place-items-center rounded-lg bg-muted"><Icon className="size-4 text-muted-foreground" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold tabular-nums">{integerFormatter.format(value)}</p></div></CardContent></Card>)}</section>
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
      <Card className="shadow-none"><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>Progresso por loja</CardTitle><CardDescription>Abra uma loja para ver seus 85 itens.</CardDescription></div><Button asChild variant="outline" size="sm"><Link to="/lojas">Ver todas</Link></Button></CardHeader><CardContent className="overflow-x-auto px-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Loja</TableHead><TableHead>Status</TableHead><TableHead className="w-52">Progresso</TableHead><TableHead className="text-right">Pendências</TableHead></TableRow></TableHeader><TableBody>{stores.slice(0, 7).map((entry) => <TableRow key={entry.store.id}><TableCell className="pl-6"><Link to={`/lojas/${entry.store.id}`} className="font-medium text-primary hover:underline">{entry.store.name}</Link><p className="font-mono text-xs text-muted-foreground">{entry.store.id}</p></TableCell><TableCell><StatusBadge status={entry.store.status} /></TableCell><TableCell><div className="flex items-center gap-3"><Progress value={entry.progress} className="h-2" /><span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{entry.progress}%</span></div></TableCell><TableCell className="text-right tabular-nums">{entry.pendingDefinition}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      <div className="grid gap-4"><Card className="shadow-none"><CardHeader><CardTitle>Itens por área</CardTitle><CardDescription>Distribuição do catálogo oficial</CardDescription></CardHeader><CardContent className="space-y-4">{Object.entries(areas).map(([area, count]) => <div key={area}><div className="mb-1.5 flex justify-between text-sm"><span>{area}</span><span className="font-medium tabular-nums">{count}</span></div><Progress value={(count / metrics.items) * 100} className="h-2" /></div>)}</CardContent></Card><Card className="border-blue-200 bg-blue-50/70 shadow-none"><CardContent className="flex gap-3 p-5"><Clock3 className="mt-0.5 size-5 shrink-0 text-blue-700" /><div><p className="text-sm font-semibold text-blue-950">Próximo marco</p><p className="mt-1 text-sm leading-relaxed text-blue-900/70">Concluir os 6 itens com definição pendente antes de iniciar as cotações.</p></div></CardContent></Card></div>
    </section>
  </div>;
}
