import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useRaceFeed } from "@/lib/race-feed";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface TelemetryData {
  segment: string;
  speed1: number;
  speed2: number;
  delta: number;
}

interface TelemetryGraphsProps {
  driver1: string;
  driver2: string;
}

export default function TelemetryGraphs({
  driver1,
  driver2,
}: TelemetryGraphsProps) {
  const [data, setData] = useState<TelemetryData[]>([]);
  const [loading, setLoading] = useState(true);
  const { drivers } = useRaceFeed();
  const samples1 = useRef<{ t: number; v: number; km: number }[]>([]);
  const samples2 = useRef<{ t: number; v: number; km: number }[]>([]);
  const lastSpeed1 = useRef<number>(0);
  const lastSpeed2 = useRef<number>(0);

  useEffect(() => {
    // reset on driver change
    samples1.current = [];
    samples2.current = [];
    setData([]);
    setLoading(true);
    const id = setTimeout(() => {
      // If no telemetry arrived yet, still render empty charts instead of skeleton
      setLoading((prev) => (prev ? false : prev));
    }, 1500);
    return () => clearTimeout(id);
  }, [driver1, driver2]);

  useEffect(() => {
    const d1 = drivers[driver1];
    const d2 = drivers[driver2];
    const now = Date.now() / 1000;
    let updated = false;
    if (d1 && typeof d1.speedKmh === "number") {
      samples1.current.push({
        t: now,
        v: Math.max(0, d1.speedKmh || 0),
        km: d1.km,
      });
      updated = true;
    }
    if (d2 && typeof d2.speedKmh === "number") {
      samples2.current.push({
        t: now,
        v: Math.max(0, d2.speedKmh || 0),
        km: d2.km,
      });
      updated = true;
    }
    if (!updated) return;

    // keep last 12 seconds
    const cutoff = now - 12;
    const trim = (arr: typeof samples1.current) => {
      while (arr.length && arr[0].t < cutoff) arr.shift();
    };
    trim(samples1.current);
    trim(samples2.current);

    // Build aligned series by time buckets (~0.3s step)
    const step = 0.3;
    const t0 = Math.min(
      samples1.current[0]?.t ?? now,
      samples2.current[0]?.t ?? now
    );
    const t1 = now;
    const series: TelemetryData[] = [];
    for (let t = t0; t <= t1; t += step) {
      const pick = (arr: { t: number; v: number; km: number }[]) => {
        // nearest sample
        let best = arr[0];
        let bestDt = Infinity;
        for (const s of arr) {
          const dt = Math.abs(s.t - t);
          if (dt < bestDt) {
            best = s;
            bestDt = dt;
          }
        }
        return best;
      };
      const s1 = samples1.current.length ? pick(samples1.current) : undefined;
      const s2 = samples2.current.length ? pick(samples2.current) : undefined;
      const s1v = typeof s1?.v === "number" ? s1.v : undefined;
      const s2v = typeof s2?.v === "number" ? s2.v : undefined;
      if (typeof s1v === "number") lastSpeed1.current = s1v;
      if (typeof s2v === "number") lastSpeed2.current = s2v;
      const speed1 = Math.round(lastSpeed1.current);
      const speed2 = Math.round(lastSpeed2.current);

      // delta time estimate from distance gap and avg speed (km and km/s)
      const km1 = s1?.km ?? 0;
      const km2 = s2?.km ?? 0;
      const avg_km_per_s = Math.max((speed1 + speed2) / 2 / 3600, 1e-6);
      const delta_s = (km2 - km1) / avg_km_per_s;

      series.push({
        segment: new Date(t * 1000).toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        }),
        speed1,
        speed2,
        delta: Number.isFinite(delta_s) ? delta_s : 0,
      });
    }

    // If no buckets produced (e.g., very short window), seed one sample so chart renders
    if (series.length === 0) {
      const last1 = samples1.current[samples1.current.length - 1];
      const last2 = samples2.current[samples2.current.length - 1];
      const speed1 = Math.round(last1?.v ?? 0);
      const speed2 = Math.round(last2?.v ?? 0);
      const km1 = last1?.km ?? 0;
      const km2 = last2?.km ?? 0;
      const avg_km_per_s = Math.max((speed1 + speed2) / 2 / 3600, 1e-6);
      const delta_s = (km2 - km1) / avg_km_per_s;
      series.push({
        segment: new Date(now * 1000).toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        }),
        speed1,
        speed2,
        delta: Number.isFinite(delta_s) ? delta_s : 0,
      });
    }

    // Keep series length bounded to reduce churn
    setData((prev) => {
      const combined = [...prev, ...series];
      const MAX_POINTS = 400;
      return combined.length > MAX_POINTS
        ? combined.slice(combined.length - MAX_POINTS)
        : combined;
    });
    setLoading(false);
  }, [drivers, driver1, driver2]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-secondary/50 p-6 backdrop-blur">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-32 rounded bg-border" />
              <div className="h-64 w-full rounded bg-border" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Speed Comparison Graph */}
      <Card className="bg-secondary/50 p-6 backdrop-blur">
        <h3 className="mb-4 text-lg font-semibold">Speed Profile</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="segment"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="speed1"
              name={driver1}
              stroke="#22d3ee" /* cyan-400 */
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="speed2"
              name={driver2}
              stroke="#f43f5e" /* rose-500 */
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Delta (Time Difference) Graph */}
      <Card className="bg-secondary/50 p-6 backdrop-blur">
        <h3 className="mb-4 text-lg font-semibold">Performance Delta</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="deltaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="segment"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4px",
              }}
              formatter={(value: number) => `${value.toFixed(3)}s`}
            />
            <Area
              type="monotone"
              dataKey="delta"
              fill="url(#deltaGradient)"
              stroke="#f43f5e"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
