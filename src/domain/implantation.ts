import rawSeed from "../../config/implantation-v1.json";

export const IMPLANTATION_TIMEZONE = "America/Fortaleza" as const;
export const IMPLANTATION_MODEL_VERSION = 1 as const;
export const IMPLANTATION_ALLOWED_PROGRESS = [0, 25, 50, 75, 100] as const;
export const IMPLANTATION_UPCOMING_DAYS = 30 as const;
export const IMPLANTATION_CRITICAL_UPCOMING_DAYS = 7 as const;

export type ImplantationActivityStatus =
  | "NAO_INICIADO"
  | "EM_ANDAMENTO"
  | "BLOQUEADO"
  | "CONCLUIDO"
  | "NAO_APLICAVEL"
  | "CANCELADO";
export type ImplantationCycleStatus = "ATIVO" | "ENCERRADO" | "CANCELADO";
export type ImplantationModelStatus = "RASCUNHO" | "PUBLICADO" | "INATIVO";
export type ImplantationResponsibleRole = "Equipe interna" | "Equipe de campo" | "RH" | "Contratado";
export type ImplantationEvidenceType = "FOTO" | "DOCUMENTO" | "EVIDENCIA";
export type ImplantationProfile = "ADMINISTRADOR" | "GESTOR" | "COMPRAS" | "RESPONSAVEL_LOJA" | "CONSULTA";

export interface TechnicalFields {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  active: boolean;
}

export interface ImplantationChecklistModel extends TechnicalFields {
  id: string;
  versionNumber: number;
  name: string;
  status: ImplantationModelStatus;
  description: string;
  publishedAt: string | null;
  publishedBy: string;
  definitionChecksum: string;
  notes: string;
}

export interface ImplantationChecklistModelActivity extends TechnicalFields {
  id: string;
  modelVersionId: string;
  code: string;
  phaseId: string;
  phase: string;
  phaseOrder: number;
  activityOrder: number;
  action: string;
  description: string;
  offsetDays: number;
  defaultResponsibleRole: ImplantationResponsibleRole;
  mandatory: boolean;
  critical: boolean;
  evidenceRequired: boolean;
  minimumEvidence: number;
  notes: string;
}

export interface ImplantationChecklistModelEvidence extends TechnicalFields {
  id: string;
  modelActivityId: string;
  type: ImplantationEvidenceType;
  minimum: number;
  requiredForCompletion: boolean;
  notes: string;
}

export interface StoreImplantation extends TechnicalFields {
  id: string;
  storeId: string;
  modelVersionId: string;
  coordinatorUserId: string;
  openingBaseDate: string;
  currentPlannedOpeningDate: string;
  actualOpeningDate: string | null;
  status: ImplantationCycleStatus;
  startedAt: string;
  startedBy: string;
  closedAt: string | null;
  closedBy: string;
  notes: string;
}

export interface StoreImplantationActivity extends TechnicalFields {
  id: string;
  implantationId: string;
  storeId: string;
  modelActivityId: string;
  modelVersion: number;
  phaseId: string;
  phaseSnapshot: string;
  phaseOrder: number;
  activityOrder: number;
  actionSnapshot: string;
  offsetDaysSnapshot: number;
  defaultResponsibleRoleSnapshot: ImplantationResponsibleRole;
  mandatorySnapshot: boolean;
  criticalSnapshot: boolean;
  evidenceRequiredSnapshot: boolean;
  minimumEvidenceSnapshot: number;
  originalTargetDate: string;
  currentTargetDate: string;
  responsibleUserId: string;
  status: ImplantationActivityStatus;
  progress: number;
  actualStartDate: string | null;
  actualCompletionDate: string | null;
  lastObservation: string;
  lastUpdatedAt: string;
}

export interface ImplantationActivityUpdate extends TechnicalFields {
  id: string;
  storeActivityId: string;
  implantationId: string;
  storeId: string;
  updateType: string;
  text: string;
  previousStatus: ImplantationActivityStatus | "";
  nextStatus: ImplantationActivityStatus | "";
  previousProgress: number | null;
  nextProgress: number | null;
  previousResponsibleUserId: string;
  nextResponsibleUserId: string;
  occurredAt: string;
  userId: string;
  origin: string;
  requestId: string;
}

export interface ImplantationActivityBlock extends TechnicalFields {
  id: string;
  storeActivityId: string;
  implantationId: string;
  storeId: string;
  reason: string;
  previousStatus: ImplantationActivityStatus;
  progressAtBlock: number;
  unblockResponsibleRole: ImplantationResponsibleRole | "";
  unblockResponsibleUserId: string;
  blockedAt: string;
  blockedBy: string;
  unblockedAt: string | null;
  unblockedBy: string;
  unblockObservation: string;
}

