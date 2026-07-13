"use client";

/**
 * Booking screen (spec §Screen 3) — the outreach pipeline, filterable by
 * New / Replied / Category, plus a Daily Insight tip and a venue detail
 * sheet. Consumes `useOutreachData` (flattens GET /api/outreach/summary's
 * five pipeline buckets into one list) and filters entirely client-side.
 *
 * Filter semantics (P5 judgment, per the sprint brief):
 *   New     — status new|contacted, not needing a reply right now.
 *   Replied — needs_action, or a terminal replied_* status.
 *   Category — opens a BottomSheet radio picker built from the categories
 *     actually present in the loaded data (+ "All"); picking sets the chip
 *     label to the category name and keeps it in the active-pill state.
 *
 * Venue-row meta (P5 judgment): the P1 comp shows four placeholder meta
 * fields ("Listening Room / Denver / 2 times / Category") but the real
 * `Prospect` row only carries one categorical value (`category`) — there
 * is no separate "venue type" field. Rather than fake a second distinct
 * category string, `category` fills the single teal slot once; "frequency"
 * renders honestly as "cycle N" (no message-count field exists to build a
 * real "N times" figure from — repo learning: never fake precision).
 */

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowCircleUp, CheckCircle, Circle } from "@phosphor-icons/react";
import { CATEGORIES, type Prospect } from "@/lib/outreach/types";
import { useOutreachData } from "../useOutreachData";
import { BottomSheet } from "../motion/BottomSheet";
import { TapScale } from "../motion/TapScale";
import { Staggered } from "../motion/Staggered";
import { tapScaleSpring } from "../motion/springs";
import { ChipRow, type Chip } from "./shared/ChipRow";
import { StarDivider } from "./shared/StarDivider";
import { VenueSheet } from "./VenueSheet";
import styles from "./BookingScreen.module.css";

type FilterMode = "new" | "replied" | "category";

function isNewNeedingNothing(p: Prospect): boolean {
  return (p.status === "new" || p.status === "contacted") && !p.needs_action;
}

function isReplied(p: Prospect): boolean {
  return (
    p.needs_action ||
    p.status === "replied_positive" ||
    p.status === "replied_negative"
  );
}

