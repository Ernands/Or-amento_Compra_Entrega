const endpoint = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
const credential = process.env.GOOGLE_ID_TOKEN;

if (!endpoint) {
  console.error("✗ APPS_SCRIPT_URL não informado.");
  console.error("  Exemplo: APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec npm run sheets:check");
  process.exitCode = 1;
} else {
  const health = await call("health");
  console.log(`✓ Apps Script conectado (${health.status})`);
  if (!credential) {
    console.warn("⚠ GOOGLE_ID_TOKEN não informado; diagnóstico autenticado de abas não executado.");
  } else {
    const data = await call("bootstrap", credential);
    console.log(`✓ Google Sheets conectado: ${data.source.label}`);
    console.log(`✓ ${data.stores.length} lojas acessíveis`);
    console.log(`✓ ${data.items.length} itens acessíveis`);
    console.log(`✓ ${data.necessities.length} necessidades acessíveis`);
  }
}

async function call(action, token = "") {
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, credential: token, payload: {} }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (!result.ok) throw new Error(`${result.error?.code || "ERROR"}: ${result.error?.message || "Falha desconhecida"}`);
  return result.data;
}
