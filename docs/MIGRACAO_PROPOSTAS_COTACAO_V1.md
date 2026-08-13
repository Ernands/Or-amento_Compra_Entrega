# Migração V1 — propostas de cotação agrupadas

Este roteiro prepara a migração controlada de `05_COTACOES` para o modelo em que uma proposta comercial pode possuir vários vínculos de necessidades. A função não é chamada pelo frontend, não executa `setupTechnicalColumns()` e nunca deve ser adicionada ao dispatch HTTP.

> **Importante:** não execute a migração enquanto o backend e o frontend operacionais ainda estiverem usando o contrato legado de `05_COTACOES`. O código desta entrega deixa a pré-validação e a migração prontas para revisão e execução manual posterior, mas a execução deve aguardar a implantação do runtime de propostas agrupadas.

## Estrutura de destino

### `16_PROPOSTAS_COTACAO` — fonte de verdade comercial e financeira

| Coluna | Finalidade |
| --- | --- |
| `ID_Proposta` | ID interno e imutável da negociação (`PRP-000001`). |
| `ID_Fornecedor` | Fornecedor da proposta. |
| `Origem_Cotação` | Origem comercial cadastrada em `14_LISTAS`. |
| `Quantidade_Total` | Soma das quantidades dos vínculos. |
| `Subtotal_Itens` | Soma de `Subtotal_Linha` dos vínculos. |
| `Frete_Total` | Frete global da proposta; não é duplicado em `05_COTACOES`. |
| `Outros_Custos_Total` | Outros custos globais; não são duplicados em `05_COTACOES`. |
| `Valor_Total_Proposta` | `Subtotal_Itens + Frete_Total + Outros_Custos_Total`. |
| `Forma_Pagamento` | Condição comercial da proposta. |
| `Prazo_Dias` | Prazo comercial informado. |
| `Validade_Proposta` | Validade da proposta. |
| `Link` | Link do documento/proposta. |
| `Nota_Fornecedor` | Nota do fornecedor preservada do registro legado. |
| `Status` | Estado comercial da proposta. |
| `Selecionada` | `Sim/Não`, consistente com `Status=Selecionada`. |
| `Data_Cotação` | Data da cotação. |
| `Responsável` | Responsável registrado na cotação legada. |
| `Observações` | Observações comerciais. |
| `created_at`, `created_by`, `updated_at`, `updated_by`, `version`, `ativo` | Metadados técnicos preservados. |

### `05_COTACOES` — vínculos entre proposta e necessidades

| Coluna | Finalidade |
| --- | --- |
| `ID_Cotação` | ID interno legado, preservado e imutável. |
| `ID_Proposta` | FK para `16_PROPOSTAS_COTACAO`. |
| `ID_Necessidade` | Necessidade abrangida. |
| `ID_Loja` | Loja derivada da necessidade. |
| `ID_Item` | Item derivado da necessidade. |
| `Preço_Unitário` | Preço do item dentro da proposta. |
| `Quantidade` | Quantidade efetivamente abrangida pelo vínculo. |
| `Subtotal_Linha` | `Preço_Unitário × Quantidade`; único valor financeiro por vínculo. |
| `created_at`, `created_by`, `updated_at`, `updated_by`, `version`, `ativo` | Metadados técnicos preservados. |

Frete, outros custos e total global pertencem exclusivamente a `16_PROPOSTAS_COTACAO`. A distribuição logística por loja fica fora desta migração e será tratada nos módulos Compras/Entregas.

## O que a pré-validação confere

Execute `prevalidateQuoteProposalsV1()` sem criar propriedade de autorização. Ela é somente leitura e retorna:

- `current_quotes`;
- `proposals_to_create`;
- `links_to_create`;
- `duplicate_ids`;
- `orphan_records`;
- `invalid_values_totals`;
- `missing_necessities`;
- `missing_suppliers`;
- `incompatible_statuses`;
- `structural_issues`;
- `ready_to_migrate`.

A validação bloqueia, entre outros casos, IDs duplicados, vínculo sem necessidade/fornecedor, divergência de loja ou item em relação à necessidade, números negativos ou inválidos, quantidade não positiva, total diferente de `preço × quantidade + frete + outros custos` e inconsistência entre `Status` e `Selecionada`. Ela também confere, sem carregar o histórico inteiro, os cabeçalhos necessários de `12_HISTORICO` e as pequenas faixas de listas usadas em `14_LISTAS`, evitando descobrir uma dependência estrutural somente depois do backup.

## Roteiro exato de execução manual

### 1. Preparar o código, sem migrar

1. Copie integralmente `apps-script/deploy/Code.gs` para `Code.gs` no projeto Apps Script DEV.
2. Salve o projeto.
3. Não execute `setupTechnicalColumns()`.
4. Não crie ainda `ALLOW_MIGRATE_QUOTE_PROPOSALS_V1`.

