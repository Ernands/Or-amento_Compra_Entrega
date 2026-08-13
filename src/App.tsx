import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "@/auth/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard-page";
import { DiagnosticPage } from "@/pages/diagnostic-page";
import { ItemsPage } from "@/pages/items-page";
import { LoginPage } from "@/pages/login-page";
import { NecessitiesPage } from "@/pages/necessities-page";
import { QuotesPage } from "@/pages/quotes-page";
import { StoreDetailPage } from "@/pages/store-detail-page";
import { StoresPage } from "@/pages/stores-page";

export function App() {
  const { accessMode } = useAuth();
  if (!accessMode) return <LoginPage />;
  return <Routes><Route element={<AppShell />}><Route index element={<DashboardPage />} /><Route path="lojas" element={<StoresPage />} /><Route path="lojas/:id" element={<StoreDetailPage />} /><Route path="itens" element={<ItemsPage />} /><Route path="necessidades" element={<NecessitiesPage />} /><Route path="cotacoes" element={<QuotesPage />} /><Route path="diagnostico" element={accessMode === "visitor" ? <Navigate to="/" replace /> : <DiagnosticPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>;
}
