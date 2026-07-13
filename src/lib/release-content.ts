/**
 * Parse a release's WordPress page into the pieces the detail surface renders:
 * the description prose and the "liner" images (credits + lyric sheets). Pure +
 * regex-only, so it runs identically on the server (build/ISR) and in the browser
 * fallback when the WP host blocks the datacenter IP.
 *
 * The front cover is always the first image on the page; the detail page renders
 * its own cover (from the product / page Featured Image), so we drop image[0]
 * here and keep the rest — the credits sheet and the lyric cards.
 */
import { paragraphsFromHtml } from "@/lib/wp-content";
import { parsePhotos, type Photo } from "@/lib/media-photos";

export interface ReleaseContent {
  /** Real prose paragraphs (structural link/heading text filtered out). */
  paragraphs: string[];
  /** Credits + lyric-sheet images, in page order (front cover dropped). */
  liner: Photo[];
}

export const EMPTY_RELEASE_CONTENT: ReleaseContent = {
  paragraphs: [],
  liner: [],
};

export function parseReleaseContent(html: string): ReleaseContent {
  const paragraphs = paragraphsFromHtml(html).filter(
    (p) => p.split(/\s+/).length >= 6,
  );
  const liner = parsePhotos(html).slice(1); // drop the front cover
  return { paragraphs, liner };
}
