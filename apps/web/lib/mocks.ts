import cities from "../../../mocks/cities.json";
import health from "../../../mocks/health.json";
import reportsCreate from "../../../mocks/reports-create.json";
import reportsNearby from "../../../mocks/reports-nearby.json";
import report from "../../../mocks/report.json";
import tickets from "../../../mocks/tickets.json";
import ticketPatch from "../../../mocks/ticket-patch.json";
import cells from "../../../mocks/cells.json";
import recommendations from "../../../mocks/recommendations.json";
import scenarioCreate from "../../../mocks/scenario-create.json";

export const useMocks = () => process.env.USE_MOCKS === "1";

export const mocks = {
  cities,
  health,
  reportsCreate,
  reportsNearby,
  report,
  tickets,
  ticketPatch,
  cells,
  recommendations,
  scenarioCreate,
};
