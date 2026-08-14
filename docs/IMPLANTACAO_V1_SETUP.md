# Preparação estrutural — IMPLANTATION_V1

Este documento descreve a preparação aprovada do módulo Implantação. O código desta entrega **não executa setup**, não cria Script Properties, não altera a planilha DEV, não publica Web App, não chama `setupTechnicalColumns()` e não adiciona acesso ao Google Drive.

## Funções manuais

- `prevalidateImplantationV1()` — estritamente somente leitura. Não exige propriedade temporária.
- `setupImplantationV1()` — setup manual protegido, idempotente, com `ScriptLock`, backups e rollback.
- `validateImplantationV1()` — validação somente leitura da estrutura já inicializada.

Essas funções não pertencem ao `doPost`, ao dispatch autenticado nem ao dispatch público. Portanto, não podem ser chamadas pelo frontend ou pelo modo visitante.

## Estrutura aprovada

O setup criará, somente quando autorizado, as abas:

1. `17_CHECKLIST_MODELOS`
2. `18_CHECKLIST_MODELO_ATIVIDADES`
3. `19_CHECKLIST_MODELO_EVIDENCIAS`
4. `20_IMPLANTACOES_LOJA`
5. `21_IMPLANTACAO_ATIVIDADES`
6. `22_IMPLANTACAO_ATUALIZACOES`
7. `23_IMPLANTACAO_BLOQUEIOS`
8. `24_ARQUIVOS`

Também acrescentará ao final dos cabeçalhos atuais de `01_LOJAS`, sem deslocar colunas existentes:

- `Data_Inauguracao_Planejada`
- `Data_Inauguracao_Real`

### Cabeçalhos finais das novas abas

`17_CHECKLIST_MODELOS`

```text
ID_Modelo_Versao, Versao_Modelo, Nome, Status_Modelo, Descricao, Data_Publicacao,
ID_Usuario_Publicacao, Checksum_Definicao, Observacoes, created_at, created_by,
updated_at, updated_by, version, ativo
```

`18_CHECKLIST_MODELO_ATIVIDADES`

```text
ID_Modelo_Atividade, ID_Modelo_Versao, Codigo_Atividade, ID_Fase, Fase, Ordem_Fase,
Ordem_Atividade, Acao, Descricao, Offset_Dias, Papel_Responsavel_Padrao, Obrigatoria,
Critica, Evidencia_Obrigatoria, Qtd_Min_Evidencias, Observacoes, created_at, created_by,
updated_at, updated_by, version, ativo
```

`19_CHECKLIST_MODELO_EVIDENCIAS`

```text
ID_Regra_Evidencia, ID_Modelo_Atividade, Tipo_Evidencia, Quantidade_Minima,
Obrigatoria_Para_Conclusao, Observacoes, created_at, created_by, updated_at, updated_by,
version, ativo
```

`20_IMPLANTACOES_LOJA`

```text
ID_Implantacao, ID_Loja, ID_Modelo_Versao, ID_Usuario_Coordenador,
Data_Inauguracao_Base, Data_Inauguracao_Planejada_Atual, Data_Inauguracao_Real,
Status_Ciclo, Iniciada_Em, Iniciada_Por, Encerrada_Em, Encerrada_Por, Observacoes,
created_at, created_by, updated_at, updated_by, version, ativo
```

`21_IMPLANTACAO_ATIVIDADES`

```text
ID_Checklist_Loja, ID_Implantacao, ID_Loja, ID_Modelo_Atividade, Versao_Modelo,
ID_Fase, Fase_Snapshot, Ordem_Fase, Ordem_Atividade, Acao_Snapshot,
Offset_Dias_Snapshot, Papel_Responsavel_Padrao_Snapshot, Obrigatoria_Snapshot,
Critica_Snapshot, Evidencia_Obrigatoria_Snapshot, Qtd_Min_Evidencias_Snapshot,
Data_Alvo_Original, Data_Alvo_Atual, ID_Usuario_Responsavel, Status,
Percentual_Concluido, Data_Inicio_Real, Data_Conclusao_Real, Ultima_Observacao,
Ultima_Atualizacao_Em, created_at, created_by, updated_at, updated_by, version, ativo
```

