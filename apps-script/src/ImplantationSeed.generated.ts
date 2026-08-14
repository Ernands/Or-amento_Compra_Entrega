/* Arquivo gerado por scripts/generate-implantation-seed.mjs. Não editar manualmente. */
const IMPLANTATION_CHECKLIST_CHECKSUM_V1 = "9433f887315bbd5db40e4b94fa726a79edc0db639905347fcbb3a8fe8d78da39";
const IMPLANTATION_MODEL_SEED_V1: ImplantationModelSeedV1 = {
  "id": "CHK-VRS-00001",
  "version": 1,
  "name": "Checklist Mestre de Implantação V1",
  "status": "PUBLICADO",
  "description": "Checklist inicial aprovado para implantação das 27 lojas."
};
const IMPLANTATION_ACTIVITY_SEED_V1: ReadonlyArray<ImplantationSeedActivityV1> = [
  {
    "id": "CHK-MOD-00001",
    "code": "ATV-001",
    "phaseId": "FAS-01",
    "phase": "Ações Iniciais",
    "phaseOrder": 1,
    "order": 1,
    "action": "Solicitar orçamento de cofre + transporte de valores.",
    "offsetDays": -30,
    "defaultRole": "Equipe interna",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00002",
    "code": "ATV-002",
    "phaseId": "FAS-01",
    "phase": "Ações Iniciais",
    "phaseOrder": 1,
    "order": 2,
    "action": "Visitar a agência BB. Apresentar-se ao gerente BB e explicar o objetivo da visita, buscando apoio.",
    "offsetDays": -30,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00003",
    "code": "ATV-003",
    "phaseId": "FAS-01",
    "phase": "Ações Iniciais",
    "phaseOrder": 1,
    "order": 3,
    "action": "Mapear na cidade a existência de agentes de crédito do BB, empresa responsável e concorrência.",
    "offsetDays": -30,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00004",
    "code": "ATV-004",
    "phaseId": "FAS-01",
    "phase": "Ações Iniciais",
    "phaseOrder": 1,
    "order": 4,
    "action": "Com agência BB: buscar imóveis para locação com anuência do gerente BB. Sem agência BB: buscar locais centrais com bastante movimento.",
    "offsetDays": -30,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00005",
    "code": "ATV-005",
    "phaseId": "FAS-01",
    "phase": "Ações Iniciais",
    "phaseOrder": 1,
    "order": 5,
    "action": "Compartilhar no grupo de trabalho informações e características do imóvel visitado.",
    "offsetDays": -30,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00006",
    "code": "ATV-006",
    "phaseId": "FAS-01",
    "phase": "Ações Iniciais",
    "phaseOrder": 1,
    "order": 6,
    "action": "Submeter ao BB valores de locação + orçamentos de transporte de valores.",
    "offsetDays": -30,
    "defaultRole": "Equipe interna",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00007",
    "code": "ATV-007",
    "phaseId": "FAS-01",
    "phase": "Ações Iniciais",
    "phaseOrder": 1,
    "order": 7,
    "action": "Realizar projeto simples/croqui e submeter ao BB para aprovação.",
    "offsetDays": -30,
    "defaultRole": "Equipe interna",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00008",
    "code": "ATV-008",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 8,
    "action": "Orçamento/contratação mão de obra - pedreiro.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00009",
    "code": "ATV-009",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 9,
    "action": "Orçamento/contratação mão de obra - gesseiro.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00010",
    "code": "ATV-010",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 10,
    "action": "Orçamento/contratação mão de obra - pintor.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00011",
    "code": "ATV-011",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 11,
    "action": "Orçamento/contratação mão de obra - eletricista.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00012",
    "code": "ATV-012",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 12,
    "action": "Orçamento/contratação mão de obra - vidraceiro.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00013",
    "code": "ATV-013",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 13,
    "action": "Orçamento/contratação mão de obra - encanador.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00014",
    "code": "ATV-014",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 14,
    "action": "Ativar/transferir água e energia em nome da empresa.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00015",
    "code": "ATV-015",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 15,
    "action": "Orçamento/contratação de sistema de CFTV/DVR.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00016",
    "code": "ATV-016",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 16,
    "action": "Orçamento/contratação de alarme contra intrusão.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00017",
    "code": "ATV-017",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 17,
    "action": "Orçamento/contratação - Fachada.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00018",
    "code": "ATV-018",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 18,
    "action": "Orçamento/contratação - Internet.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00019",
    "code": "ATV-019",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 19,
    "action": "Orçamento/contratação - Instalação de ar condicionado.",
    "offsetDays": -25,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00020",
    "code": "ATV-020",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 20,
    "action": "Orçamento/contratação - sinalização tátil.",
    "offsetDays": -20,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00021",
    "code": "ATV-021",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 21,
    "action": "Orçamento/contratação - persianas quando necessárias.",
    "offsetDays": -20,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00022",
    "code": "ATV-022",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 22,
    "action": "Implantação de mobiliário, maquinário e sinalização / conclusão de obra.",
    "offsetDays": -20,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00023",
    "code": "ATV-023",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 23,
    "action": "Instalação do cofre / transportadora.",
    "offsetDays": -20,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00024",
    "code": "ATV-024",
    "phaseId": "FAS-02",
    "phase": "Obras e Instalações",
    "phaseOrder": 2,
    "order": 24,
    "action": "Vistoria final de obra.",
    "offsetDays": -20,
    "defaultRole": "Equipe de campo",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00025",
    "code": "ATV-025",
    "phaseId": "FAS-03",
    "phase": "Pessoas e capacitação",
    "phaseOrder": 3,
    "order": 25,
    "action": "Seleção, recrutamento e contratação de colaboradores.",
    "offsetDays": -5,
    "defaultRole": "RH",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00026",
    "code": "ATV-026",
    "phaseId": "FAS-03",
    "phase": "Pessoas e capacitação",
    "phaseOrder": 3,
    "order": 26,
    "action": "Realizar capacitações e certificações: CDC, consignado, PLDFT etc.",
    "offsetDays": -5,
    "defaultRole": "Contratado",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00027",
    "code": "ATV-027",
    "phaseId": "FAS-03",
    "phase": "Pessoas e capacitação",
    "phaseOrder": 3,
    "order": 27,
    "action": "Entregar uniformes e identificação.",
    "offsetDays": -5,
    "defaultRole": "RH",
    "mandatory": true,
    "critical": false
  },
  {
    "id": "CHK-MOD-00028",
    "code": "ATV-028",
    "phaseId": "FAS-03",
    "phase": "Pessoas e capacitação",
    "phaseOrder": 3,
    "order": 28,
    "action": "Criar usuários individuais e perfis.",
    "offsetDays": -5,
    "defaultRole": "Equipe interna",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00029",
    "code": "ATV-029",
    "phaseId": "FAS-03",
    "phase": "Pessoas e capacitação",
    "phaseOrder": 3,
    "order": 29,
    "action": "Treinamento de equipe.",
    "offsetDays": -5,
    "defaultRole": "Equipe interna",
    "mandatory": true,
    "critical": true
  },
  {
    "id": "CHK-MOD-00030",
    "code": "ATV-030",
    "phaseId": "FAS-04",
    "phase": "Inauguração",
    "phaseOrder": 4,
    "order": 30,
    "action": "Realizar inauguração.",
    "offsetDays": 0,
    "defaultRole": "Equipe interna",
    "mandatory": true,
    "critical": true
  }
];
const IMPLANTATION_EVIDENCE_SEED_V1: ReadonlyArray<ImplantationEvidenceRuleSeedV1> = [
  {
    "id": "EVD-MOD-00001",
    "activityId": "CHK-MOD-00007",
    "activityCode": "ATV-007",
    "type": "DOCUMENTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00002",
    "activityId": "CHK-MOD-00014",
    "activityCode": "ATV-014",
    "type": "DOCUMENTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00003",
    "activityId": "CHK-MOD-00015",
    "activityCode": "ATV-015",
    "type": "FOTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00004",
    "activityId": "CHK-MOD-00016",
    "activityCode": "ATV-016",
    "type": "FOTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00005",
    "activityId": "CHK-MOD-00017",
    "activityCode": "ATV-017",
    "type": "FOTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00006",
    "activityId": "CHK-MOD-00018",
    "activityCode": "ATV-018",
    "type": "DOCUMENTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00007",
    "activityId": "CHK-MOD-00020",
    "activityCode": "ATV-020",
    "type": "FOTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00008",
    "activityId": "CHK-MOD-00022",
    "activityCode": "ATV-022",
    "type": "FOTO",
    "minimum": 2
  },
  {
    "id": "EVD-MOD-00009",
    "activityId": "CHK-MOD-00023",
    "activityCode": "ATV-023",
    "type": "FOTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00010",
    "activityId": "CHK-MOD-00023",
    "activityCode": "ATV-023",
    "type": "DOCUMENTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00011",
    "activityId": "CHK-MOD-00024",
    "activityCode": "ATV-024",
    "type": "FOTO",
    "minimum": 2
  },
  {
    "id": "EVD-MOD-00012",
    "activityId": "CHK-MOD-00024",
    "activityCode": "ATV-024",
    "type": "DOCUMENTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00013",
    "activityId": "CHK-MOD-00026",
    "activityCode": "ATV-026",
    "type": "DOCUMENTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00014",
    "activityId": "CHK-MOD-00027",
    "activityCode": "ATV-027",
    "type": "FOTO",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00015",
    "activityId": "CHK-MOD-00029",
    "activityCode": "ATV-029",
    "type": "EVIDENCIA",
    "minimum": 1
  },
  {
    "id": "EVD-MOD-00016",
    "activityId": "CHK-MOD-00030",
    "activityCode": "ATV-030",
    "type": "FOTO",
    "minimum": 2
  }
];
