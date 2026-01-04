# 專案管理系統 Vibe Coding 規格書

**版本：** v1.0  
**目標用戶：** 10人以內團隊  
**專案週期：** 兩年長期專案  
**技術棧：** React + Supabase

---

## 📋 一、系統概述

### 1.1 核心目標
為 10 人小團隊提供輕量級專案管理工具，追蹤「誰在做什麼」、「什麼時候要完成」、「有沒有按時完成」。

### 1.2 核心價值
- ✅ 輕量、直覺、快速
- ✅ 視覺化任務狀態和時間分佈
- ✅ 團隊即時協作同步
- ✅ 避免任務遺漏或重複

### 1.3 技術架構
```
前端：React (Artifact)
後端：Supabase (PostgreSQL + Realtime)
部署：Vercel / Netlify (可選)
儲存：Supabase Database
認證：Supabase Auth (Email/Password)
```

---

## 📊 二、資料結構

### 2.1 Task 資料表

```javascript
Task = {
  // 基本資訊
  id: "uuid",                      // 主鍵
  title: "任務標題",                // 必填，文字
  description: "任務內容描述",      // 選填，文字
  assignee: "工作負責人名稱",       // 必填，文字
  
  // 狀態與時間
  status: "todo" | "in_progress" | "review" | "done",  // 必填
  start_date: "2026-01-01",        // 必填，日期
  end_date: "2026-01-15",          // 必填，日期
  
  // 完成紀錄
  completed_at: "2026-01-14T10:30:00Z",  // 自動記錄
  completed_by: "王小明",                 // 自動記錄
  
  // 軟刪除
  is_deleted: false,               // 布林值
  deleted_at: null,                // 時間戳或 null
  deleted_by: null,                // 文字或 null
  
  // 系統欄位
  created_by: "uuid",              // 外鍵關聯 auth.users
  created_at: "2026-01-01T09:00:00Z",  // 自動記錄
  updated_at: "2026-01-14T10:30:00Z"   // 自動記錄
}
```

### 2.2 狀態定義

```
todo (待辦)
  ↓ 拖曳
in_progress (進行中)
  ↓ 拖曳
review (檢核中) ← 此狀態不可刪除任務
  ↓ 拖曳
done (完成)
```

### 2.3 Supabase SQL Schema

```sql
-- 建立任務表
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee text not null,
  status text not null default 'todo' 
    check (status in ('todo', 'in_progress', 'review', 'done')),
  start_date date not null,
  end_date date not null,
  
  completed_at timestamp with time zone,
  completed_by text,
  
  is_deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 開啟即時同步
alter publication supabase_realtime add table tasks;

-- 啟用 Row Level Security
alter table tasks enable row level security;

-- 權限政策：所有人可讀取未刪除的任務
create policy "Anyone can read active tasks"
  on tasks for select
  using (is_deleted = false);

-- 權限政策：登入用戶可新增任務
create policy "Authenticated users can insert"
  on tasks for insert
  with check (auth.role() = 'authenticated');

-- 權限政策：任務建立者可更新
create policy "Users can update their own tasks"
  on tasks for update
  using (auth.uid() = created_by);

-- 權限政策：任務建立者可刪除（軟刪除）
create policy "Users can delete their own tasks"
  on tasks for update
  using (auth.uid() = created_by);

-- 自動更新 updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_tasks_updated_at
  before update on tasks
  for each row
  execute function update_updated_at();
```

---

## 🎨 三、功能模組

### 3.1 Task Board（任務看板）

#### 3.1.1 佈局結構
```
┌──────────────────────────────────────────────────────┐
│  [+ 新增任務]                    [Task Board] [甘特圖] │
├─────────┬─────────┬─────────┬─────────┬─────────────┤
│  待辦    │ 進行中   │ 檢核中   │  完成   │   [設定▼]   │
│ (todo)  │(progress)│(review) │ (done)  │             │
├─────────┼─────────┼─────────┼─────────┤             │
│┌───────┐│┌───────┐│┌───────┐│┌───────┐│   - 完成紀錄│
││任務卡片│││任務卡片│││任務卡片│││任務卡片││   - 回收站  │
│└───────┘│└───────┘│└───────┘│└───────┘│   - 登出    │
│         │         │         │         │             │
│┌───────┐│         │┌───────┐│┌───────┐│             │
││任務卡片││         ││任務卡片│││任務卡片││             │
│└───────┘│         │└───────┘│└───────┘│             │
└─────────┴─────────┴─────────┴─────────┴─────────────┘
```

