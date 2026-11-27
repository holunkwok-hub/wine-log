# Wine Log PWA - 完整版（前端 + Vercel 後端）

影相 → AI 自動分析酒標 → 寫入你的 Notion Database。

## 檔案結構
- `index.html` — 前端 PWA
- `api/analyze.js` — Vercel Serverless Function（AI 分析 + Notion 寫入）
- `package.json` / `vercel.json`
- `manifest.json`

## 部署到 Vercel（推薦）

1. 把整個資料夾上傳到 GitHub repo
2. 到 [vercel.com](https://vercel.com) 匯入該 repo
3. 在 Vercel 專案設定 → Environment Variables 加入：

   | Name | Value |
   |------|-------|
   | `NOTION_TOKEN` | 你的 Notion Integration Secret（`secret_...` 或 `ntn_...`） |
   | `OPENAI_API_KEY` | 你的 OpenAI API Key（支援 gpt-4o Vision） |
   | `NOTION_DATA_SOURCE_ID` | `425242c0-587d-81a7-b97c-000b546b91df`（已預設，可選） |

4. Deploy 完成後，用手機打開你的 Vercel URL，就可以「加到主畫面」當 App 用。

## Notion 設定（必做）
1. 到 https://www.notion.so/my-integrations 建立 Internal Integration
2. 複製 Secret
3. 打開 Wine Log database → `...` → Connections → 加你的 Integration

## 使用方式
1. 打開網頁
2. 影酒標相或選相簿
3. 可選填個人 Notes / 買價 / 網上價
4. 按「儲存到 Notion」
5. AI 會分析標籤並自動建立記錄

## 注意
- 目前後端使用 OpenAI gpt-4o 做 Vision 分析。
- 相片本身尚未自動上傳到 Notion Files（需要額外 File Upload API 步驟，可之後加）。
- 分析結果會盡量對應你 database 的選項（類型、國家、葡萄品種等）。

## 本地測試
```bash
npm install
npx vercel dev
```

需要我再加「自動上傳相片到 Notion」或「上網查價錢」功能嗎？
