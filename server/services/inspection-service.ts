/**
 * Inspection Service
 * Business logic for property inspections (Vistorias)
 */

export interface RoomTemplate {
  type: string;
  label: string;
  items: string[];
}

export interface ComparisonItem {
  itemName: string;
  roomLabel: string;
  entryCondition: string;
  exitCondition: string;
  conditionChanged: boolean;
  hasDamage: boolean;
  damageDescription?: string;
  estimatedRepairCost?: number;
}

export interface ComparisonResult {
  entryInspectionId: string;
  exitInspectionId: string;
  entryDate: string | null;
  exitDate: string | null;
  overallEntryCondition: string | null;
  overallExitCondition: string | null;
  items: ComparisonItem[];
  totalDamages: number;
  roomsSummary: Array<{
    roomLabel: string;
    entryCondition: string | null;
    exitCondition: string | null;
    changed: boolean;
  }>;
}

// Default room templates by property type
const APARTMENT_ROOMS: RoomTemplate[] = [
  {
    type: "living_room",
    label: "Sala de Estar",
    items: ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Tomadas", "Interruptores", "Pintura", "Rodape"],
  },
  {
    type: "kitchen",
    label: "Cozinha",
    items: ["Piso", "Paredes", "Teto", "Pia", "Torneira", "Armarios", "Bancada", "Tomadas", "Interruptores", "Azulejos", "Exaustor"],
  },
  {
    type: "bedroom_1",
    label: "Quarto 1",
    items: ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Armario Embutido", "Tomadas", "Interruptores", "Pintura"],
  },
  {
    type: "bedroom_2",
    label: "Quarto 2",
    items: ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Armario Embutido", "Tomadas", "Interruptores", "Pintura"],
  },
  {
    type: "bathroom_1",
    label: "Banheiro Social",
    items: ["Piso", "Paredes", "Teto", "Vaso Sanitario", "Pia", "Box/Vidro", "Chuveiro", "Torneira", "Espelho", "Azulejos", "Ralo"],
  },
  {
    type: "laundry",
    label: "Area de Servico",
    items: ["Piso", "Paredes", "Tanque", "Torneira", "Tomadas"],
  },
  {
    type: "balcony",
    label: "Varanda",
    items: ["Piso", "Paredes", "Guarda-corpo", "Teto", "Tomadas"],
  },
];

const HOUSE_ROOMS: RoomTemplate[] = [
  ...APARTMENT_ROOMS,
  {
    type: "bedroom_3",
    label: "Quarto 3",
    items: ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Armario Embutido", "Tomadas", "Interruptores", "Pintura"],
  },
  {
    type: "bathroom_2",
    label: "Banheiro Suite",
    items: ["Piso", "Paredes", "Teto", "Vaso Sanitario", "Pia", "Box/Vidro", "Chuveiro", "Torneira", "Espelho", "Azulejos", "Ralo"],
  },
  {
    type: "garage",
    label: "Garagem",
    items: ["Piso", "Paredes", "Portao", "Iluminacao", "Tomadas"],
  },
  {
    type: "exterior",
    label: "Area Externa",
    items: ["Fachada", "Muro", "Portao", "Jardim", "Calcada", "Iluminacao"],
  },
];

const COMMERCIAL_ROOMS: RoomTemplate[] = [
  {
    type: "main_hall",
    label: "Salao Principal",
    items: ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Tomadas", "Interruptores", "Pintura", "Ar Condicionado"],
  },
  {
    type: "bathroom_1",
    label: "Banheiro",
    items: ["Piso", "Paredes", "Teto", "Vaso Sanitario", "Pia", "Espelho", "Azulejos", "Ralo"],
  },
  {
    type: "kitchen",
    label: "Copa/Cozinha",
    items: ["Piso", "Paredes", "Pia", "Torneira", "Armarios", "Tomadas"],
  },
  {
    type: "exterior",
    label: "Fachada",
    items: ["Fachada", "Porta Principal", "Vitrine", "Letreiro", "Calcada"],
  },
];

