// Per-city non-emergency 311 contact info for the "Call 311" button.
//
// Config-only: to support a new city, add an entry here keyed by its slug. All three
// cities use 311 for city services; `tel` is the number the phone dials (311 works on
// local lines, so we dial the full public number which also works from any phone).
//
// These are stable public phone numbers, not model data. If a city is missing we fall
// back to a plain "311" dial.

export type CityContact = {
  /** What the button shows, e.g. "Call Orlando 311". */
  label: string;
  /** What the phone dials (tel: target). */
  tel: string;
  /** Short line explaining what 311 is for, shown under the button. */
  blurb: string;
};

const CONTACTS: Record<string, CityContact> = {
  orlando: {
    label: "Call Orlando 311",
    tel: "407-246-2121",
    blurb: "Orlando City Hall 311 — report sanitation and overflow issues to the city.",
  },
  nyc: {
    label: "Call NYC 311",
    tel: "311",
    blurb: "NYC 311 — non-emergency city services, including sanitation complaints.",
  },
  chicago: {
    label: "Call Chicago 311",
    tel: "311",
    blurb: "Chicago 311 — non-emergency city services, including sanitation complaints.",
  },
};

const FALLBACK: CityContact = {
  label: "Call 311",
  tel: "311",
  blurb: "311 — your city's non-emergency services line.",
};

export function cityContact(slug: string | undefined): CityContact {
  if (!slug) return FALLBACK;
  return CONTACTS[slug] ?? FALLBACK;
}