#### 3.1.2 任務卡片設計
```
┌─────────────────────────────┐
│ 🎯 設計 UI 介面       [編輯][X]│ ← 標題 + 操作按鈕
│ ─────────────────────────── │
│ 👤 王小明                    │ ← 負責人
│ 📅 2026/01/05 ~ 2026/01/15  │ ← 日期範圍
│ ─────────────────────────── │
│ 📝 完成首頁、任務頁面的      │ ← 內容摘要（最多2行）
│    設計稿，包含 RWD...      │
└─────────────────────────────┘
```

**顏色配置：**
```css
待辦 (todo)         → 背景: #F3F4F6  邊框: #D1D5DB
進行中 (in_progress) → 背景: #DBEAFE  邊框: #3B82F6
檢核中 (review)      → 背景: #FEF3C7  邊框: #F59E0B
完成 (done)         → 背景: #D1FAE5  邊框: #10B981
```

#### 3.1.3 核心功能

**F1. 新增任務**
```
觸發：點擊「+ 新增任務」按鈕
顯示：彈出表單對話框

表單欄位：
┌─────────────────────────────┐
│ ✏️ 新增任務                  │
│ ─────────────────────────── │
│ 標題 *                       │
│ [________________]           │
│                              │
│ 負責人 *                     │
│ [________________]           │
│                              │
│ 起始日期 *      結束日期 *    │
│ [📅 選擇]      [📅 選擇]     │
│                              │
│ 任務內容（選填）              │
│ [________________]           │
│ [________________]           │
│ [________________]           │
│                              │
│      [取消]  [建立任務]       │
└─────────────────────────────┘

驗證規則：
- 標題：必填，最多 100 字
- 負責人：必填，最多 50 字
- 起始日期：必填
- 結束日期：必填，須 >= 起始日期
- 內容：選填，最多 500 字

建立後：
- 任務出現在「待辦」欄
- 同步到 Supabase
- Realtime 通知其他用戶
```

**F2. 編輯任務**
```
觸發：點擊卡片上的「編輯」按鈕
顯示：彈出表單（同新增表單，預填現有資料）

可修改：所有欄位（包含狀態下拉選單）
儲存後：
- 卡片即時更新
- 甘特圖即時更新
- 同步到 Supabase
```

**F3. 刪除任務**
```
觸發：點擊卡片上的「X」按鈕
限制：檢核中（review）狀態不可刪除

檢核中狀態點擊刪除時：
┌─────────────────────────────┐
│ ⚠️ 無法刪除                  │
│                              │
│ 此任務正在檢核中，           │
│ 請先將狀態改為其他狀態       │
│ 後再刪除。                   │
│                              │
│          [知道了]            │
└─────────────────────────────┘

非檢核中狀態點擊刪除時：
┌─────────────────────────────┐
│ 🗑️ 確認刪除任務？            │
│                              │
│ 「設計 UI 介面」             │
│                              │
│ 刪除後將移至回收站，         │
│ 30 天後永久刪除。            │
│                              │
│      [取消]  [確認刪除]       │
└─────────────────────────────┘

刪除後：
- 卡片從看板消失
- 任務標記為 is_deleted = true
- 記錄 deleted_at 和 deleted_by
- 移至回收站
```

**F4. 拖曳換狀態**
```
操作：拖曳卡片到不同欄位
效果：
- 卡片移動到目標欄
- 更新 task.status
- 同步到 Supabase
- Realtime 通知其他用戶

特殊處理：
當任務拖曳到「完成」欄時：
- 自動記錄 completed_at = 當前時間
- 自動記錄 completed_by = 當前用戶名稱

當任務從「完成」拖回其他狀態時：
┌─────────────────────────────┐
│ ⚠️ 重新開啟已完成任務？       │
│                              │
│ 此操作將清除完成紀錄。       │
│                              │
│      [取消]  [確認重新開啟]   │
└─────────────────────────────┘

確認後：
- completed_at = null
- completed_by = null
```

---

### 3.2 甘特圖（Gantt Chart）

