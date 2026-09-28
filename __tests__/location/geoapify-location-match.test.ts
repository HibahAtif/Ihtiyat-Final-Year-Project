/// <reference types="jest" />

import {
  matchGeoapifyLocationToCatalogue,
  type LocationCatalogueRow,
} from "../../src/location/geoapify-location-match";

import type { GeoapifyLocationResult } from "../../src/location/geoapify-reverse-geocode";

const makkahRegion: LocationCatalogueRow = {
  id: 2,
  parent_id: null,
  official_code: "0002",
  location_type: "region",
  name_en: "Makkah Region",
  name_ar: "منطقة مكة المكرمة",
  is_active: true,
};

const jeddahGovernorate: LocationCatalogueRow = {
  id: 124,
  parent_id: 2,
  official_code: "0124",
  location_type: "governorate",
  name_en: "Jeddah",
  name_ar: "جدة",
  is_active: true,
};

const inactiveLocation: LocationCatalogueRow = {
  id: 999,
  parent_id: 2,
  official_code: "0999",
  location_type: "governorate",
  name_en: "Example",
  name_ar: "مثال",
  is_active: false,
};

const catalogue: LocationCatalogueRow[] = [
  makkahRegion,
  jeddahGovernorate,
  inactiveLocation,
];

function geoapifyResult(
  overrides: Partial<GeoapifyLocationResult> = {},
): GeoapifyLocationResult {
  return {
    formattedAddress: null,
    country: "Saudi Arabia",
    countryCode: "sa",
    state: "Makkah",
    stateCode: null,
    county: "Jiddah",
    countyCode: null,
    city: "Jeddah",
    district: null,
    suburb: null,
    resultType: "building",
    latitude: 21.543194,
    longitude: 39.172788,
    ...overrides,
  };
}

describe("matchGeoapifyLocationToCatalogue", () => {
  test("matches Jeddah directly from the Geoapify city", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult(),
      catalogue,
    );

    expect(result).toEqual({
      location: jeddahGovernorate,
      matchedBy: "city",
      matchedGeoapifyValue: "Jeddah",
      isRegionalFallback: false,
    });
  });

  test("prefers the city match over the regional state match", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult({
        city: "Jeddah",
        state: "Makkah",
      }),
      catalogue,
    );

    expect(result?.location.official_code).toBe("0124");
    expect(result?.matchedBy).toBe("city");
    expect(result?.isRegionalFallback).toBe(false);
  });

  test("falls back to Makkah Region when Geoapify has no usable city", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult({
        city: null,
        state: "Makkah",
      }),
      catalogue,
    );

    expect(result).toEqual({
      location: makkahRegion,
      matchedBy: "state",
      matchedGeoapifyValue: "Makkah",
      isRegionalFallback: true,
    });
  });

  test("normalises administrative suffixes for regional matching", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult({
        city: null,
        state: "Makkah Region",
      }),
      catalogue,
    );

    expect(result?.location).toEqual(makkahRegion);
    expect(result?.matchedBy).toBe("state");
  });

  test("matches names case-insensitively", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult({
        city: "  JEDDAH  ",
      }),
      catalogue,
    );

    expect(result?.location).toEqual(jeddahGovernorate);
  });

  test("does not return inactive catalogue locations", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult({
        city: "Example",
        state: null,
      }),
      catalogue,
    );

    expect(result).toBeNull();
  });

  test("returns null when neither city nor state exists in the catalogue", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult({
        city: "Unsupported City",
        state: "Unsupported Region",
      }),
      catalogue,
    );

    expect(result).toBeNull();
  });

  test("returns null when Geoapify provides neither city nor state", () => {
    const result = matchGeoapifyLocationToCatalogue(
      geoapifyResult({
        city: null,
        state: null,
      }),
      catalogue,
    );

    expect(result).toBeNull();
  });
});