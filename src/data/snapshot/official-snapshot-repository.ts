import { DEV_SPREADSHEET_ID } from "@/config/sheets";
import type { Item, Necessity, Store } from "@/domain/entities";
import type { OperationsRepository } from "@/data/repositories/operations-repository";

type CatalogRow = readonly [code: string, group: string, area: string, name: string];

const catalog: CatalogRow[] = [
  ["MOB-002", "Mobiliário", "Transacional", "Balcão atendimento com gaveta"],
  ["MOB-003", "Mobiliário", "Transacional", "Gaveta metálica de numerário"],
  ["MOB-004", "Mobiliário", "Transacional", "Cadeira operacional ergonômica"],
  ["MOB-005", "Mobiliário", "Transacional", "Apoio para os pés"],
  ["EQP-001", "Equipamentos", "Transacional", "SmartPOS"],
  ["EQP-002", "Equipamentos", "Transacional", "Adaptador para leitor pistola e fonte"],
  ["EQP-003", "Equipamentos", "Transacional", "Fonte de alimentação SmartPOS"],
  ["EQP-004", "Equipamentos", "Transacional", "Bobinas SmartPOS iniciais"],
  ["MTE-006", "Material Escritório", "Transacional", "Calculadora de mesa"],
  ["MTE-007", "Material Escritório", "Transacional", "Organizador de cédulas e moedas"],
  ["MTE-008", "Material Escritório", "Transacional", "Malote de segurança"],
  ["MTE-009", "Material Escritório", "Transacional", "Régua"],
  ["MTE-010", "Material Escritório", "Transacional", "Lixeira individual"],
  ["MTE-011", "Material Escritório", "Transacional", "Grampeador"],
  ["MTE-012", "Material Escritório", "Transacional", "Grampos"],
  ["MTE-013", "Material Escritório", "Transacional", "Ligas"],
  ["MTE-014", "Material Escritório", "Transacional", "Caneta"],
  ["MTE-015", "Material Escritório", "Transacional", "Folhas / agenda"],
  ["MOB-006", "Mobiliário", "Negocial", "Mesa de escritório negocial"],
  ["MOB-007", "Mobiliário", "Negocial", "Cadeira operacional ergonômica"],
  ["MOB-009", "Mobiliário", "Negocial", "Gaveteiro móvel com chave"],
  ["MOB-008", "Mobiliário", "Negocial", "Cadeira fixa para cliente"],
  ["MOB-010", "Mobiliário", "Negocial", "Apoio para os pés"],
  ["INF-001", "Equipamentos", "Negocial", "Computador / notebook negocial"],
  ["INF-002", "Equipamentos", "Negocial", "Monitor para PC"],
  ["INF-003", "Equipamentos", "Negocial", "Teclado e mouse para PC"],
  ["INF-004", "Equipamentos", "Negocial", "Filtro de privacidade para monitor"],
  ["INF-005", "Equipamentos", "Negocial", "Nobreak para computador"],
  ["MTE-007", "Material Escritório", "Negocial", "Calculadora de mesa"],
  ["MTE-008", "Material Escritório", "Negocial", "Régua"],
  ["MTE-009", "Material Escritório", "Negocial", "Lixeira individual"],
  ["MTE-010", "Material Escritório", "Negocial", "Grampeador"],
  ["MTE-011", "Material Escritório", "Negocial", "Grampos"],
  ["MTE-012", "Material Escritório", "Negocial", "Caneta"],
  ["MTE-013", "Material Escritório", "Negocial", "Agenda"],
  ["MTE-014", "Material Escritório", "Negocial", "Resma de folhas A4"],
  ["MOB-011", "Mobiliário", "Atendimento", "Mesa de videoatendimento"],
  ["MOB-012", "Mobiliário", "Atendimento", "Cadeira operacional ergonômica"],
  ["MOB-013", "Mobiliário", "Atendimento", "Cadeira fixa para cliente"],
  ["MOB-014", "Mobiliário", "Atendimento", "Gaveteiro móvel com chave"],
  ["MOB-015", "Mobiliário", "Atendimento", "Apoio para os pés"],
  ["MOB-016", "Mobiliário", "Atendimento", "Painel de privacidade para vídeo"],
  ["INF-006", "Equipamentos", "Atendimento", "Computador all-in-one de videoatendimento"],
  ["INF-007", "Equipamentos", "Atendimento", "Monitor"],
  ["INF-008", "Equipamentos", "Atendimento", "Teclado e mouse"],
  ["INF-009", "Equipamentos", "Atendimento", "Nobreak para computador"],
  ["INF-010", "Equipamentos", "Atendimento", "Filtro de privacidade para monitor"],
  ["INF-011", "Equipamentos", "Atendimento", "Webcam Full HD"],
  ["INF-012", "Equipamentos", "Atendimento", "Headset profissional"],
  ["INF-013", "Equipamentos", "Atendimento", "Iluminador frontal"],
  ["MTE-015", "Material Escritório", "Atendimento", "Lixeira individual"],
  ["MOB-017", "Mobiliário", "Itens Gerais", "Longarina de espera com 3 lugares"],
  ["MOB-018", "Mobiliário", "Itens Gerais", "Cadeira preferencial com braços"],
  ["MOB-019", "Mobiliário", "Itens Gerais", "Armário alto com chave"],
  ["MOB-020", "Mobiliário", "Itens Gerais", "Armário baixo com chave"],
  ["MOB-021", "Mobiliário", "Itens Gerais", "Bancada de apoio"],
  ["MOB-022", "Mobiliário", "Itens Gerais", "Mesa de apoio para água / café"],
  ["EQP-004", "Equipamentos compartilhados", "Itens Gerais", "Cofre para numerário"],
  ["EQP-005", "Equipamentos compartilhados", "Itens Gerais", "Máquina contadora de cédulas"],
  ["EQP-006", "Equipamentos compartilhados", "Itens Gerais", "Detector de cédulas falsas"],
  ["INF-007", "Equipamentos compartilhados", "Itens Gerais", "Impressora multifuncional com scanner"],
  ["INF-008", "Equipamentos compartilhados", "Itens Gerais", "Nobreak para multifuncional"],
  ["INF-009", "Equipamentos compartilhados", "Itens Gerais", "Fragmentadora de papel"],
  ["CLI-001", "Climatização", "Itens Gerais", "Ar-condicionado split inverter"],
  ["CLI-002", "Climatização", "Itens Gerais", "Kit completo de instalação de split"],
  ["CTV-001", "Segurança - CFTV", "Itens Gerais", "Câmera de segurança"],
  ["CTV-002", "Segurança - CFTV", "Itens Gerais", "NVR / DVR de 8 canais"],
  ["CTV-003", "Segurança - CFTV", "Itens Gerais", "HD para vigilância"],
  ["CTV-004", "Segurança - CFTV", "Itens Gerais", "Switch PoE ou fonte central"],
  ["CTV-005", "Segurança - CFTV", "Itens Gerais", "Nobreak para CFTV"],
  ["CTV-006", "Segurança - CFTV", "Itens Gerais", "Rack protegido para gravador"],
  ["CTV-007", "Segurança - CFTV", "Itens Gerais", "Kit de cabeamento e conectores"],
  ["CTV-008", "Segurança - CFTV", "Itens Gerais", "Placa de ambiente monitorado"],
  ["ALM-001", "Segurança - Alarme", "Itens Gerais", "Central de alarme monitorável"],
  ["ALM-002", "Segurança - Alarme", "Itens Gerais", "Sensor magnético de abertura"],
  ["ALM-003", "Segurança - Alarme", "Itens Gerais", "Sensor de presença"],
  ["ALM-004", "Segurança - Alarme", "Itens Gerais", "Botão de pânico fixo"],
  ["ALM-005", "Segurança - Alarme", "Itens Gerais", "Sirene interna / externa"],
  ["APO-001", "Demais itens", "Itens Gerais", "Purificador / bebedouro"],
  ["APO-002", "Demais itens", "Itens Gerais", "Suporte para copos"],
  ["APO-004", "Demais itens", "Itens Gerais", "Lixeira coletiva com pedal"],
  ["APO-005", "Demais itens", "Itens Gerais", "Dispenser de álcool"],
  ["APO-006", "Demais itens", "Itens Gerais", "Organizador de fila"],
  ["APO-007", "Demais itens", "Itens Gerais", "Kit de primeiros socorros"],
  ["APO-008", "Demais itens", "Itens Gerais", "Quadro de chaves"],
];

