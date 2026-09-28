import * as Location from "expo-location";

import type {
  Coordinates,
} from "./geoapify-reverse-geocode";

/**
 * Describes why automatic device-location detection could not continue.
 *
 * Location detection is optional in Ihtiyat. These reasons allow the
 * onboarding/UI layer to offer manual location selection instead of treating
 * expected situations such as denied permission as application failures.
 *
 * Each expected device-side failure maps to a small stable reason that does
 * not expose platform-specific implementation details to the rest of the app.
 */
export type DeviceLocationFallbackReason =
  | "services-disabled"
  | "permission-denied"
  | "position-unavailable";

/**
 * Represents the outcome of attempting to obtain the user's current
 * foreground location.
 *
 * GPS access must never be mandatory for Ihtiyat. A user who denies location
 * permission, disables location services, or cannot obtain a position must
 * still be able to continue through manual location selection.
 *
 * A successful result exposes only latitude and longitude. Expected failures
 * return a manual-selection state plus a reason the UI can interpret.
 */
export type DeviceLocationResult =
  | {
      status: "success";
      coordinates: Coordinates;
    }
  | {
      status: "manual-selection-required";
      reason: DeviceLocationFallbackReason;
      canAskAgain: boolean | null;
    };

/**
 * Requests one foreground device position for automatic Ihtiyat location
 * detection.
 *
 * Ihtiyat needs only an on-demand location fix when the user explicitly asks
 * to use their current location. Continuous tracking and background location
 * would add unnecessary privacy, battery, and permission complexity.
 *
 * The function:
 * 1. checks that device location services are enabled;
 * 2. requests foreground-only permission;
 * 3. stops safely if permission is refused;
 * 4. obtains one current position using balanced accuracy;
 * 5. reduces Expo's larger LocationObject to the latitude/longitude pair
 *    required by the Geoapify boundary.
 *
 * Expected device failures return a manual-selection state rather than
 * throwing because manual location selection is a supported Ihtiyat path.
 */
export async function getCurrentDeviceCoordinates():
  Promise<DeviceLocationResult> {
  const servicesEnabled =
    await Location.hasServicesEnabledAsync();

  /**

   * Stop before requesting a position when the operating system has location
   * services disabled.
   *
   * A location request cannot succeed in this state and repeatedly prompting
   * would create a poor onboarding experience.
   *
   * The caller receives a fallback reason and can immediately present the
   * existing manual location-selection route.
   */
  if (!servicesEnabled) {
    return {
      status: "manual-selection-required",
      reason: "services-disabled",
      canAskAgain: null,
    };
  }

  const permission =
    await Location.requestForegroundPermissionsAsync();

  /**
   *
   * Respect a refused foreground-location permission.
   *
   * Current-location detection is optional. Permission refusal must never
   * block access to Ihtiyat's preparedness features.
   *
   * canAskAgain is preserved so a future UI can distinguish between a
   * permission that may be requested again and one that requires the user to
   * change operating-system settings.
   */
  if (!permission.granted) {
    return {
      status: "manual-selection-required",
      reason: "permission-denied",
      canAskAgain: permission.canAskAgain,
    };
  }

  try {
    const position =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

    return {
      status: "success",
      coordinates: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    /**
     * WHAT:
     * Convert an unavailable GPS/location fix into the manual-selection path.
     *
     * WHY:
     * Permission can be granted while a usable position still cannot be
     * obtained, for example because of provider/device conditions.
     *
     * HOW:
     * The technical failure stays inside this boundary. The rest of Ihtiyat
     * receives a predictable fallback state instead of a raw Expo exception.
     */
    return {
      status: "manual-selection-required",
      reason: "position-unavailable",
      canAskAgain: null,
    };
  }
}