// Estimated repair costs per item type and severity (BRL)
const REPAIR_COSTS: Record<string, { fair: number; poor: number }> = {
  "Piso": { fair: 80, poor: 200 },
  "Paredes": { fair: 40, poor: 100 },
  "Teto": { fair: 50, poor: 120 },
  "Pintura": { fair: 30, poor: 60 },
  "Janelas": { fair: 150, poor: 400 },
  "Portas": { fair: 200, poor: 500 },
  "Tomadas": { fair: 30, poor: 80 },
  "Interruptores": { fair: 25, poor: 60 },
  "Rodape": { fair: 40, poor: 100 },
  "Pia": { fair: 100, poor: 300 },
  "Torneira": { fair: 80, poor: 200 },
  "Armarios": { fair: 200, poor: 600 },
  "Armario Embutido": { fair: 250, poor: 700 },
  "Bancada": { fair: 150, poor: 400 },
  "Azulejos": { fair: 60, poor: 150 },
  "Exaustor": { fair: 100, poor: 250 },
  "Vaso Sanitario": { fair: 200, poor: 500 },
  "Box/Vidro": { fair: 300, poor: 800 },
  "Chuveiro": { fair: 80, poor: 200 },
  "Espelho": { fair: 60, poor: 150 },
  "Ralo": { fair: 40, poor: 100 },
  "Tanque": { fair: 150, poor: 350 },
  "Guarda-corpo": { fair: 200, poor: 500 },
  "Portao": { fair: 300, poor: 800 },
  "Iluminacao": { fair: 50, poor: 120 },
  "Fachada": { fair: 200, poor: 600 },
  "Muro": { fair: 150, poor: 400 },
  "Jardim": { fair: 100, poor: 300 },
  "Calcada": { fair: 80, poor: 200 },
  "Ar Condicionado": { fair: 200, poor: 500 },
  "Porta Principal": { fair: 250, poor: 600 },
  "Vitrine": { fair: 300, poor: 800 },
  "Letreiro": { fair: 150, poor: 400 },
};

/**
 * Get default room templates for a property type
 */
export function getDefaultRooms(propertyType: string): RoomTemplate[] {
  switch (propertyType?.toLowerCase()) {
    case "house":
    case "casa":
    case "sobrado":
      return HOUSE_ROOMS;
    case "commercial":
    case "comercial":
    case "loja":
    case "sala":
      return COMMERCIAL_ROOMS;
    case "apartment":
    case "apartamento":
    case "flat":
    case "studio":
    case "kitnet":
    default:
      return APARTMENT_ROOMS;
  }
}

/**
 * Get default items for a specific room type
 */
export function getDefaultItems(roomType: string): string[] {
  const allRooms = [...HOUSE_ROOMS, ...COMMERCIAL_ROOMS];
  const room = allRooms.find((r) => r.type === roomType);
  return room?.items || ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Tomadas", "Interruptores"];
}

/**
 * Estimate repair cost based on item name and condition
 */
export function estimateRepairCost(itemName: string, condition: string): number {
  const costs = REPAIR_COSTS[itemName];
  if (!costs) {
    // Default costs for unknown items
    if (condition === "fair") return 50;
    if (condition === "poor") return 150;
    return 0;
  }
  if (condition === "fair") return costs.fair;
  if (condition === "poor") return costs.poor;
  return 0;
}

/**
 * Compare entry and exit inspections
 */
