import type { GeoapifyLocationResult } from "./geoapify-reverse-geocode";

export type LocationCatalogueRow = {
  id: number;
  parent_id: number | null;
  official_code: string;
  location_type: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
};

export type GeoapifyLocationMatchSource =
  | "city"
  | "state";

export type GeoapifyLocationMatch = {
  location: LocationCatalogueRow;
  matchedBy: GeoapifyLocationMatchSource;
  matchedGeoapifyValue: string;
  isRegionalFallback: boolean;
};

function normaliseLocationName(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(region|province|governorate)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findByEnglishName(
  value: string | null,
  locations: LocationCatalogueRow[],
): LocationCatalogueRow | null {
  if (!value?.trim()) {
    return null;
  }

  const normalisedValue = normaliseLocationName(value);

  if (!normalisedValue) {
    return null;
  }

  return (
    locations.find(
      (location) =>
        location.is_active &&
        normaliseLocationName(location.name_en) ===
          normalisedValue,
    ) ?? null
  );
}

export function matchGeoapifyLocationToCatalogue(
  geoapifyLocation: GeoapifyLocationResult,
  locations: LocationCatalogueRow[],
): GeoapifyLocationMatch | null {
  const activeLocations = locations.filter(
    (location) => location.is_active,
  );

  const cityMatch = findByEnglishName(
    geoapifyLocation.city,
    activeLocations,
  );

  if (cityMatch && geoapifyLocation.city) {
    return {
      location: cityMatch,
      matchedBy: "city",
      matchedGeoapifyValue: geoapifyLocation.city,
      isRegionalFallback: false,
    };
  }

  const stateMatch = findByEnglishName(
    geoapifyLocation.state,
    activeLocations,
  );

  if (stateMatch && geoapifyLocation.state) {
    return {
      location: stateMatch,
      matchedBy: "state",
      matchedGeoapifyValue: geoapifyLocation.state,
      isRegionalFallback: true,
    };
  }

  return null;
}