import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const [compiled, deployCode, sourceManifest, deployManifest] = await Promise.all([
  readFile(new URL("apps-script/dist/Code.js", root), "utf8"),
  readFile(new URL("apps-script/deploy/Code.gs", root), "utf8"),
  readFile(new URL("apps-script/appsscript.json", root), "utf8"),
  readFile(new URL("apps-script/deploy/appsscript.json", root), "utf8"),
]);

assert.equal(deployCode, compiled, "Code.gs diverge do JavaScript compilado.");
assert.equal(deployManifest, sourceManifest, "O manifesto de implantação está desatualizado.");
const manifest = JSON.parse(deployManifest);
assert.deepEqual(
  manifest.urlFetchWhitelist,
  ["https://oauth2.googleapis.com/tokeninfo"],
  "urlFetchWhitelist deve permitir somente o endpoint tokeninfo.",
);
assert.match(deployCode, /function doGet\(event\)/, "doGet(event) ausente.");
assert.match(deployCode, /function doPost\(event\)/, "doPost(event) ausente.");
assert.match(deployCode, /function updateStore\(/, "updateStore ausente.");
assert.match(deployCode, /function updateItem\(/, "updateItem ausente.");
assert.match(deployCode, /function assertModulePermission\(/, "Validação central de permissões ausente.");
assert.match(deployCode, /getProperty\("SPREADSHEET_ID"\)/, "SPREADSHEET_ID não usa PropertiesService.");
assert.match(deployCode, /getProperty\("GOOGLE_CLIENT_ID"\)/, "GOOGLE_CLIENT_ID não usa PropertiesService.");
assert.doesNotMatch(
  deployCode,
  /1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c/,
  "O ID DEV não pode estar hardcoded em Code.gs.",
);
assert.equal(
  (deployCode.match(/UrlFetchApp\.fetch\(/g) || []).length,
  1,
  "Code.gs deve possuir exatamente uma chamada externa por UrlFetchApp.",
);
assert.match(
  deployCode,
  /UrlFetchApp\.fetch\(`https:\/\/oauth2\.googleapis\.com\/tokeninfo\?id_token=/,
  "A única chamada UrlFetchApp deve usar o endpoint tokeninfo permitido.",
);

const sandbox = {
  console,
  ContentService: {
    MimeType: { JSON: "application/json" },
    createTextOutput(content) {
      return {
        content,
        getContent() { return this.content; },
        setMimeType() { return this; },
      };
    },
  },
  Utilities: { getUuid: () => "local-request-id" },
};

vm.createContext(sandbox);
vm.runInContext(deployCode, sandbox, { filename: "Code.gs" });

const getHealth = JSON.parse(sandbox.doGet({ parameter: { action: "health" } }).getContent());
assert.equal(getHealth.ok, true);
assert.equal(getHealth.data.status, "ok");

const postHealth = JSON.parse(sandbox.doPost({
  postData: { contents: JSON.stringify({ action: "health", payload: {} }) },
}).getContent());
assert.equal(postHealth.ok, true);
assert.equal(postHealth.data.status, "ok");
assert.equal(postHealth.requestId, "local-request-id");

console.log("✓ Code.gs corresponde ao JavaScript compilado");
console.log("✓ Manifesto de implantação sincronizado");
console.log("✓ urlFetchWhitelist limitada a https://oauth2.googleapis.com/tokeninfo");
console.log("✓ SPREADSHEET_ID e GOOGLE_CLIENT_ID usam PropertiesService");
console.log("✓ ID da planilha DEV não está hardcoded em Code.gs");
console.log("✓ doGet health e doPost health responderam corretamente");
console.log("✓ updateStore e updateItem compilados com permissão centralizada");
