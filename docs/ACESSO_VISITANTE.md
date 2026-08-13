# Acesso visitante

O modo visitante abre pelo mesmo link do GitHub Pages, sem Google OAuth e sem registro em `09_USUARIOS`. Ele permite navegar pelas áreas operacionais disponíveis, mas não possui qualquer operação de gravação.

## Contrato público

Somente duas ações são aceitas pelo dispatch público:

- `publicBootstrap`: dashboard, lojas, itens e necessidades;
- `publicQuotesWorkspace`: lista e comparativo de cotações.

O corpo do POST não contém `credential`. Qualquer outro nome de ação segue obrigatoriamente para o fluxo autenticado e, sem Google ID token válido, retorna `AUTH_REQUIRED` com a mensagem “Entre com Google para realizar alterações.”.

## Campos expostos

| Conjunto | Campos públicos |
| --- | --- |
| Fonte | tipo público, estado da conexão, somente leitura, data da consulta e mensagem |
| Lojas | ID, nome, cidade, UF e status |
| Itens | ID, código operacional, grupo, área, nome, situação da definição e indicador de código duplicado |
| Necessidades | ID, ID da loja, ID do item, quantidade, prioridade e status |
| Fornecedores | ID público temporário e nome anonimizado (`Fornecedor 01`, `Fornecedor 02`...) |
| Cotações | ID público temporário, necessidade, loja, item, fornecedor público, quantidade, valor total, prazo, status e seleção |

Os dados são lidos das abas reais da planilha DEV. Não há mock nem usuário visitante artificial.

## Campos deliberadamente não expostos

- responsáveis, e-mails, telefones e endereços;
- CNPJ/CPF e contatos dos fornecedores;
- nome real e ID interno do fornecedor;
- ID interno real da cotação;
- preço unitário, frete, outros custos e forma de pagamento;
- links e observações de propostas;
- `created_by`, `updated_by`, datas técnicas, `version` e outros metadados internos;
- usuários, permissões, solicitações de acesso e histórico/auditoria;
- diagnóstico e estrutura técnica da planilha.

Esses campos poderiam revelar dados pessoais, condições comerciais ou a estrutura administrativa. Permanecem disponíveis somente no fluxo Google autenticado, sujeito a `09_USUARIOS`, `10_PERMISSOES` e `Lojas_Permitidas`.

## Proteções

- `dispatchPublicReadAction` possui lista branca exata e não contém nenhuma ação mutável;
- `PUBLIC_READ_ACCESS=SIM` precisa existir nas Script Properties;
- ações autenticadas exigem o token antes de abrir a planilha;
- o frontend remove controles de alteração, mas essa remoção não é usada como barreira de segurança;
- o modo visitante não abre Diagnóstico nem módulos administrativos;
- os DTOs são reconstruídos por lista branca no backend e novamente no cliente.

Módulos operacionais futuros — Aprovações, Compras e Entregas — deverão receber ações públicas próprias e reduzidas quando forem implementados. Eles nunca devem reutilizar o dispatch de gravação.
