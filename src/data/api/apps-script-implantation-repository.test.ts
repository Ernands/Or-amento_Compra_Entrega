import { describe, expect, it, vi } from "vitest";

import type { AppsScriptClient } from "./apps-script-client";
import { ImplantationRepository } from "./apps-script-implantation-repository";

describe("ImplantationRepository", () => {
  it("mantém todas as leituras em ações autenticadas próprias", async () => {
    const call = vi.fn().mockResolvedValue({});
    const repository = new ImplantationRepository("TOKEN", { call } as unknown as AppsScriptClient);

    await repository.capabilities();
    await repository.overview();
    await repository.checklists();
    await repository.pendencies();
    await repository.storeDetail("LOJ-001");
    await repository.activityDetail("CHK-000001");
    await repository.timeline("CHK-000001", 20, 10);
    await repository.master();

    expect(call.mock.calls.map(([action]) => action)).toEqual([
      "implantationCapabilities", "implantationOverview", "implantationChecklists", "implantationPendencies",
      "implantationStoreDetail", "implantationActivityDetail", "implantationTimeline", "implantationMasterChecklist",
    ]);
    expect(call).toHaveBeenCalledWith("implantationStoreDetail", { storeId: "LOJ-001" });
    expect(call).toHaveBeenCalledWith("implantationTimeline", { activityId: "CHK-000001", cursor: 20, pageSize: 10 });
  });

  it("envia version e Request_ID em todas as mutações operacionais", async () => {
    const call = vi.fn().mockResolvedValue({});
    const repository = new ImplantationRepository("TOKEN", { call } as unknown as AppsScriptClient);

    await repository.setOpeningDate({ storeId: "LOJ-001", version: 2, plannedOpeningDate: "2026-09-30", requestId: "REQ-1" });
    await repository.start({ storeId: "LOJ-001", storeVersion: 3, requestId: "REQ-2" });
    await repository.updateActivity({ activityId: "CHK-000001", version: 1, progress: 25, responsibleUserId: "USR-1", observation: "Iniciada", requestId: "REQ-3" });
    await repository.blockActivity({ activityId: "CHK-000001", version: 2, reason: "Aguardando fornecedor", requestId: "REQ-4" });
    await repository.unblockActivity({ activityId: "CHK-000001", version: 3, reason: "Resolvido", requestId: "REQ-5" });

    for (const [, payload] of call.mock.calls) {
      expect(payload).toHaveProperty("requestId");
      expect(payload.version ?? payload.storeVersion).toBeTypeOf("number");
    }
  });

  it("reprograma somente depois da prévia e envia as versões das atividades", async () => {
    const call = vi.fn().mockResolvedValue({});
    const repository = new ImplantationRepository("TOKEN", { call } as unknown as AppsScriptClient);
    await repository.previewDateChange("LOJ-001", "2026-10-15");
    await repository.changeDate({
      storeId: "LOJ-001", storeVersion: 4, implantationVersion: 2, plannedOpeningDate: "2026-10-15",
      reason: "Ajuste contratual", requestId: "REQ-DATE", activityVersions: { "CHK-000001": 3 },
    });

    expect(call).toHaveBeenNthCalledWith(1, "previewOpeningDateChange", { storeId: "LOJ-001", plannedOpeningDate: "2026-10-15" });
    expect(call).toHaveBeenNthCalledWith(2, "changePlannedOpeningDate", expect.objectContaining({
      implantationVersion: 2, activityVersions: { "CHK-000001": 3 }, requestId: "REQ-DATE",
    }));
  });
});
