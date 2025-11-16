import { Suspense } from "react";
import Header from "./components/Header";
import DriverComparison from "./components/driver-comparison";
import Leaderboard from "./components/leaderboard";
import TrackMap from "./components/track-map";
import LoadingState from "./components/loading-state";
import { useSearchParams } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useRaceFeed, colorForCode } from "./lib/race-feed";
import PredictionsPanel from "./components/predictions-panel";

export function Compare() {
  const params = useParams<{
    year: string;
    circuit: string;
    session: string;
  }>();
  const [searchParams] = useSearchParams();
  const d1 = searchParams.get("d1") || "VER";
  // const d2 = searchParams.get("d2") || "LEC";

  const year = params.year as string;
  const circuit = params.circuit as string;
  const session = params.session as string;

  const { connected, leaderboard, topFive, positionsAll, predictions } =
    useRaceFeed(undefined, circuit);
  const loading = !connected && leaderboard.length === 0;
  const lbRows = leaderboard.map((r) => ({
    position: r.position,
    code: r.code,
    teamColor: colorForCode(r.code),
    gap: r.gap,
  }));
  const highlightedPosition = (
    positionsAll.find((t) => t.code === d1) ||
    topFive.find((t) => t.code === d1)
  )?.positionScalar;

  return (
    <div className="min-h-screen bg-background">
      <Header year={year} circuit={circuit} session={session} />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        {/* Top Section: Drivers + Track Map */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Suspense fallback={<LoadingState />}>
            <DriverComparison driver={d1} position="left" />
          </Suspense>

          <Suspense fallback={<LoadingState />}>
            <TrackMap
              circuit={circuit}
              topFive={topFive}
              cars={positionsAll}
              highlightedDriverCode={d1}
              highlightedPosition={highlightedPosition ?? undefined}
            />
          </Suspense>

          <Suspense fallback={<LoadingState />}>
            <Leaderboard
              highlightedDriver={d1}
              rows={lbRows}
              loading={loading}
            />
          </Suspense>
        </div>

        {/* Predictions Section */}
        <div className="mb-8">
          <Suspense fallback={<LoadingState />}>
            <PredictionsPanel predictions={predictions} />
          </Suspense>
        </div>

        {/* Bottom Section: Telemetry Graphs */}
        {/* <Suspense fallback={<LoadingState />}>
          <TelemetryGraphs driver1={d1} driver2={d2} />
        </Suspense> */}
      </main>
    </div>
  );
}
