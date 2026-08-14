import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export class ImplantationErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha isolada no módulo Implantação", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Card className="shadow-none">
        <CardContent className="space-y-4 p-6">
          <div>
            <h1 className="text-xl font-semibold">Não foi possível abrir esta tela de Implantação</h1>
            <p className="mt-1 text-sm text-muted-foreground">A falha ficou isolada neste módulo; as demais áreas do sistema continuam disponíveis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => this.setState({ failed: false })}>Tentar novamente</Button>
            <Button asChild variant="outline"><Link to="/">Voltar ao dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}
