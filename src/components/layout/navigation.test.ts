import { describe, expect, it } from "vitest";

import { shouldShowImplantationNavigation } from "@/components/layout/navigation";

describe("shouldShowImplantationNavigation", () => {
  it("mantem o menu visivel enquanto o acesso autenticado e verificado", () => {
    expect(shouldShowImplantationNavigation("authenticated", true, undefined)).toBe(true);
  });

  it("mantem o menu somente quando a permissao de visualizacao e confirmada", () => {
    expect(shouldShowImplantationNavigation("authenticated", false, true)).toBe(true);
    expect(shouldShowImplantationNavigation("authenticated", false, false)).toBe(false);
    expect(shouldShowImplantationNavigation("visitor", true, true)).toBe(false);
  });
});
