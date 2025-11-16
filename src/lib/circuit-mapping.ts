export const circuitMapping: Record<string, string> = {
  // European circuits
  monaco: "mc-1929",
  "monte-carlo": "mc-1929",
  monza: "it-1922",
  imola: "it-1953",
  mugello: "it-1914", // Scarperia e San Piero
  silverstone: "gb-1948",
  spa: "be-1925",
  "spa-francorchamps": "be-1925",
  "paul-ricard": "fr-1969", // Le Castellet
  "le-castellet": "fr-1969",
  "magny-cours": "fr-1960",
  madrid: "es-2026",
  hockenheim: "de-1932",
  hungaroring: "hu-1986",
  budapest: "hu-1986",
  nurburgring: "de-1927", // Nürburg
  nuerburgring: "de-1927",
  nurburg: "de-1927",
  barcelona: "es-1991",
  catalunya: "es-1991",
  spielberg: "at-1969",
  "red-bull-ring": "at-1969",
  zandvoort: "nl-1948",

  // Asian circuits
  suzuka: "jp-1962",
  "marina-bay": "sg-2008",
  singapore: "sg-2008",
  shanghai: "cn-2004",
  bahrain: "bh-2002", // Sakhir
  "abu-dhabi": "ae-2009",
  jeddah: "sa-2021",
  losail: "qa-2004",
  lusail: "qa-2004",
  sepang: "my-1999",
  istanbul: "tr-2005",

  // American circuits
  austin: "us-2012",
  miami: "us-2022",
  "mexico-city": "mx-1962",
  montreal: "ca-1978",
  interlagos: "br-1940", // Sao Paulo
  "sao-paulo": "br-1940",
  jacarepagua: "br-1977",
  "las-vegas": "us-2023",
  indianapolis: "us-1909",
  dix: "us-1956",
  "buenos-aires": "ar-1952",

  // Australian circuits
  melbourne: "au-1953",
  "albert-park": "au-1953",

  // Middle East and Africa
  sakhir: "bh-2002",
  "yas-marina": "ae-2009",
  baku: "az-2016",
  johannesburg: "za-1961",

  // Portugal
  estoril: "pt-1972",
  portimao: "pt-2008",

  // Russia
  sochi: "ru-2014",
};

export function getCircuitGeoJSONPath(circuit: string): string {
  const filename =
    circuitMapping[circuit.toLowerCase()] || circuit.toLowerCase();
  return `https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/${filename}.geojson`;
}

export function normalizeCoordinates(
  coordinates: [number, number]
): [number, number] {
  return [coordinates[0], coordinates[1]];
}

// Lap length in kilometers. Provide key circuits and sensible defaults.
export function getLapLengthKm(circuit: string): number {
  const key = circuit.toLowerCase();
  const map: Record<string, number> = {
    // As requested: Japan (Suzuka) lap length treated as 5.48 km
    japan: 5.48,
    suzuka: 5.48,
    // Common circuits (approximate values)
    monaco: 3.32,
    "monte-carlo": 3.32,
    monza: 5.79,
    spa: 7.0,
    silverstone: 5.89,
  };
  return map[key] ?? 5.0; // fallback
}