const pendingItemNumbers = new Set([22, 24, 28, 39, 40, 41]);
const codeFrequency = catalog.reduce<Record<string, number>>((result, [code]) => {
  result[code] = (result[code] ?? 0) + 1;
  return result;
}, {});

const stores: Store[] = Array.from({ length: 27 }, (_, index) => {
  const number = index + 1;
  const id = `LOJ-${String(number).padStart(3, "0")}`;
  return {
    id,
    code: id,
    name: `Loja ${String(number).padStart(2, "0")}`,
    city: "A cadastrar",
    state: "—",
    region: "A cadastrar",
    manager: "A cadastrar",
    email: "",
    phone: "",
    status: "A cadastrar",
    address: "",
    notes: "",
    version: 1,
  };
});

const items: Item[] = catalog.map(([operationalCode, group, area, name], index) => {
  const number = index + 1;
  return {
    id: `ITM-${String(number).padStart(5, "0")}`,
    operationalCode,
    group,
    area,
    name,
    specification: "",
    defaultQuantity: 1,
    definitionStatus: pendingItemNumbers.has(number) ? "PENDENTE_DEFINICAO" : "LIBERADO_PARA_COTACAO",
    duplicateOperationalCode: codeFrequency[operationalCode] > 1,
    active: true,
    route1: "",
    route2: "",
    route3: "",
    notes: "",
    version: 1,
  };
});

