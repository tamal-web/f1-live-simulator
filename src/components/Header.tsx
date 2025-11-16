interface HeaderProps {
  year: string;
  circuit: string;
  session: string;
}

export default function Header({ year, circuit, session }: HeaderProps) {
  const sessionLabel =
    session === "q" ? "QUALIFYING" : session === "p" ? "PRACTICE" : "RACE";

  return (
    <header className="border-b border-border bg-secondary/50 backdrop-blur supports-[backdrop-filter]:bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="f1-title">
              <span className="text-primary">F1</span> {circuit.toUpperCase()}{" "}
              {sessionLabel}
            </h1>
            <p className="text-sm text-muted-foreground">{year} Season</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="f1-accent-bar" />
            <span className="text-xs font-mono text-muted-foreground">
              ANALYSIS
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
