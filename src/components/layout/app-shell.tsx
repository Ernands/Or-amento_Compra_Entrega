import { Bell, CircleUserRound, Eye } from "lucide-react";
import { Outlet } from "react-router-dom";

import { useAuth } from "@/auth/auth-context";
import { DesktopNavigation, MobileNavigation } from "@/components/layout/navigation";
import { RefreshButton } from "@/components/app/refresh-button";
import { Button } from "@/components/ui/button";

export function AppShell() {
  const { accessMode, user, developmentMode, signOut } = useAuth();
  const visitor = accessMode === "visitor";
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-lg font-black text-slate-950">27</div>
          <div>
            <p className="font-semibold tracking-tight">Implanta 27</p>
            <p className="text-xs text-sidebar-foreground/55">Compra & entrega</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <DesktopNavigation />
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/70 p-3">
            <p className="text-xs font-medium">Base oficial</p>
            <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/55">27 lojas · 2.295 necessidades</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/92 px-4 backdrop-blur md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <MobileNavigation />
            <div className="lg:hidden">
              <p className="text-sm font-semibold">Implanta 27</p>
              <p className="text-xs text-muted-foreground">Operação das lojas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <Button variant="ghost" size="icon" aria-label="Notificações">
              <Bell className="size-4" />
            </Button>
            <div className="hidden items-center gap-2 border-l pl-3 sm:flex">
              <CircleUserRound className="size-7 text-muted-foreground" />
              <div className="text-xs leading-tight">
                <p className="max-w-36 truncate font-medium">{visitor ? "Visitante" : user?.name ?? "Usuário"}</p>
                <button className="text-muted-foreground hover:text-foreground" onClick={signOut} disabled={developmentMode}>
                  {developmentMode ? "Snapshot local" : visitor ? "Entrar com Google" : "Sair"}
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">{visitor ? <div className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Eye className="size-5 shrink-0 text-blue-700" /><div><p className="text-sm font-semibold">Modo visitante — somente leitura</p><p className="text-xs text-blue-900/70">Você pode visualizar os dados operacionais, mas nenhuma alteração é permitida.</p></div></div><Button variant="outline" size="sm" onClick={signOut}>Entre com Google para realizar alterações</Button></div> : null}<Outlet /></main>
      </div>
    </div>
  );
}
