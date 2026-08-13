import { copyFile, mkdir } from "node:fs/promises";

const distDirectory = new URL("../apps-script/dist/", import.meta.url);
const deployDirectory = new URL("../apps-script/deploy/", import.meta.url);

await mkdir(distDirectory, { recursive: true });
await mkdir(deployDirectory, { recursive: true });
await copyFile(
  new URL("../apps-script/appsscript.json", import.meta.url),
  new URL("../apps-script/dist/appsscript.json", import.meta.url),
);
await copyFile(
  new URL("../apps-script/dist/Code.js", import.meta.url),
  new URL("../apps-script/deploy/Code.gs", import.meta.url),
);
await copyFile(
  new URL("../apps-script/appsscript.json", import.meta.url),
  new URL("../apps-script/deploy/appsscript.json", import.meta.url),
);
