import { AppsScriptClient } from "@/data/api/apps-script-client";
import type {
  ImplantationActivityDetailPayload,
  ImplantationCapabilities,
  ImplantationMasterPayload,
  ImplantationOverviewPayload,
  ImplantationPendenciesPayload,
  ImplantationStoreDetailPayload,
  ImplantationTimelinePayload,
  OpeningDatePreviewPayload,
} from "@/domain/implantation-operational";

export class ImplantationRepository {
  private readonly client: AppsScriptClient;

  constructor(credential: string, client?: AppsScriptClient) {
    const endpoint = import.meta.env.VITE_APPS_SCRIPT_URL?.trim();
    if (!client && !endpoint) throw new Error("A URL do Apps Script não está configurada.");
    this.client = client ?? new AppsScriptClient(endpoint!, credential);
  }

  capabilities() { return this.client.call<ImplantationCapabilities>("implantationCapabilities"); }
  overview() { return this.client.call<ImplantationOverviewPayload>("implantationOverview"); }
  checklists() { return this.client.call<ImplantationOverviewPayload>("implantationChecklists"); }
  pendencies() { return this.client.call<ImplantationPendenciesPayload>("implantationPendencies"); }
  storeDetail(storeId: string) { return this.client.call<ImplantationStoreDetailPayload>("implantationStoreDetail", { storeId }); }
  activityDetail(activityId: string) { return this.client.call<ImplantationActivityDetailPayload>("implantationActivityDetail", { activityId }); }
  timeline(activityId: string, cursor = 0, pageSize = 20) {
    return this.client.call<ImplantationTimelinePayload>("implantationTimeline", { activityId, cursor, pageSize });
  }
  master() { return this.client.call<ImplantationMasterPayload>("implantationMasterChecklist"); }
  setOpeningDate(payload: { storeId: string; version: number; plannedOpeningDate: string; requestId: string }) {
    return this.client.call<{ requestId: string }>("setPlannedOpeningDate", payload);
  }
  start(payload: { storeId: string; storeVersion: number; requestId: string }) {
    return this.client.call<{ implantationId: string; activitiesCreated: number; requestId: string }>("startImplantation", payload);
  }
  updateActivity(payload: { activityId: string; version: number; progress: number; responsibleUserId: string; observation: string; requestId: string }) {
    return this.client.call("updateImplantationActivity", payload);
  }
  blockActivity(payload: { activityId: string; version: number; reason: string; responsibleRole?: string; responsibleUserId?: string; requestId: string }) {
    return this.client.call("blockImplantationActivity", payload);
  }
  unblockActivity(payload: { activityId: string; version: number; reason: string; requestId: string }) {
    return this.client.call("unblockImplantationActivity", payload);
  }
  markNotApplicable(payload: { activityId: string; version: number; reason: string; requestId: string }) {
    return this.client.call("markImplantationActivityNotApplicable", payload);
  }
  cancelActivity(payload: { activityId: string; version: number; reason: string; requestId: string }) {
    return this.client.call("cancelImplantationActivity", payload);
  }
  completeActivity(payload: { activityId: string; version: number; observation: string; requestId: string }) {
    return this.client.call("completeImplantationActivity", payload);
  }
  reopenActivity(payload: { activityId: string; version: number; reason: string; requestId: string }) {
    return this.client.call("reopenImplantationActivity", payload);
  }
  previewDateChange(storeId: string, plannedOpeningDate: string) {
    return this.client.call<OpeningDatePreviewPayload>("previewOpeningDateChange", { storeId, plannedOpeningDate });
  }
  changeDate(payload: {
    storeId: string; storeVersion: number; implantationVersion: number; plannedOpeningDate: string;
    reason: string; requestId: string; activityVersions: Record<string, number>;
  }) {
    return this.client.call("changePlannedOpeningDate", payload);
  }
}