#### 3.2.1 佈局結構
```
┌──────────────────────────────────────────────────────┐
│  視圖：[三個月▼] [一年▼]   時間標記：[今日][本週][本月]│
├──────────────┬───────────────────────────────────────┤
│ 任務清單      │          時間軸                        │
├──────────────┼───────────────────────────────────────┤
│設計 UI       │ 1月        2月        3月              │
│👤 王小明     │ ████████                               │
│              │                                        │
│開發 API      │            ██████████                  │
│👤 李大華     │                                        │
│              │                                        │
│測試部署      │                      ████               │
│👤 陳美玲     │                                        │
└──────────────┴───────────────────────────────────────┘
```

#### 3.2.2 時間軸視圖

**三個月視圖**
```
顯示範圍：連續 90 天
橫軸刻度：以「週」為單位
每天寬度：約 10px
適用場景：近期任務規劃、細節檢視

時間軸示例：
1月                    2月                    3月
W1  W2  W3  W4  W5  W6  W7  W8  W9  W10 W11 W12
```

**一年視圖**
```
顯示範圍：365 天
橫軸刻度：以「月」為單位
每天寬度：約 2.5px
適用場景：整體專案進度、長期規劃

時間軸示例：
1月  2月  3月  4月  5月  6月  7月  8月  9月  10月 11月 12月
```

#### 3.2.3 任務橫條設計

**基本樣式**
```
橫條長度 = (結束日期 - 起始日期) × 每天寬度
橫條高度 = 30px
圓角 = 4px
```

**顏色配置**
```css
待辦 (todo)         → 背景: #D1D5DB  (灰色)
進行中 (in_progress) → 背景: #3B82F6  (藍色)
檢核中 (review)      → 背景: #F59E0B  (橙色)
完成 (done)         → 背景: #10B981  (綠色) + ✅ 圖示
```

**橫條內容**
```
┌─────────────────────────┐
│ 設計 UI 介面             │ ← 任務標題（橫條內部）
└─────────────────────────┘

或（如果橫條太短）

設計 UI 介面  ████  ← 標題在橫條左側
```

**Hover 提示框**
```
滑鼠移到橫條上顯示：
┌─────────────────────────┐
│ 任務：設計 UI 介面       │
│ 負責人：👤 王小明        │
│ 狀態：進行中            │
│ 時間：01/05 ~ 01/15     │
│ 內容：完成首頁、任務... │
└─────────────────────────┘
```

#### 3.2.4 時間標記功能

**F5. 今日線**
```
顯示：紅色垂直虛線
位置：對應當前日期
樣式：
- 顏色: #EF4444
- 寬度: 2px
- 樣式: dashed
- 從頂部到底部貫穿整個圖表
```

**F6. 本週範圍**
```
觸發：點擊「本週」按鈕
顯示：淺藍色背景高亮
範圍：本週一 00:00 ~ 本週日 23:59
樣式：
- 背景色: rgba(59, 130, 246, 0.1)
- 邊框: 2px solid #3B82F6

同時：
- 本週要結束的任務橫條加深顏色
- 或在橫條右側加上 ⚠️ 圖示
```

**F7. 本月範圍**
```
觸發：點擊「本月」按鈕
顯示：淺灰色背景高亮
範圍：本月 1 日 00:00 ~ 本月最後一天 23:59
樣式：
- 背景色: rgba(156, 163, 175, 0.1)
- 邊框: 2px solid #9CA3AF

同時：
- 本月要結束的任務橫條加深顏色
```

#### 3.2.5 互動功能

**點擊橫條**
```
觸發：點擊任務橫條
效果：彈出編輯表單（同 Task Board 編輯功能）
```

**時間對應**
```
Task Board 修改日期 → 甘特圖橫條即時更新長度/位置
甘特圖編輯任務 → Task Board 卡片即時更新日期
```

---

### 3.3 完成紀錄頁

#### 3.3.1 頁面佈局
```
┌──────────────────────────────────────────────────────┐
│  [Task Board] [甘特圖] [完成紀錄]         [設定▼]     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  📊 任務統計                                          │
│  ─────────────────────────────────────────────────── │
│  本週完成：8 個任務                                   │
│  本月完成：25 個任務                                  │
│                                                       │
│  ─────────────────────────────────────────────────── │
│                                                       │
│  🎉 最近完成的任務                                    │
│                                                       │
│  今天                                                 │
│  ✅ 設計 UI 介面                                      │
│     👤 王小明 | 完成於 01/04 14:30                    │
│     📅 原定 01/01-01/04                               │
│                                                       │
│  昨天                                                 │
│  ✅ 開發登入 API                                      │
│     👤 李大華 | 完成於 01/03 16:20                    │
│     📅 原定 01/01-01/05 (提前 2 天)                   │
│                                                       │
│  ✅ 撰寫測試文件                                      │
│     👤 陳美玲 | 完成於 01/03 11:15                    │
│     📅 原定 01/02-01/03 (準時完成)                    │
│                                                       │
│  本週                                                 │
│  ✅ ...                                               │
│                                                       │
│  [載入更多]                                           │
└──────────────────────────────────────────────────────┘
```

