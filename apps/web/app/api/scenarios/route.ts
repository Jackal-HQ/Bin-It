import { NextResponse } from "next/server";
import { z } from "zod";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { ScenarioDataError, createScenario } from "@/lib/scenarios";
import { apiError, findCity } from "@/lib/server";

const Body = z.object({
  city: z.string().min(1),
  proposed_bins: z
    .array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
    .min(1)
    .max(100),
});

export async function POST(request: Request) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.scenarioCreate, { status: 201 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("invalid_body", "Body must be { city, proposed_bins: [{ lat, lng }] } with 1-100 bins", 400);
  }
  const city = await findCity(parsed.data.city);
  if (!city) return apiError("unknown_city", "Unknown city slug", 400);

  try {
    const scenario = await createScenario(city.id, parsed.data.proposed_bins);
    return NextResponse.json({ scenario }, { status: 201 });
  } catch (e) {
    if (e instanceof ScenarioDataError) return apiError("no_data", e.message, 409);
    console.error("scenario failed:", e);
    return apiError("scenario_failed", "Could not compute the scenario", 502);
  }
}
