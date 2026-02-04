# 專案管理系統 (Project Management System)

這是一個為 10 人以下小團隊設計的輕量級專案管理工具，旨在解決「誰在做什麼」、「何時完成」以及「進度追蹤」的問題。結合了看板（Kanban）與甘特圖（Gantt Chart）的優點，並透過 Supabase 實現即時協作。

## ✨ 核心功能

### 1. 📋 任務看板 (Task Board)
- **直覺拖曳**：使用 `dnd-kit` 實現流暢的卡片拖曳體驗。
- **四階段狀態**：
  - `待辦 (Todo)`
  - `進行中 (In Progress)`
  - `檢核中 (Review)`：設有保護機制，此狀態不可直接刪除任務。
  - `完成 (Done)`
- **權限控管**：即時驗證使用者權限。
- **即時同步**：所有操作透過 Supabase Realtime 即時更新給所有在線成員。

### 2. 📊 甘特圖 (Gantt Chart)
- **多種視圖**：支援「三個月（週刻度）」與「一年（月刻度）」切換。
- **視覺化進度**：直觀顯示任務的時間跨度與重疊狀況，不同狀態顯示不同顏色。
- **時間輔助線**：
  - 🔴 **今日線**：紅色虛線標示當前日期。
  - 🟦 **區間高亮**：點擊按鈕可高亮顯示「本週」與「本月」範圍，方便檢視近期工作。

### 3. 📝 完成紀錄 (Completion Records)
- **歷史查詢**：詳細記錄任務的完成時間與執行人員。
- **績效統計**：Dashboard 顯示本週與本月的任務完成數量。
- **智慧標籤**：系統自動計算並標示任務是「🎯 準時完成」、「⚡ 提前完成」還是「⚠️ 延遲完成」。

### 4. 🗑️ 回收站 (Recycle Bin)
- **軟刪除機制**：刪除的任務會先移至回收站，不會立即消失。
- **還原功能**：可隨時將誤刪的任務一鍵還原回看板。
- **永久刪除**：支援手動永久刪除，或待系統保留 30 天後自動清理。

## 🛠️ 技術棧
- **核心框架**：React 19, TypeScript, Vite
- **UI 樣式**：Tailwind CSS v4, Lucide React (Icons)
- **後端服務**：Supabase (PostgreSQL Database + Realtime + Auth)
- **關鍵套件**：
  - `@dnd-kit`：處理複雜的拖曳交互
  - `date-fns`：強大的日期處理庫
  - `react-router-dom`：SPA 路由管理

## 🚀 快速開始

### 環境需求
- Node.js (v18 或更高版本)
- Supabase 帳號與專案

### 安裝步驟

1. **Clone 專案**
   ```bash
   git clone https://github.com/ChaosEmily/Tool_PM.git
   cd Tool_PM
   ```

2. **安裝依賴套件**
   ```bash
   npm install
   ```

3. **設定環境變數**
   複製 `.env.example` 或直接建立 `.env` 檔案，填入您的 Supabase 連線資訊：
   ```env
   VITE_SUPABASE_URL=您的_Supabase_Project_URL
   VITE_SUPABASE_ANON_KEY=您的_Supabase_Anon_Key
   ```

4. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

## 📄 資料庫設定
本專案依賴 Supabase 的資料表結構。詳細的 SQL Schema 與 RLS (Row Level Security) 設定，請參考專案中的 [specification.md](./specification.md) 文件。

---
**Version**: v1.0
