import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type {
  BomSummary,
  ErgonomicsReport,
  PlannerDesignState,
} from '../types/planner';

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildBomCsvContent(
  design: PlannerDesignState,
  ergonomics: ErgonomicsReport,
  bom: BomSummary
): string {
  const rows: Array<Array<string | number>> = [
    ['築境 AI 室內空間設計｜BOM 工程與軟裝預算分析表'],
    ['專案名稱', design.roomName || '未命名空間'],
    ['匯出日期', new Date().toLocaleDateString('zh-TW')],
    [
      '校準尺度',
      `${design.calibration.roomWidthCm}x${design.calibration.roomDepthCm} cm (地坪 ${bom.roomAreaPing} 坪 / 牆面 ${bom.wallAreaPing} 坪)`,
    ],
    [
      '動線安全總評',
      `${ergonomics.overallStatus.toUpperCase()} (最小走道 ${ergonomics.walkwayMinCm} cm)`,
    ],
    [],
    [
      '項目分類',
      '工程/軟裝項目名稱',
      '預估數量',
      '市場單價參考',
      '最低預估 (NT$)',
      '最高預估 (NT$)',
      '備註說明',
    ],
  ];

  for (const item of bom.items) {
    rows.push([
      item.categoryLabel,
      item.name,
      item.quantityText,
      item.unitRateText,
      item.minTWD,
      item.maxTWD,
      item.note || '',
    ]);
  }

  rows.push([
    '合計',
    '粗估總預算區間',
    '-',
    bom.budgetCapTWD
      ? `預算上限 NT$ ${bom.budgetCapTWD.toLocaleString()}`
      : '未設定上限',
    bom.totalMinTWD,
    bom.totalMaxTWD,
    bom.withinBudget ? '符合預算上限目標' : '略高於設定預算上限',
  ]);

  const selectedProducts = design.matchedProducts.filter(
    (p) => p.selectedForBom
  );
  if (selectedProducts.length > 0) {
    rows.push([]);
    rows.push(['推薦軟裝以圖搜物清單 (含關鍵字搜尋連結)']);
    rows.push([
      '品牌',
      '品名',
      '實體尺寸 (cm)',
      '材質',
      '尺寸適配度',
      '參考售價 (NT$)',
      '關鍵字搜尋連結',
    ]);
    for (const prod of selectedProducts) {
      rows.push([
        prod.brand,
        prod.name,
        `${prod.widthCm}x${prod.depthCm}x${prod.heightCm}`,
        prod.material,
        `${prod.fitScore}%`,
        prod.priceTWD,
        prod.searchUrl || prod.urlSlug,
      ]);
    }
  }

  rows.push([]);
  rows.push(['免責聲明', bom.disclaimer]);

  const csvBody = rows
    .map((r) => r.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');

  // UTF-8 BOM guarantees clean display in Excel, Google Sheets & LINE previews on Windows/Android
  return `\uFEFF${csvBody}`;
}

export interface CsvExportResult {
  method: 'native_share' | 'web_download';
  fileName: string;
}

/**
 * Exports the BOM & Soft-Furnishing Analysis as a UTF-8 BOM CSV file.
 * On Capacitor Android/iOS native builds, writes to Filesystem Directory.Cache
 * and invokes native Share menu (LINE, Google Drive, Excel, Gmail).
 * On Web browsers, triggers a standard file download.
 */
export async function exportBomCsv(
  design: PlannerDesignState,
  ergonomics: ErgonomicsReport,
  bom: BomSummary
): Promise<CsvExportResult> {
  const csvWithBom = buildBomCsvContent(design, ergonomics, bom);
  const safeRoomName = (design.roomName || 'interior-plan')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
    .slice(0, 40);
  const fileName = `${safeRoomName}_BOM預算分析表.csv`;

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: fileName,
      data: csvWithBom,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    const uriResult = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    await Share.share({
      title: `${design.roomName || '室內空間'} — 預算與軟裝 BOM 表`,
      text: `粗估總預算 NT$ ${bom.totalMinTWD.toLocaleString()} ~ ${bom.totalMaxTWD.toLocaleString()}（${bom.roomAreaPing} 坪）`,
      files: [uriResult.uri],
      url: uriResult.uri,
      dialogTitle: '選擇分享或開啟 BOM 預算表 (LINE / Google 雲端 / Excel)',
    });

    return { method: 'native_share', fileName };
  }

  // Standard Web browser download
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  return { method: 'web_download', fileName };
}

export function exportProjectJson(
  design: PlannerDesignState,
  ergonomics: ErgonomicsReport,
  bom: BomSummary
): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    application: '築境 AI｜專業室內空間設計與物理尺度規劃助手',
    roomName: design.roomName,
    calibration: design.calibration,
    protectionMasks: design.protectionMasks,
    constraints: design.constraints,
    mode: design.mode,
    styleId: design.styleId,
    lighting: design.lighting,
    appliedMaterials: design.appliedMaterials,
    ergonomicsReport: ergonomics,
    matchedProducts: design.matchedProducts.filter((p) => p.selectedForBom),
    bomSummary: bom,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.roomName || 'interior-plan'}-spec.json`;
  a.click();
  URL.revokeObjectURL(url);
}
