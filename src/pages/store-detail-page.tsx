import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Boxes, CheckCircle2, ClipboardList, PackageCheck } from "lucide-react";

import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperations } from "@/context/operations-context";

export function StoreDetailPage() {
  const { id } = useParams();
  const { stores, items, necessities, dashboard, loading, error, refresh } = useOperations();
  if (loading && !dashboard) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} retry={refresh} />;
  const store = stores.find((entry) => entry.id === id);
  if (!store || !dashboard) return <ErrorPanel message="Loja não encontrada." retry={refresh} />;
  const progress = dashboard.stores.find((entry) => entry.store.id === store.id)!;
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const storeNeeds = necessities.filter((need) => need.storeId === store.id);
  return <div className="space-y-6">
    <Button asChild variant="ghost" size="sm" className="-ml-3"><Link to="/lojas"><ArrowLeft />Voltar para lojas</Link></Button>
    <PageHeader eyebrow={store.id} title={store.name} description={`${store.city}/${store.state} · Responsável: ${store.manager}`} />
    <Card className="shadow-none"><CardContent className="p-5"><div className="mb-2 flex justify-between text-sm"><span className="font-medium">Progresso geral</span><span className="tabular-nums text-muted-foreground">{progress.progress}%</span></div><Progress value={progress.progress} /></CardContent></Card>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Itens necessários" value={progress.total} helper="catálogo completo da loja" icon={Boxes} /><MetricCard label="Pendentes" value={progress.pendingDefinition} helper="exigem definição" icon={ClipboardList} tone="yellow" /><MetricCard label="Comprados" value={progress.purchased} helper="compras registradas" icon={PackageCheck} tone="green" /><MetricCard label="Concluídos" value={progress.completed} helper="entrega conferida" icon={CheckCircle2} tone="green" /></section>
    <Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Código</TableHead><TableHead>Item</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{storeNeeds.map((need) => { const item = itemMap.get(need.itemId); return <TableRow key={need.id}><TableCell className="pl-6 font-mono text-xs">{item?.operationalCode}</TableCell><TableCell><p className="font-medium">{item?.name}</p><p className="font-mono text-xs text-muted-foreground">{need.id}</p></TableCell><TableCell>{item?.area}</TableCell><TableCell className="text-right tabular-nums">{need.quantity}</TableCell><TableCell><StatusBadge status={need.status} /></TableCell></TableRow>; })}</TableBody></Table></CardContent></Card>
  </div>;
}