#### 3.3.2 顯示邏輯

**時間分組**
```
- 今天
- 昨天
- 本週（不含今天、昨天）
- 上週
- 本月（不含本週）
- 更早（按月份分組）
```

**單個任務顯示**
```
✅ 任務標題
👤 完成人 | 完成於 MM/DD HH:mm
📅 原定 MM/DD-MM/DD (狀態標記)

狀態標記計算：
- 提前完成：完成日期 < 結束日期 → (提前 X 天)
- 準時完成：完成日期 = 結束日期 → (準時完成)
- 延遲完成：完成日期 > 結束日期 → (延遲 X 天)
```

**簡單統計**
```
讀取資料庫：
- status = 'done'
- completed_at BETWEEN 本週一 AND 本週日 → 本週完成數
- completed_at BETWEEN 本月 1 日 AND 本月最後一天 → 本月完成數

顯示：
本週完成：X 個任務
本月完成：Y 個任務
```

---

### 3.4 回收站

#### 3.4.1 頁面佈局
```
┌──────────────────────────────────────────────────────┐
│  🗑️ 回收站                                 [返回]     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  這些任務將在 30 天後永久刪除                          │
│                                                       │
│  ─────────────────────────────────────────────────── │
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ ❌ 設計登入頁面                                  ││
│  │ 👤 王小明 | 刪除於 01/20 15:30                  ││
│  │ 📅 原定 01/15-01/25                             ││
│  │                        [還原] [永久刪除]        ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ ❌ 第三方 API 串接                               ││
│  │ 👤 李大華 | 刪除於 01/18 10:00                  ││
│  │ 📅 原定 01/10-01/20                             ││
│  │                        [還原] [永久刪除]        ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ ❌ 優化資料庫查詢                                ││
│  │ 👤 陳美玲 | 刪除於 01/15 14:20                  ││
│  │ 📅 原定 01/12-01/18                             ││
│  │ ⚠️ 將於 3 天後永久刪除                           ││
│  │                        [還原] [永久刪除]        ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 3.4.2 核心功能

**F8. 顯示已刪除任務**
```
查詢條件：
- is_deleted = true
- deleted_at IS NOT NULL
- deleted_at > (現在 - 30 天)

排序：deleted_at DESC（最近刪除的在最上面）

顯示內容：
- 任務標題
- 刪除人、刪除時間
- 原定日期範圍
- 剩餘天數警告（< 7 天時顯示）
```

**F9. 還原任務**
```
觸發：點擊「還原」按鈕
確認對話框：
┌─────────────────────────────┐
│ 🔄 還原任務？                │
│                              │
│ 「設計登入頁面」             │
│                              │
│ 還原後將回到原本的狀態。     │
│                              │
│      [取消]  [確認還原]       │
└─────────────────────────────┘

還原後：
- is_deleted = false
- deleted_at = null
- deleted_by = null
- 任務重新出現在 Task Board
- 任務重新出現在甘特圖
```

**F10. 永久刪除**
```
觸發：點擊「永久刪除」按鈕
確認對話框：
┌─────────────────────────────┐
│ ⚠️ 永久刪除任務？             │
│                              │
│ 「設計登入頁面」             │
│                              │
│ 此操作無法復原！             │
│                              │
│      [取消]  [確認永久刪除]   │
└─────────────────────────────┘

刪除後：
- 從資料庫真正刪除該記錄
- DELETE FROM tasks WHERE id = ?
```

**F11. 自動清理**
```
背景任務（每日執行）：
DELETE FROM tasks 
WHERE is_deleted = true 
  AND deleted_at < (NOW() - INTERVAL '30 days');