`22_IMPLANTACAO_ATUALIZACOES`

```text
ID_Atualizacao, ID_Checklist_Loja, ID_Implantacao, ID_Loja, Tipo_Atualizacao, Texto,
Status_Anterior, Status_Novo, Progresso_Anterior, Progresso_Novo,
ID_Responsavel_Anterior, ID_Responsavel_Novo, Data_Hora, ID_Usuario, Origem,
Request_ID, created_at, created_by, updated_at, updated_by, version, ativo
```

`23_IMPLANTACAO_BLOQUEIOS`

```text
ID_Bloqueio, ID_Checklist_Loja, ID_Implantacao, ID_Loja, Motivo_Bloqueio,
Status_Anterior, Progresso_No_Bloqueio, Papel_Responsavel_Desbloqueio,
ID_Usuario_Responsavel_Desbloqueio, Data_Bloqueio, ID_Usuario_Bloqueio,
Data_Desbloqueio, ID_Usuario_Desbloqueio, Observacao_Desbloqueio, created_at,
created_by, updated_at, updated_by, version, ativo
```

`24_ARQUIVOS`

```text
ID_Arquivo, Modulo, ID_Registro, ID_Implantacao, ID_Loja, ID_Atualizacao,
Tipo_Arquivo, Categoria_Evidencia, Evidencia, Nome_Original, Nome_Armazenado,
Mime_Type, Tamanho_Bytes, Drive_File_ID, Drive_Folder_ID, Hash_SHA256, Descricao,
Visibilidade, Request_ID, Data_Remocao, Removido_Por, Motivo_Remocao, created_at,
created_by, updated_at, updated_by, version, ativo
```

`24_ARQUIVOS` é apenas preparação estrutural. O código não usa `DriveApp`, não cria pasta e não altera o manifesto. A futura fase de arquivos deverá apresentar antes o diff de `appsscript.json` e solicitar nova autorização para o scope `https://www.googleapis.com/auth/drive`.

## Checklist Mestre V1

- ID da versão: `CHK-VRS-00001`
- Versão: `1`
- Status inicial após setup: `Publicado`
- Atividades: `30`
- Regras de evidência: `16`
- Checksum SHA-256: `9433f887315bbd5db40e4b94fa726a79edc0db639905347fcbb3a8fe8d78da39`

