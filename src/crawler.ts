import crypto from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import TurndownService from "turndown";
import { RegulatorySource, sources, twitterSearchSources } from "./sources";
import { crawlTwitterSearchSource } from "./twitter-crawler";

export interface CrawledItem {
  sourceId: string;
  sourceName: string;
  sourceDescription: string;
  sourceJurisdictionCountry?: string;
  sourceJurisdictionState?: string;
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

const MAX_TEXT_LENGTH = 12_000;
const CRAWL_TIMEOUT_MS = Number(process.env.CRAWL_TIMEOUT_MS || 90_000);
const CRAWL_RETRIES = Number(process.env.CRAWL_RETRIES || 3);
const TWITTER_INTER_QUERY_DELAY_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = CRAWL_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch with retries for transient failures */
async function fetchWithRetry(url: string, timeoutMs = CRAWL_TIMEOUT_MS): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CRAWL_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (response.ok) return response;

      // Retry transient server / rate-limit responses
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } else {
        return response;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < CRAWL_RETRIES) {
      const backoffMs = 2000 * attempt;
      await sleep(backoffMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Strip HTML tags and collapse whitespace (simpler, more robust than turndown for some pages) */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract meta description / og:description as fallback content */
function extractMetaContent(html: string): string {
  const parts: string[] = [];

  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  if (ogDesc?.[1]) parts.push(ogDesc[1]);

  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (metaDesc?.[1]) parts.push(metaDesc[1]);

  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) parts.push(ogTitle[1]);

  return parts.join(" | ");
}

function parseRSSFeed(xml: string, source: RegulatorySource): CrawledItem[] {
  const parsed = xmlParser.parse(xml);
  const items: CrawledItem[] = [];

  const channel = parsed?.rss?.channel || parsed?.feed;
  if (!channel) return [];

  const itemList = channel.item || channel.entry || [];
  const itemsArray = Array.isArray(itemList) ? itemList : [itemList];

  const MAX_ITEMS_PER_FEED = 10;
  for (const item of itemsArray) {
    if (items.length >= MAX_ITEMS_PER_FEED) break;

    const title = item.title?.["#text"] || item.title || "";
    const link = item.link?.["@_href"] || item.link || "";
    const description =
      item.description?.["#text"] ||
      item.description ||
      item.summary?.["#text"] ||
      item.summary ||
      "";
    const rawContent =
      item["content:encoded"] ||
      item.content?.["#text"] ||
      item.content ||
      description;
    const pubDate = item.pubDate || item.published || item.updated || "";

    if (title && (link || rawContent)) {
      let pubDateIso: string | undefined;
      try {
        pubDateIso = pubDate ? new Date(pubDate).toISOString() : undefined;
      } catch { pubDateIso = undefined; }

      const cleanContent = stripHtml(String(rawContent));

      items.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceDescription: source.description,
        sourceJurisdictionCountry: source.jurisdictionCountry,
        sourceJurisdictionState: source.jurisdictionState,
        url: Array.isArray(link) ? link[0]?.["@_href"] || link[0] || "" : link,
        title: String(title).trim(),
        content: cleanContent.substring(0, MAX_TEXT_LENGTH),
        publishedDate: pubDateIso,
        extractedAt: new Date().toISOString(),
      });
    }
  }

  return items;
}

