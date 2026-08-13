import type { NecessityStatus } from "@/domain/entities";

const allowedTransitions: Record<NecessityStatus, readonly NecessityStatus[]> = {
  PENDENTE_DEFINICAO: ["NAO_INICIADO", "CANCELADO"],
  NAO_INICIADO: ["EM_COTACAO", "CANCELADO"],
  EM_COTACAO: ["AGUARDANDO_APROVACAO", "CANCELADO"],
  AGUARDANDO_APROVACAO: ["APROVADO", "EM_COTACAO", "CANCELADO"],
  APROVADO: ["COMPRADO", "EM_COTACAO", "CANCELADO"],
  COMPRADO: ["EM_TRANSPORTE", "CANCELADO"],
  EM_TRANSPORTE: ["ENTREGUE", "DIVERGENCIA"],
  ENTREGUE: ["CONFERIDO", "DIVERGENCIA"],
  CONFERIDO: ["CONCLUIDO", "DIVERGENCIA"],
  CONCLUIDO: [],
  CANCELADO: [],
  DIVERGENCIA: ["EM_TRANSPORTE", "ENTREGUE", "CONFERIDO"],
};

export function canTransition(from: NecessityStatus, to: NecessityStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: NecessityStatus, to: NecessityStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transição inválida: ${from} → ${to}`);
  }
}