| Código | Atividade | Fase | Offset | Responsável padrão | Obrigatória | Crítica | Evidência para conclusão |
|---|---|---|---:|---|---|---|---|
| ATV-001 | Solicitar orçamento de cofre + transporte de valores. | Ações Iniciais | -30 | Equipe interna | Sim | Não | — |
| ATV-002 | Visitar a agência BB, apresentar-se ao gerente e buscar apoio. | Ações Iniciais | -30 | Equipe de campo | Sim | Não | — |
| ATV-003 | Mapear agentes de crédito do BB, empresa responsável e concorrência. | Ações Iniciais | -30 | Equipe de campo | Sim | Não | — |
| ATV-004 | Buscar imóveis com anuência do BB ou locais centrais com movimento. | Ações Iniciais | -30 | Equipe de campo | Sim | Não | — |
| ATV-005 | Compartilhar no grupo as informações do imóvel visitado. | Ações Iniciais | -30 | Equipe de campo | Sim | Não | — |
| ATV-006 | Submeter ao BB locação e orçamentos de transporte de valores. | Ações Iniciais | -30 | Equipe interna | Sim | Não | — |
| ATV-007 | Realizar projeto simples/croqui e submeter ao BB. | Ações Iniciais | -30 | Equipe interna | Sim | Sim | DOCUMENTO ≥ 1 |
| ATV-008 | Orçamento/contratação de pedreiro. | Obras e Instalações | -25 | Equipe de campo | Sim | Não | — |
| ATV-009 | Orçamento/contratação de gesseiro. | Obras e Instalações | -25 | Equipe de campo | Sim | Não | — |
| ATV-010 | Orçamento/contratação de pintor. | Obras e Instalações | -25 | Equipe de campo | Sim | Não | — |
| ATV-011 | Orçamento/contratação de eletricista. | Obras e Instalações | -25 | Equipe de campo | Sim | Não | — |
| ATV-012 | Orçamento/contratação de vidraceiro. | Obras e Instalações | -25 | Equipe de campo | Sim | Não | — |
| ATV-013 | Orçamento/contratação de encanador. | Obras e Instalações | -25 | Equipe de campo | Sim | Não | — |
| ATV-014 | Ativar/transferir água e energia em nome da empresa. | Obras e Instalações | -25 | Equipe de campo | Sim | Sim | DOCUMENTO ≥ 1 |
| ATV-015 | Orçamento/contratação de CFTV/DVR. | Obras e Instalações | -25 | Equipe de campo | Sim | Sim | FOTO ≥ 1 |
| ATV-016 | Orçamento/contratação de alarme contra intrusão. | Obras e Instalações | -25 | Equipe de campo | Sim | Sim | FOTO ≥ 1 |
| ATV-017 | Orçamento/contratação de fachada. | Obras e Instalações | -25 | Equipe de campo | Sim | Sim | FOTO ≥ 1 |
| ATV-018 | Orçamento/contratação de internet. | Obras e Instalações | -25 | Equipe de campo | Sim | Sim | DOCUMENTO ≥ 1 |
| ATV-019 | Orçamento/contratação de instalação de ar condicionado. | Obras e Instalações | -25 | Equipe de campo | Sim | Não | — |
| ATV-020 | Orçamento/contratação de sinalização tátil. | Obras e Instalações | -20 | Equipe de campo | Sim | Sim | FOTO ≥ 1 |
| ATV-021 | Orçamento/contratação de persianas, quando necessárias. | Obras e Instalações | -20 | Equipe de campo | Sim | Não | — |
| ATV-022 | Implantar mobiliário, maquinário, sinalização e concluir obra. | Obras e Instalações | -20 | Equipe de campo | Sim | Sim | FOTO ≥ 2 |
| ATV-023 | Instalar cofre / transportadora. | Obras e Instalações | -20 | Equipe de campo | Sim | Sim | FOTO ≥ 1; DOCUMENTO ≥ 1 |
| ATV-024 | Realizar vistoria final de obra. | Obras e Instalações | -20 | Equipe de campo | Sim | Sim | FOTO ≥ 2; DOCUMENTO ≥ 1 |
| ATV-025 | Selecionar, recrutar e contratar colaboradores. | Pessoas e capacitação | -5 | RH | Sim | Sim | — |
| ATV-026 | Realizar capacitações e certificações (CDC, consignado, PLDFT etc.). | Pessoas e capacitação | -5 | Contratado | Sim | Sim | DOCUMENTO ≥ 1 |
| ATV-027 | Entregar uniformes e identificação. | Pessoas e capacitação | -5 | RH | Sim | Não | FOTO ≥ 1 |
| ATV-028 | Criar usuários individuais e perfis. | Pessoas e capacitação | -5 | Equipe interna | Sim | Sim | — |
| ATV-029 | Realizar treinamento de equipe. | Pessoas e capacitação | -5 | Equipe interna | Sim | Sim | EVIDENCIA ≥ 1 |
| ATV-030 | Realizar inauguração. | Inauguração | 0 | Equipe interna | Sim | Sim | FOTO ≥ 2 |

As descrições completas estão na fonte canônica `config/implantation-v1.json`. Não há requisito de documento pessoal ou trabalhista.

## Regras de domínio preparadas

