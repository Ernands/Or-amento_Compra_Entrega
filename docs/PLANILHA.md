# Validação das planilhas

Inspeção executada em 12/08/2026, exclusivamente em modo leitura.

## Ambiente DEV nativo

- Nome: `Orçamento_Compra_Entrega_LojasBB_DEV`
- ID: `1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c`
- Formato: Google Sheets nativo (`application/vnd.google-apps.spreadsheet`)
- Criada em: `2026-08-12T19:43:16.629Z`
- Última modificação observada: `2026-08-12T19:43:19.445Z`
- Abas encontradas: 17, incluindo a aba legada `Orçamento`

Essa é a única planilha autorizada para os testes do Codex. Login, leitura, gravação, permissões, auditoria e fluxo completo devem ser validados nela antes da criação da PROD.

## Fonte original preservada

- ID: `1o6JLWSRI2OPXuVfCqZ-sgvKXE18XSoIm`
- GID informado: `490406432`
- Nome: `Orçamento_Compra_Entrega_LojasBB_Estruturada.xlsx`
- Formato: Excel (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

O XLSX continua sendo apenas a origem preservada. Ele não deve ser usado pelo Apps Script nem receber dados de teste.

## Estrutura nativa confirmada

| Aba | Função | Chave principal |
| --- | --- | --- |
| `00_DASHBOARD` | indicadores da base | — |
| `01_LOJAS` | cadastro de 27 lojas | `ID_Loja` |
| `02_ITENS` | catálogo de 85 itens | `ID_Item` |
| `03_NECESSIDADES` | 27 × 85 relações | `ID_Necessidade` |
| `04_FORNECEDORES` | cadastro de fornecedores | `ID_Fornecedor` |
| `05_COTACOES` | uma proposta por linha | `ID_Cotação` |
| `06_APROVACOES` | decisões e reaberturas | `ID_Aprovação` |
| `07_COMPRAS` | compras autorizadas | `ID_Compra` |
| `08_ENTREGAS` | transporte e conferência | `ID_Entrega` |
| `09_USUARIOS` | acesso, perfil e escopo | `ID_Usuário` |
| `10_PERMISSOES` | matriz de permissões | perfil + módulo |
| `11_SOLIC_ACESSO` | liberações | `ID_Solicitação` |
| `12_HISTORICO` | auditoria imutável | `ID_Histórico` |
| `13_IMPORTACAO` | estágio de importação | tipo + ID externo |
| `14_LISTAS` | listas e parâmetros | cabeçalho da lista |
| `15_ROTAS_COMPRA` | prioridade de origens | `ID_Rota` |
| `Orçamento` | escopo original legado | não usar como base principal |

Os cabeçalhos das tabelas estruturadas estão na linha 4. O backend foi alinhado aos nomes exatos dessas abas.

## Métricas reconciliadas

- 27 lojas; último ID: `LOJ-027`.
- 85 itens; último ID: `ITM-00085`.
- 2.295 necessidades; último ID: `NEC-002295`.
- 162 necessidades pendentes de definição (6 itens × 27 lojas).
- 26 itens afetados por códigos operacionais duplicados.
- 2.133 necessidades com status “Não iniciado”.
- 65 regras na matriz de permissões, além do cabeçalho.
- Um gráfico no dashboard: “Necessidades por status”.

## Pendências antes dos testes funcionais

1. As lojas ainda possuem nomes placeholder (`Loja 01` a `Loja 27`) e dados cadastrais em branco.
2. Existem códigos operacionais repetidos; relações devem usar somente IDs internos.
3. As entidades editáveis ainda precisam das colunas técnicas `created_at`, `created_by`, `updated_at`, `updated_by`, `version` e `ativo` quando não existentes.
4. A aba `09_USUARIOS` ainda precisa de pelo menos um usuário DEV ativo.
5. O Web App e o Client ID OAuth precisam ser configurados antes dos testes autenticados.

O Apps Script inclui `diagnoseSpreadsheet()` para execução manual e a ação autenticada `technicalStatus` usada pela tela Diagnóstico. Ambas são somente leitura e examinam no máximo as 10 primeiras linhas de cada aba para localizar o cabeçalho e verificar as colunas técnicas. `setupTechnicalColumns()` permanece exclusivamente manual: exige `ALLOW_SETUP=SIM`, localiza a linha real de cabeçalhos, cria uma cópia de segurança de cada aba afetada e remove a autorização temporária ao terminar.