function categoryLabel(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

type TipState = "loading" | "ready" | "empty" | "error";

function DailyInsightCard() {
  const [tip, setTip] = useState<string | null>(null);
  const [state, setState] = useState<TipState>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/playbook/tips?surface=booking_insight")
      .then(async (res) => {
        if (res.status === 404) return { empty: true as const, body: null };
        if (!res.ok) throw new Error("tip fetch failed");
        const json = (await res.json()) as { body: string };
        return { empty: false as const, body: json.body };
      })
      .then((result) => {
        if (cancelled) return;
        if (result.empty) {
          setState("empty");
        } else {
          setTip(result.body);
          setState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Error is "a missing nicety, not an error state" (spec §10) — the card
  // simply doesn't render rather than showing a broken/empty tile.
  if (state === "error") return null;

  return (
    <div className={styles.tipCard}>
      <p className={styles.tipLabel}>
        <ArrowCircleUp weight="bold" aria-hidden="true" className={styles.tipIcon} />
        Daily Insight
      </p>
      {state === "loading" ? (
        <span className={styles.tipSkeleton} aria-hidden="true" />
      ) : (
        <p className={styles.tipBody}>
          {state === "ready" ? tip : "Fresh tips are on their way."}
        </p>
      )}
    </div>
  );
}

interface VenueRowProps {
  prospect: Prospect;
  onOpen: () => void;
}

function VenueRow({ prospect, onOpen }: VenueRowProps) {
  const metaParts = [categoryLabel(prospect.category), prospect.city, `cycle ${prospect.cycle}`].filter(
    (part): part is string => Boolean(part),
  );

  return (
    <TapScale
      as="div"
      className={styles.row}
      onClick={onOpen}
      ariaLabel={`${prospect.org} — view details`}
    >
      <p className={styles.venueName}>{prospect.org}</p>
      <p className={styles.contacts}>{prospect.contact_name ?? "No contact on file"}</p>
      <p className={styles.meta}>
        {metaParts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {index > 0 ? <span className={styles.slash}> / </span> : null}
            <span className={index === 0 ? styles.metaType : styles.metaValue}>
              {part}
            </span>
          </span>
        ))}
      </p>
    </TapScale>
  );
}

interface CategoryRowProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function CategoryRow({ label, selected, onClick }: CategoryRowProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      className={styles.radioRow}
      onClick={onClick}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={tapScaleSpring}
    >
      <span>{label}</span>
      {selected ? (
        <CheckCircle weight="fill" className={styles.radioIconSelected} aria-hidden="true" />
      ) : (
        <Circle className={styles.radioIcon} aria-hidden="true" />
      )}
    </motion.button>
  );
}

function SkeletonRows() {
  return (
    <div className={styles.rows} aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

export function BookingScreen() {
  const { prospects, status, error, refetch, updateProspect } = useOutreachData();
  const [filterMode, setFilterMode] = useState<FilterMode>("new");
  const [categoryValue, setCategoryValue] = useState<string | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

  const categoriesPresent = useMemo(() => {
    const present = new Set(prospects.map((p) => p.category));
    return CATEGORIES.filter((c) => present.has(c));
  }, [prospects]);

  const filtered = useMemo(() => {
    if (filterMode === "new") return prospects.filter(isNewNeedingNothing);
    if (filterMode === "replied") return prospects.filter(isReplied);
    if (filterMode === "category" && categoryValue) {
      return prospects.filter((p) => p.category === categoryValue);
    }
    return prospects;
  }, [prospects, filterMode, categoryValue]);

  function pickCategory(value: string | null) {
    setCategoryValue(value);
    setFilterMode("category");
    setCategorySheetOpen(false);
  }

  const chips: Chip[] = [
    { id: "new", label: "New" },
    { id: "replied", label: "Replied" },
    {
      id: "category",
      label:
        filterMode === "category"
          ? categoryValue
            ? categoryLabel(categoryValue)
            : "All"
          : "Category",
      caretIcon: true,
    },
  ];

  // The Category chip opens the picker sheet rather than filtering directly;
  // the other two switch the filter in place.
  function handleChipChange(id: string) {
    if (id === "category") {
      setCategorySheetOpen(true);
      return;
    }
    setFilterMode(id as FilterMode);
  }

  const selectedProspect = prospects.find((p) => p.id === selectedProspectId) ?? null;

  return (
    <div className={styles.stack}>
      <ChipRow
        chips={chips}
        activeId={filterMode}
        onChange={handleChipChange}
        ariaLabel="Booking filters"
      />

      <DailyInsightCard />

      <section aria-label="Pipeline">
        <p className={styles.eyebrow}>Pipeline</p>

        {status === "loading" ? <SkeletonRows /> : null}

        {status === "error" ? (
          <div className={styles.stateBlock}>
            <p className={styles.errorText}>Couldn&apos;t reach the playbook.</p>
            <TapScale as="button" className={styles.retryButton} onClick={refetch}>
              Retry
            </TapScale>
            <span className={styles.srOnly} role="status" aria-live="polite">
              {error}
            </span>
          </div>
        ) : null}

        {status === "ready" && filtered.length === 0 ? (
          <div className={styles.stateBlock}>
            <StarDivider />
            <p className={styles.emptyText}>
              No venues in the pipeline yet — the weekly run fills this list.
            </p>
          </div>
        ) : null}

        {status === "ready" && filtered.length > 0 ? (
          <Staggered className={styles.rows} itemClassName={styles.rowItem}>
            {filtered.map((prospect) => (
              <VenueRow
                key={prospect.id}
                prospect={prospect}
                onOpen={() => setSelectedProspectId(prospect.id)}
              />
            ))}
          </Staggered>
        ) : null}
      </section>

      <BottomSheet
        isOpen={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        ariaLabel="Filter by category"
      >
        <p className={styles.sheetEyebrow}>Category</p>
        <div role="radiogroup" aria-label="Category" className={styles.radioGroup}>
          <CategoryRow
            label="All"
            selected={filterMode === "category" && categoryValue === null}
            onClick={() => pickCategory(null)}
          />
          {categoriesPresent.map((category) => (
            <CategoryRow
              key={category}
              label={categoryLabel(category)}
              selected={filterMode === "category" && categoryValue === category}
              onClick={() => pickCategory(category)}
            />
          ))}
        </div>
      </BottomSheet>

      <VenueSheet
        prospect={selectedProspect}
        isOpen={selectedProspectId !== null}
        onClose={() => setSelectedProspectId(null)}
        onUpdateProspect={updateProspect}
      />
    </div>
  );
}
