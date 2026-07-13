/**
 * "Work With Me" — from Meg's WP Collabs page. Two audiences (community +
 * business) with what she offers each, plus her real community links. Levi-
 * editable. Booking-bound items point at /booking; the Cave Crew + newsletter
 * are her live community destinations.
 */
export const CAVE_CREW_URL = "https://www.facebook.com/groups/1636196277191028/";

export interface CollabGroup {
  heading: string;
  blurb: string;
  offerings: string[];
}

export const COLLAB_GROUPS: CollabGroup[] = [
  {
    heading: "For fans & community",
    blurb: "Come closer than the back row.",
    offerings: [
      "The Cave Crew — her Facebook group for friends and fans",
      "House concerts, weddings, and private events",
      "Postcards from the road — the mailing list",
    ],
  },
  {
    heading: "For business & brands",
    blurb: "Original music, made for the moment.",
    offerings: [
      "Custom songs and jingles for branding, ads, and events",
      "Concerts for corporate events, retreats, and client appreciation",
      "Brand partnerships across performances and social",
    ],
  },
];
