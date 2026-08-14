import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SourceStatusCompact } from "@/components/app/source-banner";
import type { DataSourceInfo } from "@/domain/entities";

const connectedSource: DataSourceInfo = {
  kind: "apps-script",
  status: "connected",
  readOnly: false,
  checkedAt: "2026-08-14T12:00:00.000Z",
  message: "Dados ao vivo pelo Google Apps Script Web App, com autenticação e permissões validadas no backend.",
};

describe("status global da aplicação", () => {
  it("mostra a sincronização autenticada de forma compacta", () => {
    const markup = renderToStaticMarkup(createElement(SourceStatusCompact, { source: connectedSource, visitor: false, loading: false }));
    expect(markup).toContain("Sincronização ao vivo ativa");
    expect(markup).toContain("Conexão conferida em 14/08/2026");
  });

  it("identifica claramente o modo visitante somente leitura", () => {
    const markup = renderToStaticMarkup(createElement(SourceStatusCompact, { source: { ...connectedSource, kind: "public", readOnly: true }, visitor: true, loading: false }));
    expect(markup).toContain("Modo visitante — somente leitura");
    expect(markup).toContain("nenhuma alteração é permitida");
  });
});