- `NAO_INICIADO = 0%`.
- `EM_ANDAMENTO` aceita somente `25%`, `50%` ou `75%`.
- `CONCLUIDO = 100%`.
- `BLOQUEADO` preserva o percentual existente.
- `NAO_APLICAVEL` e `CANCELADO` preservam histórico e ficam fora do denominador do progresso.
- Bloqueio, não aplicável e cancelamento exigem motivo.
- Cancelamento exige permissão; reabertura exige permissão.
- Progresso da loja é a média simples das atividades ativas e aplicáveis.
- Próxima inauguração: entre hoje e 30 dias.
- Situação crítica próxima: entre hoje e 7 dias.
- Data-alvo: `Data_Inauguracao_Planejada + Offset_Dias`, validada como data civil.
- Visitante não possui acesso ao módulo Implantação.
- `Lojas_Permitidas` é obrigatório para leitura e gravação por loja.

## Linhas planejadas para `10_PERMISSOES`

Legenda: `V` Visualizar, `C` Criar, `E` Editar, `A` Aprovar, `X` Excluir/cancelar logicamente, `Exp` Exportar, `R` Reabrir.

| Perfil | Módulo | V | C | E | A | X | Exp | R |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Administrador | Implantação | S | S | S | S | S | S | S |
| Administrador | Implantação Atualizações | S | S | S | S | S | S | S |
| Administrador | Implantação Arquivos | S | S | S | S | S | S | S |
| Administrador | Checklist Mestre | S | S | S | S | S | S | S |
| Gestor/Aprovador | Implantação | S | S | S | S | S | S | S |
| Gestor/Aprovador | Implantação Atualizações | S | S | S | S | S | S | S |
| Gestor/Aprovador | Implantação Arquivos | S | S | S | S | N | S | S |
| Gestor/Aprovador | Checklist Mestre | S | S | S | S | N | S | S |
| Compras | Implantação | S | N | N | N | N | S | N |
| Compras | Implantação Atualizações | S | N | N | N | N | S | N |
| Compras | Implantação Arquivos | N | N | N | N | N | N | N |
| Compras | Checklist Mestre | N | N | N | N | N | N | N |
| Responsável Loja | Implantação | S | N | N | N | N | N | N |
| Responsável Loja | Implantação Atualizações | S | S | N | N | N | N | N |
| Responsável Loja | Implantação Arquivos | S | S | N | N | N | N | N |
| Responsável Loja | Checklist Mestre | N | N | N | N | N | N | N |
| Consulta | Implantação | S | N | N | N | N | S | N |
| Consulta | Implantação Atualizações | S | N | N | N | N | S | N |
| Consulta | Implantação Arquivos | N | N | N | N | N | N | N |
| Consulta | Checklist Mestre | N | N | N | N | N | N | N |

As permissões continuam subordinadas a `Lojas_Permitidas`, ao usuário responsável e às validações do backend. O modo visitante não recebe nenhuma dessas permissões.

## Listas planejadas para `14_LISTAS`

- `Status Atividade Implantação`: Não iniciado; Em andamento; Bloqueado; Concluído; Não aplicável; Cancelado.
- `Status Ciclo Implantação`: Ativo; Encerrado; Cancelado.
- `Status Modelo Checklist`: Rascunho; Publicado; Inativo.
- `Papel Responsável Implantação`: Equipe interna; Equipe de campo; RH; Contratado.
- `Tipo Atualização Implantação`: Comentário; Mudança de status; Mudança de progresso; Mudança de responsável; Reprogramação; Bloqueio; Desbloqueio; Evidência adicionada; Arquivo removido; Conclusão; Reabertura; Cancelamento.
- `Tipo Evidência Implantação`: FOTO; DOCUMENTO; EVIDENCIA.
- `Visibilidade Arquivo`: INTERNO.

## JSON esperado da pré-validação da DEV atual

O retorno real terá as 20 linhas de permissão completas e as sete listas detalhadas. Considerando a estrutura DEV previamente conferida, o resumo esperado é:

