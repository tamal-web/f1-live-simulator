import { useEffect, useMemo, useRef, useState } from "react";
import { getLapLengthKm } from "@/lib/circuit-mapping";

export type TelemetryMsg = {
  type: "telemetry" | "info" | "error" | "leaderboard" | "prediction";
  driver?: string;
  lap_number?: number | null;
  position?: number | null;
  position_from_start_km?: number | null;
  speed_kmh?: number | null;
  message?: string;
  data?: { position: number; code: string }[];
};

export type DriverState = {
  code: string;
  lap: number | null;
  rank: number | null;
  km: number; // cumulative position from start in km
  speedKmh: number | null;
};

export function useRaceFeed(wsUrl = "ws://localhost:8765", circuit?: string) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Record<string, DriverState>>({});
  const [predictions, setPredictions] = useState<
    { driver: string; predicted_seconds: number }[] | null
  >(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (evt) => {
      try {
        const msg: TelemetryMsg = JSON.parse(evt.data);
        if (msg.type === "error") {
          setError(msg.message || "server error");
          return;
        }
        if (msg.type === "info") {
          // ignore
          return;
        }
        if (msg.type === "leaderboard" && msg.data) {
          setDrivers((prev) => {
            const next = { ...prev };
            for (const item of msg.data!) {
              const existing = next[item.code];
              if (existing) {
                existing.rank = item.position;
              } else {
                next[item.code] = {
                  code: item.code,
                  lap: null,
                  rank: item.position,
                  km: 0,
                  speedKmh: null,
                };
              }
            }
            return next;
          });
        } else if (msg.type === "prediction" && msg.data) {
          // prediction payload from server has the shape { data: { predictions, mae_seconds } }
          const anyMsg: any = msg as any;
          if (anyMsg.data && Array.isArray(anyMsg.data.predictions)) {
            setPredictions(anyMsg.data.predictions);
          }
          return;
        } else if (msg.type === "telemetry" && msg.driver) {
          setDrivers((prev) => {
            const existing = prev[msg.driver!];
            const next: DriverState = {
              code: msg.driver!,
              lap: msg.lap_number ?? existing?.lap ?? null,
              rank: (msg.position as number | null) ?? existing?.rank ?? null,
              km:
                typeof msg.position_from_start_km === "number"
                  ? msg.position_from_start_km
                  : existing?.km ?? 0,
              speedKmh:
                (msg.speed_kmh as number | null) ?? existing?.speedKmh ?? null,
            };
            const out = { ...prev, [msg.driver!]: next };
            return out;
          });
        }
      } catch (e) {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setError("WebSocket error");
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);

  const leaderboard = useMemo(() => {
    // Sort by rank when available, else by km descending
    const arr = Object.values(drivers);
    // debug: console count
    if (arr.length) {
      // eslint-disable-next-line no-console
      console.debug("[race-feed] drivers in state:", arr.length);
    }
    return arr
      .slice()
      .sort((a, b) => {
        if (a.rank != null && b.rank != null) return a.rank - b.rank;
        if (a.rank != null) return -1;
        if (b.rank != null) return 1;
        return b.km - a.km;
      })
      .map((d, idx) => ({
        position: d.rank ?? idx + 1,
        code: d.code,
        gap: "", // could compute vs leader if multiple drivers available
      }));
  }, [drivers]);

  // Top five for track map: map to positionScalar using km directly
  const topFive = useMemo(() => {
    const lapLen = circuit ? getLapLengthKm(circuit) : undefined;
    return Object.values(drivers)
      .sort((a, b) => b.km - a.km)
      .slice(0, 5)
      .map((d) => {
        let pct = 0;
        if (lapLen && lapLen > 0) {
          const laps = d.km / lapLen;
          const frac = laps - Math.floor(laps);
          pct = Math.max(0, Math.min(99.999, frac * 100));
        } else {
          pct = Math.max(0, Math.min(99.999, d.km));
        }
        return {
          code: d.code,
          teamColor: colorForCode(d.code),
          positionScalar: pct,
        };
      });
  }, [drivers, circuit]);

  const positionsAll = useMemo(() => {
    const lapLen = circuit ? getLapLengthKm(circuit) : undefined;
    return Object.values(drivers)
      .sort((a, b) => b.km - a.km)
      .map((d) => {
        let pct = 0;
        if (lapLen && lapLen > 0) {
          const laps = d.km / lapLen;
          const frac = laps - Math.floor(laps);
          pct = Math.max(0, Math.min(99.999, frac * 100));
        } else {
          pct = Math.max(0, Math.min(99.999, d.km));
        }
        return {
          code: d.code,
          teamColor: colorForCode(d.code),
          positionScalar: pct,
        };
      });
  }, [drivers, circuit]);

  return {
    connected,
    error,
    drivers,
    leaderboard,
    topFive,
    positionsAll,
    predictions,
  } as const;
}

export function colorForCode(code: string) {
  // Deterministic color from code to avoid hardcoding team colors
  let hash = 0;
  for (let i = 0; i < code.length; i++)
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 50%)`;
}
