"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Boxes,
  Building2,
  ClipboardList,
  Gauge,
  PackageCheck,
  PanelLeft,
  SearchCheck,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/auth-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/lojas", label: "Lojas", icon: Building2 },
  { href: "/itens", label: "Itens", icon: Boxes },
  { href: "/necessidades", label: "Necessidades", icon: ClipboardList },
  { href: "/cotacoes", label: "Cotações", icon: ShoppingCart },
  { href: "/diagnostico", label: "Diagnóstico", icon: SearchCheck },
];

const roadmapItems = [
  { label: "Aprovações", icon: ShieldCheck },
  { label: "Compras", icon: PackageCheck },
  { label: "Entregas", icon: Truck },
];

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { accessMode } = useAuth();
  const { pathname } = useLocation();
  const visibleItems = accessMode === "visitor" ? primaryItems.filter((item) => item.href !== "/diagnostico") : primaryItems;
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {visibleItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-slate-950 shadow-sm"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <p className="mb-1 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
        Próximas etapas
      </p>
      {roadmapItems.map((item) => (
        <span key={item.label} className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/40">
          <item.icon className="size-4" aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </nav>
  );
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