```json
{
  "migration": "IMPLANTATION_V1",
  "already_initialized": false,
  "ready_to_setup": true,
  "stores_found": 27,
  "required_new_store_columns": [
    "Data_Inauguracao_Planejada",
    "Data_Inauguracao_Real"
  ],
  "sheet_conflicts": [],
  "header_conflicts": [],
  "permission_conflicts": [],
  "list_conflicts": [],
  "duplicate_seed_activity_codes": [],
  "invalid_offsets": [],
  "invalid_responsible_roles": [],
  "invalid_evidence_rules": [],
  "invalid_critical_rules": [],
  "structural_issues": [],
  "sheets_to_create": [
    "17_CHECKLIST_MODELOS",
    "18_CHECKLIST_MODELO_ATIVIDADES",
    "19_CHECKLIST_MODELO_EVIDENCIAS",
    "20_IMPLANTACOES_LOJA",
    "21_IMPLANTACAO_ATIVIDADES",
    "22_IMPLANTACAO_ATUALIZACOES",
    "23_IMPLANTACAO_BLOQUEIOS",
    "24_ARQUIVOS"
  ],
  "backups_required": [
    "01_LOJAS",
    "10_PERMISSOES",
    "12_HISTORICO",
    "14_LISTAS"
  ],
  "columns_to_add": [
    {
      "sheet": "01_LOJAS",
      "columns": ["Data_Inauguracao_Planejada", "Data_Inauguracao_Real"]
    }
  ],
  "permission_rows_to_add_count": 20,
  "list_values_to_add_count": 7,
  "checklist_model": {
    "id": "CHK-VRS-00001",
    "version": 1,
    "checksum_sha256": "9433f887315bbd5db40e4b94fa726a79edc0db639905347fcbb3a8fe8d78da39",
    "activities": 30,
    "evidence_rules": 16
  }
}
```

`required_new_store_columns` não é um erro: ele informa exatamente o que o futuro setup acrescentará. Se qualquer array de conflito/inconsistência vier preenchido, `ready_to_setup` será `false`.

## Roteiro exato: executar somente a pré-validação na DEV

1. No repositório, execute `npm run apps-script:build`.
2. Confirme que `apps-script/deploy/appsscript.json` continua sem scope do Drive.
3. No projeto Apps Script DEV já vinculado à planilha DEV, substitua apenas o conteúdo do `Code.gs` pelo conteúdo compilado de `apps-script/deploy/Code.gs` e salve. Não é necessário atualizar a implantação Web App para uma execução manual no editor.
4. No seletor de funções do editor Apps Script, escolha **somente** `prevalidateImplantationV1`.
5. Clique em **Executar**.
6. Abra **Registro de execução** e copie o JSON completo impresso pela função.
7. Confirme no JSON: `stores_found = 27`, `ready_to_setup = true`, checksum igual ao documentado e todos os arrays de conflitos/inconsistências vazios.
8. Pare nesse ponto e envie o JSON para conferência.

Não crie `ALLOW_SETUP_IMPLANTATION_V1` para a pré-validação. Não selecione nem execute `setupImplantationV1()`.

## Comportamento futuro do setup autorizado

Quando houver autorização posterior, o operador criará temporariamente `ALLOW_SETUP_IMPLANTATION_V1=SIM` e executará manualmente `setupImplantationV1()`. A função:

1. adquire `ScriptLock`;
2. repete a pré-validação dentro do lock;
3. aborta antes da primeira escrita se houver qualquer inconsistência;
4. cria backups integrais de `01_LOJAS`, `10_PERMISSOES`, `12_HISTORICO` e `14_LISTAS`;
5. cria as oito abas;
6. acrescenta colunas, permissões e listas;
7. grava e publica o seed V1;
8. valida a estrutura;
9. registra auditoria técnica em `12_HISTORICO`;
10. valida novamente;
11. remove a propriedade temporária no `finally`.

Em falha, as novas abas são removidas e as quatro abas originais são restauradas a partir dos backups. Se executada novamente após sucesso, retorna `already_initialized` antes de qualquer escrita e não duplica abas, permissões, listas, seed ou auditoria.
