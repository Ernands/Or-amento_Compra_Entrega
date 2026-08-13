import { useMemo, useState, type FormEvent } from "react";
import { Calculator, Check, Save } from "lucide-react";

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
  const initialNeed = necessities.find((need) => need.id === props.initialNecessityId);
  const [itemId, setItemId] = useState(quote?.itemId || initialNeed?.itemId || "");
  const [selectedNecessityIds, setSelectedNecessityIds] = useState<string[]>(() => quote?.necessityIds || (initialNeed ? [initialNeed.id] : []));
  const [form, setForm] = useState<QuoteValuesInput>(() => quote ? quoteValues(quote) : defaultValues(options));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const storeMap = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const currentNeedIds = useMemo(() => new Set(quote?.necessityIds || []), [quote?.necessityIds]);
  const eligibleNeeds = useMemo(() => necessities
    .filter((need) => need.itemId === itemId && (["NAO_INICIADO", "EM_COTACAO"].includes(need.status) || currentNeedIds.has(need.id)))
    .sort((left, right) => (storeMap.get(left.storeId)?.name || left.storeId).localeCompare(storeMap.get(right.storeId)?.name || right.storeId)), [currentNeedIds, itemId, necessities, storeMap]);
  const eligibleItemIds = useMemo(() => new Set(necessities
    .filter((need) => ["NAO_INICIADO", "EM_COTACAO"].includes(need.status) || currentNeedIds.has(need.id))
    .map((need) => need.itemId)), [currentNeedIds, necessities]);
  const selectedNeeds = useMemo(() => eligibleNeeds.filter((need) => selectedNecessityIds.includes(need.id)), [eligibleNeeds, selectedNecessityIds]);
  const quantityTotal = selectedNeeds.reduce((sum, need) => sum + need.quantity, 0);
  const selectedItem = itemMap.get(itemId);
  const suggestedRoutes = routes.filter((route) => route.itemId === itemId && route.active).sort((a, b) => a.order - b.order);
  const activeSuppliers = suppliers.filter((supplier) => supplier.active);
  const allEligibleSelected = eligibleNeeds.length > 0 && selectedNeeds.length === eligibleNeeds.length;
  const totals = useMemo(() => {
    try { return calculateQuoteTotals({ quantityTotal, unitPrice: form.unitPrice, freight: form.freight, otherCosts: form.otherCosts }); }
    catch { return { subtotal: 0, total: 0 }; }
  }, [form.freight, form.otherCosts, form.unitPrice, quantityTotal]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNecessityIds.length) {
      setError("Selecione pelo menos uma loja elegível.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (quote) await onUpdate({ id: quote.id, version: quote.version, changes: { necessityIds: selectedNecessityIds, ...form }, reason });
      else await onCreate({ necessityIds: selectedNecessityIds, ...form });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a proposta.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof QuoteValuesInput>(field: K, value: QuoteValuesInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseItem(nextItemId: string) {
    setItemId(nextItemId);
    setSelectedNecessityIds([]);
  }

  function toggleNeed(necessityId: string) {
    setSelectedNecessityIds((current) => current.includes(necessityId)
      ? current.filter((id) => id !== necessityId)
      : [...current, necessityId]);
  }

  function toggleAllEligible() {
    setSelectedNecessityIds(allEligibleSelected ? [] : eligibleNeeds.map((need) => need.id));
  }

  return (
    <Sheet open={props.open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{quote ? `Editar ${quote.id}` : "Nova proposta de cotação"}</SheetTitle>
          <SheetDescription>Selecione um item e uma ou mais lojas. Quantidades e subtotais são derivados das necessidades; frete e outros custos pertencem ao cabeçalho comercial.</SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid gap-4 px-4 pb-6 sm:grid-cols-2">
            <Field label="Item" htmlFor="quote-item" className="sm:col-span-2">
              <select id="quote-item" value={itemId} onChange={(event) => chooseItem(event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                <option value="">Selecione o item</option>
                {items.filter((item) => eligibleItemIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.operationalCode} · {item.name}</option>)}
              </select>
            </Field>
            {selectedItem ? <div className="rounded-lg border bg-muted/30 p-3 text-xs sm:col-span-2"><p className="font-medium">{selectedItem.name} · {selectedItem.operationalCode}</p><p className="mt-1 text-muted-foreground">Rotas cadastradas: {suggestedRoutes.length ? suggestedRoutes.map((route) => `${route.order}. ${route.originDestination}`).join(" → ") : "nenhuma"}</p></div> : null}
            <div className="rounded-xl border sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
                <div><p className="text-sm font-medium">Lojas abrangidas</p><p className="text-xs text-muted-foreground">{selectedNeeds.length} de {eligibleNeeds.length} lojas · quantidade total {quantityTotal}</p></div>
                <Button type="button" variant="outline" size="sm" onClick={toggleAllEligible} disabled={!eligibleNeeds.length}>{allEligibleSelected ? "Limpar seleção" : "Todas as lojas elegíveis"}</Button>
              </div>
              <div className="max-h-64 divide-y overflow-y-auto">
                {eligibleNeeds.map((need) => {
                  const checked = selectedNecessityIds.includes(need.id);
                  return <label key={need.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/40"><input type="checkbox" checked={checked} onChange={() => toggleNeed(need.id)} className="size-4" /><span className="flex-1"><span className="block text-sm font-medium">{storeMap.get(need.storeId)?.name || need.storeId}</span><span className="block text-xs text-muted-foreground">{need.id} · Qtd. planejada {need.quantity}</span></span>{checked ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}</label>;
                })}
                {itemId && !eligibleNeeds.length ? <p className="p-4 text-sm text-muted-foreground">Nenhuma loja elegível para este item.</p> : null}
              </div>
            </div>
            <Field label="Fornecedor" htmlFor="quote-supplier"><select id="quote-supplier" value={form.supplierId} onChange={(event) => update("supplierId", event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Selecione</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
            <Field label="Origem da cotação" htmlFor="quote-origin"><select id="quote-origin" value={form.origin} onChange={(event) => update("origin", event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Selecione</option>{options.origins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}</select></Field>
            <Field label="Quantidade total" htmlFor="quote-quantity"><Input id="quote-quantity" type="number" value={quantityTotal} readOnly className="bg-muted" /><p className="mt-1 text-xs text-muted-foreground">Soma de Qtd_Planejada das lojas selecionadas.</p></Field>
            <Field label="Preço unitário do item" htmlFor="quote-unit-price"><Input id="quote-unit-price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => update("unitPrice", Number(event.target.value))} required /></Field>
            <Field label="Frete total da proposta" htmlFor="quote-freight"><Input id="quote-freight" type="number" min="0" step="0.01" value={form.freight} onChange={(event) => update("freight", Number(event.target.value))} required /></Field>
            <Field label="Outros custos totais" htmlFor="quote-other-costs"><Input id="quote-other-costs" type="number" min="0" step="0.01" value={form.otherCosts} onChange={(event) => update("otherCosts", Number(event.target.value))} required /></Field>
            <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3 sm:col-span-2"><Calculator className="size-5 text-primary" /><div className="grid flex-1 grid-cols-2 gap-3 text-sm"><span>Subtotal dos itens <strong className="block">{currencyFormatter.format(totals.subtotal)}</strong></span><span>Total da proposta <strong className="block">{currencyFormatter.format(totals.total)}</strong></span></div></div>
            <Field label="Forma de pagamento" htmlFor="quote-payment"><select id="quote-payment" value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} required className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Selecione</option>{options.paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></Field>
            <Field label="Prazo (dias)" htmlFor="quote-lead"><Input id="quote-lead" type="number" min="0" step="1" value={form.leadTimeDays} onChange={(event) => update("leadTimeDays", Number(event.target.value))} required /></Field>
            <Field label="Data da cotação" htmlFor="quote-date"><Input id="quote-date" type="date" value={form.quoteDate} onChange={(event) => update("quoteDate", event.target.value)} required /></Field>
            <Field label="Validade da proposta" htmlFor="quote-valid-until"><Input id="quote-valid-until" type="date" value={form.proposalValidUntil} onChange={(event) => update("proposalValidUntil", event.target.value)} /></Field>
            <Field label="Status" htmlFor="quote-status"><select id="quote-status" value={form.status} onChange={(event) => update("status", event.target.value as QuoteValuesInput["status"])} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">{options.statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></Field>
            <Field label="Link da proposta" htmlFor="quote-link"><Input id="quote-link" type="url" value={form.link} onChange={(event) => update("link", event.target.value)} placeholder="https://" /></Field>
            <Field label="Observações" htmlFor="quote-notes" className="sm:col-span-2"><Textarea id="quote-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
            {quote ? <Field label="Motivo da alteração" htmlFor="quote-reason" className="sm:col-span-2"><Textarea id="quote-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></Field> : null}
            {!activeSuppliers.length ? <Alert className="sm:col-span-2"><AlertDescription>Cadastre um fornecedor ativo antes de registrar a primeira proposta.</AlertDescription></Alert> : null}
            {error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
          </div>
          <SheetFooter className="border-t"><Button type="submit" disabled={saving || !activeSuppliers.length || !selectedNeeds.length}><Save />{saving ? "Salvando…" : "Salvar proposta"}</Button><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button></SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function defaultValues(options: QuoteOptions): QuoteValuesInput {
  return { supplierId: "", origin: options.origins[0] || "", unitPrice: 0, freight: 0, otherCosts: 0, paymentMethod: options.paymentMethods[0] || "", leadTimeDays: 0, proposalValidUntil: "", link: "", status: options.statuses[0] || "RASCUNHO", quoteDate: localDate(), notes: "" };
}

function quoteValues(quote: Quote): QuoteValuesInput {
  return { supplierId: quote.supplierId, origin: quote.origin, unitPrice: quote.unitPrice, freight: quote.freight, otherCosts: quote.otherCosts, paymentMethod: quote.paymentMethod, leadTimeDays: quote.leadTimeDays, proposalValidUntil: quote.proposalValidUntil, link: quote.link, status: quote.status === "RASCUNHO" || quote.status === "EM_ANDAMENTO" || quote.status === "RECEBIDA" ? quote.status : "EM_ANDAMENTO", quoteDate: quote.quoteDate, notes: quote.notes };
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function Field({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
