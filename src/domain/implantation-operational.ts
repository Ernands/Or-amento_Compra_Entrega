import type { ImplantationActivityStatus } from "@/domain/implantation";

export interface ImplantationCapabilities {
  view: boolean;
  viewUpdates: boolean;
  viewMaster: boolean;
  setOpeningDate: boolean;
  start: boolean;
  updateActivity: boolean;
  cancelActivity: boolean;
  reopenActivity: boolean;
  evidenceFilesEnabled: false;
}
export interface ImplantationStoreView {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  plannedOpeningDate: string | null;
  actualOpeningDate: string | null;
  version: number;
}

export interface ImplantationCycleView {
  id: string;
  storeId: string;
  modelVersionId: string;
  coordinatorUserId: string;
  baseOpeningDate: string;
  plannedOpeningDate: string;
  actualOpeningDate: string | null;
  status: string;
  startedAt: string;
  startedBy: string;
  notes: string;
  version: number;
}

export interface ImplantationActivityView {
  id: string;
  implantationId: string;
  storeId: string;
  modelActivityId: string;
  modelVersion: number;
  phaseId: string;
  phase: string;
  phaseOrder: number;
  activityOrder: number;
  action: string;
  offsetDays: number;
  defaultResponsibleRole: string;
  mandatory: boolean;
  critical: boolean;
  evidenceRequired: boolean;
  minimumEvidence: number;
  originalTargetDate: string;
  currentTargetDate: string;
  responsibleUserId: string;
  status: ImplantationActivityStatus;
  progress: number;
  actualStartDate: string | null;
  actualCompletionDate: string | null;
  lastObservation: string;
  lastUpdatedAt: string;
  version: number;
  evidenceValidationPending: boolean;
}

export interface ImplantationSummary {
  total: number;
  progress: number;
  statuses: Record<string, number>;
  criticalOpen: number;
  blocked: number;
  completed: number;
}

export interface ImplantationStoreOverview {
  store: ImplantationStoreView;
  implantation: ImplantationCycleView | null;
  summary: ImplantationSummary;
}

export interface ImplantationOverviewPayload {
  checkedAt: string;
  capabilities: ImplantationCapabilities;
  stores: ImplantationStoreOverview[];
  totals: {
    stores: number;
    withOpeningDate: number;
    started: number;
    notStarted: number;
    blocked: number;
    completedActivities: number;
  };
  evidenceValidationPending: true;
}

export interface ImplantationStoreDetailPayload {
  checkedAt: string;
  capabilities: ImplantationCapabilities;
  store: ImplantationStoreView;
  implantation: ImplantationCycleView | null;
  activities: ImplantationActivityView[];
  summary: ImplantationSummary;
  eligibleUsers: Array<{ id: string; name: string; profile: string }>;
  evidenceValidationPending: true;
}

export interface ImplantationActivityDetailPayload extends ImplantationStoreDetailPayload {
  activity: ImplantationActivityView;
  activeBlock: null | { id: string; reason: string; previousStatus: string; progress: number; responsibleRole: string; version: number };
  evidenceRules: Array<{ id: string; type: string; minimum: number; requiredForCompletion: boolean }>;
}

export interface ImplantationPendenciesPayload {
  checkedAt: string;
  today: string;
  capabilities: ImplantationCapabilities;
  items: Array<{ activity: ImplantationActivityView; store: ImplantationStoreView }>;
  evidenceValidationPending: true;
}

export interface ImplantationTimelinePayload {
  items: Array<{
    id: string;
    type: string;
    text: string;
    previousStatus: string;
    nextStatus: string;
    previousProgress: string;
    nextProgress: string;
    previousResponsibleUserId: string;
    nextResponsibleUserId: string;
    occurredAt: string;
    userId: string;
    origin: string;
  }>;
  nextCursor: number | null;
  total: number;
}

export interface ImplantationMasterPayload {
  readOnly: true;
  model: { id: string; version: number; name: string; status: string; description: string; publishedAt: string; checksum: string };
  activities: Array<{
    id: string; code: string; phaseId: string; phase: string; phaseOrder: number; order: number; action: string;
    description: string; offsetDays: number; responsibleRole: string; mandatory: boolean; critical: boolean;
    evidenceRequired: boolean; minimumEvidence: number;
  }>;
  evidenceRules: Array<{ id: string; modelActivityId: string; type: string; minimum: number; requiredForCompletion: boolean }>;
  evidenceValidationPending: true;
}

export interface OpeningDatePreviewPayload {
  storeId: string;
  implantationId: string;
  implantationVersion: number;
  previousDate: string;
  nextDate: string;
  impacts: Array<{ activityId: string; action: string; status: ImplantationActivityStatus; previousTargetDate: string; nextTargetDate: string; version: number }>;
  summary: { changed: number; preserved: number; inProgressOrBlocked: number };
}

export function implantationStatusLabel(status: ImplantationActivityStatus): string {
  return ({
    NAO_INICIADO: "Não iniciado",
    EM_ANDAMENTO: "Em andamento",
    BLOQUEADO: "Bloqueado",
    CONCLUIDO: "Concluído",
    NAO_APLICAVEL: "Não aplicável",
    CANCELADO: "Cancelado",
  } as const)[status];
}

export function createImplantationRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `imp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
