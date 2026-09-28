import { geoapifyApiKey } from "@/lib/geoapify-config";

const GEOAPIFY_REVERSE_GEOCODING_URL =
  "https://api.geoapify.com/v1/geocode/reverse";

type GeoapifyRawResult = {
  name?: string;
  country?: string;
  country_code?: string;
  state?: string;
  state_code?: string;
  county?: string;
  county_code?: string;
  city?: string;
  district?: string;
  suburb?: string;
  formatted?: string;
  result_type?: string;
  lat?: number;
  lon?: number;
};

type GeoapifyReverseResponse = {
  results?: GeoapifyRawResult[];
};

export type GeoapifyLocationResult = {
  formattedAddress: string | null;
  country: string | null;
  countryCode: string;
  state: string | null;
  stateCode: string | null;
  county: string | null;
  countyCode: string | null;
  city: string | null;
  district: string | null;
  suburb: string | null;
  resultType: string | null;
  latitude: number;
  longitude: number;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function validateCoordinates({
  latitude,
  longitude,
}: Coordinates): void {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Latitude must be a finite value between -90 and 90.");
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      "Longitude must be a finite value between -180 and 180.",
    );
  }
}

function nullableText(value: string | undefined): string | null {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

export async function reverseGeocodeSaudiCoordinates(
  coordinates: Coordinates,
  fetchImplementation: typeof fetch = fetch,
): Promise<GeoapifyLocationResult> {
  validateCoordinates(coordinates);

  const { latitude, longitude } = coordinates;

  const url =
    `${GEOAPIFY_REVERSE_GEOCODING_URL}` +
    `?lat=${latitude}` +
    `&lon=${longitude}` +
    `&format=json` +
    `&limit=1` +
    `&lang=en` +
    `&apiKey=${encodeURIComponent(geoapifyApiKey)}`;

  const response = await fetchImplementation(url);

  if (!response.ok) {
    throw new Error(
      `Geoapify reverse geocoding failed with HTTP ${response.status}.`,
    );
  }

  const payload =
    (await response.json()) as GeoapifyReverseResponse;

  const result = payload.results?.[0];

  if (!result) {
    throw new Error(
      "Geoapify could not identify a location for these coordinates.",
    );
  }

  const countryCode = result.country_code?.trim().toLowerCase();

  if (!countryCode) {
    throw new Error(
      "Geoapify returned a location without a country code.",
    );
  }

  if (countryCode !== "sa") {
    throw new Error(
      "The detected location is outside Saudi Arabia.",
    );
  }

  const resolvedLatitude = result.lat;
  const resolvedLongitude = result.lon;

  if (
    typeof resolvedLatitude !== "number" ||
    typeof resolvedLongitude !== "number"
  ) {
    throw new Error(
      "Geoapify returned a location without valid coordinates.",
    );
  }

  return {
    formattedAddress: nullableText(result.formatted),
    country: nullableText(result.country),
    countryCode,
    state: nullableText(result.state),
    stateCode: nullableText(result.state_code),
    county: nullableText(result.county),
    countyCode: nullableText(result.county_code),
    city: nullableText(result.city),
    district: nullableText(result.district),
    suburb: nullableText(result.suburb),
    resultType: nullableText(result.result_type),
    latitude: resolvedLatitude,
    longitude: resolvedLongitude,
  };
}