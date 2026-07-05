import {
  CHANNEL_ID,
  extraVideoIds,
  primaryVideoId,
  seedVideoIds,
} from "@/config/videos";

// YouTube is not the WP host, so it isn't datacenter-blocked — these run
// server-side at build/ISR. Everything is bounded + falls back so a slow
// upstream can never hang the build.
const TIMEOUT_MS = 8_000;

export interface Video {
  id: string;
  title: string;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Newest uploads from the channel RSS → id → title. */
async function fetchChannelTitles(): Promise<{ order: string[]; titles: Map<string, string> }> {
  const titles = new Map<string, string>();
  const order: string[] = [];
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return { order, titles };
    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
    for (const entry of entries) {
      const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([^<]+)<\/title>/)?.[1];
      if (id) {
        order.push(id);
        if (title) titles.set(id, decode(title));
      }
    }
  } catch {
    // fall through to seeds
  }
  return { order, titles };
}

/** oEmbed title for a single video (for ids not in the channel RSS). */
async function fetchTitle(id: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { title?: string };
    return data.title ?? "";
  } catch {
    return "";
  }
}

/**
 * The merged video list: primary first, then the channel's newest uploads, then
 * the seed lineup and any cross-channel extras — deduped. Titles come from the
 * RSS where possible, otherwise oEmbed.
 */
export async function getVideos(): Promise<Video[]> {
  const { order, titles } = await fetchChannelTitles();

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const id of [primaryVideoId, ...order, ...seedVideoIds, ...extraVideoIds]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  const missing = ids.filter((id) => !titles.get(id));
  const fetched = await Promise.all(missing.map((id) => fetchTitle(id)));
  missing.forEach((id, i) => {
    if (fetched[i]) titles.set(id, fetched[i]);
  });

  return ids.map((id) => ({ id, title: titles.get(id) ?? "" }));
}
