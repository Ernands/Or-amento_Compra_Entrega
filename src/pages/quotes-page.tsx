import { useDeferredValue, useMemo, useState } from "react";
import { Check, GitCompareArrows, LoaderCircle, PackagePlus, Pencil, Plus, Search, Star, Timer, Trash2, Truck } from "lucide-react";
import { useLocation } from "react-router-dom";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel } from "@/components/app/page-state";
import { QuoteFormSheet } from "@/components/app/quote-form-sheet";
import { StatusBadge } from "@/components/app/status-badge";
import { SupplierCreateSheet } from "@/components/app/supplier-create-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useOperations } from "@/context/operations-context";
import type { Quote } from "@/domain/entities";
import { areQuoteQuantitiesComparable } from "@/domain/quotes";
import { useQuotesWorkspace } from "@/hooks/use-quotes-workspace";
import { currencyFormatter, formatStatus } from "@/lib/format";

const pageSize = 100;

export function QuotesPage() {
  const location = useLocation();
  const linkedNecessityId = (location.state as { necessityId?: string } | null)?.necessityId;
  const { stores, items, necessities } = useOperations();
  const { state, refresh, createSupplier, createQuote, updateQuote, deleteQuote, selectQuote } = useQuotesWorkspace();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [storeFilter, setStoreFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [view, setView] = useState<"list" | "compare">("list");
  const [page, setPage] = useState(1);
  const [quoteSheet, setQuoteSheet] = useState<{ quote?: Quote; necessityId?: string } | null>(() => linkedNecessityId ? { necessityId: linkedNecessityId } : null);
  const [supplierSheet, setSupplierSheet] = useState(false);
  const [actionError, setActionError] = useState("");
  const [selectingId, setSelectingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const storeMap = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  if (state.status === "loading") return <QuotesLoadingPage />;
  if (state.status === "error") return <ErrorPanel message={state.message} retry={refresh} />;

  const { quotes, suppliers, routes, options, permissions } = state.data;
  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const normalizedQuery = normalize(deferredQuery);
  const filtered = quotes.filter((quote) => {
    const item = itemMap.get(quote.itemId);
    const store = storeMap.get(quote.storeId);
    const supplier = supplierMap.get(quote.supplierId);
    return (!storeFilter || quote.storeId === storeFilter)
      && (!statusFilter || quote.status === statusFilter)
      && (!supplierFilter || quote.supplierId === supplierFilter)
      && (!normalizedQuery || normalize([quote.id, quote.necessityId, item?.name, item?.operationalCode, store?.name, supplier?.name].join(" ")).includes(normalizedQuery));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const grouped = groupQuotes(filtered.filter((quote) => quote.status === "RECEBIDA" || quote.status === "SELECIONADA"));
  const quotedNeedIds = new Set(quotes.map((quote) => quote.necessityId));
  const eligibleWithoutQuote = necessities.filter((need) => (need.status === "NAO_INICIADO" || need.status === "EM_COTACAO") && !quotedNeedIds.has(need.id));
  const statusOptions = [...new Set([...options.statuses, ...quotes.map((quote) => quote.status)])];

  async function chooseQuote(quote: Quote) {
    if (!window.confirm(`Selecionar ${quote.id} como proposta escolhida para esta necessidade?`)) return;
    setSelectingId(quote.id);
    setActionError("");
    try { await selectQuote({ id: quote.id, version: quote.version, reason: "Proposta escolhida no mapa comparativo." }); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Não foi possível selecionar a proposta."); }
    finally { setSelectingId(""); }
  }

  async function removeQuote(quote: Quote) {
    if (!window.confirm(`Excluir a cotação ${quote.id}? Ela deixará de aparecer no sistema, mas permanecerá auditável na planilha DEV.`)) return;
    setDeletingId(quote.id);
    setActionError("");
    try { await deleteQuote({ id: quote.id, version: quote.version, reason: "Exclusão solicitada na tela de cotações." }); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Não foi possível excluir a cotação."); }
    finally { setDeletingId(""); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compras"
        title="Cotações"
        description="Propostas individuais por necessidade, com comparação e seleção humana da melhor opção."
        actions={<div className="flex flex-wrap gap-2">{permissions.createSupplier ? <Button variant="outline" onClick={() => setSupplierSheet(true)}><PackagePlus />Fornecedor</Button> : null}{permissions.create ? <Button onClick={() => setQuoteSheet({})}><Plus />Nova cotação</Button> : null}</div>}
      />
      {actionError ? <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cotações" value={quotes.length} detail={`${eligibleWithoutQuote.length} necessidades elegíveis ainda sem proposta`} />
        <Metric label="Recebidas" value={quotes.filter((quote) => quote.status === "RECEBIDA").length} detail="Aptas para comparação e seleção" />
        <Metric label="Selecionadas" value={quotes.filter((quote) => quote.selected).length} detail="Preparadas para a futura aprovação" />
        <Metric label="Valor cotado" value={currencyFormatter.format(quotes.reduce((total, quote) => total + quote.total, 0))} detail="Soma de todas as propostas" />
      </div>
      <Card className="shadow-none">
        <CardContent className="grid gap-2 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_200px_auto]">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar cotação, necessidade, item ou fornecedor" className="pl-9" /></div>
          <Filter label="Filtrar por loja" value={storeFilter} onChange={(value) => { setStoreFilter(value); setPage(1); }}><option value="">Todas as lojas</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</Filter>
          <Filter label="Filtrar por status" value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }}><option value="">Todos os status</option>{statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</Filter>
          <Filter label="Filtrar por fornecedor" value={supplierFilter} onChange={(value) => { setSupplierFilter(value); setPage(1); }}><option value="">Todos os fornecedores</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Filter>
          <div className="flex rounded-md border p-1"><Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}>Lista</Button><Button variant={view === "compare" ? "default" : "ghost"} size="sm" onClick={() => setView("compare")}><GitCompareArrows />Comparar</Button></div>
        </CardContent>
      </Card>
      {!quotes.length ? <EmptyQuotes canCreate={permissions.create} canCreateSupplier={permissions.createSupplier} onNewSupplier={() => setSupplierSheet(true)} onNewQuote={() => setQuoteSheet({})} /> : view === "list" ? (
        <QuoteTable quotes={visible} supplierMap={supplierMap} storeMap={storeMap} itemMap={itemMap} canEdit={permissions.edit} canDelete={permissions.delete} canSelect={permissions.select} selectingId={selectingId} deletingId={deletingId} onEdit={(quote) => setQuoteSheet({ quote })} onDelete={removeQuote} onSelect={chooseQuote} />
      ) : <Comparison groups={grouped} supplierMap={supplierMap} storeMap={storeMap} itemMap={itemMap} selectingId={selectingId} canSelect={permissions.select} onSelect={chooseQuote} />}
      {view === "list" && quotes.length ? <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Exibindo {visible.length} de {filtered.length} cotação(ões).</span>{totalPages > 1 ? <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button><span>Página {currentPage} de {totalPages}</span><Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</Button></div> : null}</div> : null}
      {quoteSheet && (quoteSheet.quote ? permissions.edit : permissions.create) ? <QuoteFormSheet key={quoteSheet.quote ? `${quoteSheet.quote.id}:${quoteSheet.quote.version}` : `new:${quoteSheet.necessityId || "none"}`} open quote={quoteSheet.quote} initialNecessityId={quoteSheet.necessityId} stores={stores} items={items} necessities={necessities} suppliers={suppliers} routes={routes} options={options} onOpenChange={(open) => { if (!open) setQuoteSheet(null); }} onCreate={createQuote} onUpdate={updateQuote} /> : null}
      {supplierSheet ? <SupplierCreateSheet open onOpenChange={setSupplierSheet} onSave={createSupplier} /> : null}
    </div>
  );
}

function QuoteTable(props: { quotes: Quote[]; supplierMap: Map<string, { name: string }>; storeMap: Map<string, { name: string }>; itemMap: Map<string, { name: string; operationalCode: string }>; canEdit: boolean; canDelete: boolean; canSelect: boolean; selectingId: string; deletingId: string; onEdit: (quote: Quote) => void; onDelete: (quote: Quote) => void; onSelect: (quote: Quote) => void }) {
  return <Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Cotação</TableHead><TableHead>Loja / item</TableHead><TableHead>Fornecedor</TableHead><TableHead className="text-right">Unitário</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Prazo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{props.quotes.map((quote) => <TableRow key={quote.id}><TableCell className="pl-6"><p className="font-mono text-xs">{quote.id}</p><p className="text-xs text-muted-foreground">{quote.necessityId}</p></TableCell><TableCell><p className="font-medium">{props.storeMap.get(quote.storeId)?.name}</p><p className="text-xs text-muted-foreground">{props.itemMap.get(quote.itemId)?.operationalCode} · {props.itemMap.get(quote.itemId)?.name}</p></TableCell><TableCell>{props.supplierMap.get(quote.supplierId)?.name || quote.supplierId}</TableCell><TableCell className="text-right tabular-nums">{currencyFormatter.format(quote.unitPrice)}</TableCell><TableCell className="text-right font-medium tabular-nums">{currencyFormatter.format(quote.total)}</TableCell><TableCell>{quote.leadTimeDays} dia(s)</TableCell><TableCell><div className="flex items-center gap-2"><StatusBadge status={quote.status} />{quote.selected ? <Check className="size-4 text-emerald-600" aria-label="Selecionada" /> : null}</div></TableCell><TableCell><div className="flex justify-end gap-1">{quote.link ? <Button asChild variant="ghost" size="sm"><a href={quote.link} target="_blank" rel="noreferrer">Proposta</a></Button> : null}{props.canEdit && !quote.selected ? <Button variant="ghost" size="sm" onClick={() => props.onEdit(quote)}><Pencil />Editar</Button> : null}{props.canDelete && !quote.selected ? <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={props.deletingId === quote.id} onClick={() => props.onDelete(quote)}><Trash2 />{props.deletingId === quote.id ? "Excluindo…" : "Excluir"}</Button> : null}{props.canSelect && quote.status === "RECEBIDA" && !quote.selected ? <Button variant="outline" size="sm" disabled={props.selectingId === quote.id} onClick={() => props.onSelect(quote)}>Selecionar</Button> : null}</div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>;
}

function QuotesLoadingPage() {
  return <div className="space-y-6" aria-live="polite" aria-busy="true"><PageHeader eyebrow="Compras" title="Cotações" description="Carregando propostas e permissões da planilha DEV…" /><Card className="shadow-none"><CardContent className="flex items-center gap-3 p-6"><LoaderCircle className="size-5 animate-spin text-primary" /><div><p className="font-medium">Carregando cotações</p><p className="text-sm text-muted-foreground">Consultando propostas, fornecedores, rotas e permissões.</p></div></CardContent></Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div><Skeleton className="h-64 rounded-xl" /></div>;
}

function Comparison(props: { groups: Array<[string, Quote[]]>; supplierMap: Map<string, { name: string; rating?: number | null }>; storeMap: Map<string, { name: string }>; itemMap: Map<string, { name: string; operationalCode: string }>; canSelect: boolean; selectingId: string; onSelect: (quote: Quote) => void }) {
  if (!props.groups.length) return <Card className="shadow-none"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma proposta corresponde aos filtros atuais.</CardContent></Card>;
  return <div className="space-y-4">{props.groups.map(([necessityId, quotes]) => { const first = quotes[0]; const quantitiesComparable = areQuoteQuantitiesComparable(quotes.map((quote) => quote.quantity)); const minTotal = quantitiesComparable ? Math.min(...quotes.map((quote) => quote.total)) : null; const minLead = Math.min(...quotes.map((quote) => quote.leadTimeDays)); const maxRating = Math.max(...quotes.map((quote) => quote.supplierRating ?? -1)); return <Card key={necessityId} className="shadow-none"><CardHeader><CardTitle className="text-base">{props.itemMap.get(first.itemId)?.name}</CardTitle><CardDescription>{necessityId} · {props.storeMap.get(first.storeId)?.name} · {props.itemMap.get(first.itemId)?.operationalCode} · Quantidade {first.quantity}</CardDescription>{!quantitiesComparable ? <Alert variant="destructive"><AlertDescription>Há propostas legadas com quantidades diferentes. O menor total e a seleção ficam bloqueados até que todas correspondam à quantidade planejada.</AlertDescription></Alert> : null}</CardHeader><CardContent className="grid gap-3 xl:grid-cols-3">{quotes.map((quote) => { const supplier = props.supplierMap.get(quote.supplierId); return <div key={quote.id} className={`rounded-xl border p-4 ${quote.selected ? "border-emerald-300 bg-emerald-50/60" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{supplier?.name || quote.supplierId}</p><p className="font-mono text-xs text-muted-foreground">{quote.id}</p></div>{quote.selected ? <StatusBadge status="SELECIONADA" /> : null}</div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><ComparisonValue icon={<Truck />} label="Total" value={currencyFormatter.format(quote.total)} highlight={minTotal !== null && quote.total === minTotal} /><ComparisonValue icon={<Timer />} label="Prazo" value={`${quote.leadTimeDays} dia(s)`} highlight={quote.leadTimeDays === minLead} /><ComparisonValue icon={<Star />} label="Nota" value={quote.supplierRating === null ? "—" : quote.supplierRating.toLocaleString("pt-BR")} highlight={maxRating >= 0 && quote.supplierRating === maxRating} /><div><p className="text-xs text-muted-foreground">Pagamento</p><p className="font-medium">{quote.paymentMethod || "—"}</p></div></div><p className="mt-3 text-xs text-muted-foreground">Quantidade: {quote.quantity} · Unitário: {currencyFormatter.format(quote.unitPrice)} · Frete: {currencyFormatter.format(quote.freight)} · Outros: {currencyFormatter.format(quote.otherCosts)}</p>{props.canSelect && quantitiesComparable && quote.status === "RECEBIDA" && !quote.selected ? <Button className="mt-4 w-full" variant="outline" disabled={props.selectingId === quote.id} onClick={() => props.onSelect(quote)}>Selecionar proposta</Button> : null}</div>; })}</CardContent></Card>; })}</div>;
}

function ComparisonValue({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight: boolean }) {
  return <div className={highlight ? "rounded-md bg-primary/10 p-2" : "p-2"}><div className="flex items-center gap-1 text-xs text-muted-foreground"><span className="[&_svg]:size-3">{icon}</span>{label}</div><p className="font-medium">{value}</p></div>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <Card className="shadow-none"><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function EmptyQuotes({ canCreate, canCreateSupplier, onNewSupplier, onNewQuote }: { canCreate: boolean; canCreateSupplier: boolean; onNewSupplier: () => void; onNewQuote: () => void }) {
  return <Card className="shadow-none"><CardContent className="flex flex-col items-center p-10 text-center"><GitCompareArrows className="size-10 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Nenhuma cotação registrada</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Cadastre um fornecedor ativo e registre propostas individuais vinculadas às necessidades liberadas.</p><div className="mt-5 flex gap-2">{canCreateSupplier ? <Button variant="outline" onClick={onNewSupplier}><PackagePlus />Cadastrar fornecedor</Button> : null}{canCreate ? <Button onClick={onNewQuote}><Plus />Nova cotação</Button> : null}</div></CardContent></Card>;
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm">{children}</select>;
}

function groupQuotes(quotes: Quote[]): Array<[string, Quote[]]> {
  const groups = new Map<string, Quote[]>();
  quotes.forEach((quote) => groups.set(quote.necessityId, [...(groups.get(quote.necessityId) || []), quote]));
  return [...groups.entries()].sort(([, left], [, right]) => left[0].storeId.localeCompare(right[0].storeId));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
