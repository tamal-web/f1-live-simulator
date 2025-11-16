import { Card } from "@/components/ui/card";

interface LeaderboardEntry {
  position: number;
  code: string;
  gap?: string;
  teamColor?: string;
  name?: string;
  team?: string;
}

interface LeaderboardProps {
  highlightedDriver: string;
  rows: LeaderboardEntry[];
  loading?: boolean;
}

export default function Leaderboard({
  highlightedDriver,
  rows,
  loading,
}: LeaderboardProps) {
  if (loading) {
    return (
      <Card className="bg-secondary/50 p-6">
        <div className="space-y-3">
          <div className="h-6 w-32 animate-pulse rounded bg-border" />
          <div className="h-4 w-full animate-pulse rounded bg-border" />
          <div className="h-4 w-full animate-pulse rounded bg-border" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-border" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary/50 p-6 backdrop-blur max-h-[26rem] overflow-scroll">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-primary">Live Leaderboard</h3>
        <span className="text-xs text-muted-foreground">Current race</span>
      </div>

      <div className="divide-y divide-border">
        {rows.map((r) => {
          const isHighlighted = r.code === highlightedDriver;
          return (
            <div
              key={`${r.code}-${r.position ?? "na"}`}
              className={`flex items-center justify-between gap-3 py-2 px-2 rounded-md transition-colors ${
                isHighlighted ? "bg-primary/10 ring-1 ring-primary/40" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {r.position}
                </div>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: r.teamColor || "#999" }}
                />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-bold">
                      {r.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.team || ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.name || ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold transition-colors">
                  {r.gap || ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
