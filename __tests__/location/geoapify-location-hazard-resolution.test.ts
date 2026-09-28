/// <reference types="jest" />

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  Database,
} from "../../src/types/database.types";

import {
  resolveGeoapifyLocationHazards,
  type ResolvedLocationHazard,
} from "../../src/location/geoapify-location-hazard-resolution";

import type {
  GeoapifyLocationResult,
} from "../../src/location/geoapify-reverse-geocode";

import type {
  LocationCatalogueRow,
} from "../../src/location/geoapify-location-match";

/**
 * WHAT:
 * Prevents the real Expo/Supabase configuration module from being
 * initialised while this unit test file is loaded.
 *
 * WHY:
 * These tests verify service orchestration only. They must not depend on
 * environment variables, a live Supabase project, or network availability.
 *
 * HOW:
 * Every test injects its own fake Supabase client into the service.
 */
jest.mock("@/lib/supabase-config", () => ({
  supabaseClient: {},
}));

const makkahRegion: LocationCatalogueRow = {
  id: 200,
  parent_id: null,
  official_code: "0002",
  location_type: "region",
  name_en: "Makkah Region",
  name_ar: "منطقة مكة المكرمة",
  is_active: true,
};

const jeddahGovernorate: LocationCatalogueRow = {
  id: 201,
  parent_id: 200,
  official_code: "0124",
  location_type: "governorate",
  name_en: "Jeddah",
  name_ar: "جدة",
  is_active: true,
};

const catalogue: LocationCatalogueRow[] = [
  makkahRegion,
  jeddahGovernorate,
];

/**
 * WHAT:
 * Creates a normalised Geoapify result suitable for service tests.
 *
 * WHY:
 * Individual tests only need to change the geographic field relevant to the
 * behaviour being exercised.
 *
 * HOW:
 * A realistic Jeddah result is used as the default and Partial overrides
 * replace only the required fields.
 */
function createGeoapifyResult(
  overrides: Partial<GeoapifyLocationResult> = {},
): GeoapifyLocationResult {
  return {
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
    ...overrides,
  };
}

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

type FakeClientOptions = {
  locations?: LocationCatalogueRow[] | null;
  locationError?: {
    message: string;
  } | null;
  hazards?: ResolvedLocationHazard[] | null;
  hazardError?: {
    message: string;
  } | null;
};

/**
 * WHAT:
 * Creates the smallest fake Supabase client required by this service.
 *
 * WHY:
 * We want deterministic unit tests for query/RPC orchestration without
 * contacting Supabase.
 *
 * HOW:
 * from().select().eq() resolves with the configured location response,
 * while rpc() resolves with the configured hazard response. Jest mocks are
 * returned as well so tests can verify the exact calls made by the service.
 */
function createFakeSupabaseClient(
  options: FakeClientOptions = {},
) {
  const eqMock = jest.fn().mockResolvedValue({
    data:
      options.locations === undefined
        ? catalogue
        : options.locations,
    error: options.locationError ?? null,
  });

  const selectMock = jest.fn().mockReturnValue({
    eq: eqMock,
  });

  const fromMock = jest.fn().mockReturnValue({
    select: selectMock,
  });

  const rpcMock = jest.fn().mockResolvedValue({
    data:
      options.hazards === undefined
        ? [flashFloodHazard]
        : options.hazards,
    error: options.hazardError ?? null,
  });

  const client = {
    from: fromMock,
    rpc: rpcMock,
  } as unknown as SupabaseClient<Database>;

  return {
    client,
    fromMock,
    selectMock,
    eqMock,
    rpcMock,
  };
}

describe("resolveGeoapifyLocationHazards", () => {
  test("matches Jeddah and resolves hazards using its curated location ID", async () => {
    const {
      client,
      fromMock,
      selectMock,
      eqMock,
      rpcMock,
    } = createFakeSupabaseClient();

    const result =
      await resolveGeoapifyLocationHazards(
        createGeoapifyResult(),
        client,
      );

    expect(result.status).toBe("matched");

    if (result.status !== "matched") {
      throw new Error(
        "Expected a matched location result.",
      );
    }

    expect(
      result.match.location.official_code,
    ).toBe("0124");

    expect(result.match.matchedBy).toBe("city");

    expect(result.hazards).toEqual([
      flashFloodHazard,
    ]);

    expect(fromMock).toHaveBeenCalledWith(
      "locations",
    );

    expect(selectMock).toHaveBeenCalledWith(
      "id,parent_id,official_code,location_type,name_en,name_ar,is_active",
    );

    expect(eqMock).toHaveBeenCalledWith(
      "is_active",
      true,
    );

    expect(rpcMock).toHaveBeenCalledWith(
      "resolve_location_hazards",
      {
        p_location_id: 201,
      },
    );
  });

  test("uses the regional location ID when city matching falls back to Makkah Region", async () => {
    const {
      client,
      rpcMock,
    } = createFakeSupabaseClient();

    const result =
      await resolveGeoapifyLocationHazards(
        createGeoapifyResult({
          city: null,
          state: "Makkah",
        }),
        client,
      );

    expect(result.status).toBe("matched");

    if (result.status !== "matched") {
      throw new Error(
        "Expected a matched location result.",
      );
    }

    expect(
      result.match.location.official_code,
    ).toBe("0002");

    expect(result.match.matchedBy).toBe("state");

    expect(
      result.match.isRegionalFallback,
    ).toBe(true);

    expect(rpcMock).toHaveBeenCalledWith(
      "resolve_location_hazards",
      {
        p_location_id: 200,
      },
    );
  });

  test("requests manual selection when no curated location can be matched", async () => {
    const {
      client,
      rpcMock,
    } = createFakeSupabaseClient();

    const result =
      await resolveGeoapifyLocationHazards(
        createGeoapifyResult({
          city: "Unsupported City",
          state: "Unsupported Region",
        }),
        client,
      );

    expect(result).toEqual({
      status: "manual-selection-required",
      match: null,
      hazards: [],
    });

    /**
     * No RPC should run without a trusted curated location ID.
     * This prevents an unsupported Geoapify place from being silently treated
     * as a supported Ihtiyat location.
     */
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test("throws a useful error when the location catalogue cannot be loaded", async () => {
    const {
      client,
      rpcMock,
    } = createFakeSupabaseClient({
      locations: null,
      locationError: {
        message: "catalogue unavailable",
      },
    });

    await expect(
      resolveGeoapifyLocationHazards(
        createGeoapifyResult(),
        client,
      ),
    ).rejects.toThrow(
      "Unable to load the Ihtiyat location catalogue: catalogue unavailable",
    );

    expect(rpcMock).not.toHaveBeenCalled();
  });

  test("throws a useful error when the database hazard resolver fails", async () => {
    const {
      client,
    } = createFakeSupabaseClient({
      hazards: null,
      hazardError: {
        message: "resolver unavailable",
      },
    });

    await expect(
      resolveGeoapifyLocationHazards(
        createGeoapifyResult(),
        client,
      ),
    ).rejects.toThrow(
      "Unable to resolve hazards for the selected location: resolver unavailable",
    );
  });

  test("returns an empty hazard list when the resolver succeeds without rows", async () => {
    const {
      client,
    } = createFakeSupabaseClient({
      hazards: null,
    });

    const result =
      await resolveGeoapifyLocationHazards(
        createGeoapifyResult(),
        client,
      );

    expect(result.status).toBe("matched");

    if (result.status !== "matched") {
      throw new Error(
        "Expected a matched location result.",
      );
    }

    expect(result.hazards).toEqual([]);
  });
});