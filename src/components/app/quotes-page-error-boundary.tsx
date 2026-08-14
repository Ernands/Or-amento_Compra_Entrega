import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorPanel } from "@/components/app/page-state";

interface QuotesPageErrorBoundaryProps {
  children: ReactNode;
}

interface QuotesPageErrorBoundaryState {
  failed: boolean;
}

export class QuotesPageErrorBoundary extends Component<QuotesPageErrorBoundaryProps, QuotesPageErrorBoundaryState> {
  state: QuotesPageErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): QuotesPageErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha isolada na página Cotações.", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <QuotesPageCrashFallback retry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

export function QuotesPageCrashFallback({ retry }: { retry: () => void }) {
  return <ErrorPanel message="A página Cotações encontrou um formato de dados inesperado. As demais áreas do sistema continuam disponíveis." retry={retry} />;
}