### 2. Executar a pré-validação somente leitura

1. No seletor de funções do editor, escolha `prevalidateQuoteProposalsV1`.
2. Clique em **Executar**.
3. Abra **Registro de execução** e expanda o JSON retornado.
4. Só prossiga se:
   - `ready_to_migrate` for `true`;
   - `already_migrated` for `false` na primeira execução;
   - todos os arrays de inconsistências estiverem vazios;
   - `current_quotes`, `proposals_to_create` e `links_to_create` coincidirem entre si para a migração individual inicial.

Se qualquer inconsistência existir, corrija os dados de origem e execute novamente a pré-validação. Não crie a propriedade temporária enquanto o relatório não estiver limpo.

### 3. Criar a autorização temporária

Em **Configurações do projeto → Propriedades do script → Adicionar propriedade**, crie exatamente:

```text
ALLOW_MIGRATE_QUOTE_PROPOSALS_V1=SIM
```

Não use `ALLOW_SETUP`. A migração possui autorização própria e consome/apaga a propriedade ao terminar, inclusive em caso de erro.

### 4. Executar a migração

1. No seletor de funções, escolha `migrateQuoteProposalsV1`.
2. Clique em **Executar** uma única vez.
3. A função obtém `LockService`, repete toda a pré-validação dentro do lock e aborta antes da primeira escrita se `ready_to_migrate=false`.
4. Quando válida, a ordem de gravação é:
   1. backup integral de `05_COTACOES`;
   2. backup integral de `12_HISTORICO`;
   3. criação de `16_PROPOSTAS_COTACAO`;
   4. conversão de `05_COTACOES` para vínculos;
   5. auditoria separada de propostas e vínculos;
   6. pós-validação completa.
5. Copie o JSON final do **Registro de execução** para a evidência da mudança.

O resultado esperado contém:

```json
{
  "status": "migrated",
  "backup_quotes": "BKP_MIG_V1_..._05_COTACOES",
  "backup_history": "BKP_MIG_V1_..._12_HISTORICO",
  "proposals_created": 1,
  "links_created": 1,
  "report_before": { "ready_to_migrate": true },
  "report_after": { "already_migrated": true, "ready_to_migrate": true }
}
```

Os números são ilustrativos: confira-os contra a quantidade real apresentada na pré-validação.

### 5. Conferir as abas

#### `16_PROPOSTAS_COTACAO`

1. Confirme os 24 cabeçalhos de `A4:X4` na ordem documentada acima.
2. Confirme uma linha por cotação legada a partir da linha 5.
3. Confirme que `ID_Proposta` foi preenchido e é único.
4. Confirme `Subtotal_Itens + Frete_Total + Outros_Custos_Total = Valor_Total_Proposta`.
5. Confirme `Status`/`Selecionada` e os metadados técnicos.

#### `05_COTACOES`

1. Confirme os 14 cabeçalhos de `A4:N4`.
2. Confirme que todos os `ID_Cotação` originais foram preservados.
3. Confirme que nenhum `ID_Proposta` ficou vazio.
4. Confirme que `ID_Necessidade`, `ID_Loja` e `ID_Item` foram preservados.
5. Confirme `Preço_Unitário × Quantidade = Subtotal_Linha`.
6. Confirme que as colunas globais `Frete`, `Outros_Custos` e `Valor_Total` não permanecem como fontes duplicadas nessa aba.

#### `12_HISTORICO`

1. Filtre `Origem` por `MIGRACAO_MANUAL`.
2. Filtre `Referência` por `QUOTE_PROPOSALS_V1`.
3. Confirme registros separados para os módulos `COTACOES_PROPOSTA` e `COTACOES_VINCULO`.
4. Confirme a ação `MIGRACAO` e os IDs correspondentes.

### 6. Conferência final e idempotência

1. Execute novamente `prevalidateQuoteProposalsV1()`.
2. O resultado deve apresentar:
   - `already_migrated: true`;
   - `ready_to_migrate: true`;
   - `proposals_to_create: 0`;
   - `links_to_create: 0`;
   - arrays de inconsistências vazios.
3. Confirme que `ALLOW_MIGRATE_QUOTE_PROPOSALS_V1` não existe mais nas propriedades do script.

Se `migrateQuoteProposalsV1()` for chamada novamente com nova autorização e a estrutura já estiver íntegra, ela retorna `status: "already_migrated"` sem recriar propostas ou vínculos.

## Falhas e recuperação

Se a pós-validação falhar, a função remove a nova aba `16_PROPOSTAS_COTACAO`, restaura `05_COTACOES` e `12_HISTORICO` a partir dos backups e propaga o erro. Os backups ficam preservados para conferência manual. Não exclua os backups até validar o fluxo operacional completo.
