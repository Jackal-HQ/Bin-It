// What the detail card shows, stored in the URL as ?sel=t:<ticket id> | s:<rank> | c:<h3 cell>.
export type Selection =
  | { kind: "ticket"; id: string }
  | { kind: "site"; rank: number }
  | { kind: "cell"; h3: string };

export function parseSelection(raw: string | null): Selection | null {
  if (!raw) return null;
  const [kind, value] = [raw.slice(0, 2), raw.slice(2)];
  if (!value) return null;
  if (kind === "t:") return { kind: "ticket", id: value };
  if (kind === "s:" && Number.isInteger(Number(value))) return { kind: "site", rank: Number(value) };
  if (kind === "c:") return { kind: "cell", h3: value };
  return null;
}

export function selectionParam(s: Selection) {
  if (s.kind === "ticket") return `t:${s.id}`;
  if (s.kind === "site") return `s:${s.rank}`;
  return `c:${s.h3}`;
}

export type LayerToggles = { pins: boolean; risk: boolean; under: boolean; bins: boolean; sites: boolean };
export const DEFAULT_LAYERS: LayerToggles = { pins: true, risk: true, under: true, bins: true, sites: true };
export const LAYER_NAMES: Record<keyof LayerToggles, string> = {
  pins: "Reports",
  risk: "Expected overflow",
  under: "Under-reported",
  bins: "Existing bins",
  sites: "Recommended sites",
};
