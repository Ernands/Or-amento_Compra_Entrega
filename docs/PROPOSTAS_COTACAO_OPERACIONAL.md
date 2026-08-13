# Propostas de Cotação agrupadas — implantação e operação

Este documento descreve o runtime operacional que passa a usar:

- `16_PROPOSTAS_COTACAO` como cabeçalho comercial e fonte dos valores globais;
- `05_COTACOES` como vínculos entre proposta, necessidade, loja e item;
- um item em uma ou mais lojas nesta primeira fase.

A migração continua estritamente manual. Nenhuma ação HTTP, tela ou rotina de inicialização chama `migrateQuoteProposalsV1()`.

## Compatibilidade segura antes e depois da migração

O backend detecta a estrutura em toda chamada de Cotações:

- `LEGACY`: `05_COTACOES` ainda não possui `ID_Proposta` e `16_PROPOSTAS_COTACAO` não existe;
- `GROUPED`: as duas estruturas existem juntas;
- estrutura parcial: a operação é bloqueada com `MIGRATION_PARTIAL`.

Em `LEGACY`, a listagem e o acesso visitante continuam funcionando, mas todas as permissões de alteração de propostas são retornadas como `false`. As ações agrupadas retornam `QUOTE_MIGRATION_REQUIRED`. As antigas ações `createQuote`, `updateQuote`, `deleteQuote` e `selectQuote` retornam `CLIENT_UPDATE_REQUIRED` e não gravam.

Isso evita novas cotações legadas entre a última pré-validação e a migração.

## Contrato das ações Apps Script

Todas as ações abaixo exigem `credential` Google válida, usuário ativo em `09_USUARIOS`, permissão em `10_PERMISSOES` e respeito integral a `Lojas_Permitidas`.

### `quotesWorkspace` — alterada

Retorna `schemaMode: "LEGACY" | "GROUPED"`. No modo agrupado, cada proposta contém:

```json
{
  "id": "PRP-000001",
  "itemId": "ITM-00001",
  "supplierId": "FOR-000001",
  "necessityIds": ["NEC-000001", "NEC-000086"],
  "storeIds": ["LOJ-001", "LOJ-002"],
  "scopeSignature": "NEC-000001:ITM-00001:1|NEC-000086:ITM-00001:2",
  "quantityTotal": 3,
  "subtotalItems": 300,
  "freight": 20,
  "otherCosts": 5,
  "total": 325,
  "status": "RECEBIDA",
  "selected": false,
  "version": 2,
  "lines": []
}
```

Uma proposta que contenha loja fora de `Lojas_Permitidas` não é retornada parcialmente, pois um cabeçalho financeiro incompleto seria enganoso.

### `createQuoteProposal` — nova

```json
{
  "action": "createQuoteProposal",
  "credential": "<GOOGLE_ID_TOKEN>",
  "payload": {
    "necessityIds": ["NEC-000001", "NEC-000086"],
    "supplierId": "FOR-000001",
    "origin": "Matriz",
    "unitPrice": 100,
    "freight": 20,
    "otherCosts": 5,
    "paymentMethod": "PIX",
    "leadTimeDays": 10,
    "proposalValidUntil": "2026-08-31",
    "link": "https://example.com/proposta",
    "status": "EM_ANDAMENTO",
    "quoteDate": "2026-08-13",
    "notes": "Negociação nacional"
  }
}
```

O cliente não envia quantidade. O backend:

1. valida todas as necessidades e lojas;
2. exige um único `ID_Item`;
3. deriva cada quantidade de `Qtd_Planejada`;
4. soma `Quantidade_Total`;
5. calcula subtotais e total;
6. grava cabeçalho, vínculos, status das necessidades e auditoria sob `LockService`.

### `updateQuoteProposal` — nova

Mesmo corpo comercial de criação, acrescido de `id`, `version`, `changes` e `reason`:

```json
{
  "action": "updateQuoteProposal",
  "credential": "<GOOGLE_ID_TOKEN>",
  "payload": {
    "id": "PRP-000001",
    "version": 2,
    "changes": {
      "necessityIds": ["NEC-000001", "NEC-000086"],
      "supplierId": "FOR-000001",
      "origin": "Matriz",
      "unitPrice": 100,
      "freight": 20,
      "otherCosts": 5,
      "paymentMethod": "PIX",
      "leadTimeDays": 10,
      "proposalValidUntil": "2026-08-31",
      "link": "https://example.com/proposta",
      "status": "RECEBIDA",
      "quoteDate": "2026-08-13",
      "notes": "Condição recebida"
    },
    "reason": "Fornecedor consolidou as lojas"
  }
}
```

Somente propostas `RASCUNHO` ou `EM_ANDAMENTO` podem ser editadas. Adições e remoções de lojas atualizam os vínculos e recalculam os status de `03_NECESSIDADES`.

### `reopenQuoteProposal` — nova

```json
{
  "action": "reopenQuoteProposal",
  "credential": "<GOOGLE_ID_TOKEN>",
  "payload": {
    "id": "PRP-000001",
    "version": 3,
    "reason": "Fornecedor revisará preço e escopo"
  }
}
```

