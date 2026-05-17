export type Manufacturer = {
  id: string; // route slug, e.g. "Boeing"
  name: string;
  country?: string;
  founded?: number;
  logoUrl?: string;
  description?: string;
  families: string[];
};

export type Family = {
  manufacturerId: string;
  familyId: string; // route slug, e.g. "737"
  name: string;
  description?: string;
  models: string[]; // modelId list, e.g. "737-800"
};

export type AircraftModel = {
  manufacturerId: string;
  familyId: string;
  modelId: string; // route slug, e.g. "737-800"
  name: string;

  introduced?: number;
  productionStatus?: "in-service" | "out-of-production" | "prototype" | "planned";
  firstFlight?: string; // YYYY-MM-DD

  passengerCapacity?: { typical?: number; max?: number };
  rangeKm?: number;
  cruiseSpeedKmh?: number;
  mtowKg?: number;

  engines?: string[];
  layouts?: { name: string; seats?: string; rows?: number; seatmapUrl?: string }[];
  majorOperators?: string[];
  buyingCustomers?: { airline: string; orders?: number | null }[];
  manufacturersNotes?: string;
  accidents?: { date: string; summary: string; link?: string }[];

  images: string[];
  wikiUrl?: string;
  officialUrl?: string;

  slug: string; // unique global id, e.g. "Boeing-737-800"
  keywords?: string[]; // for search/identify mapping
  summary?: string;
};

export type ModelIndexItem = {
  manufacturerId: string;
  familyId: string;
  modelId: string;
  name: string;
  slug: string;
  thumbnailUrl?: string;
  keywords: string[];
};

