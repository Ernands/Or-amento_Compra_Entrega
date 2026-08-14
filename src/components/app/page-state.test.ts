import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoadingPanel } from "@/components/app/page-state";

describe("LoadingPanel", () => {
  it("exibe um estado de carregamento visivel e acessivel", () => {
    const markup = renderToStaticMarkup(createElement(LoadingPanel));

    expect(markup).toContain("Carregando dados do sistema");
    expect(markup).toContain("role=\"status\"");
    expect(markup).toContain("aria-live=\"polite\"");
    expect(markup).toContain("animate-spin");
  });
});
