/**
 * Recognition timeline — the curated awards/affiliations shown in the Liner
 * Notes sidebar (Figma 39:120). Kept as a Levi-editable config, not parsed from
 * the /about prose (it isn't structured there). Seeded from the comp.
 *
 * NOTE (verify with Levi): the live /about page lists newer honors than the comp
 * — 2026 Josie Music Award nominations (Album of the Year Folk/Americana, Female
 * Americana Artist of the Year) and CCMHoF nominations (Female Vocalist, Best
 * Solo Artist). Confirm which belong here before launch.
 */
export interface Recognition {
  /** Year or span, e.g. "2025" or "2019 – Present". */
  period: string;
  title: string;
  detail: string;
}

export const RECOGNITION: Recognition[] = [
  {
    period: "2025",
    title: "Colorado Country Music Hall of Fame",
    detail: "Duo of the Year — w/ Todd Clayton",
  },
  {
    period: "2024",
    title: "Colorado Country Music Hall of Fame",
    detail: "Recorded at Howling Dog Records, w/ Don Richmond",
  },
  {
    period: "2019 – Present",
    title: "Musicians on Call",
    detail: "Children’s Hospital · VA Denver",
  },
  {
    period: "2025 – Present",
    title: "Mountain West Country Music Association",
    detail: "Pro Artist Member",
  },
];
