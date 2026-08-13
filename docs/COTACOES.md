# Módulo Cotações

## Estrutura DEV analisada

O módulo usa a estrutura já existente, sem adicionar ou renomear colunas:

- `03_NECESSIDADES`: fornece `ID_Necessidade`, loja, item, quantidade, status e versionamento;
- `04_FORNECEDORES`: cadastro mestre do fornecedor, contato, avaliação e situação;
- `05_COTACOES`: uma linha por proposta, com fornecedor, necessidade, preços, custos, prazo, validade, status, seleção e auditoria técnica;
- `14_LISTAS`: fonte das opções de status, origem da cotação e forma de pagamento;
- `15_ROTAS_COMPRA`: rotas informativas relacionadas ao item;
- `09_USUARIOS`, `10_PERMISSOES` e `Lojas_Permitidas`: identidade, operações autorizadas e escopo de registros;
- `12_HISTORICO`: auditoria das criações, edições, seleções e mudança de status da necessidade.

`setupTechnicalColumns()` não faz parte do fluxo e não deve ser executada nesta entrega.

## Contrato autenticado

Todo POST usa o envelope:

```json
{
  "action": "nomeDaAcao",
  "credential": "<GOOGLE_ID_TOKEN>",
  "payload": {}
}
```

### `quotesWorkspace`

Payload vazio. Retorna `suppliers`, `quotes`, `routes`, `options`, `permissions` e `checkedAt`. Cotações e rotas respeitam `Lojas_Permitidas`; as opções vêm de `14_LISTAS`.

### `createSupplier`

```json
{
  "name": "Fornecedor",
  "taxId": "",
  "city": "",
  "state": "",
  "contact": "",
  "phone": "",
  "email": "",
  "rating": null,
  "active": true,
  "notes": "",
  "website": ""
}
```

### `createQuote`

```json
{
  "necessityId": "NEC-000001",
  "supplierId": "FOR-000001",
  "origin": "<valor de 14_LISTAS>",
  "unitPrice": 100,
  "quantity": 2,
  "freight": 10,
  "otherCosts": 5,
  "paymentMethod": "<valor de 14_LISTAS>",
  "leadTimeDays": 7,
  "proposalValidUntil": "2026-08-31",
  "link": "https://example.com/proposta",
  "status": "RECEBIDA",
  "quoteDate": "2026-08-13",
  "notes": ""
}
```

O campo `quantity` é enviado apenas como conferência de integridade. O servidor deriva o valor efetivo de `Qtd_Planejada` em `03_NECESSIDADES` e rejeita qualquer divergência; o formulário o exibe como somente leitura. Quantidades parciais não são suportadas nesta fase.

O servidor calcula `Valor_Total = Qtd_Planejada × Preço_Unitário + Frete + Outros_Custos`. Loja e item também são derivados da necessidade e nunca aceitos do navegador. Uma necessidade em `PENDENTE_DEFINICAO` não pode ser cotada. A primeira cotação de uma necessidade em `NAO_INICIADO` move a necessidade para `EM_COTACAO`.

### `updateQuote`

Recebe `id`, `version`, `changes` com todos os campos editáveis de `createQuote` exceto `necessityId`, e `reason` opcional. O backend rejeita conflito de versão e proposta já selecionada.

### `selectQuote`

Recebe `id`, `version` e `reason` opcional. Somente uma proposta `RECEBIDA`, dentro da validade e pertencente a um grupo com quantidades iguais pode ser selecionada. Dentro do mesmo `ScriptLock`, a ação grava `Status=Selecionada` e `Selecionada=Sim` no alvo e restaura `Status=Recebida` e `Selecionada=Não` em qualquer seleção anterior da necessidade. A ação prepara a informação para o futuro módulo Aprovações, mas não cria aprovação nem avança a necessidade automaticamente.

## Garantias de gravação

As ações validam permissão e escopo no backend, usam `LockService`, conferem `version`, preservam IDs internos, preenchem os campos técnicos e registram `12_HISTORICO`. Operações multiaba possuem compensação local se a auditoria falhar. Quando informado, `CNPJ_CPF` é normalizado para apenas dígitos durante a verificação de duplicidade, independentemente da máscara armazenada.

Novas linhas são gravadas na primeira posição em que a coluna do ID interno esteja vazia. Fórmulas pré-preenchidas em outras colunas não alteram essa escolha. O leitor preserva o número físico de cada linha, e qualquer ID interno duplicado bloqueia edições ambíguas até a duplicidade ser corrigida.