function extractFromHTML(html: string, source: RegulatorySource): CrawledItem[] {
  const items: CrawledItem[] = [];

  let content: string;
  try {
    const turndownContent = turndownService.turndown(html);
    const strippedContent = stripHtml(html);
    content = turndownContent.length > strippedContent.length ? turndownContent : strippedContent;
  } catch {
    content = stripHtml(html);
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : source.name;

  if (content.length < 200) {
    const metaContent = extractMetaContent(html);
    const enrichment = [
      `Source: ${source.name}`,
      `Description: ${source.description}`,
      `Jurisdiction: ${source.jurisdictionCountry}${source.jurisdictionState ? " / " + source.jurisdictionState : ""}`,
      metaContent ? `Meta: ${metaContent}` : "",
    ].filter(Boolean).join("\n");
    content = `${enrichment}\n\n${content}`;
  }

  if (content.length > 0) {
    items.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceDescription: source.description,
      sourceJurisdictionCountry: source.jurisdictionCountry,
      sourceJurisdictionState: source.jurisdictionState,
      url: source.url,
      title,
      content: content.substring(0, MAX_TEXT_LENGTH),
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
    if (source.type === "twitter_search") {
      const bearerToken = process.env.X_BEARER_TOKEN;
      if (!bearerToken) {
        result.errors.push("X_BEARER_TOKEN not set");
        return result;
      }
      result.items = await crawlTwitterSearchSource(source, bearerToken);
    } else if (source.type === "rss" || source.type === "search") {
      const response = await fetchWithRetry(source.url);
      if (!response.ok) {
        result.errors.push(`HTTP ${response.status}: ${response.statusText}`);
        return result;
      }
      const xml = await response.text();
      result.items = parseRSSFeed(xml, source);
    } else if (source.type === "html") {
      const response = await fetchWithRetry(source.url);
      if (!response.ok) {
        result.errors.push(`HTTP ${response.status}: ${response.statusText}`);
        return result;
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/pdf") || source.url.toLowerCase().endsWith(".pdf")) {
        result.items = [{
          sourceId: source.id,
          sourceName: source.name,
          sourceDescription: source.description,
          sourceJurisdictionCountry: source.jurisdictionCountry,
          sourceJurisdictionState: source.jurisdictionState,
          url: source.url,
          title: source.name,
          content: [
            `Source: ${source.name}`,
            `URL: ${source.url}`,
            `Description: ${source.description}`,
            "Document type: PDF",
          ].join("\n"),
          extractedAt: new Date().toISOString(),
        }];
      } else {
        const html = await response.text();
        result.items = extractFromHTML(html, source);
      }
    }

    if (result.items.length === 0) {
      result.errors.push("No extractable content");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Crawl failed: ${message}`);
  }

  return result;
}

function normalizeTextForHash(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function hashText(text: string): string {
  return crypto.createHash("sha1").update(normalizeTextForHash(text)).digest("hex");
}

function dedupeItems(items: CrawledItem[]): CrawledItem[] {
  const deduped = new Map<string, CrawledItem>();
  for (const item of items) {
    const normalizedUrl = item.url.trim().toLowerCase();
    const textHash = hashText(item.content || item.title);
    const key = normalizedUrl
      ? `${item.sourceId}::${normalizedUrl}`
      : `${item.sourceId}::text:${textHash}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }
  return [...deduped.values()];
}

export async function crawlAllSources(
  sourceIds?: string[]
): Promise<CrawlResult[]> {
  const allSources = [...sources, ...twitterSearchSources];
  const targetSources = sourceIds
    ? allSources.filter((s) => sourceIds.includes(s.id))
    : allSources;

  const nonTwitterSources = targetSources.filter((s) => s.type !== "twitter_search");
  const twitterSources = targetSources.filter((s) => s.type === "twitter_search");

  const results: CrawlResult[] = [];
  const CONCURRENCY = 10;

  for (let i = 0; i < nonTwitterSources.length; i += CONCURRENCY) {
    const batch = nonTwitterSources.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((source) => crawlSource(source))
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        r.value.items = dedupeItems(r.value.items);
        results.push(r.value);
      }
    }
  }

  for (let i = 0; i < twitterSources.length; i++) {
    const twitterResult = await crawlSource(twitterSources[i]);
    twitterResult.items = dedupeItems(twitterResult.items);
    results.push(twitterResult);

    if (i < twitterSources.length - 1) {
      await sleep(TWITTER_INTER_QUERY_DELAY_MS);
    }
  }

  return results;
}