或使用 Supabase Edge Function 定時執行
```

---

### 3.5 使用者認證

#### 3.5.1 登入頁面
```
┌─────────────────────────────┐
│                              │
│     📊 專案管理系統          │
│                              │
│  Email                       │
│  [________________]          │
│                              │
│  密碼                        │
│  [________________]          │
│                              │
│       [登入]                 │
│                              │
│  還沒有帳號？[註冊]          │
└─────────────────────────────┘
```

#### 3.5.2 註冊頁面
```
┌─────────────────────────────┐
│                              │
│     📊 註冊帳號              │
│                              │
│  Email                       │
│  [________________]          │
│                              │
│  密碼                        │
│  [________________]          │
│                              │
│  確認密碼                    │
│  [________________]          │
│                              │
│  姓名                        │
│  [________________]          │
│                              │
│       [註冊]                 │
│                              │
│  已有帳號？[登入]            │
└─────────────────────────────┘
```

---

## 🎯 四、使用者互動流程

### 4.1 新增任務流程
```
1. 點擊「+ 新增任務」
   ↓
2. 填寫表單
   - 標題：設計 UI 介面
   - 負責人：王小明
   - 起始：2026-01-05
   - 結束：2026-01-15
   - 內容：（選填）
   ↓
3. 點擊「建立任務」
   ↓
4. 系統處理
   - 驗證欄位
   - 寫入 Supabase
   - Realtime 同步
   ↓
5. 結果顯示
   - Task Board「待辦」欄出現新卡片
   - 甘特圖出現對應橫條
   - 其他用戶即時看到
```

### 4.2 更新任務進度流程
```
1. 小明開始做任務
   ↓
2. 拖曳卡片：待辦 → 進行中
   ↓
3. 卡片顏色變藍，甘特圖橫條變藍
   ↓
4. 小明完成任務
   ↓
5. 拖曳卡片：進行中 → 檢核中
   ↓
6. 卡片顏色變橙，甘特圖橫條變橙
   ↓
7. 主管檢查 OK
   ↓
8. 拖曳卡片：檢核中 → 完成
   ↓
9. 系統自動記錄
   - completed_at = 當前時間
   - completed_by = 當前用戶
   ↓
10. 卡片移到「完成」欄，橫條變綠色加 ✅
```

### 4.3 週進度追蹤流程
```
1. 週一早會，PM 打開系統
   ↓
2. 切換到 Task Board
   - 快速掃視「進行中」欄
   - 確認大家都在做事
   ↓
3. 切換到甘特圖（三個月視圖）
   ↓
4. 點擊「本週」按鈕
   - 本週範圍高亮顯示
   - 本週要完成的任務標記
   ↓
5. 檢查進度
   - 看「今日線」位置
   - 判斷任務是否落後
   ↓
6. 討論調整
   - 落後的任務重新分配
   - 或延後結束日期
```

### 4.4 月度檢討流程
```
1. 月末，PM 打開系統
   ↓
2. 切換到「完成紀錄」頁
   ↓
3. 查看統計
   - 本月完成：25 個任務
   ↓
4. 展開清單
   - 瀏覽完成的任務
   - 確認沒有遺漏
   ↓
5. 切換到甘特圖（一年視圖）
   ↓
6. 點擊「本月」按鈕
   - 視覺化本月工作分佈
   ↓
7. 規劃下個月
   - 在 Task Board 新增下個月任務
```

---

## 💻 五、技術實作要點

### 5.1 前端框架

**React 元件結構**
```
App
├── AuthProvider (Supabase Auth)
├── Layout
│   ├── Header (導航列)
│   └── Main
│       ├── TaskBoard (條件渲染)
│       ├── GanttChart (條件渲染)
│       ├── CompletedTasks (條件渲染)
│       └── RecycleBin (條件渲染)
└── Modals
    ├── TaskFormModal (新增/編輯)
    ├── ConfirmModal (確認對話框)
    └── AlertModal (警告訊息)
```

**狀態管理**
```javascript
// 全域狀態（使用 React Context 或 Zustand）
{
  tasks: Task[],              // 所有任務
  currentView: 'board' | 'gantt' | 'completed' | 'recycle',
  ganttViewMode: 'quarter' | 'year',
  timeMarker: 'today' | 'week' | 'month',
  user: User | null
}
```

### 5.2 Supabase 整合

**初始化**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**CRUD 操作**
```javascript
// 讀取所有任務
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('is_deleted', false)
  .order('created_at', { ascending: false });

