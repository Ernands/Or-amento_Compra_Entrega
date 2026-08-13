import { useMemo, useState, type FormEvent } from "react";
import { Calculator, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CreateQuoteInput, Item, Necessity, PurchaseRoute, Quote, QuoteOptions, QuoteValuesInput, Store, Supplier, UpdateQuoteInput } from "@/domain/entities";
import { calculateQuoteTotals } from "@/domain/quotes";
import { currencyFormatter, formatStatus } from "@/lib/format";

interface QuoteFormSheetProps {
  open: boolean;
  quote?: Quote;
  initialNecessityId?: string;
  stores: Store[];
  items: Item[];
  necessities: Necessity[];
  suppliers: Supplier[];
  routes: PurchaseRoute[];
  options: QuoteOptions;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateQuoteInput) => Promise<void>;
  onUpdate: (input: UpdateQuoteInput) => Promise<void>;
}

export function QuoteFormSheet(props: QuoteFormSheetProps) {
  const { quote, stores, items, necessities, suppliers, routes, options, onOpenChange, onCreate, onUpdate } = props;
  const initialNeed = quote?.necessityId || props.initialNecessityId || "";
  const initialStore = quote?.storeId || necessities.find((need) => need.id === initialNeed)?.storeId || stores[0]?.id || "";
  const initialPlannedQuantity = necessities.find((need) => need.id === initialNeed)?.quantity ?? quote?.quantity ?? 1;
  const [storeId, setStoreId] = useState(initialStore);
  const [necessityId, setNecessityId] = useState(initialNeed);
  const [form, setForm] = useState<QuoteValuesInput>(() => quote ? quoteValues(quote, initialPlannedQuantity) : defaultValues(initialPlannedQuantity, options));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const eligibleNeeds = useMemo(() => necessities.filter((need) => need.storeId === storeId && (need.status === "NAO_INICIADO" || need.status === "EM_COTACAO")), [necessities, storeId]);
  const selectedNeed = necessities.find((need) => need.id === necessityId);
  const selectedItem = selectedNeed ? itemMap.get(selectedNeed.itemId) : undefined;
  const suggestedRoutes = routes.filter((route) => route.itemId === selectedNeed?.itemId && route.active).sort((a, b) => a.order - b.order);
  const activeSuppliers = suppliers.filter((supplier) => supplier.active);
  const totals = useMemo(() => {
    try { return calculateQuoteTotals({ quantity: form.quantity, unitPrice: form.unitPrice, freight: form.freight, otherCosts: form.otherCosts }); }
    catch { return { subtotal: 0, total: 0 }; }
  }, [form.freight, form.otherCosts, form.quantity, form.unitPrice]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (quote) await onUpdate({ id: quote.id, version: quote.version, changes: { ...(necessityId === quote.necessityId ? {} : { necessityId }), ...form }, reason });
      else await onCreate({ necessityId, ...form });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a cotação.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof QuoteValuesInput>(field: K, value: QuoteValuesInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseNeed(id: string) {
    setNecessityId(id);
    const need = necessities.find((entry) => entry.id === id);
    if (need) update("quantity", need.quantity);
  }

  return (
    <Sheet open={props.open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{quote ? `Editar ${quote.id}` : "Nova cotação"}</SheetTitle>
          <SheetDescription>{quote ? "O ID interno permanece imutável. Loja, item e quantidade acompanham a necessidade escolhida." : "A cotação será registrada como uma proposta individual vinculada à necessidade."}</SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid gap-4 px-4 pb-6 sm:grid-cols-2">
            <Field label="Loja" htmlFor="quote-store">
              <select id="quote-store" value={storeId} onChange={(event) => { setStoreId(event.target.value); setNecessityId(""); }} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select>
            </Field>
            <Field label="Necessidade / item" htmlFor="quote-necessity">
              <select id="quote-necessity" value={necessityId} onChange={(event) => chooseNeed(event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Selecione</option>{eligibleNeeds.map((need) => <option key={need.id} value={need.id}>{need.id} · {itemMap.get(need.itemId)?.name}</option>)}</select>
            </Field>
            {selectedItem ? <div className="rounded-lg border bg-muted/30 p-3 text-xs sm:col-span-2"><p className="font-medium">{selectedItem.name} · {selectedItem.operationalCode}</p><p className="mt-1 text-muted-foreground">Rotas cadastradas: {suggestedRoutes.length ? suggestedRoutes.map((route) => `${route.order}. ${route.originDestination}`).join(" → ") : "nenhuma"}</p></div> : null}
            <Field label="Fornecedor" htmlFor="quote-supplier"><select id="quote-supplier" value={form.supplierId} onChange={(event) => update("supplierId", event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Selecione</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
            <Field label="Origem da cotação" htmlFor="quote-origin"><select id="quote-origin" value={form.origin} onChange={(event) => update("origin", event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Selecione</option>{options.origins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}</select></Field>
            <Field label="Quantidade planejada" htmlFor="quote-quantity"><Input id="quote-quantity" type="number" value={form.quantity} readOnly aria-describedby="quote-quantity-help" className="bg-muted" /><p id="quote-quantity-help" className="mt-1 text-xs text-muted-foreground">Derivada de Qtd_Planejada da necessidade e não editável na cotação.</p></Field>
            <Field label="Preço unitário" htmlFor="quote-unit-price"><Input id="quote-unit-price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => update("unitPrice", Number(event.target.value))} required /></Field>
            <Field label="Frete" htmlFor="quote-freight"><Input id="quote-freight" type="number" min="0" step="0.01" value={form.freight} onChange={(event) => update("freight", Number(event.target.value))} required /></Field>
            <Field label="Outros custos" htmlFor="quote-other-costs"><Input id="quote-other-costs" type="number" min="0" step="0.01" value={form.otherCosts} onChange={(event) => update("otherCosts", Number(event.target.value))} required /></Field>
            <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3 sm:col-span-2"><Calculator className="size-5 text-primary" /><div className="grid flex-1 grid-cols-2 gap-3 text-sm"><span>Subtotal <strong className="block">{currencyFormatter.format(totals.subtotal)}</strong></span><span>Total <strong className="block">{currencyFormatter.format(totals.total)}</strong></span></div></div>
            <Field label="Forma de pagamento" htmlFor="quote-payment"><select id="quote-payment" value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Selecione</option>{options.paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></Field>
            <Field label="Prazo (dias)" htmlFor="quote-lead"><Input id="quote-lead" type="number" min="0" step="1" value={form.leadTimeDays} onChange={(event) => update("leadTimeDays", Number(event.target.value))} required /></Field>
            <Field label="Data da cotação" htmlFor="quote-date"><Input id="quote-date" type="date" value={form.quoteDate} onChange={(event) => update("quoteDate", event.target.value)} required /></Field>
            <Field label="Validade da proposta" htmlFor="quote-valid-until"><Input id="quote-valid-until" type="date" value={form.proposalValidUntil} onChange={(event) => update("proposalValidUntil", event.target.value)} /></Field>
            <Field label="Status" htmlFor="quote-status"><select id="quote-status" value={form.status} onChange={(event) => update("status", event.target.value as QuoteValuesInput["status"])} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">{options.statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></Field>
            <Field label="Link da proposta" htmlFor="quote-link"><Input id="quote-link" type="url" value={form.link} onChange={(event) => update("link", event.target.value)} placeholder="https://" /></Field>
            <Field label="Observações" htmlFor="quote-notes" className="sm:col-span-2"><Textarea id="quote-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
            {quote ? <Field label="Motivo da alteração" htmlFor="quote-reason" className="sm:col-span-2"><Textarea id="quote-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></Field> : null}
            {!activeSuppliers.length ? <Alert className="sm:col-span-2"><AlertDescription>Cadastre um fornecedor ativo antes de registrar a primeira cotação.</AlertDescription></Alert> : null}
            {error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
          </div>
          <SheetFooter className="border-t"><Button type="submit" disabled={saving || !activeSuppliers.length}><Save />{saving ? "Salvando…" : "Salvar cotação"}</Button><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button></SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function defaultValues(quantity = 1, options: QuoteOptions): QuoteValuesInput {
  return { supplierId: "", origin: options.origins[0] || "", unitPrice: 0, quantity, freight: 0, otherCosts: 0, paymentMethod: options.paymentMethods[0] || "", leadTimeDays: 0, proposalValidUntil: "", link: "", status: options.statuses[0] || "RASCUNHO", quoteDate: localDate(), notes: "" };
}

function quoteValues(quote: Quote, plannedQuantity: number): QuoteValuesInput {
  return { supplierId: quote.supplierId, origin: quote.origin, unitPrice: quote.unitPrice, quantity: plannedQuantity, freight: quote.freight, otherCosts: quote.otherCosts, paymentMethod: quote.paymentMethod, leadTimeDays: quote.leadTimeDays, proposalValidUntil: quote.proposalValidUntil, link: quote.link, status: quote.status === "RASCUNHO" || quote.status === "EM_ANDAMENTO" || quote.status === "RECEBIDA" ? quote.status : "RECEBIDA", quoteDate: quote.quoteDate, notes: quote.notes };
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function Field({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
