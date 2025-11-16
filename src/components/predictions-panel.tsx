import { Card } from "@/components/ui/card";

type Prediction = { driver: string; predicted_seconds: number };

interface PredictionsPanelProps {
  predictions: Prediction[] | null;
}

export default function PredictionsPanel({
  predictions,
}: PredictionsPanelProps) {
  return (
    <Card className="bg-secondary/50 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Monaco 2025 Winner Prediction</h3>
        <span className="text-xs text-muted-foreground">Historical model</span>
      </div>

      {!predictions || predictions.length === 0 ? (
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-border" />
          <div className="h-4 w-full animate-pulse rounded bg-border" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-border" />
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {predictions.slice(0, 10).map((p, idx) => (
            <li
              key={`${p.driver}-${idx}`}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {idx + 1}
                </div>
                <span className="font-mono text-sm font-semibold">
                  {p.driver}
                </span>
              </div>
              <span className="font-mono text-sm text-muted-foreground">
                {p.predicted_seconds.toFixed(3)}s
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
