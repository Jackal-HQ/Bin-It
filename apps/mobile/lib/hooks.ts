// TanStack Query hooks wrapping the API client.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReport,
  getCities,
  getNearby,
  getReport,
} from "@/lib/api";

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: getCities,
    staleTime: 1000 * 60 * 60, // cities rarely change
  });
}

export function useNearby(params: {
  city: string;
  lat: number | null;
  lng: number | null;
  radiusM?: number;
}) {
  const { city, lat, lng, radiusM } = params;
  return useQuery({
    queryKey: ["nearby", city, lat, lng, radiusM],
    enabled: lat !== null && lng !== null,
    queryFn: () => getNearby({ city, lat: lat as number, lng: lng as number, radiusM }),
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ["report", id],
    enabled: !!id,
    queryFn: () => getReport(id as string),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      // a new report may change what's nearby
      qc.invalidateQueries({ queryKey: ["nearby"] });
    },
  });
}
