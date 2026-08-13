import type { DashboardMetrics, Item, Necessity, NecessityStatus, Store, StoreProgress } from "@/domain/entities";
import type { OperationsRepository } from "@/data/repositories/operations-repository";

const stageScore: Partial<Record<NecessityStatus, number>> = {
  EM_COTACAO: 1,
  AGUARDANDO_APROVACAO: 2,
  APROVADO: 3,
  COMPRADO: 4,
  EM_TRANSPORTE: 4,
  ENTREGUE: 5,
  CONFERIDO: 6,
  CONCLUIDO: 6,
};

export class OperationsService {
  constructor(private readonly repository: OperationsRepository) {}

  getSourceInfo() { return this.repository.getSourceInfo(); }

  async listAll() {
    const [source, stores, items, necessities] = await Promise.all([
      this.repository.getSourceInfo(),
      this.repository.listStores(),
      this.repository.listItems(),
      this.repository.listNecessities(),
    ]);
    return { source, stores, items, necessities, dashboard: buildDashboard(stores, items, necessities) };
  }
}

export function buildDashboard(stores: Store[], items: Item[], necessities: Necessity[], activeQuoteNecessityIds?: string[]) {
  const activeQuoteNeeds = activeQuoteNecessityIds ? new Set(activeQuoteNecessityIds) : null;
  const metrics: DashboardMetrics = {
    stores: stores.length,
    items: items.length,
    necessities: necessities.length,
    pendingDefinition: countStatus(necessities, "PENDENTE_DEFINICAO"),
    quoted: necessities.filter((necessity) => necessity.status === "EM_COTACAO" && (!activeQuoteNeeds || activeQuoteNeeds.has(necessity.id))).length,
    awaitingApproval: countStatus(necessities, "AGUARDANDO_APROVACAO"),
    approved: countStatus(necessities, "APROVADO"),
    purchased: countStatus(necessities, "COMPRADO"),
    delivered: countStatus(necessities, "ENTREGUE"),
    completed: countStatus(necessities, "CONCLUIDO"),
    divergences: countStatus(necessities, "DIVERGENCIA"),
    duplicateCodeItems: items.filter((item) => item.duplicateOperationalCode).length,
  };
  const areas = items.reduce<Record<string, number>>((result, item) => {
    result[item.area] = (result[item.area] ?? 0) + 1;
    return result;
  }, {});
  return { metrics, stores: buildStoreProgress(stores, necessities, activeQuoteNeeds), areas };
}

function countStatus(necessities: Necessity[], status: NecessityStatus): number {
  return necessities.filter((necessity) => necessity.status === status).length;
}

function buildStoreProgress(stores: Store[], necessities: Necessity[], activeQuoteNeeds: Set<string> | null): StoreProgress[] {
  return stores.map((store) => {
    const storeNeeds = necessities.filter((necessity) => necessity.storeId === store.id);
    const earned = storeNeeds.reduce((total, necessity) => total + (stageScore[necessity.status] ?? 0), 0);
    const possible = storeNeeds.length * 6;
    return {
      store,
      total: storeNeeds.length,
      pendingDefinition: countStatus(storeNeeds, "PENDENTE_DEFINICAO"),
      quoted: storeNeeds.filter((necessity) => necessity.status === "EM_COTACAO" && (!activeQuoteNeeds || activeQuoteNeeds.has(necessity.id))).length,
      approved: countStatus(storeNeeds, "APROVADO"),
      purchased: countStatus(storeNeeds, "COMPRADO"),
      delivered: countStatus(storeNeeds, "ENTREGUE"),
      completed: countStatus(storeNeeds, "CONCLUIDO"),
      progress: possible === 0 ? 0 : Math.round((earned / possible) * 100),
    };
  });
}