Exige status `RECEBIDA`, motivo explícito e escopo ainda em `EM_COTACAO`. Altera o status para `EM_ANDAMENTO`. Propostas selecionadas ou com necessidades que já avançaram não podem ser reabertas.

### `selectQuoteProposal` — nova

```json
{
  "action": "selectQuoteProposal",
  "credential": "<GOOGLE_ID_TOKEN>",
  "payload": {
    "id": "PRP-000001",
    "version": 4,
    "reason": "Melhor condição para o escopo completo"
  }
}
```

Seleciona o cabeçalho integralmente e move todas as necessidades vinculadas para `AGUARDANDO_APROVACAO`. Antes de escrever, procura qualquer necessidade sobreposta em outra proposta selecionada. Em caso de conflito retorna `SELECTED_SCOPE_CONFLICT` e não altera nenhuma seleção anterior.

### `deleteQuoteProposal` — nova

Exclusão lógica do cabeçalho e de todos os vínculos. Proposta selecionada não pode ser excluída. Necessidades sem qualquer outra proposta ativa retornam para `NAO_INICIADO`; as demais permanecem em `EM_COTACAO`.

## Comparação

`scopeSignature` é calculada no backend a partir de `ID_Necessidade + ID_Item + Quantidade`, ordenados de forma determinística. O frontend cria um bloco comparativo por assinatura e só calcula menor total, menor prazo e melhor nota dentro desse bloco.

Duas propostas com apenas a mesma quantidade de lojas, mas necessidades ou quantidades diferentes, nunca aparecem como alternativas diretamente comparáveis.

## Fluxo do frontend

### Criação

1. Clicar em **Nova proposta**.
2. Selecionar um item.
3. Marcar lojas individualmente ou clicar em **Todas as lojas elegíveis**.
4. Conferir quantidade total derivada.
5. Informar fornecedor, preço unitário e condições globais.
6. Salvar.

### Edição

- `RASCUNHO`/`EM_ANDAMENTO`: botão **Editar**;
- `RECEBIDA`: botão **Reabrir**, motivo obrigatório, depois **Editar**;
- `SELECIONADA`: sem edição, reabertura ou exclusão.

### Comparação e seleção

1. Abrir **Comparar**.
2. Conferir o cabeçalho do bloco, que informa lojas, necessidades e quantidade total.
3. Comparar somente as propostas daquele escopo idêntico.
4. Clicar em **Selecionar escopo integral** e confirmar.

## Momento exato para executar a migração

Siga exatamente esta ordem:

1. Substitua e salve o novo `Code.gs` no Apps Script DEV.
2. Atualize a implantação do Web App para uma nova versão.
3. Publique o novo frontend no GitHub Pages.
4. Abra Cotações e confirme:
   - `Pré-migração — somente leitura` visível;
   - a cotação legada aparece;
   - **Nova proposta**, **Editar**, **Excluir** e **Selecionar** não estão disponíveis;
   - Dashboard, Lojas, Itens, Necessidades e modo visitante continuam funcionando.
5. Execute novamente `prevalidateQuoteProposalsV1()`.
6. Confirme novamente `current_quotes: 1`, `proposals_to_create: 1`, `links_to_create: 1`, todos os arrays vazios e `ready_to_migrate: true`.
7. Somente nesse momento crie `ALLOW_MIGRATE_QUOTE_PROPOSALS_V1=SIM`.
8. Execute manualmente `migrateQuoteProposalsV1()` uma vez.
9. Confira `status: "migrated"`, os dois backups e `report_after.ready_to_migrate: true`.
10. Atualize a página Cotações. O backend passará a retornar `schemaMode: "GROUPED"` e os botões operacionais serão liberados conforme as permissões.

Não é necessário criar outra versão do Apps Script entre os passos 8 e 10: o mesmo backend detecta automaticamente a estrutura pós-migração.

## Teste funcional pós-migração

1. Confira a proposta migrada individual e seus IDs preservados.
2. Crie uma proposta `RASCUNHO` para um item e duas lojas.
3. Valide `Quantidade_Total`, `Subtotal_Itens` e `Valor_Total_Proposta` em `16`.
4. Valide duas linhas e subtotais em `05`.
5. Edite o escopo adicionando e removendo uma loja.
6. Mude a proposta para `RECEBIDA`.
7. Confirme que **Editar** foi substituído por **Reabrir**.
8. Reabra com motivo, edite e volte a `RECEBIDA`.
9. Crie uma segunda proposta com o mesmo escopo e confira o comparativo conjunto.
10. Crie uma terceira com escopo diferente e confirme que aparece em outro bloco.
11. Selecione uma das propostas recebidas e confira todas as necessidades em `AGUARDANDO_APROVACAO`.
12. Tente selecionar outra proposta sobreposta; deve retornar conflito sem desmontar a seleção existente.
13. Confira auditorias separadas de `COTACOES_PROPOSTA`, `COTACOES_VINCULO` e `NECESSIDADES` em `12_HISTORICO`.
