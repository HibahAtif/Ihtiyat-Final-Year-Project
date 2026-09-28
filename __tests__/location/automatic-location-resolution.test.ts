/// <reference types="jest" />

/**
 * WHAT:
 * Supplies a deterministic Geoapify key while the production modules used by
 * this orchestration test are being imported.
 * +
 * Prevents the real Supabase client from being initialised while this
 * orchestration unit test is loaded.
 *
 * WHY:
 * Jest does not rely on Expo's .env.local loading, and this unit test must not
 * require or expose the developer's real Geoapify API key.
 * +
 * The production Supabase client installs Expo SQLite-backed localStorage for
 * persisted authentication. Jest does not provide Expo's native SQLite
 * database implementation, and this test injects a fake hazard-resolution
 * dependency anyway.
 * 
 * HOW:
 * The Geoapify configuration module is replaced before Jest evaluates the
 * reverse-geocoding service imported by the orchestrator.
 * +
 * The configuration module is replaced with a harmless placeholder client
 * before the production location modules are evaluated.
*/

jest.mock("@/lib/geoapify-config", () => ({
    geoapifyApiKey: "test-geoapify-key",
}))

jest.mock("@/lib/supabase-config", () => ({
    supabaseClient: {}
}))

import {
  resolveCurrentLocationHazards,
} from "../../src/location/automatic-location-resolution";

import type {
  AutomaticLocationDependencies,
} from "../../src/location/automatic-location-resolution";

import type {
  GeoapifyLocationResult,
} from "../../src/location/geoapify-reverse-geocode";

import type {
  GeoapifyLocationMatch,
  LocationCatalogueRow,
} from "../../src/location/geoapify-location-match";

import type {
  ResolvedLocationHazard,
} from "../../src/location/geoapify-location-hazard-resolution";




const coordinates = {
  latitude: 21.5433,
  longitude: 39.1728,
};

const jeddahLocation: LocationCatalogueRow = {
  id: 201,
  parent_id: 200,
  official_code: "0124",
  location_type: "governorate",
  name_en: "Jeddah",
  name_ar: "جدة",
  is_active: true,
};

const geoapifyResult: GeoapifyLocationResult = {
  formattedAddress:
    "Al Andalus, Jeddah, Saudi Arabia",
  country: "Saudi Arabia",
  countryCode: "sa",
  state: "Makkah",
  stateCode: null,
  county: "Jiddah",
  countyCode: null,
  city: "Jeddah",
  district: "Al Andalus",
  suburb: "Al Andalus",
  resultType: "building",
  latitude: 21.543194,
  longitude: 39.172788,
};

const jeddahMatch: GeoapifyLocationMatch = {
  location: jeddahLocation,
  matchedBy: "city",
  matchedGeoapifyValue: "Jeddah",
  isRegionalFallback: false,
};

const flashFloodHazard: ResolvedLocationHazard = {
  hazard_id: 1,
  hazard_code: "flash_flood",
  hazard_name_en: "Flash Flood",
  hazard_name_ar: "سيول",
  classification: "hydrological",
  hazard_sort_order: 1,
  is_prioritised: true,
  relevance_rank: 1,
  matched_location_id: 201,
  matched_location_code: "0124",
  matched_location_type: "governorate",
  matched_location_name_en: "Jeddah",
  matched_location_name_ar: "جدة",
  hierarchy_distance: 0,
};

/**
 * WHAT:
 * Creates deterministic substitutes for every external boundary used by the
 * automatic-location orchestrator.
 *
 * WHY:
 * The orchestrator test should verify sequencing and fallback behaviour
 * without accessing GPS hardware, Geoapify, or Supabase.
 *
 * HOW:
 * Each dependency starts in a successful Jeddah state and individual tests
 * override only the boundary required for that scenario.
 */
function createDependencies() {
  const getCurrentDeviceCoordinates =
    jest.fn().mockResolvedValue({
      status: "success",
      coordinates,
    });

  const reverseGeocodeSaudiCoordinates =
    jest.fn().mockResolvedValue(
      geoapifyResult,
    );

  const resolveGeoapifyLocationHazards =
    jest.fn().mockResolvedValue({
      status: "matched",
      match: jeddahMatch,
      hazards: [
        flashFloodHazard,
      ],
    });

  const dependencies: AutomaticLocationDependencies = {
    getCurrentDeviceCoordinates,
    reverseGeocodeSaudiCoordinates,
    resolveGeoapifyLocationHazards,
  };

  return {
    dependencies,
    getCurrentDeviceCoordinates,
    reverseGeocodeSaudiCoordinates,
    resolveGeoapifyLocationHazards,
  };
}

