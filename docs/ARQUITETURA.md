# Arquitetura

```text
GitHub Repository
      ↓
GitHub Actions (lint, TypeScript, testes e build)
      ↓
GitHub Pages (SPA React/TypeScript)
      ↓ HTTPS + Google ID token
Google Apps Script Web App
      ↓ autenticação + permissão + workflow + lock + auditoria
Google Sheets nativo
```

## Fronteiras

- `src/domain`: regras puras, IDs, cálculos, permissões e máquina de estados.
- `src/data`: contratos de repository, cliente Apps Script e snapshot de desenvolvimento.
- `src/services`: agregações e métricas sem dependência de UI.
- `src/pages` e `src/components`: interface React.
- `apps-script/src`: backend Google, único componente autorizado a gravar na planilha.

## Segurança

- O Client ID OAuth e a URL do Web App são identificadores públicos, incorporados à SPA.
- O ID da planilha fica em Script Properties, não no frontend.
- No ambiente atual, `SPREADSHEET_ID` aponta exclusivamente para a planilha DEV nativa (`1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c`).
- O token Google é mantido somente em memória e enviado por HTTPS.
- O Apps Script valida assinatura/claims através do endpoint oficial `tokeninfo`, incluindo `aud`, `iss`, `exp` e `email_verified`.
- O e-mail precisa estar ativo em `09_USUARIOS`; o escopo de lojas é aplicado no backend.
- Toda escrita confere permissão, status e `version`, usa `LockService` e registra `12_HISTORICO`.
- O Web App deve executar como o proprietário e aceitar requisições externas; acesso à planilha continua condicionado ao token validado pela aplicação.

## Concorrência e atomicidade possível

O Apps Script não oferece transação multiaba. A implementação reduz o risco com `ScriptLock`, controle de versão, gravação em lote e compensação da linha principal se a auditoria falhar. A UI só recebe sucesso após `SpreadsheetApp.flush()`.

## Migração futura

O frontend depende de `OperationsRepository`, não do Google Sheets. Um backend posterior com PostgreSQL pode preservar o contrato do Apps Script e as regras do domínio.
