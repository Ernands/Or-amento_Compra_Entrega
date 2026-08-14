"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  PanelLeft,
  SearchCheck,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/auth-context";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const dashboardItem = { href: "/", label: "Dashboard", icon: Gauge };
const supplyItems = [
  { href: "/itens", label: "Itens", icon: Boxes },
  { href: "/necessidades", label: "Necessidades", icon: ClipboardList },
  { href: "/cotacoes", label: "Cotações", icon: ShoppingCart },
];

const implantationItems = [
  { href: "/implantacao", label: "Visão geral", icon: Gauge },
  { href: "/lojas", label: "Lojas", icon: Building2 },
  { href: "/implantacao/checklists", label: "Checklists", icon: ClipboardCheck },
  { href: "/implantacao/pendencias", label: "Pendências", icon: CircleAlert },
];

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { accessMode } = useAuth();
  const { capabilities } = useImplantationAccess();
  const { pathname } = useLocation();
  const showImplantation = accessMode === "authenticated" && capabilities?.view;
  const [supplyOpen, setSupplyOpen] = useState(() => supplyItems.some((item) => pathname.startsWith(item.href)));
  const [implantationOpen, setImplantationOpen] = useState(() => pathname.startsWith("/implantacao") || pathname.startsWith("/lojas"));
  const [administrationOpen, setAdministrationOpen] = useState(() => pathname.startsWith("/diagnostico"));
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      <NavigationItem item={dashboardItem} pathname={pathname} onNavigate={onNavigate} />
      {!showImplantation ? <NavigationItem item={{ href: "/lojas", label: "Lojas", icon: Building2 }} pathname={pathname} onNavigate={onNavigate} /> : null}
      {showImplantation ? <NavigationGroup label="Implantação" open={implantationOpen} onToggle={() => setImplantationOpen((current) => !current)}>
        {implantationItems.map((item) => <NavigationItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} nested exact={item.href === "/implantacao"} />)}
        {capabilities?.viewMaster ? <NavigationItem item={{ href: "/implantacao/checklist-mestre", label: "Checklist Mestre", icon: ClipboardList }} pathname={pathname} onNavigate={onNavigate} nested /> : null}
      </NavigationGroup> : null}
      <NavigationGroup label="Suprimentos" open={supplyOpen} onToggle={() => setSupplyOpen((current) => !current)}>
        {supplyItems.map((item) => <NavigationItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} nested />)}
      </NavigationGroup>
      {accessMode !== "visitor" ? <NavigationGroup label="Administração" open={administrationOpen} onToggle={() => setAdministrationOpen((current) => !current)}><NavigationItem item={{ href: "/diagnostico", label: "Diagnóstico", icon: SearchCheck }} pathname={pathname} onNavigate={onNavigate} nested /></NavigationGroup> : null}
    </nav>
  );
}

interface NavigationItemValue { href: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }> }

function NavigationItem({ item, pathname, onNavigate, nested = false, exact = false }: { item: NavigationItemValue; pathname: string; onNavigate?: () => void; nested?: boolean; exact?: boolean }) {
  const active = item.href === "/" || exact ? pathname === item.href : pathname.startsWith(item.href);
  return <Link to={item.href} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", nested && "ml-2", active ? "bg-sidebar-primary text-slate-950 shadow-sm" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}><item.icon className="size-4" aria-hidden="true" />{item.label}</Link>;
}

function NavigationGroup({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <div className="mt-2"><button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55 hover:bg-sidebar-accent">{open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}{label}</button>{open ? <div className="mt-1 flex flex-col gap-1">{children}</div> : null}</div>;
}

export function DesktopNavigation() {
  return <NavigationLinks />;
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
          <PanelLeft className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-sidebar-border p-5 text-left">
          <SheetTitle className="text-sidebar-foreground">Implanta 27</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <NavigationLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
