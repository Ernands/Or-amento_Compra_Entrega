import { ArrowRight, Eye, LockKeyhole, Sheet } from "lucide-react";

import { GoogleSignIn } from "@/auth/google-sign-in";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const { enterVisitor, enteringVisitor } = useAuth();
  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 top-10 size-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-blue-600/15 to-transparent" />
        <div className="relative flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-amber-300 font-black text-slate-950">27</div><div><p className="font-semibold">Implanta 27</p><p className="text-xs text-slate-400">Orçamento · compra · entrega</p></div></div>
        <div className="relative max-w-xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">Operação centralizada</p><h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight">Cada item, em cada loja, do planejamento à entrega.</h1><p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-300">Controle seguro sobre a planilha oficial, sem expor credenciais ou exigir que a equipe trabalhe diretamente nas abas.</p></div>
        <div className="relative grid grid-cols-3 gap-3 text-sm">{[["27", "lojas"], ["85", "itens"], ["2.295", "necessidades"]].map(([value, label]) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-slate-400">{label}</p></div>)}</div>
      </section>
      <section className="flex items-center justify-center bg-background p-5 sm:p-10">
        <Card className="w-full max-w-md shadow-xl shadow-slate-950/10">
          <CardHeader className="space-y-3"><div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-primary"><LockKeyhole className="size-6" /></div><CardTitle className="text-2xl">Entrar no sistema</CardTitle><CardDescription className="text-sm leading-relaxed">Use sua conta Google. O acesso só será liberado se o e-mail estiver ativo na aba de usuários.</CardDescription></CardHeader>
          <CardContent className="space-y-6"><GoogleSignIn /><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>ou</span><span className="h-px flex-1 bg-border" /></div><Button type="button" variant="outline" className="h-auto w-full justify-start gap-3 py-3" onClick={() => void enterVisitor()} disabled={enteringVisitor}><Eye className="size-5 text-primary" /><span className="text-left"><span className="block font-medium text-foreground">{enteringVisitor ? "Abrindo modo visitante…" : "Acessar como visitante"}</span><span className="block text-xs font-normal text-muted-foreground">Somente leitura · não exige login Google</span></span></Button><div className="rounded-lg border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground"><p className="flex items-center gap-2 font-medium text-foreground"><Sheet className="size-4 text-primary" />Seus dados permanecem protegidos</p><p className="mt-2">O navegador envia o token por HTTPS ao Apps Script, que valida identidade e permissões antes de acessar a planilha.</p></div><p className="flex items-center gap-1 text-xs text-muted-foreground">Sem acesso? Procure o administrador <ArrowRight className="size-3" /></p></CardContent>
        </Card>
      </section>
    </main>
  );
}
