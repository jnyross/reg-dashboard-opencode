import { XMLParser } from "fast-xml-parser";
import TurndownService from "turndown";
import { RegulatorySource, sources } from "./sources";

export interface CrawledItem {
  sourceId: string;
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  extractedAt: string;
}

export interface CrawlResult {
  sourceId: string;
  items: CrawledItem[];
  errors: string[];
  crawledAt: string;
}

const turndownService = new TurndownService();
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchWithTimeout(
  url: string,
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/html, application/json",
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRSSFeed(xml: string): CrawledItem[] {
  const parsed = xmlParser.parse(xml);
  const items: CrawledItem[] = [];

  const channel = parsed?.rss?.channel || parsed?.feed;
  if (!channel) return [];

  const itemList = channel.item || channel.entry || [];
  const itemsArray = Array.isArray(itemList) ? itemList : [itemList];

  for (const item of itemsArray) {
    const title = item.title?.["#text"] || item.title || "";
    const link = item.link?.["@_href"] || item.link || "";
    const description =
      item.description?.["#text"] ||
      item.description ||
      item.summary?.["#text"] ||
      item.summary ||
      "";
    const content =
      item["content:encoded"] ||
      item.content?.["#text"] ||
      item.content ||
      description;
    const pubDate = item.pubDate || item.published || item.updated || "";

    if (title && (link || content)) {
      items.push({
        sourceId: "",
        url: Array.isArray(link) ? link[0]?.["@_href"] || link[0] || "" : link,
        title: String(title).trim(),
        content: String(content).trim(),
        publishedDate: pubDate ? new Date(pubDate).toISOString() : undefined,
        extractedAt: new Date().toISOString(),
      });
    }
  }

  return items;
}

async function fetchHTMLPage(url: string): Promise<string> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}

function extractFromHTML(html: string, sourceId: string): CrawledItem[] {
  const items: CrawledItem[] = [];
  const content = turndownService.turndown(html);

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Unknown";

  if (content.length > 100) {
    items.push({
      sourceId,
      url: sources.find((s) => s.id === sourceId)?.url || "",
      title,
      content: content.substring(0, 5000),
      extractedAt: new Date().toISOString(),
    });
  }

  return items;
}

export async function crawlSource(source: RegulatorySource): Promise<CrawlResult> {
  const result: CrawlResult = {
    sourceId: source.id,
    items: [],
    errors: [],
    crawledAt: new Date().toISOString(),
  };

  try {
    if (source.type === "rss" || source.type === "search") {
      const response = await fetchWithTimeout(source.url);
      if (!response.ok) {
        result.errors.push(`HTTP ${response.status}: ${response.statusText}`);
        return result;
      }
      const xml = await response.text();
      const parsedItems = parseRSSFeed(xml);
      result.items = parsedItems.map((item) => ({
        ...item,
        sourceId: source.id,
      }));
    } else if (source.type === "html") {
      const html = await fetchHTMLPage(source.url);
      const items = extractFromHTML(html, source.id);
      result.items = items.map((item) => ({
        ...item,
        sourceId: source.id,
      }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Crawl failed: ${message}`);
  }

  return result;
}

export async function crawlAllSources(
  sourceIds?: string[]
): Promise<CrawlResult[]> {
  const targetSources = sourceIds
    ? sources.filter((s) => sourceIds.includes(s.id))
    : sources;

  const results: CrawlResult[] = [];

  for (const source of targetSources) {
    const result = await crawlSource(source);
    results.push(result);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}
