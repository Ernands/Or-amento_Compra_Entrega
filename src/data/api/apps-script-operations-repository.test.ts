import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AppsScriptClient } from "./apps-script-client";
import { AppsScriptOperationsRepository } from "./apps-script-operations-repository";
import { QuotesPageCrashFallback } from "@/components/app/quotes-page-error-boundary";
import type { CreateQuoteInput, Item, Store, UpdateQuoteInput } from "@/domain/entities";
import { LegacyQuotesReadOnlyNotice, ProposalTable } from "@/pages/quotes-page";

const values = {
  supplierId: "FOR-000001",
  origin: "Matriz",
  unitPrice: 100,
  freight: 20,
  otherCosts: 5,
  paymentMethod: "PIX",
  leadTimeDays: 10,
  proposalValidUntil: "2026-08-31",
  link: "https://example.com/proposta",
  status: "EM_ANDAMENTO" as const,
  quoteDate: "2026-08-13",
  notes: "Teste",
};

describe("AppsScriptOperationsRepository — propostas agrupadas", () => {
  it("usa ações novas e nunca envia quantidade calculada pelo cliente", async () => {
    const call = vi.fn().mockResolvedValue({ quote: {} });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);
    const input: CreateQuoteInput = { necessityIds: ["NEC-000001", "NEC-000002"], ...values };

    await repository.createQuote(input);

    expect(call).toHaveBeenCalledWith("createQuoteProposal", input);
    expect(call.mock.calls[0][1]).not.toHaveProperty("quantity");
  });

  it("separa edição, reabertura, seleção e exclusão por proposta", async () => {
    const call = vi.fn().mockResolvedValue({ quote: {} });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);
    const update: UpdateQuoteInput = { id: "PRP-000001", version: 2, changes: { necessityIds: ["NEC-000001"], ...values }, reason: "Ajuste" };

    await repository.updateQuote(update);
    await repository.reopenQuote({ id: "PRP-000001", version: 3, reason: "Negociação revisada" });
    await repository.selectQuote({ id: "PRP-000001", version: 4, reason: "Melhor proposta" });
    await repository.deleteQuote({ id: "PRP-000002", version: 1, reason: "Descartada" });

    expect(call.mock.calls.map(([action]) => action)).toEqual([
      "updateQuoteProposal",
      "reopenQuoteProposal",
      "selectQuoteProposal",
      "deleteQuoteProposal",
    ]);
  });

  it("renderiza autenticado + schema LEGACY + COT-000001 sem ações nem exceção", async () => {
    const call = vi.fn().mockResolvedValue({
      suppliers: [{ id: "FOR-000001", name: "Fornecedor real" }],
      quotes: [{
        id: "COT-000001",
        necessityId: "NEC-000001",
        storeId: "LOJ-001",
        itemId: "ITM-00001",
        supplierId: "FOR-000001",
        unitPrice: 575,
        quantity: 1,
        freight: 2,
        otherCosts: 2,
        total: 579,
        leadTimeDays: 10,
        status: "RECEBIDA",
        selected: false,
        version: 1,
        active: true,
      }],
      routes: [],
      options: { statuses: ["RECEBIDA"], origins: [], paymentMethods: [] },
      permissions: { view: true, create: true, edit: true, delete: true, select: true, createSupplier: true },
      schemaMode: "LEGACY",
      checkedAt: "2026-08-14T12:00:00.000Z",
    });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);

    const workspace = await repository.getQuotesWorkspace();
    const quote = workspace.quotes[0];
    const markup = renderToStaticMarkup(createElement("div", null,
      createElement(LegacyQuotesReadOnlyNotice),
      createElement(ProposalTable, {
        publicView: false,
        readOnly: workspace.schemaMode === "LEGACY",
        quotes: workspace.quotes,
        supplierMap: new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier])),
        storeMap: new Map<string, Store>(),
        itemMap: new Map<string, Item>(),
        canEdit: workspace.permissions.edit,
        canDelete: workspace.permissions.delete,
        canSelect: workspace.permissions.select,
        selectingId: "",
        deletingId: "",
        reopeningId: "",
        onEdit: vi.fn(),
        onReopen: vi.fn(),
        onDelete: vi.fn(),
        onSelect: vi.fn(),
      }),
    ));

    expect(quote.lines).toHaveLength(1);
    expect(quote.storeIds).toEqual(["LOJ-001"]);
    expect(quote.necessityIds).toEqual(["NEC-000001"]);
    expect(workspace.permissions).toEqual({ view: true, create: false, edit: false, delete: false, select: false, createSupplier: false });
    expect(markup).toContain("Pré-migração — somente leitura");
    expect(markup).toContain("COT-000001");
    expect(markup).not.toMatch(/Nova proposta|Editar|Reabrir|Excluir|Selecionar/);
  });

  it("mantém um fallback local para falhas inesperadas da página Cotações", () => {
    const markup = renderToStaticMarkup(createElement(QuotesPageCrashFallback, { retry: vi.fn() }));
    expect(markup).toContain("As demais áreas do sistema continuam disponíveis");
    expect(markup).toContain("Tentar novamente");
  });
});
