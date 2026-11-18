import type { FurnitureCategory } from '../types/planner';

export interface CatalogProduct {
  id: string;
  brand: 'IKEA' | '無印良品 MUJI' | '宜得利 NITORI' | '有情門' | 'MR. LIVING';
  name: string;
  category: FurnitureCategory;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  priceTWD: number;
  material: string;
  petFriendly: boolean;
  colorHex: string;
  urlSlug: string;
}

export const RETAIL_CATALOG: CatalogProduct[] = [
  // Sofas
  {
    id: 'cat_ikea_kivik',
    brand: 'IKEA',
    name: 'KIVIK 三人座布面沙發 (燕麥米白可拆洗)',
    category: 'sofa',
    widthCm: 228,
    depthCm: 95,
    heightCm: 83,
    priceTWD: 16900,
    material: '高磅數混紡布套 (可機洗)',
    petFriendly: false,
    colorHex: '#DDD6CA',
    urlSlug: 'https://www.ikea.com.tw',
  },
  {
    id: 'cat_nitori_cat_sofa',
    brand: '宜得利 NITORI',
    name: 'N-Shield 防貓抓三人座機能沙發 (奶茶色)',
    category: 'sofa',
    widthCm: 206,
    depthCm: 90,
    heightCm: 86,
    priceTWD: 18900,
    material: '防抓耐磨科技合成皮/布',
    petFriendly: true,
    colorHex: '#CBB8A2',
    urlSlug: 'https://www.nitori-net.tw',
  },
  {
    id: 'cat_mrliving_bruce',
    brand: 'MR. LIVING',
    name: 'Bruce 亞麻防潑水防抓三人沙發',
    category: 'sofa',
    widthCm: 215,
    depthCm: 92,
    heightCm: 79,
    priceTWD: 25900,
    material: '高密度防抓貓抓布 + 梣木腳',
    petFriendly: true,
    colorHex: '#D8CFC2',
    urlSlug: 'https://www.mrliving.com.tw',
  },
  {
    id: 'cat_muji_oak_sofa',
    brand: '無印良品 MUJI',
    name: '白橡木羽絨獨立筒雙人/三人沙發',
    category: 'sofa',
    widthCm: 195,
    depthCm: 88,
    heightCm: 78,
    priceTWD: 28800,
    material: '白橡木實木框 + 棉麻布套',
    petFriendly: false,
    colorHex: '#E5DEC9',
    urlSlug: 'https://www.muji.com/tw',
  },

  // Coffee Tables
  {
    id: 'cat_ikea_listerby',
    brand: 'IKEA',
    name: 'LISTERBY 圓形實木貼皮茶几 (橡木色)',
    category: 'coffee_table',
    widthCm: 90,
    depthCm: 90,
    heightCm: 45,
    priceTWD: 4990,
    material: '白橡木實木桌腳 + 圓角安全設計',
    petFriendly: true,
    colorHex: '#C8A377',
    urlSlug: 'https://www.ikea.com.tw',
  },
  {
    id: 'cat_muji_slatted_table',
    brand: '無印良品 MUJI',
    name: '無垢材白橡木格柵長茶几',
    category: 'coffee_table',
    widthCm: 110,
    depthCm: 55,
    heightCm: 38,
    priceTWD: 7900,
    material: '天然白橡木實木',
    petFriendly: true,
    colorHex: '#C19A6B',
    urlSlug: 'https://www.muji.com/tw',
  },
  {
    id: 'cat_youqingmen_table',
    brand: '有情門',
    name: '豆豆實木邊茶几組 (梣木自然色)',
    category: 'coffee_table',
    widthCm: 100,
    depthCm: 58,
    heightCm: 42,
    priceTWD: 9800,
    material: '台灣製梣木實木導圓角',
    petFriendly: true,
    colorHex: '#B6895B',
    urlSlug: 'https://www.macromaison.com.tw',
  },

  // TV Consoles & Storage
  {
    id: 'cat_ikea_besta',
    brand: 'IKEA',
    name: 'BESTÅ 懸浮/落地電視收納組合 (180cm)',
    category: 'tv_console',
    widthCm: 180,
    depthCm: 42,
    heightCm: 48,
    priceTWD: 8790,
    material: '耐刮美耐皿貼面 + 緩衝門片',
    petFriendly: true,
    colorHex: '#D5B895',
    urlSlug: 'https://www.ikea.com.tw',
  },
  {
    id: 'cat_muji_stacking_tv',
    brand: '無印良品 MUJI',
    name: '自由組合層架組 + 軟質藤編收納籃',
    category: 'tv_console',
    widthCm: 162,
    depthCm: 40,
    heightCm: 52,
    priceTWD: 12400,
    material: '橡木貼皮層板 + 天然藤編',
    petFriendly: false,
    colorHex: '#B98F60',
    urlSlug: 'https://www.muji.com/tw',
  },
  {
    id: 'cat_nitori_tv_low',
    brand: '宜得利 NITORI',
    name: 'LOFTY 鐵件胡桃木電視櫃 (150cm)',
    category: 'tv_console',
    widthCm: 150,
    depthCm: 42,
    heightCm: 46,
    priceTWD: 6990,
    material: '鋼骨粉體烤漆 + 耐刮木紋',
    petFriendly: true,
    colorHex: '#7A5438',
    urlSlug: 'https://www.nitori-net.tw',
  },

  // Accent Chairs
  {
    id: 'cat_ikea_strandmon',
    brand: 'IKEA',
    name: 'EKERÖ / VEDBO 簡約單人休閒椅',
    category: 'accent_chair',
    widthCm: 73,
    depthCm: 75,
    heightCm: 76,
    priceTWD: 6490,
    material: '白橡木實木腳 + 耐磨聚酯布',
    petFriendly: true,
    colorHex: '#EAE4D7',
    urlSlug: 'https://www.ikea.com.tw',
  },
  {
    id: 'cat_mrliving_lounge',
    brand: 'MR. LIVING',
    name: 'Hygge 梣木羊羔絨單人主人椅',
    category: 'accent_chair',
    widthCm: 72,
    depthCm: 76,
    heightCm: 82,
    priceTWD: 8990,
    material: '北美梣木實木 + Bouclé 圈絨布',
    petFriendly: false,
    colorHex: '#F2ECE1',
    urlSlug: 'https://www.mrliving.com.tw',
  },

  // Cat Trees
  {
    id: 'cat_nitori_cattower',
    brand: '宜得利 NITORI',
    name: '木質質感劍麻三層貓跳台 (附可拆洗軟墊)',
    category: 'cat_tree',
    widthCm: 58,
    depthCm: 58,
    heightCm: 145,
    priceTWD: 4680,
    material: '加厚橡膠木實木 + 天然劍麻柱',
    petFriendly: true,
    colorHex: '#C99E6B',
    urlSlug: 'https://www.nitori-net.tw',
  },

  // Floor Lamps
  {
    id: 'cat_ikea_lauters',
    brand: 'IKEA',
    name: 'SKAFTET / LAUTERS 黃銅亞麻弧形立燈',
    category: 'floor_lamp',
    widthCm: 42,
    depthCm: 42,
    heightCm: 178,
    priceTWD: 5490,
    material: '拉絲黃銅支架 + 石材底座 + 亞麻燈罩',
    petFriendly: true,
    colorHex: '#C8A464',
    urlSlug: 'https://www.ikea.com.tw',
  },

  // Beds & Wardrobes for Bedroom preset
  {
    id: 'cat_muji_bed',
    brand: '無印良品 MUJI',
    name: '白橡木標準雙人床架 (5×6.2尺)',
    category: 'bed',
    widthCm: 155,
    depthCm: 196,
    heightCm: 85,
    priceTWD: 16800,
    material: '白橡木貼皮實木腳',
    petFriendly: true,
    colorHex: '#D1B086',
    urlSlug: 'https://www.muji.com/tw',
  },
  {
    id: 'cat_ikea_pax',
    brand: 'IKEA',
    name: 'PAX 推拉門淺木系統衣櫃 (150cm)',
    category: 'wardrobe',
    widthCm: 150,
    depthCm: 60,
    heightCm: 201,
    priceTWD: 18500,
    material: '推拉門省迴轉空間 + E1 低甲醛板材',
    petFriendly: true,
    colorHex: '#E8E3DA',
    urlSlug: 'https://www.ikea.com.tw',
  },
];

export const TAIWAN_RENOVATION_RATES = {
  // Per 尺 (30.3cm width) for Taiwan system cabinet (系統櫃體)
  systemCabinetPerChiMin: 4800,
  systemCabinetPerChiMax: 7500,
  // Per 坪 (3.3058 m^2) for entryway tile dust zone (玄關六角磚/落塵區)
  entrywayDustZoneMin: 18000,
  entrywayDustZoneMax: 32000,
  // Lighting package (無主燈嵌燈 + 間接燈帶材料與安裝估算)
  recessedLightingMin: 12000,
  recessedLightingMax: 24000,
  indirectCoveMin: 8000,
  indirectCoveMax: 16000,
};
