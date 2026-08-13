# Backend DEV — implantação manual no Google Apps Script

Esta pasta é a saída final de implantação. `Code.gs` é JavaScript compilado, sem TypeScript.

Para regenerar e verificar o pacote localmente:

```powershell
npm.cmd run apps-script:build
npm.cmd run apps-script:verify
```

## Arquivos no editor

1. Crie ou substitua um único arquivo de script chamado `Code.gs` pelo conteúdo integral de `Code.gs` desta pasta.
2. Em **Configurações do projeto**, ative **Mostrar o arquivo de manifesto appsscript.json no editor**.
3. Substitua o manifesto pelo conteúdo integral de `appsscript.json` desta pasta.

Não crie arquivos `.html`, não use bibliotecas externas e não adicione serviços avançados do Google.

## Script Properties obrigatórias

Em **Configurações do projeto → Propriedades do script**:

| Propriedade | Valor no ambiente DEV |
| --- | --- |
| `SPREADSHEET_ID` | `1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c` |
| `GOOGLE_CLIENT_ID` | `636511329976-k25aj1bnqrn7ncltfsv526d0q467jdou.apps.googleusercontent.com` |
| `PUBLIC_READ_ACCESS` | `SIM` |

`ALLOW_MIGRATE_QUOTE_PROPOSALS_V1` não é permanente. Crie-a com valor `SIM` somente depois de `prevalidateQuoteProposalsV1()` retornar `ready_to_migrate: true`. A migração apaga a propriedade ao terminar. O roteiro completo está em `docs/MIGRACAO_PROPOSTAS_COTACAO_V1.md`.

`ALLOW_SETUP` não é permanente. Use `ALLOW_SETUP=SIM` somente durante a preparação inicial descrita abaixo; a própria função o apaga ao concluir.

## Serviços e APIs

Nenhum serviço avançado precisa ser adicionado no menu **Serviços**. O backend usa apenas serviços nativos do Apps Script:

- `SpreadsheetApp`
- `PropertiesService`
- `ContentService`
- `UrlFetchApp`
- `CacheService`
- `LockService`
- `Utilities`

O manifesto já declara os escopos `spreadsheets` e `script.external_request`. Para implantação manual, não é necessário habilitar separadamente Google Sheets API, Drive API ou Apps Script API no Google Cloud.

`UrlFetchApp` realiza uma única chamada externa, exclusivamente para validar o Google ID token:

```text
https://oauth2.googleapis.com/tokeninfo?id_token=<TOKEN_URL_ENCODED>
```

Por isso, `urlFetchWhitelist` contém somente o prefixo mínimo `https://oauth2.googleapis.com/tokeninfo`, sem wildcard de domínio.

O projeto OAuth Web usado pelo frontend deve manter a tela de consentimento configurada e as origens JavaScript autorizadas para localhost e GitHub Pages.

## Testes antes de atualizar a implantação

Execute no editor, nesta ordem:

1. `testHealthCheck()` — deve retornar JSON com `ok: true` e `status: "ok"`.
2. `testPostHealthCheck()` — valida o envelope POST público e deve retornar `ok: true`.
3. `diagnoseSpreadsheet()` — somente leitura; o relatório deve retornar `ready: true`. Em `tables`, cada aba deve ter `ok: true` e `missing: []`.
4. Confirme que existe um usuário DEV ativo em `09_USUARIOS` com o mesmo e-mail usado no login Google.
5. Após publicar, teste `publicBootstrap` sem `credential` e confirme que o retorno possui `source.kind: "public"`.

Para esta entrega de Cotações, não execute `setupTechnicalColumns()`: a estrutura DEV já foi preparada e o módulo é compatível com os cabeçalhos existentes.

Depois, atualize a implantação existente em **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**.

## Testes do endpoint publicado

Health GET:

```text
https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec?action=health
```

Health POST pelo projeto local:

```powershell
$env:APPS_SCRIPT_URL='https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec'
npm.cmd run sheets:check
```

O teste autenticado de `bootstrap` também aceita `GOOGLE_ID_TOKEN` temporário. Nunca grave esse token em arquivo ou no GitHub.

## Operações HTTP implementadas

- `GET ?action=health`: health check público.
- `POST {"action":"health"}`: health check público.
- `POST {"action":"publicBootstrap","payload":{}}`: dashboard, lojas, itens e necessidades em DTO público reduzido, sem autenticação Google.
- `POST {"action":"publicQuotesWorkspace","payload":{}}`: cotações operacionais reduzidas, com fornecedor e ID de cotação anonimizados, sem autenticação Google.
- `POST {"action":"bootstrap","credential":"<Google ID token>","payload":{}}`: sessão, lojas, itens, necessidades e IDs das necessidades com cotação ativa, filtrados pelo escopo do usuário.
- `POST {"action":"technicalStatus","credential":"<Google ID token>","payload":{}}`: diagnóstico somente leitura das 12 abas; lê no máximo as 10 primeiras linhas de cada aba para localizar cabeçalhos e verificar colunas técnicas.
- `POST {"action":"updateNecessity","credential":"<Google ID token>","payload":{...}}`: escrita versionada com permissão, validação de status, `LockService` e auditoria em `12_HISTORICO`.
- `POST {"action":"updateStore","credential":"<Google ID token>","payload":{...}}`: edição versionada de lojas com escopo, permissão do módulo e auditoria.
- `POST {"action":"updateItem","credential":"<Google ID token>","payload":{...}}`: edição versionada do catálogo com permissão do módulo e auditoria.
- `POST {"action":"quotesWorkspace","credential":"<Google ID token>","payload":{}}`: fornecedores, cotações e rotas filtrados pelo escopo, opções reais de `14_LISTAS` e permissões do usuário.
- `POST {"action":"createSupplier","credential":"<Google ID token>","payload":{...}}`: cadastro de fornecedor nos campos existentes de `04_FORNECEDORES`.
- `POST {"action":"createQuote","credential":"<Google ID token>","payload":{...}}`: cria uma proposta em `05_COTACOES`, deriva loja/item da necessidade e calcula o total no backend.
- `POST {"action":"updateQuote","credential":"<Google ID token>","payload":{"id":"COT-000001","version":1,"changes":{"necessityId":"NEC-000001",...},"reason":"..."}}`: edição versionada; preserva o ID da cotação e deriva loja, item e quantidade da necessidade escolhida.
- `POST {"action":"deleteQuote","credential":"<Google ID token>","payload":{"id":"COT-000001","version":2,"reason":"..."}}`: exclusão lógica versionada, auditada e protegida por `LockService`.
- `POST {"action":"selectQuote","credential":"<Google ID token>","payload":{"id":"COT-000001","version":2,"reason":"..."}}`: seleciona manualmente uma proposta recebida e desmarca a anterior da mesma necessidade.

Todo acesso à planilha usa `SPREADSHEET_ID` via `PropertiesService`. O ID não é hardcoded em `Code.gs`.

As ações públicas passam exclusivamente por `dispatchPublicReadAction`. Toda ação ausente dessa lista, inclusive qualquer `create*`, `update*`, `delete*` ou `select*`, exige uma credencial Google válida antes mesmo de abrir a planilha.