// 新增任務
const { data, error } = await supabase
  .from('tasks')
  .insert({
    title,
    assignee,
    start_date,
    end_date,
    description,
    status: 'todo',
    created_by: user.id
  });

// 更新任務
const { data, error } = await supabase
  .from('tasks')
  .update({ status, updated_at: new Date() })
  .eq('id', taskId);

// 軟刪除
const { data, error } = await supabase
  .from('tasks')
  .update({
    is_deleted: true,
    deleted_at: new Date(),
    deleted_by: user.email
  })
  .eq('id', taskId);
```

**即時同步**
```javascript
// 訂閱任務變更
const channel = supabase
  .channel('tasks-changes')
  .on(
    'postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'tasks',
      filter: 'is_deleted=eq.false'
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setTasks(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setTasks(prev => 
          prev.map(t => t.id === payload.new.id ? payload.new : t)
        );
      } else if (payload.eventType === 'DELETE') {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      }
    }
  )
  .subscribe();

// 清理
return () => {
  supabase.removeChannel(channel);
};
```

### 5.3 關鍵演算法

**甘特圖橫條寬度計算**
```javascript
function calculateBarWidth(startDate, endDate, viewMode) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  const pixelsPerDay = {
    quarter: 10,  // 三個月視圖：10px/天
    year: 2.5     // 一年視圖：2.5px/天
  };
  
  return days * pixelsPerDay[viewMode];
}
```

**橫條起始位置計算**
```javascript
function calculateBarOffset(startDate, viewStartDate, viewMode) {
  const start = new Date(startDate);
  const viewStart = new Date(viewStartDate);
  const days = Math.ceil((start - viewStart) / (1000 * 60 * 60 * 24));
  
  const pixelsPerDay = {
    quarter: 10,
    year: 2.5
  };
  
  return Math.max(0, days * pixelsPerDay[viewMode]);
}
```

**拖曳換狀態邏輯**
```javascript
function handleDrop(taskId, newStatus) {
  const task = tasks.find(t => t.id === taskId);
  
  // 特殊處理：拖到「完成」
  if (newStatus === 'done') {
    return supabase
      .from('tasks')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        completed_by: user.email
      })
      .eq('id', taskId);
  }
  
  // 特殊處理：從「完成」拖回
  if (task.status === 'done' && newStatus !== 'done') {
    // 顯示確認對話框
    if (!confirm('確定要重新開啟此任務嗎？')) return;
    
    return supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: null,
        completed_by: null
      })
      .eq('id', taskId);
  }
  
  // 一般狀態變更
  return supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId);
}
```

### 5.4 響應式設計

**斷點設定**
```css
/* 手機 */
@media (max-width: 768px) {
  /* Task Board 改為單欄垂直排列 */
  /* 甘特圖改為可左右滑動 */
}

/* 平板 */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Task Board 顯示 2 欄 */
}

/* 桌機 */
@media (min-width: 1025px) {
  /* Task Board 顯示 4 欄 */
  /* 甘特圖顯示完整寬度 */
}
```

---

## 🎨 六、UI/UX 設計規範

### 6.1 色彩系統

**主色調**
```
Primary (藍色)：#3B82F6
Success (綠色)：#10B981
Warning (橙色)：#F59E0B
Danger (紅色)：#EF4444
Gray (灰色)：#6B7280
```

**狀態色彩**
```
待辦：#F3F4F6 (淺灰背景) + #D1D5DB (灰邊框)
進行中：#DBEAFE (淺藍背景) + #3B82F6 (藍邊框)
檢核中：#FEF3C7 (淺黃背景) + #F59E0B (橙邊框)
完成：#D1FAE5 (淺綠背景) + #10B981 (綠邊框)
```

### 6.2 字體規範

**字體家族**
```css
font-family: 
  -apple-system, BlinkMacSystemFont, 
  "Segoe UI", "Noto Sans TC", 
  sans-serif;
