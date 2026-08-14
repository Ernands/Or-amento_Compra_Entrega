# Cadastros e condições comerciais

Esta versão acrescenta cadastro de itens, link público de produto e detalhamento mínimo da forma de pagamento. Nenhuma função de setup ou migração é executada automaticamente.

## Alterações manuais na planilha DEV

Faça backup antes de editar cabeçalhos e trabalhe exclusivamente na DEV.

1. Em `02_ITENS`, acrescente uma coluna com o cabeçalho exato `Link_Produto`. A posição é livre; recomenda-se colocá-la após `Rota_3` ou `Observações`.
2. Em `16_PROPOSTAS_COTACAO`, acrescente as colunas `Quantidade_Parcelas` e `Possui_Entrada`. A posição é livre; recomenda-se colocá-las após `Forma_Pagamento`.
3. Em `14_LISTAS`, localize a coluna de cabeçalho `Forma Pagamento` e acrescente `Dinheiro` na primeira linha vazia da lista.
4. Em `Possui_Entrada`, use os valores `Sim` e `Não`. Em `Quantidade_Parcelas`, use números inteiros a partir de 1.

Não execute `setupTechnicalColumns()` para essas alterações.

## Significado dos campos

- `Link_Produto`: URL HTTP/HTTPS do produto ou da imagem de referência; alimenta o botão azul **Ver produto**.
- `Quantidade_Parcelas`: quantidade total de parcelas da condição comercial, entre 1 e 120.
- `Possui_Entrada`: informa somente se a negociação exige entrada. Esta versão não registra valor ou percentual da entrada.

## Cadastro de item

`createItem` gera um `ITM-00000` imutável, valida os dados no backend, usa `LockService`, preenche `created_at`, `created_by`, `updated_at`, `updated_by` e `version`, e audita a criação em `12_HISTORICO`.

O cadastro não cria automaticamente 27 necessidades em `03_NECESSIDADES`. O novo item aparece no catálogo, mas só fica disponível para cotação depois que existirem necessidades reais vinculadas às lojas.

## Ordem segura de publicação

1. Acrescente as três colunas/lista descritas acima na DEV.
2. Substitua o `Code.gs` pelo arquivo compilado de `apps-script/deploy/Code.gs`.
3. Atualize a implantação do Web App existente.
4. Teste `GET ?action=health`.
5. No sistema autenticado, cadastre um item sem criar necessidades e confirme a linha em `02_ITENS` e a auditoria em `12_HISTORICO`.
6. Edite o item, informe `Link_Produto` e teste **Ver produto**.
7. Edite uma proposta em Rascunho/Em andamento, escolha a forma de pagamento, parcelas e entrada; confirme os três campos em `16_PROPOSTAS_COTACAO`.

O frontend negocia essas capacidades com o backend. Antes da nova implantação confirmar a ação `createItem` e as colunas funcionais, o botão **Novo item**, o campo de link e os campos de parcelas/entrada permanecem ocultos; payloads enviados ao backend anterior também não incluem os campos desconhecidos.
