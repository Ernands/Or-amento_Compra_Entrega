import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Item, UpdateItemInput } from "@/domain/entities";

interface ItemEditSheetProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateItemInput) => Promise<void>;
}

export function ItemEditSheet({ item, open, onOpenChange, onSave }: ItemEditSheetProps) {
  const [form, setForm] = useState(() => ({
    operationalCode: item.operationalCode,
    group: item.group,
    area: item.area,
    name: item.name,
    specification: item.specification,
    defaultQuantity: item.defaultQuantity,
    definitionStatus: item.definitionStatus,
    active: item.active,
    route1: item.route1,
    route2: item.route2,
    route3: item.route3,
    notes: item.notes,
  }));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ id: item.id, version: item.version, changes: form, reason });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o item.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Editar {item.name}</SheetTitle>
          <SheetDescription>{item.id} é imutável. Códigos operacionais podem repetir; os vínculos usam o ID interno.</SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid gap-4 px-4 pb-6 sm:grid-cols-2">
            <Field label="Código operacional" htmlFor="item-code"><Input id="item-code" value={form.operationalCode} onChange={(event) => update("operationalCode", event.target.value)} required /></Field>
            <Field label="Quantidade padrão por loja" htmlFor="item-quantity"><Input id="item-quantity" type="number" min="0.01" step="0.01" value={form.defaultQuantity} onChange={(event) => update("defaultQuantity", Number(event.target.value))} required /></Field>
            <Field label="Nome do item" htmlFor="item-name" className="sm:col-span-2"><Input id="item-name" value={form.name} onChange={(event) => update("name", event.target.value)} required /></Field>
            <Field label="Grupo" htmlFor="item-group"><Input id="item-group" value={form.group} onChange={(event) => update("group", event.target.value)} required /></Field>
            <Field label="Área" htmlFor="item-area"><Input id="item-area" value={form.area} onChange={(event) => update("area", event.target.value)} required /></Field>
            <Field label="Status da especificação" htmlFor="item-definition">
              <select id="item-definition" value={form.definitionStatus} onChange={(event) => update("definitionStatus", event.target.value as Item["definitionStatus"])} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                <option value="LIBERADO_PARA_COTACAO">Liberado para cotação</option>
                <option value="PENDENTE_DEFINICAO">Pendente definição</option>
              </select>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Ao liberar, as necessidades pendentes deste item passam para Não iniciado e ficam disponíveis para cotação.</p>
            </Field>
            <Field label="Situação" htmlFor="item-active">
              <select id="item-active" value={form.active ? "true" : "false"} onChange={(event) => update("active", event.target.value === "true")} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </Field>
            <Field label="Especificação" htmlFor="item-spec" className="sm:col-span-2"><Textarea id="item-spec" value={form.specification} onChange={(event) => update("specification", event.target.value)} /></Field>
            <Field label="Rota 1" htmlFor="item-route-1"><Input id="item-route-1" value={form.route1} onChange={(event) => update("route1", event.target.value)} /></Field>
            <Field label="Rota 2" htmlFor="item-route-2"><Input id="item-route-2" value={form.route2} onChange={(event) => update("route2", event.target.value)} /></Field>
            <Field label="Rota 3" htmlFor="item-route-3"><Input id="item-route-3" value={form.route3} onChange={(event) => update("route3", event.target.value)} /></Field>
            <Field label="Observações" htmlFor="item-notes" className="sm:col-span-2"><Textarea id="item-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
            <Field label="Motivo da alteração (opcional)" htmlFor="item-reason" className="sm:col-span-2"><Textarea id="item-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
            {error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
          </div>
          <SheetFooter className="border-t">
            <Button type="submit" disabled={saving}><Save />{saving ? "Salvando…" : "Salvar alterações"}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>{children}</div>;
}
