import { describe, expect, it } from "vitest";

import type { Item, Necessity, NecessityStatus, Store } from "../domain/entities";
import { buildDashboard } from "./operations-service";

describe("buildDashboard", () => {
  it("conta etapas operacionais exatamente e ignora EM_COTACAO sem proposta ativa", () => {
    const necessities = [
      necessity("NEC-001", "EM_COTACAO"),
      necessity("NEC-002", "EM_COTACAO"),
      necessity("NEC-003", "AGUARDANDO_APROVACAO"),
      necessity("NEC-004", "APROVADO"),
      necessity("NEC-005", "COMPRADO"),
      necessity("NEC-006", "EM_TRANSPORTE"),
      necessity("NEC-007", "ENTREGUE"),
      necessity("NEC-008", "CONCLUIDO"),
    ];

    const dashboard = buildDashboard([store], [item], necessities, ["NEC-001"]);

    expect(dashboard.metrics).toMatchObject({
      quoted: 1,
      awaitingApproval: 1,
      approved: 1,
      purchased: 1,
      delivered: 1,
      completed: 1,
    });
    expect(dashboard.stores[0]).toMatchObject({ quoted: 1, approved: 1, purchased: 1, delivered: 1, completed: 1 });
  });
});

const store: Store = {
  id: "LOJ-001", code: "LOJ-001", name: "Loja 01", city: "", state: "", region: "", manager: "", email: "", phone: "", status: "Ativa", address: "", notes: "", version: 1,
};

const item: Item = {
  id: "ITM-00001", operationalCode: "MOB-001", group: "Mobiliário", area: "Loja", name: "Item", specification: "", defaultQuantity: 1, definitionStatus: "LIBERADO_PARA_COTACAO", duplicateOperationalCode: false, active: true, route1: "", route2: "", route3: "", productLink: "", notes: "", version: 1,
};

function necessity(id: string, status: NecessityStatus): Necessity {
  return { id, storeId: store.id, itemId: item.id, quantity: 1, priority: "MEDIA", status, version: 1 };
}
