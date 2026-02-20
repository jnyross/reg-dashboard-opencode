import type { RegulatorySource } from "./sources";
import type { CrawledItem } from "./crawler";

type TwitterUser = {
  id: string;
  name?: string;
  username?: string;
  verified?: boolean;
};

type TwitterTweet = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
  };
};

type TwitterRecentSearchResponse = {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
};

const TWITTER_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent";

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildTweetUrl(tweetId: string, username?: string): string {
  const safeUser = username || "i";
  return `https://x.com/${safeUser}/status/${tweetId}`;
}

export async function crawlTwitterSearchSource(
  source: RegulatorySource,
  bearerToken: string,
): Promise<CrawledItem[]> {
  const query = source.searchQuery?.trim();
  if (!query) {
    return [];
  }

  const requestUrl = new URL(TWITTER_ENDPOINT);
  requestUrl.searchParams.set("query", query);
  requestUrl.searchParams.set("max_results", "100");
  requestUrl.searchParams.set("tweet.fields", "created_at,author_id,public_metrics,entities");
  requestUrl.searchParams.set("expansions", "author_id");
  requestUrl.searchParams.set("user.fields", "name,username,verified");

  const response = await fetch(requestUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`X API ${response.status}: ${body.slice(0, 200)}`);
  }

  const payload = (await response.json()) as TwitterRecentSearchResponse;
  const users = new Map<string, TwitterUser>((payload.includes?.users ?? []).map((u) => [u.id, u]));
  const items: CrawledItem[] = [];
  const seenTweetIds = new Set<string>();

  for (const tweet of payload.data ?? []) {
    if (!tweet.id || !tweet.text || seenTweetIds.has(tweet.id)) {
      continue;
    }
    seenTweetIds.add(tweet.id);

    const user = tweet.author_id ? users.get(tweet.author_id) : undefined;
    const username = user?.username || "unknown";
    const author = user?.name ? `${user.name} (@${username})${user.verified ? " ✓" : ""}` : `@${username}`;
    const cleanText = normalizeWhitespace(tweet.text);
    const url = buildTweetUrl(tweet.id, username);
    const metrics = tweet.public_metrics;

    items.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceDescription: source.description,
      url,
      title: cleanText.slice(0, 180) || `Tweet by ${author}`,
      content: [
        `Tweet Author: ${author}`,
        `Tweet URL: ${url}`,
        `Published: ${tweet.created_at || "unknown"}`,
        `Search Query: ${query}`,
        metrics
          ? `Metrics: ${metrics.like_count ?? 0} likes, ${metrics.retweet_count ?? 0} reposts, ${metrics.reply_count ?? 0} replies, ${metrics.quote_count ?? 0} quotes`
          : "",
        "",
        cleanText,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 12_000),
      publishedDate: tweet.created_at,
      extractedAt: new Date().toISOString(),
    });
  }

  return items;
}
