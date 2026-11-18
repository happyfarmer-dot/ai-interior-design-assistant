# 築境 AI｜專業室內空間設計與物理尺度規劃助手 (AI Interior Design & Space Planning Assistant)

一款結合**空間物理邏輯**與**商業落地參考價值**的專業級 AI 室內空間設計與裝潢輔助工作台。不僅提供風格渲染對比，更整合了空間尺度校準、動線人體工學檢測、結構與機電點位保護遮罩、採光色溫模擬、局部材質替換、軟裝以圖搜物及台灣市場工程 BOM 預算估算。

---

## 核心功能模組（11 大完整實作）

### 基礎四大核心模組
1. **現有傢俱智慧重排與空間優化**：偵測現有傢俱實體尺寸與邊界，生成 3 組最佳化重排方案（含調整理由說明），並提供即時互動式 **2D CAD 俯視平面圖** 拖拽／旋轉微調。
2. **多元風格轉換與模擬圖生成**：內建「北歐簡約」、「日式侘寂」、「現代極簡」、「工業風」、「無印原木風」、「美式輕奢」6 大風格與風格強度滑桿（0%～100% 保留原格局比例），支援 **Before / After 左右滑動對比**。
3. **新增物件智慧擺放與合成**：支援上傳單品照片或選用內建單品，執行前端即時 **Canvas 智慧去背（Alpha Cutout）** 與長寬高公分數輸入，自動分析空間畸零角標示 1～3 個擺放高亮熱區並透視合成與拖曳微調。
4. **客製化裝潢需求解析（Prompt → JSON Constraints）**：支援標籤與自然語言輸入（如「兩隻貓需防抓耐磨材質與貓跳台動線」、「預算上限 30 萬台幣」、「增加玄關落塵區」），即時解析為結構化 JSON 約束並注入後續檢測與預算管線。

### 進階物理限制與商業落地模組
5. **空間尺度校準模組**：提供「標準房門 210cm」、「插座面板 12cm」、「A4 紙 29.7cm」與自訂參照線拉線工具，建立 `Pixel-to-CM` 物理比例尺與可調式 **3D 地面透視網格**。
6. **動線淨寬與人體工學自動檢測**：依據比例尺自動計算並以 **紅 / 黃 / 綠燈** 提示主要走道淨寬（≥ 75cm 綠燈 / < 60cm 紅燈）、房門 85cm 開啟半徑碰撞檢查與視聽距離建議螢幕吋數。
7. **不可更動結構與機電點位鎖定**：提供筆刷遮罩、多邊形遮罩與 AI 自動辨識，鎖定結構樑柱、採光窗戶、冷氣室內機出風口、配電箱與重要插座，避免生成或擺放遮擋。
8. **自然採光時段與人工照明色溫模擬**：可切換東向晨光 / 西曬午後 / 北向柔和光 / 夜間模式，以及 `3000K` / `4000K` / `6000K` 色溫與無主燈嵌燈、間接燈帶光影效果。
9. **局部材質精準替換**：在不更動傢俱結構前提下，點選地板、主牆面、沙發布料或窗簾單獨替換材質（如超耐磨橡木、人字拼、微水泥、水磨石、防貓抓科技布等）。
10. **軟裝單品「以圖搜物」與相似品推薦**：串接 IKEA、無印良品 MUJI、宜得利 NITORI、MR. LIVING、有情門實體規格資料庫，依空間尺寸計算適配度（Fit Score %）與防抓條件。
11. **粗估工程與軟裝物料清單（BOM & 預算評估）**：依據空間校準坪數自動彙整表面材與採購明細、對比預算上限，並明確標註參考範圍聲明，支援匯出 **A4 PDF 設計企劃書** 與 JSON 規格檔。

---

## 系統架構與檔案目錄

```text
src/
├── types/planner.ts                  # 全系統領域模型與 Undo/Redo 快照型別定義
├── data/
│   ├── presets.ts                    # 台灣屋況實景案例、6 大風格庫、材質庫與保護區分類
│   └── catalog.ts                    # IKEA / MUJI / NITORI 等實體規格資料庫與市場行情
├── services/
│   ├── ai/
│   │   ├── interfaces.ts             # IVisionService / IRenderingService / IConstraintParserService / IProductSearchService
│   │   ├── config.ts                 # Mock 引擎與 Live REST API 端點抽象設定
│   │   ├── visionService.ts          # 物件偵測與 MEP 保護區自動辨識服務
│   │   ├── constraintParser.ts       # 自然語言需求轉結構化 JSON 約束解析服務
│   │   ├── renderingService.ts       # 重排方案生成、風格遷移與擺放熱區演算服務
│   │   └── productSearchService.ts   # 以圖搜物尺寸比對與 BOM 預算計算引擎
│   └── physics/
│       ├── scaleEngine.ts            # Pixel-to-CM 比例尺、坪數推算與 3D 透視網格投影
│       └── ergonomicsEngine.ts       # 走道淨寬、門片迴轉弧線碰撞與 MEP 衝突物理引擎
├── state/usePlannerStore.ts          # 集中式狀態管理、Undo/Redo 歷史堆疊與版本快照
├── utils/
│   ├── imageProcessing.ts            # HTML5 Canvas BFS 智慧去背與程序化風格渲染
│   └── proposalExport.ts             # JSON 規格匯出輔助工具
└── components/
    ├── layout/                       # TopBar 步驟列、LeftToolRail CAD 工具列、RightInspector
    ├── canvas/                       # SpatialCanvas 多圖層互動視口、FloorPlan2D 平面圖
    ├── panels/                       # Step 1~4 對應功能控制側邊面板
    └── modals/                       # 版本快照管理、AI 管線設定、A4 PDF 企劃書預覽
```

---

## 本地開發與建置

```bash
npm install
npm run dev
```

建置生產版本：

```bash
npm run build
```

環境變數請參考 [`.env.example`](./.env.example) 設定真實 VLM / Diffusion / LLM API 端點。