```

**字體大小**
```
標題 H1：24px (1.5rem)
標題 H2：20px (1.25rem)
標題 H3：18px (1.125rem)
正文：16px (1rem)
小字：14px (0.875rem)
```

### 6.3 間距系統

**使用 Tailwind 間距**
```
px：1px
0.5：2px (0.125rem)
1：4px (0.25rem)
2：8px (0.5rem)
3：12px (0.75rem)
4：16px (1rem)
6：24px (1.5rem)
8：32px (2rem)
```

### 6.4 動畫效果

**拖曳動畫**
```css
.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
  transition: all 0.2s ease;
}
```

**卡片 Hover**
```css
.task-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}
```

**狀態變更動畫**
```css
.status-change {
  animation: pulse 0.5s ease;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## ✅ 七、驗收標準

### 7.1 功能測試

**Task Board**
```
□ 可以新增任務（所有欄位驗證正確）
□ 可以編輯任務
□ 可以拖曳卡片換狀態
□ 檢核中的任務無法刪除（顯示警告）
□ 非檢核中的任務可以刪除（進入回收站）
□ 多人同時操作時即時同步
```

**甘特圖**
```
□ 三個月視圖正確顯示 90 天
□ 一年視圖正確顯示 365 天
□ 橫條長度正確對應任務時間範圍
□ 橫條顏色正確對應任務狀態
□ 今日線顯示在正確位置
□ 本週範圍高亮正確
□ 本月範圍高亮正確
□ 點擊橫條可編輯任務
□ Hover 顯示任務詳細資訊
```

**完成紀錄**
```
□ 正確統計本週完成數
□ 正確統計本月完成數
□ 任務按時間分組顯示（今天/昨天/本週...）
□ 正確顯示完成時間和完成人
□ 正確計算提前/準時/延遲狀態
```

**回收站**
```
□ 顯示所有已刪除任務（30 天內）
□ 可以還原任務
□ 可以永久刪除任務
□ 顯示剩餘天數警告（< 7 天）
```


```

### 7.2 效能測試

```
□ 100 個任務時 Task Board 渲染 < 1 秒
□ 200 個任務時甘特圖渲染 < 2 秒
□ 拖曳操作流暢（60fps）
□ Supabase 同步延遲 < 500ms
□ 首次載入時間 < 3 秒
```

### 7.3 響應式測試

```
□ 手機版（< 768px）佈局正常
□ 平板版（768-1024px）佈局正常
□ 桌機版（> 1024px）佈局正常
□ 橫向/直向切換正常
```

### 7.4 瀏覽器相容性

```
□ Chrome（最新版）
□ Firefox（最新版）
□ Safari（最新版）
□ Edge（最新版）
```

---

## 📦 八、交付清單

### 8.1 程式碼

```
□ React Artifact 完整程式碼
□ Supabase SQL Schema
□ 環境變數設定範例（.env.example）
□ README.md（部署說明）
```

### 8.2 文件

```
□ 本規格書
□ API 串接說明
□ 故障排除指南
□ 使用者操作手冊（可選）
```

### 8.3 測試報告

```
□ 功能測試結果
□ 效能測試結果
□ 瀏覽器相容性測試結果
```

---

## 🚀 九、部署指南

### 9.1 Supabase 設定步驟

```
1. 註冊 Supabase 帳號（supabase.com）
2. 建立新專案
   - 專案名稱：project-manager
   - 資料庫密碼：（自訂）
   - 地區：Singapore
3. 執行 SQL Schema（複製規格書的 SQL）
4. 取得 API 金鑰
   - Project URL
   - anon public key
5. 設定 Row Level Security（RLS）
```

### 9.2 前端部署（Vercel）

```
1. 將程式碼上傳至 GitHub
2. 前往 vercel.com
3. Import GitHub repository
4. 設定環境變數：
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
5. 點擊 Deploy
6. 等待部署完成
7. 取得網址：https://your-app.vercel.app
```

---

## 📝 十、開發優先順序

### Phase 1：核心功能（MVP）
```
1. 資料結構與 Supabase 設定
2. 使用者認證（登入/註冊）
3. Task Board 基本功能
   - 顯示任務卡片
   - 新增任務
   - 編輯任務
   - 拖曳換狀態
4. 即時同步
```

### Phase 2：視覺化
```
5. 甘特圖基本顯示
   - 三個月視圖
   - 一年視圖
   - 橫條渲染
6. 今日線
```

### Phase 3：進階功能
```
7. 刪除與回收站
   - 軟刪除
   - 檢核中禁刪
   - 回收站頁面
8. 完成紀錄頁
9. 時間標記（本週/本月）
```

### Phase 4：優化
```
10. 響應式設計
11. 動畫效果
12. 效能優化
13. 錯誤處理
```

---

## 🎯 **規格書完成！準備開始製作了嗎？** 🚀
