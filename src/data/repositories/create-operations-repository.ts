import { AppsScriptClient } from "@/data/api/apps-script-client";
import { AppsScriptOperationsRepository } from "@/data/api/apps-script-operations-repository";
import type { OperationsRepository } from "@/data/repositories/operations-repository";
import { OfficialSnapshotRepository } from "@/data/snapshot/official-snapshot-repository";

export function createOperationsRepository(credential: string): OperationsRepository {
  const endpoint = import.meta.env.VITE_APPS_SCRIPT_URL?.trim();
  if (!endpoint || credential === "LOCAL_SNAPSHOT") return new OfficialSnapshotRepository();
  return new AppsScriptOperationsRepository(new AppsScriptClient(endpoint, credential));
}
