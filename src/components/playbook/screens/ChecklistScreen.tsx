"use client";

/**
 * Checklist screen (spec §Screen 4) — three tabs: the daily pre-publish
 * Checklist (persisted per-day via `useChecklistState`), and static
 * Instagram/Facebook rule-card tabs sourced straight from the bundled
 * `playbook.json` (spec §9.10 — no fetch, no evidence/sources layer on
 * this phone surface).
 *
 * Checklist rows use native `role="checkbox"`/`aria-checked` semantics on
 * a real `<button>` (the "pick one accessible pattern and be consistent"
 * call from the sprint brief) rather than `TapScale`, because the required
 * check-off motion — a spring scale-pop scoped to just the icon, with no
 * whole-row scale-down — doesn't match `TapScale`'s whole-element
 * press-scale; it's built here with the same studio spring constants
 * instead of a new one.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckSquare, Square } from "@phosphor-icons/react";
import playbook from "@/data/playbook.json";
import { useChecklistState } from "../useChecklistState";
import { Staggered } from "../motion/Staggered";
import { EASE_OUT, REDUCED_MOTION_TRANSITION } from "../motion/springs";
import { ChipRow, type Chip } from "./shared/ChipRow";
import styles from "./ChecklistScreen.module.css";

type TabId = "checklist" | "instagram" | "facebook";

interface ChecklistItem {
  id: string;
  label: string;
  ruleIds: string[];
}

interface PlatformRule {
  id: string;
  action: string;
  insight: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = playbook.checklist;
const IG_RULES: PlatformRule[] = playbook.platforms.instagram.rules;
const FB_RULES: PlatformRule[] = playbook.platforms.facebook.rules;

interface ChecklistRowProps {
  item: ChecklistItem;
  checked: boolean;
  onToggle: (id: string) => void;
}

function ChecklistRow({ item, checked, onToggle }: ChecklistRowProps) {
  const reducedMotion = useReducedMotion();
  const [flashing, setFlashing] = useState(false);

  function handleClick() {
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 120);
    onToggle(item.id);
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`${styles.row} ${flashing ? styles.flash : ""}`}
      onClick={handleClick}
    >
      <motion.span
        className={styles.iconWrap}
        animate={reducedMotion || !checked ? { scale: 1 } : { scale: [1, 1.2, 1] }}
        transition={reducedMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.22, ease: EASE_OUT }}
      >
        {checked ? (
          <CheckSquare weight="fill" className={styles.iconChecked} aria-hidden="true" />
        ) : (
          <Square className={styles.iconUnchecked} aria-hidden="true" />
        )}
      </motion.span>
      <span className={styles.label}>{item.label}</span>
    </button>
  );
}

function RuleCard({ rule }: { rule: PlatformRule }) {
  return (
    <div className={styles.ruleCard}>
      <p className={styles.ruleAction}>{rule.action}</p>
      <p className={styles.ruleInsight}>{rule.insight}</p>
    </div>
  );
}

function TabList({
  animate,
  children,
}: {
  animate: boolean;
  children: ReactNode[];
}) {
  if (!animate) {
    return <div className={styles.list}>{children}</div>;
  }
  return (
    <Staggered className={styles.list} itemClassName={styles.listItem}>
      {children}
    </Staggered>
  );
}

export function ChecklistScreen() {
  const { items, status, error, toggle } = useChecklistState();
  const [activeTab, setActiveTab] = useState<TabId>("checklist");
  const animatedTabs = useRef<Set<TabId>>(new Set());
  const isFirstRenderOfTab = !animatedTabs.current.has(activeTab);

  useEffect(() => {
    animatedTabs.current.add(activeTab);
  }, [activeTab]);

  const checkedCount = CHECKLIST_ITEMS.filter((item) => items[item.id]).length;

  const chips: Chip[] = [
    { id: "checklist", label: "Checklist" },
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
  ];

  return (
    <div className={styles.stack}>
      <ChipRow
        chips={chips}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        ariaLabel="Checklist sections"
        fixedHeight
      />

      {activeTab === "checklist" ? (
        <>
          <p className={styles.progress}>
            {checkedCount} of {CHECKLIST_ITEMS.length} done
          </p>
          {status === "error" ? (
            <p className={styles.errorText} role="status" aria-live="polite">
              {error}
            </p>
          ) : null}
          <TabList animate={isFirstRenderOfTab}>
            {CHECKLIST_ITEMS.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                checked={Boolean(items[item.id])}
                onToggle={toggle}
              />
            ))}
          </TabList>
        </>
      ) : null}

      {activeTab === "instagram" ? (
        <TabList animate={isFirstRenderOfTab}>
          {IG_RULES.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </TabList>
      ) : null}

      {activeTab === "facebook" ? (
        <TabList animate={isFirstRenderOfTab}>
          {FB_RULES.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </TabList>
      ) : null}
    </div>
  );
}
