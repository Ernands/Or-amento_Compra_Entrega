import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "@/auth/auth-context";
import { QuotesPageErrorBoundary } from "@/components/app/quotes-page-error-boundary";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { ImplantationErrorBoundary } from "@/components/implantation/implantation-error-boundary";
import { AppShell } from "@/components/layout/app-shell";
import { ImplantationAccessProvider, useImplantationAccess } from "@/context/implantation-access-context";
import { DashboardPage } from "@/pages/dashboard-page";
import { DiagnosticPage } from "@/pages/diagnostic-page";
import { ItemsPage } from "@/pages/items-page";
import { ImplantationActivityPage } from "@/pages/implantation-activity-page";
import { ImplantationChecklistsPage } from "@/pages/implantation-checklists-page";
import { ImplantationMasterPage } from "@/pages/implantation-master-page";
import { ImplantationOverviewPage } from "@/pages/implantation-overview-page";
import { ImplantationPendenciesPage } from "@/pages/implantation-pendencies-page";
import { LoginPage } from "@/pages/login-page";
import { NecessitiesPage } from "@/pages/necessities-page";
import { QuotesPage } from "@/pages/quotes-page";
import { StoreDetailPage } from "@/pages/store-detail-page";
import { StoresPage } from "@/pages/stores-page";

export function App() {
  const { accessMode } = useAuth();
  if (!accessMode) return <LoginPage />;
  return <ImplantationAccessProvider><Routes><Route element={<AppShell />}><Route index element={<DashboardPage />} /><Route path="lojas" element={<StoresPage />} /><Route path="lojas/:id" element={<StoreDetailPage />} /><Route path="itens" element={<ItemsPage />} /><Route path="necessidades" element={<NecessitiesPage />} /><Route path="cotacoes" element={<QuotesPageErrorBoundary><QuotesPage /></QuotesPageErrorBoundary>} /><Route path="diagnostico" element={accessMode === "visitor" ? <Navigate to="/" replace /> : <DiagnosticPage />} /><Route path="implantacao" element={<ImplantationRoute><ImplantationOverviewPage /></ImplantationRoute>} /><Route path="implantacao/checklists" element={<ImplantationRoute><ImplantationChecklistsPage /></ImplantationRoute>} /><Route path="implantacao/pendencias" element={<ImplantationRoute><ImplantationPendenciesPage /></ImplantationRoute>} /><Route path="implantacao/checklist-mestre" element={<ImplantationRoute requireMaster><ImplantationMasterPage /></ImplantationRoute>} /><Route path="implantacao/atividades/:id" element={<ImplantationRoute><ImplantationActivityPage /></ImplantationRoute>} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes></ImplantationAccessProvider>;
}

function ImplantationRoute({ children, requireMaster = false }: { children: React.ReactNode; requireMaster?: boolean }) {
  const { accessMode } = useAuth();
  const { capabilities, loading, error, refreshCapabilities } = useImplantationAccess();
  if (accessMode !== "authenticated") return <Navigate to="/" replace />;
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} retry={refreshCapabilities} />;
  if (!capabilities?.view || (requireMaster && !capabilities.viewMaster)) return <Navigate to="/" replace />;
  return <ImplantationErrorBoundary>{children}</ImplantationErrorBoundary>;
}