export interface ImplantationFileMetadata extends TechnicalFields {
  id: string;
  module: string;
  recordId: string;
  implantationId: string;
  storeId: string;
  updateId: string;
  fileType: string;
  evidenceCategory: ImplantationEvidenceType | "";
  evidence: boolean;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  driveFileId: string;
  driveFolderId: string;
  sha256: string;
  description: string;
  visibility: "INTERNO";
  requestId: string;
  removedAt: string | null;
  removedBy: string;
  removalReason: string;
}

export interface ImplantationSeedActivity {
  id: string;
  code: string;
  phaseId: string;
  phase: string;
  phaseOrder: number;
  order: number;
  action: string;
  offsetDays: number;
  defaultRole: ImplantationResponsibleRole;
  mandatory: boolean;
  critical: boolean;
}

export interface ImplantationEvidenceRuleSeed {
  id: string;
  activityId: string;
  activityCode: string;
  type: ImplantationEvidenceType;
  minimum: number;
}

export interface ImplantationSeedV1 {
  model: {
    id: string;
    version: number;
    name: string;
    status: ImplantationModelStatus;
    description: string;
  };
  activities: ImplantationSeedActivity[];
  evidenceRules: ImplantationEvidenceRuleSeed[];
}

export const implantationSeedV1 = rawSeed as ImplantationSeedV1;

export const IMPLANTATION_CRITICAL_ACTIVITY_CODES = [
  "ATV-007", "ATV-014", "ATV-015", "ATV-016", "ATV-017", "ATV-018", "ATV-020", "ATV-022",
  "ATV-023", "ATV-024", "ATV-025", "ATV-026", "ATV-028", "ATV-029", "ATV-030",
] as const;

export const IMPLANTATION_LISTS_V1 = [
  { name: "Status Atividade Implantação", values: ["Não iniciado", "Em andamento", "Bloqueado", "Concluído", "Não aplicável", "Cancelado"] },
  { name: "Status Ciclo Implantação", values: ["Ativo", "Encerrado", "Cancelado"] },
  { name: "Status Modelo Checklist", values: ["Rascunho", "Publicado", "Inativo"] },
  { name: "Papel Responsável Implantação", values: ["Equipe interna", "Equipe de campo", "RH", "Contratado"] },
  { name: "Tipo Atualização Implantação", values: ["Comentário", "Mudança de status", "Mudança de progresso", "Mudança de responsável", "Reprogramação", "Bloqueio", "Desbloqueio", "Evidência adicionada", "Arquivo removido", "Conclusão", "Reabertura", "Cancelamento"] },
  { name: "Tipo Evidência Implantação", values: ["FOTO", "DOCUMENTO", "EVIDENCIA"] },
  { name: "Visibilidade Arquivo", values: ["INTERNO"] },
] as const;

export interface ImplantationPermissionRow {
  profile: "Administrador" | "Gestor/Aprovador" | "Compras" | "Responsável Loja" | "Consulta";
  module: "Implantação" | "Implantação Atualizações" | "Implantação Arquivos" | "Checklist Mestre";
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  remove: boolean;
  export: boolean;
  reopen: boolean;
  notes: string;
}

const permission = (
  profile: ImplantationPermissionRow["profile"], module: ImplantationPermissionRow["module"],
  values: Omit<ImplantationPermissionRow, "profile" | "module" | "notes">, notes: string,
): ImplantationPermissionRow => ({ profile, module, ...values, notes });

const full = { view: true, create: true, edit: true, approve: true, remove: true, export: true, reopen: true };
const read = { view: true, create: false, edit: false, approve: false, remove: false, export: true, reopen: false };
const none = { view: false, create: false, edit: false, approve: false, remove: false, export: false, reopen: false };

