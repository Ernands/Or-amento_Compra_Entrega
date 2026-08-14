import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AppsScriptClient } from "./apps-script-client";
import { AppsScriptOperationsRepository } from "./apps-script-operations-repository";
import { QuotesPageCrashFallback } from "@/components/app/quotes-page-error-boundary";
import type { CreateItemInput, CreateQuoteInput, Item, Store, UpdateItemInput, UpdateQuoteInput } from "@/domain/entities";
import { LegacyQuotesReadOnlyNotice, ProposalTable } from "@/pages/quotes-page";

const values = {
  supplierId: "FOR-000001",
  origin: "Matriz",
  unitPrice: 100,
  freight: 20,
  otherCosts: 5,
  paymentMethod: "PIX",
  installments: 3,
  hasDownPayment: true,
  leadTimeDays: 10,
  proposalValidUntil: "2026-08-31",
  link: "https://example.com/proposta",
  status: "EM_ANDAMENTO" as const,
  quoteDate: "2026-08-13",
  notes: "Teste",
};

describe("AppsScriptOperationsRepository — propostas agrupadas", () => {
  it("usa a ação autenticada createItem com o contrato completo", async () => {
    const call = vi.fn().mockResolvedValue({ item: {} });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);
    const input: CreateItemInput = {
      operationalCode: "MOB-999", group: "Mobiliário", area: "Transacional", name: "Item novo",
      specification: "Especificação", defaultQuantity: 1, definitionStatus: "PENDENTE_DEFINICAO", active: true,
      route1: "", route2: "", route3: "", productLink: "https://example.com/produto", notes: "",
    };

    await repository.createItem(input);

    expect(call).toHaveBeenCalledWith("createItem", input);
  });

  it("não envia productLink para um backend anterior", async () => {
    const call = vi.fn().mockImplementation(async (action: string) => action === "bootstrap" ? {} : { item: {} });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);
    const input: UpdateItemInput = {
      id: "ITM-00001", version: 1, reason: "Teste",
      changes: {
        operationalCode: "MOB-001", group: "Mobiliário", area: "Transacional", name: "Item",
        specification: "", defaultQuantity: 1, definitionStatus: "LIBERADO_PARA_COTACAO", active: true,
        route1: "", route2: "", route3: "", productLink: "https://example.com/produto", notes: "",
      },
    };

    await repository.updateItem(input);

    expect(call.mock.calls.map(([action]) => action)).toEqual(["bootstrap", "updateItem"]);
    expect(call.mock.calls[1][1].changes).not.toHaveProperty("productLink");
  });

  it("usa ações novas e nunca envia quantidade calculada pelo cliente", async () => {
    const call = vi.fn().mockImplementation(async (action: string) => action === "quotesWorkspace"
      ? { schemaMode: "GROUPED", paymentTermsSupported: true, quotes: [] }
      : { quote: {} });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);
    const input: CreateQuoteInput = { necessityIds: ["NEC-000001", "NEC-000002"], ...values };

    await repository.getQuotesWorkspace();
    await repository.createQuote(input);

    expect(call).toHaveBeenCalledWith("createQuoteProposal", input);
    expect(call.mock.calls[1][1]).not.toHaveProperty("quantity");
  });

  it("remove parcelas e entrada ao conversar com um backend anterior", async () => {
    const call = vi.fn().mockImplementation(async (action: string) => action === "quotesWorkspace"
      ? { schemaMode: "GROUPED", quotes: [] }
      : { quote: {} });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);

    await repository.getQuotesWorkspace();
    await repository.createQuote({ necessityIds: ["NEC-000001"], ...values });

    const payload = call.mock.calls[1][1];
    expect(payload).not.toHaveProperty("installments");
    expect(payload).not.toHaveProperty("hasDownPayment");
  });

  it("separa edição, reabertura, seleção e exclusão por proposta", async () => {
    const call = vi.fn().mockImplementation(async (action: string) => action === "quotesWorkspace"
      ? { schemaMode: "GROUPED", paymentTermsSupported: true, quotes: [] }
      : { quote: {} });
    const repository = new AppsScriptOperationsRepository({ call } as unknown as AppsScriptClient);
    const update: UpdateQuoteInput = { id: "PRP-000001", version: 2, changes: { necessityIds: ["NEC-000001"], ...values }, reason: "Ajuste" };

    await repository.getQuotesWorkspace();
    await repository.updateQuote(update);
    await repository.reopenQuote({ id: "PRP-000001", version: 3, reason: "Negociação revisada" });
    await repository.selectQuote({ id: "PRP-000001", version: 4, reason: "Melhor proposta" });
    await repository.deleteQuote({ id: "PRP-000002", version: 1, reason: "Descartada" });

    expect(call.mock.calls.map(([action]) => action)).toEqual([
      "quotesWorkspace",
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