describe("resolveCurrentLocationHazards", () => {
  test("runs the complete automatic Jeddah location pipeline successfully", async () => {
    const {
      dependencies,
      getCurrentDeviceCoordinates,
      reverseGeocodeSaudiCoordinates,
      resolveGeoapifyLocationHazards,
    } = createDependencies();

    const result =
      await resolveCurrentLocationHazards(
        dependencies,
      );

    expect(result).toEqual({
      status: "matched",
      coordinates,
      geoapifyLocation: geoapifyResult,
      match: jeddahMatch,
      hazards: [
        flashFloodHazard,
      ],
    });

    expect(
      getCurrentDeviceCoordinates,
    ).toHaveBeenCalledTimes(1);

    expect(
      reverseGeocodeSaudiCoordinates,
    ).toHaveBeenCalledWith(
      coordinates,
    );

    expect(
      resolveGeoapifyLocationHazards,
    ).toHaveBeenCalledWith(
      geoapifyResult,
    );
  });

  test("stops immediately when device location requires manual selection", async () => {
    const {
      dependencies,
      getCurrentDeviceCoordinates,
      reverseGeocodeSaudiCoordinates,
      resolveGeoapifyLocationHazards,
    } = createDependencies();

    getCurrentDeviceCoordinates
      .mockResolvedValue({
        status:
          "manual-selection-required",
        reason: "services-disabled",
        canAskAgain: null,
      });

    const result =
      await resolveCurrentLocationHazards(
        dependencies,
      );

    expect(result).toEqual({
      status:
        "manual-selection-required",
      reason: "services-disabled",
      canAskAgain: null,
    });

    expect(
      reverseGeocodeSaudiCoordinates,
    ).not.toHaveBeenCalled();

    expect(
      resolveGeoapifyLocationHazards,
    ).not.toHaveBeenCalled();
  });

  test("preserves permission canAskAgain information", async () => {
    const {
      dependencies,
      getCurrentDeviceCoordinates,
    } = createDependencies();

    getCurrentDeviceCoordinates
      .mockResolvedValue({
        status:
          "manual-selection-required",
        reason: "permission-denied",
        canAskAgain: false,
      });

    const result =
      await resolveCurrentLocationHazards(
        dependencies,
      );

    expect(result).toEqual({
      status:
        "manual-selection-required",
      reason: "permission-denied",
      canAskAgain: false,
    });
  });

  test("falls back to manual selection when reverse geocoding fails", async () => {
    const {
      dependencies,
      reverseGeocodeSaudiCoordinates,
      resolveGeoapifyLocationHazards,
    } = createDependencies();

    reverseGeocodeSaudiCoordinates
      .mockRejectedValue(
        new Error(
          "Geoapify unavailable",
        ),
      );

    const result =
      await resolveCurrentLocationHazards(
        dependencies,
      );

    expect(result).toEqual({
      status:
        "manual-selection-required",
      reason:
        "reverse-geocoding-failed",
      canAskAgain: null,
    });

    expect(
      resolveGeoapifyLocationHazards,
    ).not.toHaveBeenCalled();
  });

  test("falls back to manual selection when the detected place is unsupported", async () => {
    const {
      dependencies,
      resolveGeoapifyLocationHazards,
    } = createDependencies();

    resolveGeoapifyLocationHazards
      .mockResolvedValue({
        status:
          "manual-selection-required",
        match: null,
        hazards: [],
      });

    const result =
      await resolveCurrentLocationHazards(
        dependencies,
      );

    expect(result).toEqual({
      status:
        "manual-selection-required",
      reason: "unsupported-location",
      canAskAgain: null,
    });
  });

  test("does not hide backend failures as normal manual-selection fallbacks", async () => {
    const {
      dependencies,
      resolveGeoapifyLocationHazards,
    } = createDependencies();

    resolveGeoapifyLocationHazards
      .mockRejectedValue(
        new Error(
          "Supabase resolver unavailable",
        ),
      );

    await expect(
      resolveCurrentLocationHazards(
        dependencies,
      ),
    ).rejects.toThrow(
      "Supabase resolver unavailable",
    );
  });
});