export const IMPLANTATION_PERMISSION_ROWS_V1: readonly ImplantationPermissionRow[] = [
  permission("Administrador", "Implantação", full, "Acesso administrativo; cancelamentos continuam lógicos e auditados."),
  permission("Administrador", "Implantação Atualizações", full, "Acesso administrativo às atualizações operacionais."),
  permission("Administrador", "Implantação Arquivos", full, "Metadados preparados; arquivos dependem da futura autorização do Drive."),
  permission("Administrador", "Checklist Mestre", full, "Administra e publica versões do Checklist Mestre."),
  permission("Gestor/Aprovador", "Implantação", full, "Acesso de gestor sujeito a Lojas_Permitidas."),
  permission("Gestor/Aprovador", "Implantação Atualizações", full, "Atualizações sujeitas a Lojas_Permitidas."),
  permission("Gestor/Aprovador", "Implantação Arquivos", { ...full, remove: false }, "Arquivos sujeitos a Lojas_Permitidas; remoção lógica restrita."),
  permission("Gestor/Aprovador", "Checklist Mestre", { ...full, remove: false }, "Gestor autorizado pode editar e publicar; não há exclusão física."),
  permission("Compras", "Implantação", read, "Consulta autenticada para integração futura com Suprimentos."),
  permission("Compras", "Implantação Atualizações", read, "Consulta autenticada."),
  permission("Compras", "Implantação Arquivos", none, "Sem acesso inicial a arquivos internos."),
  permission("Compras", "Checklist Mestre", none, "Sem acesso ao cadastro administrativo."),
  permission("Responsável Loja", "Implantação", { ...read, export: false }, "Visualiza somente Lojas_Permitidas."),
  permission("Responsável Loja", "Implantação Atualizações", { ...none, view: true, create: true }, "Cria atualizações somente em Lojas_Permitidas e quando responsável/autorizado."),
  permission("Responsável Loja", "Implantação Arquivos", { ...none, view: true, create: true }, "Futuro upload somente em Lojas_Permitidas; Drive ainda desativado."),
  permission("Responsável Loja", "Checklist Mestre", none, "Sem acesso ao cadastro administrativo."),
  permission("Consulta", "Implantação", read, "Somente leitura autenticada e limitada por Lojas_Permitidas."),
  permission("Consulta", "Implantação Atualizações", read, "Somente leitura autenticada e limitada por Lojas_Permitidas."),
  permission("Consulta", "Implantação Arquivos", none, "Sem acesso a arquivos internos."),
  permission("Consulta", "Checklist Mestre", none, "Sem acesso ao cadastro administrativo."),
];

export const IMPLANTATION_FILE_ARCHITECTURE_V1 = {
  enabled: false,
  provider: "DriveApp",
  rootFolderProperty: "DRIVE_ROOT_FOLDER_ID",
  visibility: "INTERNO",
  visitorAccess: false,
  oneFilePerRequest: true,
  compressedImageMaxBytes: 4 * 1024 * 1024,
  documentMaxBytes: 8 * 1024 * 1024,
  recommendedImageMaxDimension: 1600,
  driveScope: "https://www.googleapis.com/auth/drive",
} as const;

const allowedTransitions: Record<ImplantationActivityStatus, readonly ImplantationActivityStatus[]> = {
  NAO_INICIADO: ["EM_ANDAMENTO", "BLOQUEADO", "NAO_APLICAVEL", "CANCELADO"],
  EM_ANDAMENTO: ["BLOQUEADO", "CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"],
  BLOQUEADO: ["NAO_INICIADO", "EM_ANDAMENTO", "NAO_APLICAVEL", "CANCELADO"],
  CONCLUIDO: ["EM_ANDAMENTO"],
  NAO_APLICAVEL: ["NAO_INICIADO"],
  CANCELADO: ["NAO_INICIADO"],
};

export function validateImplantationTransition(input: {
  from: ImplantationActivityStatus;
  to: ImplantationActivityStatus;
  currentProgress: number;
  requestedProgress?: number;
  reason?: string;
  canCancel?: boolean;
  canReopen?: boolean;
}): number {
  if (input.from !== input.to && !allowedTransitions[input.from].includes(input.to)) {
    throw new Error(`Transição inválida: ${input.from} → ${input.to}`);
  }
  const reasonRequired = ["BLOQUEADO", "NAO_APLICAVEL", "CANCELADO"].includes(input.to);
  if (reasonRequired && !input.reason?.trim()) throw new Error(`Motivo obrigatório para ${input.to}.`);
  if (input.to === "CANCELADO" && !input.canCancel) throw new Error("Permissão de cancelamento obrigatória.");
  const reopening = ["CONCLUIDO", "NAO_APLICAVEL", "CANCELADO"].includes(input.from) && input.from !== input.to;
  if (reopening && !input.canReopen) throw new Error("Permissão de reabertura obrigatória.");
  if (input.to === "NAO_INICIADO") return 0;
  if (input.to === "CONCLUIDO") return 100;
  if (input.to === "BLOQUEADO" || input.to === "NAO_APLICAVEL" || input.to === "CANCELADO") return input.currentProgress;
  const progress = input.requestedProgress ?? input.currentProgress;
  if (![25, 50, 75].includes(progress)) throw new Error("EM_ANDAMENTO aceita somente 25%, 50% ou 75%.");
  return progress;
}

