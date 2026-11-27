import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || "425242c0-587d-81a3-8cc1-fc26daa9553e";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query, country, region, sort = "date" } = req.query;

    const filter = { and: [] };

    if (query) {
      filter.and.push({
        property: "Name",
        title: { contains: query },
      });
    }
    if (country) {
      filter.and.push({
        property: "Country",
        select: { equals: country },
      });
    }
    if (region) {
      filter.and.push({
        property: "Region",
        rich_text: { contains: region },
      });
    }

    const sorts = [];
    if (sort === "date") {
      sorts.push({ property: "Date Drunk", direction: "descending" });
    } else if (sort === "country") {
      sorts.push({ property: "Country", direction: "ascending" });
    } else if (sort === "region") {
      sorts.push({ property: "Region", direction: "ascending" });
    }

    const response = await notion.databases.query({
      database_id: DATA_SOURCE_ID,
      filter: filter.and.length ? filter : undefined,
      sorts: sorts.length ? sorts : undefined,
      page_size: 50,
    });

    const wines = response.results.map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        name: p.Name?.title?.[0]?.plain_text || "未命名",
        type: p.Type?.select?.name || "",
        winery: p.Winery?.rich_text?.[0]?.plain_text || "",
        vintage: p.Vintage?.number || null,
        grapes: (p["Grape Varieties"]?.multi_select || []).map((g) => g.name),
        region: p.Region?.rich_text?.[0]?.plain_text || "",
        subregion: p.Subregion?.rich_text?.[0]?.plain_text || "",
        country: p.Country?.select?.name || "",
        purchasePrice: p["Purchase Price"]?.number || null,
        onlinePrice: p["Online Price"]?.number || null,
        notes: p.Notes?.rich_text?.[0]?.plain_text || "",
        dateDrunk: p["Date Drunk"]?.date?.start || null,
        url: page.url,
      };
    });

    return res.status(200).json({ success: true, wines });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
