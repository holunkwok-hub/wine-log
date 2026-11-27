import { Client } from "@notionhq/client";
import OpenAI from "openai";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 用 xAI Grok（OpenAI 兼容接口）
const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || "425242c0-587d-81a7-b97c-000b546b91df";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, analyzeOnly, notes, purchasePrice, onlinePrice, name, type, winery, vintage, grapes, region, country } = req.body;

    if (!imageBase64 && !analyzeOnly) {
      return res.status(400).json({ error: "Missing image" });
    }

    if (analyzeOnly) {
      if (!imageBase64) return res.status(400).json({ error: "Missing image for analysis" });
      const analysis = await analyzeWineLabel(imageBase64);
      return res.status(200).json({ success: true, analysis });
    }

    let analysis = {
      name: name || "未命名酒",
      type: type || "其他",
      winery: winery || "",
      vintage: vintage ? Number(vintage) : null,
      grapes: grapes ? grapes.split(",").map(g => g.trim()).filter(Boolean) : [],
      region: region || "",
      country: country || "其他",
      notes: notes || "",
    };

    if (!name && imageBase64) {
      analysis = { ...analysis, ...(await analyzeWineLabel(imageBase64)) };
    }

    const page = await createNotionPage({
      ...analysis,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      onlinePrice: onlinePrice ? Number(onlinePrice) : null,
    });

    return res.status(200).json({
      success: true,
      pageUrl: page.url,
      analysis,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Failed to process" });
  }
}

async function analyzeWineLabel(imageBase64) {
  const response = await openai.chat.completions.create({
    model: "grok-4.1-fast",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `你是一個專業的酒標分析助手。請仔細分析這張酒標相片，抽出以下資訊，並以嚴格的 JSON 格式回傳（不要有其他文字）：

{
  "name": "酒名（盡量完整）",
  "type": "紅酒" | "白酒" | "粉紅酒" | "汽酒" | "加強酒" | "其他",
  "winery": "酒莊名稱",
  "vintage": 年份數字或 null,
  "grapes": ["葡萄品種1", "葡萄品種2"],
  "region": "產區",
  "country": "法國" | "義大利" | "西班牙" | "德國" | "澳洲" | "美國" | "其他",
  "alcohol": 酒精含量數字或 null,
  "notes": "簡短描述或品酒提示（可留空）"
}

如果某項資料看不清或不確定，請填 null 或最合理的猜測。`,
          },
          {
            type: "image_url",
            image_url: { url: imageBase64 },
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content.replace(/```json|```/g, "").trim());
  } catch {
    return { name: "未能識別的酒", type: "其他", notes: content };
  }
}

async function createNotionPage(data) {
  const properties = {
    Name: { title: [{ text: { content: data.name || "未命名酒" } }] },
  };

  if (data.type) properties.Type = { select: { name: data.type } };
  if (data.winery) properties.Winery = { rich_text: [{ text: { content: data.winery } }] };
  if (data.vintage) properties.Vintage = { number: data.vintage };
  if (data.grapes && data.grapes.length) {
    properties["Grape Varieties"] = {
      multi_select: data.grapes.map((g) => ({ name: g })),
    };
  }
  if (data.region) properties.Region = { rich_text: [{ text: { content: data.region } }] };
  if (data.country) properties.Country = { select: { name: data.country } };
  if (data.alcohol) properties["Alcohol %"] = { number: data.alcohol };
  if (data.purchasePrice) properties["Purchase Price"] = { number: data.purchasePrice };
  if (data.onlinePrice) properties["Online Price"] = { number: data.onlinePrice };
  if (data.notes) properties.Notes = { rich_text: [{ text: { content: data.notes } }] };

  properties.Status = { select: { name: "已飲" } };

  const response = await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID },
    properties,
    icon: { type: "emoji", emoji: "🍷" },
  });

  return response;
}
