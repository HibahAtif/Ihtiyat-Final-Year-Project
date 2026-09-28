/// <reference types="jest" />

import * as Location from "expo-location";

import {
  getCurrentDeviceCoordinates,
} from "../../src/location/device-location-boundary";

/**
 * WHAT:
 * Replaces Expo's native location module with deterministic Jest functions.
 *
 * WHY:
 * Unit tests must not trigger a real Android/iOS permission dialog, read the
 * developer machine's location, or depend on emulator GPS configuration.
 *
 * HOW:
 * Each Expo method used by the service becomes a Jest mock. Balanced accuracy
 * is represented by a stable fixture value because only the call contract is
 * relevant to these tests.
 */
jest.mock("expo-location", () => ({
  Accuracy: {
    Balanced: 3,
  },
  
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },

  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const hasServicesEnabledAsyncMock =
  Location.hasServicesEnabledAsync as jest.MockedFunction<
    typeof Location.hasServicesEnabledAsync
  >;

const requestForegroundPermissionsAsyncMock =
  Location.requestForegroundPermissionsAsync as jest.MockedFunction<
    typeof Location.requestForegroundPermissionsAsync
  >;

const getCurrentPositionAsyncMock =
  Location.getCurrentPositionAsync as jest.MockedFunction<
    typeof Location.getCurrentPositionAsync
  >;

/**
 * WHAT:
 * Creates a foreground-location permission response for tests.
 *
 * WHY:
 * Expo represents permission status with its PermissionStatus enum rather
 * than plain string literals. Using the enum keeps this fixture compatible
 * with the real requestForegroundPermissionsAsync() return type.
 *
 * HOW:
 * The helper converts the requested granted state into Expo's corresponding
 * GRANTED or DENIED enum value while allowing tests to control canAskAgain.
 */
function createPermissionResponse(
  granted: boolean,
  canAskAgain = true,
): Awaited<
  ReturnType<
    typeof Location.requestForegroundPermissionsAsync
  >
> {
  return {
    status: granted
      ? Location.PermissionStatus.GRANTED
      : Location.PermissionStatus.DENIED,
    granted,
    canAskAgain,
    expires: "never",
  };
}

/**
 * WHAT:
 * Creates the minimum realistic Expo current-position object required by
 * getCurrentDeviceCoordinates().
 *
 * WHY:
 * These tests care only about latitude and longitude, but keeping the complete
 * coordinate shape avoids relying on unsafe partial native objects.
 *
 * HOW:
 * The default coordinates mirror the Jeddah values used throughout the
 * Geoapify integration tests.
 */
function createLocationObject():
  Awaited<
    ReturnType<
      typeof Location.getCurrentPositionAsync
    >
  > {
  return {
    coords: {
      latitude: 21.5433,
      longitude: 39.1728,
      altitude: null,
      accuracy: 20,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1_795_000_000_000,
  };
}

describe("getCurrentDeviceCoordinates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns current coordinates when services and permission are available", async () => {
    hasServicesEnabledAsyncMock
      .mockResolvedValue(true);

    requestForegroundPermissionsAsyncMock
      .mockResolvedValue(
        createPermissionResponse(true),
      );

    getCurrentPositionAsyncMock
      .mockResolvedValue(
        createLocationObject(),
      );

    const result =
      await getCurrentDeviceCoordinates();

    expect(result).toEqual({
      status: "success",
      coordinates: {
        latitude: 21.5433,
        longitude: 39.1728,
      },
    });

    expect(
      hasServicesEnabledAsyncMock,
    ).toHaveBeenCalledTimes(1);

    expect(
      requestForegroundPermissionsAsyncMock,
    ).toHaveBeenCalledTimes(1);

    expect(
      getCurrentPositionAsyncMock,
    ).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });

  test("requests manual selection when device location services are disabled", async () => {
    hasServicesEnabledAsyncMock
      .mockResolvedValue(false);

    const result =
      await getCurrentDeviceCoordinates();

    expect(result).toEqual({
      status: "manual-selection-required",
      reason: "services-disabled",
      canAskAgain: null,
    });

    /**
     * HOW:
     * Neither permission nor GPS should be requested when the operating
     * system has already reported that location services are unavailable.
     */
    expect(
      requestForegroundPermissionsAsyncMock,
    ).not.toHaveBeenCalled();

    expect(
      getCurrentPositionAsyncMock,
    ).not.toHaveBeenCalled();
  });

  test("requests manual selection when foreground permission is denied", async () => {
    hasServicesEnabledAsyncMock
      .mockResolvedValue(true);

    requestForegroundPermissionsAsyncMock
      .mockResolvedValue(
        createPermissionResponse(
          false,
          true,
        ),
      );

    const result =
      await getCurrentDeviceCoordinates();

    expect(result).toEqual({
      status: "manual-selection-required",
      reason: "permission-denied",
      canAskAgain: true,
    });

    expect(
      getCurrentPositionAsyncMock,
    ).not.toHaveBeenCalled();
  });

  test("preserves canAskAgain=false for a permission that cannot be requested again", async () => {
    hasServicesEnabledAsyncMock
      .mockResolvedValue(true);

    requestForegroundPermissionsAsyncMock
      .mockResolvedValue(
        createPermissionResponse(
          false,
          false,
        ),
      );

    const result =
      await getCurrentDeviceCoordinates();

    expect(result).toEqual({
      status: "manual-selection-required",
      reason: "permission-denied",
      canAskAgain: false,
    });
  });

  test("requests manual selection when a current position cannot be obtained", async () => {
    hasServicesEnabledAsyncMock
      .mockResolvedValue(true);

    requestForegroundPermissionsAsyncMock
      .mockResolvedValue(
        createPermissionResponse(true),
      );

    getCurrentPositionAsyncMock
      .mockRejectedValue(
        new Error(
          "Current position unavailable",
        ),
      );

    const result =
      await getCurrentDeviceCoordinates();

    expect(result).toEqual({
      status: "manual-selection-required",
      reason: "position-unavailable",
      canAskAgain: null,
    });
  });
});