/**
 * Recognition timeline — the curated awards/affiliations shown in the Liner
 * Notes sidebar (Figma 39:120). Levi-editable config; sourced from the live
 * /about honors (Meg keeps that page current). Update as new honors land.
 */
export interface Recognition {
  /** Year or span, e.g. "2026" or "2019 – Present". */
  period: string;
  title: string;
  detail: string;
}

export const RECOGNITION: Recognition[] = [
  {
    period: "2026",
    title: "Josie Music Award Nominee",
    detail: "Album of the Year (Folk/Americana) · Female Americana Artist",
  },
  {
    period: "2026",
    title: "Colorado Country Music Hall of Fame Nominee",
    detail: "Female Vocalist · Best Solo Artist of the Year",
  },
  {
    period: "2025",
    title: "Colorado Country Music Hall of Fame",
    detail: "Duo of the Year — w/ Todd Clayton",
  },
  {
    period: "2025 – Present",
    title: "Mountain West Country Music Association",
    detail: "Pro Artist Member",
  },
  {
    period: "2019 – Present",
    title: "Musicians on Call",
    detail: "Children’s Hospital · VA Denver",
  },
];
