import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getCircuitGeoJSONPath } from "@/lib/circuit-mapping";

import { geoMercator, geoPath } from "d3";

interface TrackMapProps {
  circuit: string;
  topFive?: { code: string; teamColor: string; positionScalar: number }[];
  cars?: { code: string; teamColor: string; positionScalar: number }[];
  highlightedDriverCode?: string;
  highlightedPosition?: number;
}

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export default function TrackMap({
  circuit,
  topFive,
  cars,
  highlightedDriverCode,
  highlightedPosition,
}: TrackMapProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathLength, setPathLength] = useState<number | null>(null);
  const [computedPoints, setComputedPoints] = useState<
    {
      x: number;
      y: number;
      code: string;
      teamColor: string;
      highlighted?: boolean;
    }[]
  >([]);

  const [firstPathEl, setFirstPathEl] = useState<SVGPathElement | null>(null);
  const handleFirstPathRef = useCallback((el: SVGPathElement | null) => {
    // Avoid repeating state updates with the same element
    setFirstPathEl((prev) => (prev === el ? prev : el));
  }, []);

  useEffect(() => {
    const fetchCircuitGeoJSON = async () => {
      setLoading(true);
      setError(null);
      setPaths([]);
      setBounds(null);

      try {
        const geoJsonUrl = getCircuitGeoJSONPath(circuit);
        console.log(`[track] fetching geojson from: ${geoJsonUrl}`);
        const response = await fetch(geoJsonUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.status}`);
        }

        const geojsonData = await response.json();
        console.log("[track] fetched geojson:", geojsonData);

        // Quick validation / normalization: we want a FeatureCollection for easier handling
        let normalized: any;
        if (!geojsonData) throw new Error("Empty geojson response");
        if (geojsonData.type === "FeatureCollection") {
          normalized = geojsonData;
        } else if (geojsonData.type === "Feature") {
          normalized = { type: "FeatureCollection", features: [geojsonData] };
        } else if (geojsonData.type && geojsonData.type.endsWith("Geometry")) {
          // Single geometry (e.g., LineString)
          normalized = {
            type: "FeatureCollection",
            features: [
              { type: "Feature", properties: {}, geometry: geojsonData },
            ],
          };
        } else if (
          geojsonData.features &&
          Array.isArray(geojsonData.features)
        ) {
          // might already be a Collection-like object
          normalized = {
            type: "FeatureCollection",
            features: geojsonData.features,
          };
        } else {
          throw new Error("Unsupported GeoJSON structure");
        }

        // Virtual canvas used when fitting projection
        const VIRT_WIDTH = 1000;
        const VIRT_HEIGHT = 1000;

        // Create projection and path generator
        const projection = (geoMercator as any)().fitSize(
          [VIRT_WIDTH, VIRT_HEIGHT],
          normalized
        );
        const pathGenerator = (geoPath as any)().projection(projection);

        // helper: turn geometries/features into drawable path strings
        const dStrings: string[] = [];

        // handle each feature, but for Multi* or GeometryCollection expand to sub-geometries
        const produceDFromFeature = (feat: any) => {
          if (!feat || !feat.geometry) return;
          const geom = feat.geometry;
          if (!geom) return;

          const pushIfValid = (f: any) => {
            try {
              const d = pathGenerator(f);
              if (d && typeof d === "string") {
                dStrings.push(d);
              }
            } catch (e) {
              console.warn("[track] pathGenerator error for feature:", e);
            }
          };

          switch (geom.type) {
            case "LineString":
            case "Polygon":
              pushIfValid(feat);
              break;

            case "MultiLineString":
            case "MultiPolygon":
              // split into separate features so pathGenerator returns sub-paths
              for (const coords of geom.coordinates) {
                const subGeom = {
                  type: geom.type.startsWith("Multi")
                    ? geom.type.replace("Multi", "")
                    : geom.type,
                  coordinates: coords,
                };
                pushIfValid({
                  type: "Feature",
                  properties: feat.properties || {},
                  geometry: subGeom,
                });
              }
              break;

            case "Point":
              // Points are not visible as stroked lines; skip or optionally draw circle
              break;

            case "GeometryCollection":
              for (const g of geom.geometries || []) {
                pushIfValid({
                  type: "Feature",
                  properties: feat.properties || {},
                  geometry: g,
                });
              }
              break;

            default:
              // try to push as-is
              pushIfValid(feat);
          }
        };

        // Iterate normalized features
        (normalized.features || []).forEach((f: any) => produceDFromFeature(f));

        console.log(
          `[track] produced ${dStrings.length} path(s). Example first d:`,
          dStrings[0]
        );

        if (dStrings.length === 0) {
          throw new Error(
            "No drawable paths found in GeoJSON (maybe it's Points only or unsupported geometry)."
          );
        }

        // Compute bounds for all features that produced paths
        // Build a FeatureCollection only from features we actually used so bounds are correct.
        // Some pathGenerators may return null for degenerate geometries; we already filtered those out.
        // Using pathGenerator.bounds on original normalized should be fine too:
        const [[minX, minY], [maxX, maxY]] = pathGenerator.bounds(normalized);

        const padding = 20;
        setBounds({
          minX: minX - padding,
          minY: minY - padding,
          maxX: maxX + padding,
          maxY: maxY + padding,
        });

        setPaths(dStrings);
      } catch (err: any) {
        console.error("[track] error:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchCircuitGeoJSON();
  }, [circuit]);

  useEffect(() => {
    if (!firstPathEl) return;
    try {
      const len = firstPathEl.getTotalLength();
      setPathLength(len);
    } catch {}
  }, [firstPathEl, paths]);

  useEffect(() => {
    if (!firstPathEl || !pathLength) return;

    const mapScalarToPoint = (scalar: number) => {
      // scalar is percent of lap (0..100)
      const clamped = Math.max(0, Math.min(100, scalar));
      const t = (clamped / 100) * pathLength;
      try {
        const pt = firstPathEl.getPointAtLength(t);
        return { x: pt.x, y: pt.y };
      } catch {
        return null;
      }
    };

    const source =
      cars && cars.length ? cars : topFive && topFive.length ? topFive : [];
    // Stable ordering by code to avoid key reshuffles
    const inputs = source
      .slice(0, cars && cars.length ? cars.length : 5)
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code));

    const points: {
      x: number;
      y: number;
      code: string;
      teamColor: string;
      highlighted?: boolean;
    }[] = [];
    for (const r of inputs) {
      const base = mapScalarToPoint(r.positionScalar);
      if (!base) continue;
      const isHighlighted =
        highlightedDriverCode === r.code &&
        typeof highlightedPosition === "number";
      const hp = isHighlighted
        ? mapScalarToPoint(highlightedPosition as number)
        : base;
      if (!hp) continue;
      points.push({
        ...hp,
        code: r.code,
        teamColor: isHighlighted ? "#ffffff" : r.teamColor,
        highlighted: isHighlighted || undefined,
      });
    }

    // Only update state if points changed to avoid render loops
    setComputedPoints((prev) => {
      if (prev.length === points.length) {
        let same = true;
        for (let i = 0; i < prev.length; i++) {
          const a = prev[i];
          const b = points[i];
          if (
            a.x !== b.x ||
            a.y !== b.y ||
            a.code !== b.code ||
            a.teamColor !== b.teamColor ||
            !!a.highlighted !== !!b.highlighted
          ) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return points;
    });
  }, [
    firstPathEl,
    pathLength,
    topFive,
    cars,
    highlightedDriverCode,
    highlightedPosition,
  ]);

  const viewBoxForBounds = (b: Bounds) => {
    const vbX = b.minX;
    const vbY = b.minY;
    const vbW = Math.max(1, b.maxX - b.minX);
    const vbH = Math.max(1, b.maxY - b.minY);
    return `${vbX} ${vbY} ${vbW} ${vbH}`;
  };

  return (
    <Card className="bg-secondary/50 p-6 backdrop-blur flex items-center justify-center min-h-96 overflow-hidden">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 w-64 rounded-lg bg-border" />
        </div>
      ) : error ? (
        <div className="text-center text-muted-foreground">
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2">Using fallback circuit display</p>
          <div
            className="w-full h-full mt-4"
            dangerouslySetInnerHTML={{ __html: getDefaultCircuitSVG(circuit) }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center max-h-80">
          {bounds && (
            <svg
              viewBox={viewBoxForBounds(bounds)}
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <style>
                  {`.track-line { 
                      stroke: var(--primary, #0ea5e9); 
                      stroke-width: 12; 
                      fill: none; 
                      stroke-linecap: round;
                      stroke-linejoin: round;
                    }
                    .track-shadow { 
                      stroke: var(--secondary, #000000); 
                      stroke-width: 16; 
                      fill: none; 
                      stroke-linecap: round;
                      stroke-linejoin: round;
                      opacity: 0.25;
                    }
                    .track-label {
                      fill: var(--muted-foreground, #334155);
                      font-weight: bold;
                      font-family: monospace;
                    }`}
                </style>
              </defs>

              {/* shadows */}
              {paths.map((d, i) => (
                <path
                  key={`shadow-${i}`}
                  className="track-shadow"
                  d={d}
                  ref={i === 0 ? handleFirstPathRef : undefined}
                />
              ))}

              {/* main line */}
              {paths.map((d, i) => (
                <path key={`line-${i}`} className="track-line" d={d} />
              ))}

              {computedPoints.map((p) => (
                <g
                  key={`pt-${p.code}`}
                  transform={`translate(${p.x}, ${p.y})`}
                  style={{ transition: "transform 300ms ease" }}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={p.highlighted ? 24 : 20}
                    fill={p.highlighted ? "none" : p.teamColor}
                    stroke={
                      p.highlighted ? "var(--primary, #0ea5e9)" : "#000000"
                    }
                    strokeWidth={p.highlighted ? 3 : 1.5}
                    opacity={p.highlighted ? 1 : 0.95}
                  />
                  <text x={24} y={-2} className="track-label" fontSize={24}>
                    {p.code}
                  </text>
                </g>
              ))}

              <text
                x={(bounds.minX + bounds.maxX) / 2}
                y={bounds.maxY + 40}
                textAnchor="middle"
                className="track-label"
                fontSize={20}
              >
                {circuit.toUpperCase()}
              </text>
            </svg>
          )}
        </div>
      )}
    </Card>
  );
}

function getDefaultCircuitSVG(circuit: string): string {
  return `
    <svg viewBox="0 0 400 440" xmlns="http://www.w3.org/2000/svg" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <style>
          .track { stroke: hsl(var(--primary)); stroke-width: 8; fill: #fff; }
          .track-label { fill: hsl(var(--muted-foreground)); font-size: 14px; font-weight: bold; font-family: monospace; }
        </style>
      </defs>
      
      <path class="track" d="M 100 100 L 300 100 L 350 200 L 300 300 L 100 300 L 50 200 Z" />
      
      <text class="track-label" x="200" y="380" text-anchor="middle">${circuit.toUpperCase()}</text>
      <text class="track-label" x="200" y="410" text-anchor="middle" font-size="12" opacity="0.6">Generic Circuit</text>
    </svg>
  `;
}
