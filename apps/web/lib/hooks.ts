"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api, type TicketFilters } from "./api";
import type { Bbox } from "./types";

export function useCities() {
  return useQuery({ queryKey: ["cities"], queryFn: api.cities, staleTime: Infinity, select: (d) => d.cities });
}

export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 30_000 });
}

/** The queue. Polls every 5 s while `poll` (the Queue tab is open). Filters are also applied
 *  client-side so mock and cached modes behave like the live API. */
export function useTickets(city: string, filters: TicketFilters, poll: boolean) {
  return useQuery({
    queryKey: ["tickets", city, filters],
    queryFn: () => api.tickets(city, filters),
    refetchInterval: poll ? 5000 : false,
    select: (d) =>
      d.tickets
        .filter((t) => (!filters.status || t.status === filters.status) && (!filters.label || t.label === filters.label))
        .sort((a, b) => b.max_severity - a.max_severity || b.report_count - a.report_count),
  });
}

/** Pins and bins for the visible map area. Keeps the previous area's data while the next loads. */
export function useNearby(city: string, bbox: Bbox | null) {
  return useQuery({
    queryKey: ["nearby", city, bbox],
    queryFn: () => api.nearby(city, bbox!),
    enabled: bbox !== null,
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === city ? prev : undefined),
  });
}

export function useCells(city: string) {
  return useQuery({ queryKey: ["cells", city], queryFn: () => api.cells(city), select: (d) => d.cells });
}

export function useRecommendations(city: string) {
  return useQuery({
    queryKey: ["recommendations", city],
    queryFn: () => api.recommendations(city),
    select: (d) => [...d.recommendations].sort((a, b) => a.rank - b.rank),
  });
}

// ---- staff key: kept for this browser session only (demo-grade) ----

const STAFF_KEY = "binit.staffKey";
const listeners = new Set<() => void>();
let memoryKey: string | null = null; // used when sessionStorage is blocked

function readStaffKey() {
  try {
    return sessionStorage.getItem(STAFF_KEY) ?? memoryKey;
  } catch {
    return memoryKey;
  }
}

export function setStaffKey(value: string | null) {
  memoryKey = value;
  try {
    if (value) sessionStorage.setItem(STAFF_KEY, value);
    else sessionStorage.removeItem(STAFF_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function useStaffKey() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readStaffKey,
    () => null,
  );
}
