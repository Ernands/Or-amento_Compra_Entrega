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
3. `diagnoseSpreadsheet()` — somente leitura; todas as abas devem retornar `ok: true`. A lista `missing` informa as colunas técnicas ainda ausentes.
4. Se houver colunas técnicas ausentes, defina temporariamente `ALLOW_SETUP=SIM` e execute `setupTechnicalColumns()`. A função cria abas de backup antes de alterar cabeçalhos e apaga `ALLOW_SETUP` ao terminar.
5. Execute `diagnoseSpreadsheet()` novamente; todas as listas `missing` devem ficar vazias.
6. Confirme que existe um usuário DEV ativo em `09_USUARIOS` com o mesmo e-mail usado no login Google.

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
- `POST {"action":"bootstrap","credential":"<Google ID token>","payload":{}}`: sessão, lojas, itens e necessidades filtradas pelo escopo do usuário.
- `POST {"action":"updateNecessity","credential":"<Google ID token>","payload":{...}}`: escrita versionada com permissão, validação de status, `LockService` e auditoria em `12_HISTORICO`.

Todo acesso à planilha usa `SPREADSHEET_ID` via `PropertiesService`. O ID não é hardcoded em `Code.gs`.
