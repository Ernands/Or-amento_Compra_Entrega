import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { CreateSupplierInput, Supplier } from "@/domain/entities";

interface SupplierCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateSupplierInput) => Promise<Supplier>;
}

const initialForm: CreateSupplierInput = {
  name: "", taxId: "", city: "", state: "", contact: "", phone: "", email: "", rating: null, active: true, notes: "", website: "",
};

export function SupplierCreateSheet({ open, onOpenChange, onSave }: SupplierCreateSheetProps) {
  const [form, setForm] = useState<CreateSupplierInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      setForm(initialForm);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar o fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof CreateSupplierInput>(field: K, value: CreateSupplierInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Cadastrar fornecedor</SheetTitle>
          <SheetDescription>O ID interno será criado pelo backend e permanecerá imutável.</SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid gap-4 px-4 pb-6 sm:grid-cols-2">
            <Field label="Fornecedor" htmlFor="supplier-name" className="sm:col-span-2"><Input id="supplier-name" value={form.name} onChange={(event) => update("name", event.target.value)} required /></Field>
            <Field label="CNPJ/CPF" htmlFor="supplier-tax-id"><Input id="supplier-tax-id" value={form.taxId} onChange={(event) => update("taxId", event.target.value)} /></Field>
            <Field label="Nota (0 a 5)" htmlFor="supplier-rating"><Input id="supplier-rating" type="number" min="0" max="5" step="0.1" value={form.rating ?? ""} onChange={(event) => update("rating", event.target.value === "" ? null : Number(event.target.value))} /></Field>
            <Field label="Cidade" htmlFor="supplier-city"><Input id="supplier-city" value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
            <Field label="UF" htmlFor="supplier-state"><Input id="supplier-state" value={form.state} maxLength={2} onChange={(event) => update("state", event.target.value.toLocaleUpperCase("pt-BR"))} /></Field>
            <Field label="Contato" htmlFor="supplier-contact"><Input id="supplier-contact" value={form.contact} onChange={(event) => update("contact", event.target.value)} /></Field>
            <Field label="Telefone" htmlFor="supplier-phone"><Input id="supplier-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
            <Field label="E-mail" htmlFor="supplier-email"><Input id="supplier-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
            <Field label="Situação" htmlFor="supplier-active">
              <select id="supplier-active" value={form.active ? "true" : "false"} onChange={(event) => update("active", event.target.value === "true")} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="true">Ativo</option><option value="false">Inativo</option></select>
            </Field>
            <Field label="Site" htmlFor="supplier-website" className="sm:col-span-2"><Input id="supplier-website" type="url" value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://" /></Field>
            <Field label="Observações" htmlFor="supplier-notes" className="sm:col-span-2"><Textarea id="supplier-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
            {error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
          </div>
          <SheetFooter className="border-t"><Button type="submit" disabled={saving}><Save />{saving ? "Salvando…" : "Cadastrar fornecedor"}</Button><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button></SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium">{label}</label>{children}</div>;
}
