export const SOURCE_SPREADSHEET_ID = "1o6JLWSRI2OPXuVfCqZ-sgvKXE18XSoIm";
export const SOURCE_SPREADSHEET_GID = "490406432";

export const DEV_SPREADSHEET_ID = "1oU1ytbche1s1V4J6kF_xXdWgV-WdGU2xG8t79qQf62c";
export const DEV_SPREADSHEET_NAME = "Orçamento_Compra_Entrega_LojasBB_DEV";

export const SHEET_SCHEMAS = {
  stores: {
    title: "01_LOJAS",
    requiredHeaders: ["ID_Loja", "Loja", "Cidade", "UF", "Status"],
  },
  items: {
    title: "02_ITENS",
    requiredHeaders: ["ID_Item", "Código_Original", "Grupo", "Área", "Item", "Status_Especificação"],
  },
  necessities: {
    title: "03_NECESSIDADES",
    requiredHeaders: ["ID_Necessidade", "ID_Loja", "ID_Item", "Qtd_Planejada", "Status", "Prioridade"],
  },
} as const;

export const EXPECTED_SHEET_TITLES = [
  "Orçamento",
  "00_DASHBOARD",
  "01_LOJAS",
  "02_ITENS",
  "03_NECESSIDADES",
  "04_FORNECEDORES",
  "05_COTACOES",
  "06_APROVACOES",
  "07_COMPRAS",
  "08_ENTREGAS",
  "09_USUARIOS",
  "10_PERMISSOES",
  "11_SOLIC_ACESSO",
  "12_HISTORICO",
  "13_IMPORTACAO",
  "14_LISTAS",
  "15_ROTAS_COMPRA",
] as const;