export function compareInspections(
  entryRooms: Array<{ room: any; items: any[] }>,
  exitRooms: Array<{ room: any; items: any[] }>,
  entryInspection: any,
  exitInspection: any
): ComparisonResult {
  const comparisonItems: ComparisonItem[] = [];
  const roomsSummary: ComparisonResult["roomsSummary"] = [];
  let totalDamages = 0;

  for (const exitRoom of exitRooms) {
    const entryRoom = entryRooms.find(
      (er) => er.room.roomType === exitRoom.room.roomType
    );

    roomsSummary.push({
      roomLabel: exitRoom.room.roomLabel,
      entryCondition: entryRoom?.room.overallCondition || null,
      exitCondition: exitRoom.room.overallCondition,
      changed: entryRoom?.room.overallCondition !== exitRoom.room.overallCondition,
    });

    for (const exitItem of exitRoom.items) {
      const entryItem = entryRoom?.items.find(
        (ei: any) => ei.itemName === exitItem.itemName
      );

      const entryCondition = entryItem?.condition || "good";
      const exitCondition = exitItem.condition || "good";
      const conditionChanged = entryCondition !== exitCondition;

      if (exitItem.hasDamage && exitItem.estimatedRepairCost) {
        totalDamages += exitItem.estimatedRepairCost;
      }

      comparisonItems.push({
        itemName: exitItem.itemName,
        roomLabel: exitRoom.room.roomLabel,
        entryCondition,
        exitCondition,
        conditionChanged,
        hasDamage: exitItem.hasDamage || false,
        damageDescription: exitItem.damageDescription,
        estimatedRepairCost: exitItem.estimatedRepairCost,
      });
    }
  }

  return {
    entryInspectionId: entryInspection.id,
    exitInspectionId: exitInspection.id,
    entryDate: entryInspection.completedDate || entryInspection.createdAt,
    exitDate: exitInspection.completedDate || exitInspection.createdAt,
    overallEntryCondition: entryInspection.overallCondition,
    overallExitCondition: exitInspection.overallCondition,
    items: comparisonItems,
    totalDamages,
    roomsSummary,
  };
}

/**
 * Generate HTML inspection report
 */
