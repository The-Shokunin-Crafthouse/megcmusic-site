import { CHANNEL_ID, extraVideoIds } from "@/config/videos";
import { primaryVideoId, seedVideoIds } from "@/lib/videos-content";

// YouTube is not the WP host, so it isn't datacenter-blocked — these run
// server-side at build/ISR. Everything is bounded + falls back so a slow
// upstream can never hang the build.
const TIMEOUT_MS = 8_000;

export interface Video {
  id: string;
  title: string;
  /** Uploading channel (subtext) — meaningful for cross-channel live sets. */
  author: string;
}

/** Newest-upload order from the channel RSS (ids only; titles come from oEmbed). */
async function fetchChannelOrder(): Promise<string[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return (xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/g) ?? [])
      .map((m) => m.replace(/<\/?yt:videoId>/g, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** oEmbed title + author for one video. */
async function fetchMeta(id: string): Promise<{ title: string; author: string }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return { title: "", author: "" };
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { title: data.title ?? "", author: data.author_name ?? "" };
  } catch {
    return { title: "", author: "" };
  }
}

/**
 * The merged video list: Meg's featured video first, then the channel's newest
 * uploads, then her curated list and any cross-channel extras — deduped. Title
 * and author come from oEmbed (per-video, so cross-channel uploads carry their
 * real uploader).
 */
export async function getVideos(): Promise<Video[]> {
  const order = await fetchChannelOrder();

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const id of [primaryVideoId, ...order, ...seedVideoIds, ...extraVideoIds]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  const meta = await Promise.all(ids.map((id) => fetchMeta(id)));
  return ids.map((id, i) => ({
    id,
    title: meta[i].title,
    author: meta[i].author,
  }));
}