const necessities: Necessity[] = stores.flatMap((store, storeIndex) =>
  items.map((item, itemIndex) => ({
    id: `NEC-${String(storeIndex * items.length + itemIndex + 1).padStart(6, "0")}`,
    storeId: store.id,
    itemId: item.id,
    quantity: 1,
    priority: "MEDIA" as const,
    status: item.definitionStatus === "PENDENTE_DEFINICAO" ? "PENDENTE_DEFINICAO" : "NAO_INICIADO",
    version: 1,
  })),
);

export class OfficialSnapshotRepository implements OperationsRepository {
  async getSourceInfo() {
    return {
      kind: "official-snapshot" as const,
      label: "Snapshot verificado da planilha DEV",
      status: "snapshot" as const,
      readOnly: true,
      spreadsheetId: DEV_SPREADSHEET_ID,
      checkedAt: "2026-08-12T19:43:19.445Z",
      message:
        "Os dados exibidos correspondem ao snapshot validado da planilha DEV nativa. Publique e configure o Apps Script Web App DEV para habilitar autenticação e sincronização ao vivo.",
    };
  }

  async listStores() {
    return stores.map((store) => ({ ...store }));
  }

  async listItems() {
    return items.map((item) => ({ ...item }));
  }

  async listNecessities() {
    return necessities.map((necessity) => ({ ...necessity }));
  }

  async getTechnicalStatus() {
    return {
      ready: false,
      checkedAt: new Date().toISOString(),
      tables: [],
    };
  }

  async updateStore(): Promise<never> {
    throw new Error("O snapshot local é somente leitura.");
  }

  async updateItem(): Promise<never> {
    throw new Error("O snapshot local é somente leitura.");
  }
}
