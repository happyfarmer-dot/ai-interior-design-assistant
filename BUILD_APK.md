# Android APK 打包與 Capacitor 原生建置指南

本專案已預先完成 **Vite 純靜態匯出（`base: './'` → `dist/`）** 與 **Capacitor 8 原生外掛整合**，可將「築境 AI 室內空間設計與裝潢輔助系統」直接封裝為 Android APK，並在手機端使用原生相機拍照、相簿挑選與系統原生檔案分享選單（匯出 UTF-8 `.csv` 預算表至 LINE / Google 雲端硬碟 / Excel）。

---

## 1. 已整合的原生外掛與安全機制

| 外掛 / 設定 | 用途 | 對應模組 |
| :--- | :--- | :--- |
| `@capacitor/camera` | 步驟 1 現場拍照匯入、步驟 2 新增單品拍照與相簿選圖 | [nativePlatform.ts](src/utils/nativePlatform.ts) |
| `@capacitor/filesystem` | 將含 UTF-8 BOM 的 BOM 工程預算 `.csv` 寫入手機暫存目錄 (`Directory.Cache`) | [proposalExport.ts](src/utils/proposalExport.ts) |
| `@capacitor/share` | 呼叫 Android 原生分享選單（傳送至 LINE、雲端硬碟或 Excel 開啟） | [proposalExport.ts](src/utils/proposalExport.ts) |
| `capacitor.config.ts` | Application ID: `com.interior.aiassistant`、靜態目錄 `webDir: 'dist'` | [capacitor.config.ts](capacitor.config.ts) |
| API 金鑰隔離 | `USER_GEMINI_API_KEY` 僅儲存於手機裝置端 `localStorage`，不寫入 APK 原始碼 | [geminiService.ts](src/services/geminiService.ts) |

---

## 2. 本機環境前置需求

1. **Node.js 20+** 與 **npm 10+**
2. **JDK 21**（Capacitor 8 與 Gradle 8.x 所需之 Java 版本）
3. **Android Studio**（建議最新穩定版，包含 **Android SDK Platform 35+** 與 **Android SDK Build-Tools**）
4. 設定環境變數（macOS / Linux 範例，Windows 請加入系統環境變數）：
   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
   ```

---

## 3. 完整建置與產生 APK 終端機指令

### 步驟一：安裝相依套件
```bash
npm install
```

### 步驟二：產生 `android/` 原生專案資料夾（初次建置執行一次）
```bash
npx cap add android
```
> 若已定義 NPM Script，也可執行 `npm run cap:add:android`。

### 步驟三：編譯前端靜態資源並同步至 Android 專案
```bash
npm run build:android
```
此指令會依序執行：
1. `npm run build`（TypeScript 型別檢查 + Vite 靜態編譯輸出至 `dist/`）
2. `npx cap sync android`（複製 `dist/` 至 Android `assets/public` 並同步所有 Capacitor 原生外掛）

### 步驟四：檢查並補齊 Android 權限（`AndroidManifest.xml`）
確認 `android/app/src/main/AndroidManifest.xml` 中包含網路、相機與媒體讀取權限，以及 `@capacitor/camera` / `@capacitor/share` 所需的 `FileProvider`：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<!-- Android 13 (API 33+) 相簿權限 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<!-- Android 12 以下相容寫入/讀取權限 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
```

若 `android/app/src/main/res/xml/file_paths.xml` 尚未包含 `<cache-path>`（供 `@capacitor/share` 讀取 `Directory.Cache` 中的 `.csv`），請確認內容如下：
```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="." />
    <cache-path name="my_cache" path="." />
</paths>
```

### 步驟五：直接透過指令列編譯 Debug APK
```bash
cd android
./gradlew assembleDebug
```
編譯成功後，可直接於以下路徑取得可安裝之 Debug APK：
* **`android/app/build/outputs/apk/debug/app-debug.apk`**

若電腦已透過 USB 連接 Android 手機（已開啟 USB 偵錯模式），可直接安裝測試：
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 步驟六：開啟 Android Studio 或建置簽章 Release APK / AAB
* 使用 Android Studio 圖形介面開啟專案：
  ```bash
  npx cap open android
  ```
* 或使用指令列產生 Release 版（需先於 `android/app/build.gradle` 或 Android Studio 設定 Keystore 簽章）：
  ```bash
  cd android
  ./gradlew assembleRelease
  # Google Play 上架用 AAB 格式：
  ./gradlew bundleRelease
  ```

---

## 4. 使用流程與金鑰安全說明

* 安裝開啟 App 後，點擊右上角 **「⚙️ API 設定」** 貼上使用者自己的 Gemini API Key 並點擊 **「測試連線」** 即可啟用 `gemini-2.5-flash` 空間分析／BOM 報價與 `gemini-2.5-flash-image` 實景重繪。
* 若未輸入金鑰或手機處於離線狀態，App 會**自動降級使用本地 Canvas 模擬引擎**，確保所有規劃與預算估算流程仍可流暢操作而不中斷。
