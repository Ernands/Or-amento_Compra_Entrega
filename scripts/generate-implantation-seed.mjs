import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const sourceUrl = new URL("config/implantation-v1.json", root);
const outputUrl = new URL("apps-script/src/ImplantationSeed.generated.ts", root);
const seed = JSON.parse(await readFile(sourceUrl, "utf8"));
const canonical = JSON.stringify({ model: seed.model, activities: seed.activities, evidenceRules: seed.evidenceRules });
const checksum = createHash("sha256").update(canonical, "utf8").digest("hex");
const content = `/* Arquivo gerado por scripts/generate-implantation-seed.mjs. Não editar manualmente. */
const IMPLANTATION_CHECKLIST_CHECKSUM_V1 = ${JSON.stringify(checksum)};
const IMPLANTATION_MODEL_SEED_V1: ImplantationModelSeedV1 = ${JSON.stringify(seed.model, null, 2)};
const IMPLANTATION_ACTIVITY_SEED_V1: ReadonlyArray<ImplantationSeedActivityV1> = ${JSON.stringify(seed.activities, null, 2)};
const IMPLANTATION_EVIDENCE_SEED_V1: ReadonlyArray<ImplantationEvidenceRuleSeedV1> = ${JSON.stringify(seed.evidenceRules, null, 2)};
`;

await writeFile(outputUrl, content, "utf8");
console.log(`Seed IMPLANTATION_V1 gerado: ${seed.activities.length} atividades, ${seed.evidenceRules.length} regras, SHA-256 ${checksum}`);