export function generateInspectionReport(
  inspection: any,
  rooms: Array<{ room: any; items: any[] }>,
  property: any,
  comparison?: ComparisonResult
): string {
  const conditionLabel: Record<string, string> = {
    excellent: "Excelente",
    good: "Bom",
    fair: "Regular",
    poor: "Ruim",
    not_applicable: "N/A",
  };

  const typeLabel: Record<string, string> = {
    entry: "Entrada",
    exit: "Saida",
    periodic: "Periodica",
  };

  const conditionColor: Record<string, string> = {
    excellent: "#16a34a",
    good: "#2563eb",
    fair: "#ca8a04",
    poor: "#dc2626",
  };

  let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Vistoria - ${property?.address || ''}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #16213e; margin-top: 30px; }
    h3 { color: #0f3460; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    .condition { padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; }
    .damage { background-color: #fef2f2; border: 1px solid #fecaca; padding: 8px; border-radius: 4px; margin: 5px 0; }
    .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; text-align: center; border-top: 1px solid #333; padding-top: 10px; }
    .changed { background-color: #fef9c3; }
    .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .header-info p { margin: 4px 0; }
    .summary { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Relatorio de Vistoria - ${typeLabel[inspection.type] || inspection.type}</h1>

  <div class="header-info">
    <div>
      <p><strong>Imovel:</strong> ${property?.title || ''} - ${property?.address || ''}</p>
      <p><strong>Tipo de Vistoria:</strong> ${typeLabel[inspection.type] || inspection.type}</p>
      <p><strong>Data:</strong> ${inspection.completedDate || inspection.createdAt || ''}</p>
    </div>
    <div>
      <p><strong>Vistoriador:</strong> ${inspection.inspectorName || ''}</p>
      <p><strong>Inquilino:</strong> ${inspection.renterName || 'N/A'}</p>
      <p><strong>Condicao Geral:</strong> <span class="condition" style="background-color: ${conditionColor[inspection.overallCondition] || '#666'}">${conditionLabel[inspection.overallCondition] || 'N/A'}</span></p>
    </div>
  </div>

  ${inspection.generalNotes ? `<div class="summary"><strong>Observacoes Gerais:</strong> ${inspection.generalNotes}</div>` : ''}
`;

  for (const { room, items } of rooms) {
    html += `
  <h2>${room.roomLabel}</h2>
  <p><strong>Condicao:</strong> <span class="condition" style="background-color: ${conditionColor[room.overallCondition] || '#666'}">${conditionLabel[room.overallCondition] || 'N/A'}</span></p>
  ${room.notes ? `<p><em>${room.notes}</em></p>` : ''}

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Condicao</th>
        ${comparison ? '<th>Condicao Entrada</th>' : ''}
        <th>Dano</th>
        <th>Custo Estimado</th>
        <th>Observacoes</th>
      </tr>
    </thead>
    <tbody>`;

    for (const item of items) {
      const compItem = comparison?.items.find(
        (ci) => ci.itemName === item.itemName && ci.roomLabel === room.roomLabel
      );
      const rowClass = compItem?.conditionChanged ? ' class="changed"' : '';

      html += `
      <tr${rowClass}>
        <td>${item.itemName}</td>
        <td><span class="condition" style="background-color: ${conditionColor[item.condition] || '#666'}">${conditionLabel[item.condition] || item.condition}</span></td>
        ${comparison ? `<td><span class="condition" style="background-color: ${conditionColor[compItem?.entryCondition || ''] || '#666'}">${conditionLabel[compItem?.entryCondition || ''] || 'N/A'}</span></td>` : ''}
        <td>${item.hasDamage ? 'Sim' : 'Nao'}</td>
        <td>${item.estimatedRepairCost ? `R$ ${item.estimatedRepairCost.toFixed(2)}` : '-'}</td>
        <td>${item.damageDescription || item.description || '-'}</td>
      </tr>`;
    }

    html += `
    </tbody>
  </table>`;
  }

  if (comparison) {
    html += `
  <div class="summary">
    <h3>Resumo da Comparacao</h3>
    <p><strong>Total de Danos:</strong> R$ ${comparison.totalDamages.toFixed(2)}</p>
    <p><strong>Comodos com alteracao:</strong> ${comparison.roomsSummary.filter((r) => r.changed).length} de ${comparison.roomsSummary.length}</p>
    <p><strong>Itens com dano:</strong> ${comparison.items.filter((i) => i.hasDamage).length}</p>
  </div>`;
  }

  if (inspection.totalDamages && inspection.totalDamages > 0) {
    html += `
  <div class="summary">
    <h3>Total de Reparos Estimados</h3>
    <p style="font-size: 20px; font-weight: bold; color: #dc2626;">R$ ${inspection.totalDamages.toFixed(2)}</p>
  </div>`;
  }

  html += `
  <div class="signature-area">
    <div class="signature-box">
      ${inspection.inspectorSignature ? `<img src="${inspection.inspectorSignature}" alt="Assinatura do Vistoriador" style="max-width: 200px; max-height: 80px;" />` : '<br/><br/>'}
      <p><strong>${inspection.inspectorName || 'Vistoriador'}</strong></p>
      <p>Vistoriador</p>
    </div>
    <div class="signature-box">
      ${inspection.renterSignature ? `<img src="${inspection.renterSignature}" alt="Assinatura do Inquilino" style="max-width: 200px; max-height: 80px;" />` : '<br/><br/>'}
      <p><strong>${inspection.renterName || 'Inquilino'}</strong></p>
      <p>Inquilino</p>
    </div>
  </div>

  <p style="text-align: center; margin-top: 40px; color: #999; font-size: 12px;">
    Documento gerado automaticamente pelo ImobiBase em ${new Date().toLocaleDateString('pt-BR')}
  </p>
</body>
</html>`;

  return html;
}

/**
 * Get all available room/item templates
 */
export function getTemplates() {
  return {
    apartment: APARTMENT_ROOMS,
    house: HOUSE_ROOMS,
    commercial: COMMERCIAL_ROOMS,
    repairCosts: REPAIR_COSTS,
  };
}
