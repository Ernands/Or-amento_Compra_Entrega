import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Store, UpdateStoreInput } from "@/domain/entities";

interface StoreEditSheetProps {
  store: Store;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateStoreInput) => Promise<void>;
}

export function StoreEditSheet({ store, open, onOpenChange, onSave }: StoreEditSheetProps) {
  const [form, setForm] = useState(() => ({
    name: store.name,
    city: store.city,
    state: store.state === "—" ? "" : store.state,
    capitalUf: store.region === "A cadastrar" ? "" : store.region,
    address: store.address,
    manager: store.manager === "A cadastrar" ? "" : store.manager,
    email: store.email,
    phone: store.phone,
    status: store.status,
    notes: store.notes,
  }));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ id: store.id, version: store.version, changes: form, reason });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a loja.");
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar {store.name}</SheetTitle>
          <SheetDescription>{store.id} é imutável. A alteração será versionada e registrada no histórico.</SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid gap-4 px-4 pb-6 sm:grid-cols-2">
            <Field label="Nome da loja" htmlFor="store-name" className="sm:col-span-2"><Input id="store-name" value={form.name} onChange={(event) => update("name", event.target.value)} required /></Field>
            <Field label="Cidade" htmlFor="store-city"><Input id="store-city" value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
            <Field label="UF" htmlFor="store-state"><Input id="store-state" value={form.state} onChange={(event) => update("state", event.target.value.toLocaleUpperCase())} maxLength={2} /></Field>
            <Field label="Capital/UF de referência" htmlFor="store-capital"><Input id="store-capital" value={form.capitalUf} onChange={(event) => update("capitalUf", event.target.value)} /></Field>
            <Field label="Status" htmlFor="store-status"><Input id="store-status" value={form.status} onChange={(event) => update("status", event.target.value)} required /></Field>
            <Field label="Responsável" htmlFor="store-manager" className="sm:col-span-2"><Input id="store-manager" value={form.manager} onChange={(event) => update("manager", event.target.value)} /></Field>
            <Field label="E-mail" htmlFor="store-email"><Input id="store-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
            <Field label="Telefone" htmlFor="store-phone"><Input id="store-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
            <Field label="Endereço" htmlFor="store-address" className="sm:col-span-2"><Textarea id="store-address" value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
            <Field label="Observações" htmlFor="store-notes" className="sm:col-span-2"><Textarea id="store-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
            <Field label="Motivo da alteração (opcional)" htmlFor="store-reason" className="sm:col-span-2"><Textarea id="store-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
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