export function calculateStoreImplantationProgress(
  activities: ReadonlyArray<{ status: ImplantationActivityStatus; progress: number; active: boolean }>,
): number {
  const applicable = activities.filter((activity) => activity.active && !["NAO_APLICAVEL", "CANCELADO"].includes(activity.status));
  if (!applicable.length) return 0;
  return Math.round((applicable.reduce((sum, activity) => sum + activity.progress, 0) / applicable.length) * 100) / 100;
}

export function calculateImplantationTargetDate(openingDate: string, offsetDays: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(openingDate)) throw new Error("Data de inauguração deve usar YYYY-MM-DD.");
  if (!Number.isInteger(offsetDays)) throw new Error("Offset_Dias deve ser inteiro.");
  const date = new Date(`${openingDate}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== openingDate) throw new Error("Data de inauguração inválida.");
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function daysUntilImplantationOpening(today: string, openingDate: string): number {
  const start = new Date(`${today}T12:00:00.000Z`);
  const end = new Date(`${openingDate}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Data inválida.");
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function isUpcomingImplantation(today: string, openingDate: string): boolean {
  const days = daysUntilImplantationOpening(today, openingDate);
  return days >= 0 && days <= IMPLANTATION_UPCOMING_DAYS;
}

export function isCriticalUpcomingImplantation(today: string, openingDate: string): boolean {
  const days = daysUntilImplantationOpening(today, openingDate);
  return days >= 0 && days <= IMPLANTATION_CRITICAL_UPCOMING_DAYS;
}

export function missingImplantationEvidence(
  activityId: string,
  evidence: ReadonlyArray<{ type: ImplantationEvidenceType; active: boolean }>,
  rules: readonly ImplantationEvidenceRuleSeed[] = implantationSeedV1.evidenceRules,
): Array<{ type: ImplantationEvidenceType; required: number; found: number }> {
  return rules.filter((rule) => rule.activityId === activityId).flatMap((rule) => {
    const found = evidence.filter((file) => file.active && file.type === rule.type).length;
    return found < rule.minimum ? [{ type: rule.type, required: rule.minimum, found }] : [];
  });
}

export function isStoreReadyForOpening(
  activities: ReadonlyArray<{ mandatory: boolean; status: ImplantationActivityStatus; active: boolean }>,
): boolean {
  if (!activities.length) return false;
  return activities.filter((activity) => activity.active && activity.mandatory && !["NAO_APLICAVEL", "CANCELADO"].includes(activity.status))
    .every((activity) => activity.status === "CONCLUIDO");
}

export function canAccessImplantation(input: {
  authenticated: boolean;
  profile: ImplantationProfile;
  module: ImplantationPermissionRow["module"];
  action: "view" | "create" | "edit" | "approve" | "remove" | "export" | "reopen";
  allowedStoreIds: readonly string[] | "TODAS";
  storeId?: string;
}): boolean {
  if (!input.authenticated) return false;
  const profileLabels: Record<ImplantationProfile, ImplantationPermissionRow["profile"]> = {
    ADMINISTRADOR: "Administrador", GESTOR: "Gestor/Aprovador", COMPRAS: "Compras",
    RESPONSAVEL_LOJA: "Responsável Loja", CONSULTA: "Consulta",
  };
  const row = IMPLANTATION_PERMISSION_ROWS_V1.find((candidate) => candidate.profile === profileLabels[input.profile] && candidate.module === input.module);
  if (!row || !row[input.action]) return false;
  return !input.storeId || input.allowedStoreIds === "TODAS" || input.allowedStoreIds.includes(input.storeId);
}

export function planUniqueAdditions<T>(existing: readonly T[], planned: readonly T[], key: (value: T) => string): T[] {
  const seen = new Set(existing.map(key));
  const additions: T[] = [];
  planned.forEach((value) => {
    const id = key(value);
    if (!seen.has(id)) {
      seen.add(id);
      additions.push(value);
    }
  });
  return additions;
}

export function runAtomicPreparation(steps: ReadonlyArray<{ apply: () => void; rollback: () => void }>): void {
  const completed: Array<{ rollback: () => void }> = [];
  try {
    steps.forEach((step) => {
      step.apply();
      completed.push(step);
    });
  } catch (error) {
    completed.reverse().forEach((step) => step.rollback());
    throw error;
  }
}
