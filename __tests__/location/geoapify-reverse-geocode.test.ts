/// <reference types="jest" />

jest.mock("@/lib/geoapify-config", () => ({
  geoapifyApiKey: "test-geoapify-key",
}));

import {
  reverseGeocodeSaudiCoordinates,
  type Coordinates,
} from "../../src/location/geoapify-reverse-geocode";

function jsonResponse(
  body: unknown,
  options: {
    ok?: boolean;
    status?: number;
  } = {},
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("reverseGeocodeSaudiCoordinates", () => {
  const jeddahCoordinates: Coordinates = {
    latitude: 21.5433,
    longitude: 39.1728,
  };

  test("returns normalised Jeddah location data for a valid Saudi response", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            formatted:
              "4040 الامة الاسلاميه, Al Andalus, Jeddah 23325, Saudi Arabia",
            country: "Saudi Arabia",
            country_code: "sa",
            state: "Makkah",
            county: "Jiddah",
            city: "Jeddah",
            district: "Al Andalus",
            suburb: "Al Andalus",
            result_type: "building",
            lat: 21.543194,
            lon: 39.172788,
          },
        ],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    const result = await reverseGeocodeSaudiCoordinates(
      jeddahCoordinates,
      fetchMock,
    );

    expect(result).toEqual({
      formattedAddress:
        "4040 الامة الاسلاميه, Al Andalus, Jeddah 23325, Saudi Arabia",
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
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestedUrl = String(fetchMock.mock.calls[0][0]);

    expect(requestedUrl).toContain(
      "https://api.geoapify.com/v1/geocode/reverse",
    );
    expect(requestedUrl).toContain("lat=21.5433");
    expect(requestedUrl).toContain("lon=39.1728");
    expect(requestedUrl).toContain("format=json");
    expect(requestedUrl).toContain("limit=1");
    expect(requestedUrl).toContain("lang=en");
    expect(requestedUrl).toContain(
      "apiKey=test-geoapify-key",
    );
  });

  test("normalises the returned country code to lowercase", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            country: "Saudi Arabia",
            country_code: " SA ",
            state: "Makkah",
            city: "Jeddah",
            lat: 21.543194,
            lon: 39.172788,
          },
        ],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    const result = await reverseGeocodeSaudiCoordinates(
      jeddahCoordinates,
      fetchMock,
    );

    expect(result.countryCode).toBe("sa");
  });

  test("converts missing optional text fields to null", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            country_code: "sa",
            city: "   ",
            lat: 21.543194,
            lon: 39.172788,
          },
        ],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    const result = await reverseGeocodeSaudiCoordinates(
      jeddahCoordinates,
      fetchMock,
    );

    expect(result.formattedAddress).toBeNull();
    expect(result.country).toBeNull();
    expect(result.state).toBeNull();
    expect(result.stateCode).toBeNull();
    expect(result.county).toBeNull();
    expect(result.countyCode).toBeNull();
    expect(result.city).toBeNull();
    expect(result.district).toBeNull();
    expect(result.suburb).toBeNull();
    expect(result.resultType).toBeNull();
  });

  test("throws when Geoapify returns an HTTP failure", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(
        {},
        {
          ok: false,
          status: 429,
        },
      ),
    ) as jest.MockedFunction<typeof fetch>;

    await expect(
      reverseGeocodeSaudiCoordinates(
        jeddahCoordinates,
        fetchMock,
      ),
    ).rejects.toThrow(
      "Geoapify reverse geocoding failed with HTTP 429.",
    );
  });

  test("throws when Geoapify returns no results", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    await expect(
      reverseGeocodeSaudiCoordinates(
        jeddahCoordinates,
        fetchMock,
      ),
    ).rejects.toThrow(
      "Geoapify could not identify a location for these coordinates.",
    );
  });

  test("throws when Geoapify omits the country code", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            country: "Saudi Arabia",
            city: "Jeddah",
            lat: 21.543194,
            lon: 39.172788,
          },
        ],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    await expect(
      reverseGeocodeSaudiCoordinates(
        jeddahCoordinates,
        fetchMock,
      ),
    ).rejects.toThrow(
      "Geoapify returned a location without a country code.",
    );
  });

  test("rejects a location outside Saudi Arabia", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            country: "United Arab Emirates",
            country_code: "ae",
            city: "Dubai",
            lat: 25.2048,
            lon: 55.2708,
          },
        ],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    await expect(
      reverseGeocodeSaudiCoordinates(
        {
          latitude: 25.2048,
          longitude: 55.2708,
        },
        fetchMock,
      ),
    ).rejects.toThrow(
      "The detected location is outside Saudi Arabia.",
    );
  });

  test("throws when the returned result has no valid coordinates", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            country: "Saudi Arabia",
            country_code: "sa",
            state: "Makkah",
            city: "Jeddah",
          },
        ],
      }),
    ) as jest.MockedFunction<typeof fetch>;

    await expect(
      reverseGeocodeSaudiCoordinates(
        jeddahCoordinates,
        fetchMock,
      ),
    ).rejects.toThrow(
      "Geoapify returned a location without valid coordinates.",
    );
  });

  test.each([
    {
      coordinates: {
        latitude: 91,
        longitude: 39,
      },
      message:
        "Latitude must be a finite value between -90 and 90.",
    },
    {
      coordinates: {
        latitude: -91,
        longitude: 39,
      },
      message:
        "Latitude must be a finite value between -90 and 90.",
    },
    {
      coordinates: {
        latitude: Number.NaN,
        longitude: 39,
      },
      message:
        "Latitude must be a finite value between -90 and 90.",
    },
    {
      coordinates: {
        latitude: 21,
        longitude: 181,
      },
      message:
        "Longitude must be a finite value between -180 and 180.",
    },
    {
      coordinates: {
        latitude: 21,
        longitude: -181,
      },
      message:
        "Longitude must be a finite value between -180 and 180.",
    },
    {
      coordinates: {
        latitude: 21,
        longitude: Number.POSITIVE_INFINITY,
      },
      message:
        "Longitude must be a finite value between -180 and 180.",
    },
  ])(
    "rejects invalid input coordinates",
    async ({ coordinates, message }) => {
      const fetchMock =
        jest.fn() as jest.MockedFunction<typeof fetch>;

      await expect(
        reverseGeocodeSaudiCoordinates(
          coordinates,
          fetchMock,
        ),
      ).rejects.toThrow(message);

      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});