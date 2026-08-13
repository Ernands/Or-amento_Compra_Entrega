import { describe, expect, it, vi } from "vitest";

import type { AppsScriptClient } from "./apps-script-client";
import { AppsScriptOperationsRepository } from "./apps-script-operations-repository";
import type { CreateQuoteInput, UpdateQuoteInput } from "@/domain/entities";

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
});
