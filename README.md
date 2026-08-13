# Implanta 27

Sistema web para controlar necessidade → cotação → aprovação → compra → transporte → entrega → conferência em 27 lojas, usando Google Sheets como fonte oficial.

## Estado atual

O primeiro fluxo executável está pronto:

- SPA responsiva com dashboard, lojas, detalhe de loja, itens, necessidades, cotações e diagnóstico;
- edição de lojas e itens com validação, controle de versão, permissões e auditoria;
- necessidades com paginação em 100, 250 ou 500 registros e opção para exibir as 2.295 relações de uma vez;
- planilha DEV nativa validada e snapshot verificado para desenvolvimento seguro;
- login Google Identity Services para produção;
- acesso visitante sem Google, com dados operacionais ao vivo e segurança somente leitura aplicada no backend;
- módulo Cotações ao vivo: cadastro mínimo de fornecedores, propostas por necessidade, cálculo de custos, filtros, edição de vínculo, exclusão lógica, comparação e seleção para a futura aprovação;
- Google Apps Script Web App com `bootstrap` em lote, diagnóstico técnico autenticado e escrita versionada de lojas, itens, necessidades, fornecedores e cotações;
- permissões por perfil e escopo de loja no backend;
- auditoria, máquina de estados e `LockService`;
- CI e publicação automática no GitHub Pages.

## Arquitetura de publicação

O GitHub Pages publica somente arquivos estáticos. O Google Apps Script é o backend HTTPS que protege a planilha. Consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Pré-requisitos

- Node.js 24 e npm.
- Repositório no GitHub com Pages habilitado em **Settings → Pages → Source: GitHub Actions**.
- Projeto OAuth Web no Google Cloud.
- Acesso à planilha DEV nativa `Orçamento_Compra_Entrega_LojasBB_DEV`.
- Projeto Apps Script vinculado ou com acesso a essa planilha.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

Sem `.env.local`, a aplicação entra automaticamente em modo snapshot, somente leitura. Para testar o backend real, copie `.env.example` para `.env.local` e preencha os dois valores `VITE_*`.

## Google OAuth

1. No Google Cloud Console, configure a tela de consentimento OAuth.
2. Crie um Client ID do tipo **Web application**.
3. Adicione as origens JavaScript:
   - `http://localhost:3000`
   - `https://SEU_USUARIO.github.io`
   - seu domínio personalizado, se existir.
4. Use o Client ID tanto em `VITE_GOOGLE_CLIENT_ID` quanto na Script Property `GOOGLE_CLIENT_ID`.

O Client ID não é segredo. Nunca coloque Client Secret no frontend; este fluxo não precisa dele.

## Preparar o Google Sheets

1. Use somente a [planilha DEV nativa](https://docs.google.com/spreadsheets/d/1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c/edit) nos testes.
2. Preserve o XLSX de origem sem alterações.
3. Configure `SPREADSHEET_ID=1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c` nas propriedades do Apps Script DEV.
4. Revise o relatório em [docs/PLANILHA.md](docs/PLANILHA.md) e execute `diagnoseSpreadsheet()`; após a publicação, a tela Diagnóstico usa a ação autenticada `technicalStatus`.
5. Prepare as colunas técnicas com backup e cadastre pelo menos um usuário ativo em `09_USUARIOS`.

## Publicar o Apps Script

1. Crie um projeto Apps Script e copie `apps-script/dist/Code.js` e `apps-script/dist/appsscript.json` após executar:

   ```bash
   npm run apps-script:build
   ```

2. Em **Project Settings → Script properties**, configure:
   - `SPREADSHEET_ID`: `1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c` no ambiente DEV;
   - `GOOGLE_CLIENT_ID`: Client ID OAuth Web.
   - `PUBLIC_READ_ACCESS`: `SIM` para habilitar o modo visitante.
3. Execute manualmente `diagnoseSpreadsheet()` no editor e revise o log.
4. Para adicionar campos técnicos, defina temporariamente `ALLOW_SETUP=SIM` e execute `setupTechnicalColumns()`. O script cria backups de cada aba afetada e remove a autorização ao terminar.
5. Faça **Deploy → New deployment → Web app** na primeira publicação, ou **Deploy → Manage deployments → Edit → New version** para atualizar uma implantação existente:
   - Execute as: **Me**;
   - Who has access: opção que permita ao frontend alcançar o endpoint.
6. Copie a URL terminada em `/exec`.

O modo visitante e sua lista explícita de campos públicos estão documentados em [docs/ACESSO_VISITANTE.md](docs/ACESSO_VISITANTE.md).

## Configurar GitHub Actions e Pages

Em **Settings → Secrets and variables → Actions → Variables**, crie:

- `VITE_APPS_SCRIPT_URL`: URL `/exec` do Web App;
- `VITE_GOOGLE_CLIENT_ID`: Client ID OAuth Web.

São variáveis públicas do bundle, não segredos. O ID da planilha continua somente nas propriedades do Apps Script.

Depois, envie o código para `main`. O workflow `Deploy GitHub Pages` executará validação, testes, build e publicação. Pull requests executam a CI sem publicar.

## Comandos

```bash
npm run dev                # servidor local
npm run check              # ESLint + TypeScript
npm test                   # testes de domínio
npm run build              # bundle GitHub Pages
npm run apps-script:build  # compila backend Apps Script
npm run sheets:check       # testa Web App; requer APPS_SCRIPT_URL
```

Para diagnóstico autenticado completo:

```bash
APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec" GOOGLE_ID_TOKEN="token-temporario" npm run sheets:check
```

## GitHub

O repositório oficial é [Ernands/Or-amento_Compra_Entrega](https://github.com/Ernands/Or-amento_Compra_Entrega). Cada push na branch `main` executa a validação e publica o frontend no GitHub Pages.

## Testes prioritários

Há cobertura para o contrato HTTP de Cotações, cálculo de total no domínio e no backend, valores de `14_LISTAS`, IDs, permissões e máquina de estados. A CI também executa ESLint, TypeScript e compila o frontend e o Apps Script.

## Ambientes

- Desenvolvimento: planilha nativa `Orçamento_Compra_Entrega_LojasBB_DEV` e deployment Apps Script de teste.
- Produção: planilha e deployment separados. Troque as variáveis do GitHub somente depois de validar o ambiente de desenvolvimento.
