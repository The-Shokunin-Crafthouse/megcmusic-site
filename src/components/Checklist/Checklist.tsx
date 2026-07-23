"use client";

/**
 * Pre-publish checklist — the only client island on the (otherwise static,
 * server-rendered) Playbook tab. State is deliberately ephemeral (never
 * persisted): it's a per-post ritual, and a pre-checked checklist would be
 * a lie. Real <input type="checkbox">, five states via CSS, 44x44 touch
 * targets. Each item links to the rule card that explains it.
 */

import { useId, useState } from "react";
import styles from "./Checklist.module.css";

export interface ChecklistItem {
  id: string;
  label: string;
  ruleIds: string[];
}

export function Checklist({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const baseId = useId();
  const doneCount = items.filter((item) => checked[item.id]).length;

  const toggle = (id: string) =>
    setChecked((current) => ({ ...current, [id]: !current[id] }));
  const reset = () => setChecked({});

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>Pre-publish checklist</h3>
        <p className={styles.progress}>
          {doneCount} of {items.length}
        </p>
      </div>
      <ul className={styles.list}>
        {items.map((item) => {
          const inputId = `${baseId}-${item.id}`;
          return (
            <li key={item.id} className={styles.item}>
              <label className={styles.itemLabel} htmlFor={inputId}>
                <input
                  type="checkbox"
                  id={inputId}
                  className={styles.input}
                  checked={Boolean(checked[item.id])}
                  onChange={() => toggle(item.id)}
                />
                <span className={styles.itemText}>{item.label}</span>
              </label>
              {item.ruleIds[0] ? (
                <a className={styles.ruleLink} href={`#${item.ruleIds[0]}`}>
                  Why
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className={styles.reset}
        onClick={reset}
        disabled={doneCount === 0}
      >
        Reset
      </button>
    </div>
  );
}
