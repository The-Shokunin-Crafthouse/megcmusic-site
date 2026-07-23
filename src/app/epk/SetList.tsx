"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPageContentBrowser } from "@/lib/api/wordpress-browser";
import { parseSetList, type SetGroup } from "@/lib/set-list";
import styles from "./epk.module.css";

/**
 * Meg's sample set list, from her WP "Sample Set List" page. The datacenter
 * build can't read WP, so when the server parse comes back empty we refetch from
 * the visitor's residential IP (mirrors the photo gallery). She edits the list
 * in WordPress; it flows straight through.
 */
export function SetList({ server }: { server: SetGroup[] }) {
  const [groups, setGroups] = useState<SetGroup[]>(server);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || server.length > 0) return;
    ran.current = true;
    let alive = true;
    fetchPageContentBrowser("sample-set-list").then((html) => {
      if (alive && html) setGroups(parseSetList(html));
    });
    return () => {
      alive = false;
    };
  }, [server]);

  if (groups.length === 0) return null;

  return (
    <div className={styles.setList}>
      {groups.map((group) => (
        <div key={group.heading} className={styles.setGroup}>
          <h3 className={styles.setHeading}>{group.heading}</h3>
          <ul className={styles.setSongs}>
            {group.songs.map((song, i) => (
              <li key={`${song.title}-${i}`} className={styles.setSong}>
                <span className={styles.setTitle}>{song.title}</span>
                {song.artist && (
                  <span className={styles.setArtist}>{song.artist}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
