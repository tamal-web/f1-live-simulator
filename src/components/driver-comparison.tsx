import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useRaceFeed } from "@/lib/race-feed";

interface DriverData {
  name: string;
  shortName: string;
  team: string;
  teamColor: string;
  position: number;
  lapTime: string;
  gap: string;
  throttle: number;
  braking: number;
  cornering: number;
  speed: number;
}

interface DriverComparisonProps {
  driver: string;
  position: "left" | "right";
}

export default function DriverComparison({
  driver,
  position,
}: DriverComparisonProps) {
  const [data, setData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const { drivers } = useRaceFeed();
  const samplesRef = useRef<{ t: number; v: number }[]>([]);
  const updateRaf = useRef<number | null>(null);

  useEffect(() => {
    // Simulated API call - replace with actual API
    const mockData: { [key: string]: DriverData } = {
      VER: {
        name: "Max Verstappen",
        shortName: "VERSTAPPEN",
        team: "Red Bull Racing",
        teamColor: "#0082FA",
        position: 1,
        lapTime: "1:23.456",
        gap: "-",
        throttle: 81,
        braking: 5,
        cornering: 14,
        speed: 340,
      },
      LEC: {
        name: "Charles Leclerc",
        shortName: "LECLERC",
        team: "Ferrari",
        teamColor: "#DC0000",
        position: 2,
        lapTime: "1:23.777",
        gap: "+0.321s",
        throttle: 81,
        braking: 5,
        cornering: 14,
        speed: 338,
      },
    };

    setTimeout(() => {
      setData(mockData[driver] || mockData["VER"]);
      setLoading(false);
    }, 500);
  }, [driver]);

  // Live metrics from websocket telemetry (throttled)
  useEffect(() => {
    if (!data) return;
    const live = drivers[driver];
    if (!live) return;
    const now = Date.now() / 1000;
    const speed = Math.max(0, Math.round(live.speedKmh ?? 0));

    // update rolling window (last 4 seconds)
    const arr = samplesRef.current;
    arr.push({ t: now, v: speed });
    const cutoff = now - 4;
    while (arr.length && arr[0].t < cutoff) arr.shift();

    // compute rolling max speed
    const vmax = arr.reduce((m, s) => (s.v > m ? s.v : m), 0);
    const throttle =
      vmax > 0
        ? Math.min(100, Math.max(0, Math.round((speed / vmax) * 100)))
        : 0;

    // compute braking percent: fraction of samples with strong decel (>8 km/h per second)
    let brakingCount = 0;
    for (let i = 1; i < arr.length; i++) {
      const dv = arr[i - 1].v - arr[i].v;
      const dt = Math.max(0.05, arr[i].t - arr[i - 1].t);
      const decel = dv / dt;
      if (decel > 8) brakingCount++;
    }
    const braking =
      arr.length > 1
        ? Math.min(100, Math.round((brakingCount / (arr.length - 1)) * 100))
        : 0;

    // cornering proxy: percent of time in mid-speed band (40%..70% of vmax)
    let cornerCount = 0;
    for (let i = 0; i < arr.length; i++) {
      if (vmax <= 0) continue;
      const pct = arr[i].v / vmax;
      if (pct >= 0.4 && pct <= 0.7) cornerCount++;
    }
    const cornering = arr.length
      ? Math.min(100, Math.round((cornerCount / arr.length) * 100))
      : 0;

    // Batch updates in rAF to prevent cascading sync renders
    if (updateRaf.current) cancelAnimationFrame(updateRaf.current);
    updateRaf.current = requestAnimationFrame(() => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          position: live.rank ?? prev.position,
          throttle,
          braking,
          cornering,
          speed,
        };
        // Avoid re-render if values are unchanged
        if (
          next.position === prev.position &&
          next.throttle === prev.throttle &&
          next.braking === prev.braking &&
          next.cornering === prev.cornering &&
          next.speed === prev.speed
        ) {
          return prev;
        }
        return next;
      });
    });
  }, [drivers, driver]);

  if (loading || !data) {
    return (
      <Card className="bg-secondary/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-24 rounded bg-border" />
          <div className="h-6 w-32 rounded bg-border" />
        </div>
      </Card>
    );
  }

  const isLeft = position === "left";

  return (
    <Card className="bg-secondary/50 p-6 backdrop-blur">
      <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"}`}>
        {/* Position Badge */}
        <div className="mb-4 flex items-center gap-3">
          {isLeft && (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {data.position}
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">{data.name}</h3>
                <p className="text-xs text-muted-foreground">{data.team}</p>
              </div>
            </>
          )}
          {!isLeft && (
            <>
              <div>
                <h3 className="text-right text-lg font-bold text-primary">
                  {data.name}
                </h3>
                <p className="text-right text-xs text-muted-foreground">
                  {data.team}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {data.position}
              </div>
            </>
          )}
        </div>

        {/* Lap Time and Gap */}
        <div
          className={`mb-6 w-full space-y-1 ${
            isLeft ? "text-left" : "text-right"
          }`}
        >
          <p className="text-xs text-muted-foreground">LAP TIME</p>
          <p className="font-mono text-2xl font-bold">{data.lapTime}</p>
          {data.gap !== "-" && (
            <p className="text-sm text-primary font-mono">{data.gap}</p>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="w-full space-y-3">
          {[
            { label: "FULL THROTTLE", value: data.throttle },
            { label: "HEAVY BRAKING", value: data.braking },
            { label: "CORNERING", value: data.cornering },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  {label}
                </p>
                <p className="text-xs font-bold text-primary">{value}%</p>
              </div>
              <div className="performance-bar">
                <div
                  className="performance-bar-fill"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Max Speed */}
        <div className="mt-6 w-full pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">TOP SPEED</p>
          <p className="font-mono text-xl font-bold text-primary">
            {data.speed} km/h
          </p>
        </div>
      </div>
    </Card>
  );
}
