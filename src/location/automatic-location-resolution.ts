import {
  getCurrentDeviceCoordinates,
} from "./device-location-boundary";

import type {
  DeviceLocationFallbackReason,
} from "./device-location-boundary";

import {
  reverseGeocodeSaudiCoordinates,
} from "./geoapify-reverse-geocode";

import type {
  GeoapifyLocationResult,
} from "./geoapify-reverse-geocode";

import {
  resolveGeoapifyLocationHazards,
} from "./geoapify-location-hazard-resolution";

import type {
  ResolvedLocationHazard,
} from "./geoapify-location-hazard-resolution";

import type {
  GeoapifyLocationMatch,
} from "./geoapify-location-match";

import type {
  Coordinates,
} from "./geoapify-reverse-geocode";

/**
 * WHAT:
 * Describes every expected reason why automatic location detection may fall
 * back to Ihtiyat's manual location-selection flow.
 *
 * WHY:
 * Device permission problems, Geoapify failures, and unsupported catalogue
 * locations are expected application states rather than fatal errors.
 *
 * HOW:
 * Device-level reasons are reused from the device-location boundary while
 * this orchestrator adds reasons for failures occurring further downstream.
 */
export type AutomaticLocationFallbackReason =
  | DeviceLocationFallbackReason
  | "reverse-geocoding-failed"
  | "unsupported-location";

/**
 * WHAT:
 * Represents the final result of Ihtiyat's automatic location-detection
 * pipeline.
 *
 * WHY:
 * The UI should receive one predictable result regardless of which internal
 * service performed the work.
 *
 * HOW:
 * A successful result contains the original coordinates, the normalised
 * Geoapify location, the trusted Ihtiyat catalogue match, and resolved
 * hazards. Expected failures instead return the manual-selection path.
 */
export type AutomaticLocationResolution =
  | {
      status: "matched";
      coordinates: Coordinates;
      geoapifyLocation: GeoapifyLocationResult;
      match: GeoapifyLocationMatch;
      hazards: ResolvedLocationHazard[];
    }
  | {
      status: "manual-selection-required";
      reason: AutomaticLocationFallbackReason;
      canAskAgain: boolean | null;
    };

/**
 * WHAT:
 * Defines the three already-tested services used by automatic location
 * detection.
 *
 * WHY:
 * Dependency injection lets the orchestration itself be tested without
 * accessing real GPS hardware, Geoapify, or Supabase.
 *
 * HOW:
 * Production code receives the real implementations by default. Jest can
 * supply deterministic fake implementations for each boundary.
 */
export type AutomaticLocationDependencies = {
  getCurrentDeviceCoordinates:
    typeof getCurrentDeviceCoordinates;

  reverseGeocodeSaudiCoordinates:
    typeof reverseGeocodeSaudiCoordinates;

  resolveGeoapifyLocationHazards:
    typeof resolveGeoapifyLocationHazards;
};

/**
 * WHAT:
 * Provides the production implementations used by the orchestrator.
 *
 * WHY:
 * Keeping them in one object avoids hard-coding external work inside the
 * orchestration logic and makes testing straightforward.
 *
 * HOW:
 * Unless a caller supplies alternatives, these real implementations are used.
 */
const defaultDependencies: AutomaticLocationDependencies = {
  getCurrentDeviceCoordinates,
  reverseGeocodeSaudiCoordinates,
  resolveGeoapifyLocationHazards,
};

/**
 * WHAT:
 * Runs Ihtiyat's complete automatic current-location resolution pipeline.
 *
 * WHY:
 * Individual boundaries have already been tested independently. This function
 * now coordinates them without duplicating their internal responsibilities.
 *
 * HOW:
 * The pipeline:
 * 1. obtains one foreground device position;
 * 2. stops safely if device location requires manual selection;
 * 3. reverse-geocodes the coordinates through Geoapify;
 * 4. converts Geoapify failures into the supported manual-selection path;
 * 5. matches the result against Ihtiyat's curated Supabase catalogue;
 * 6. resolves hazards through PostgreSQL when a trusted location is found.
 *
 * Supabase/database failures are deliberately not swallowed here. Unlike an
 * unsupported location, a backend failure is an operational error that the UI
 * should later distinguish from a normal manual-selection fallback.
 */
export async function resolveCurrentLocationHazards(
  dependencies: AutomaticLocationDependencies =
    defaultDependencies,
): Promise<AutomaticLocationResolution> {
  const deviceLocation =
    await dependencies.getCurrentDeviceCoordinates();

  /**
   * WHAT:
   * Forward expected device-level fallback states unchanged.
   *
   * WHY:
   * Permission denial and disabled location services are normal user/device
   * states and should not be converted into exceptions.
   *
   * HOW:
   * Their existing reason and canAskAgain value are preserved for the UI.
   */
  if (deviceLocation.status !== "success") {
    return {
      status: "manual-selection-required",
      reason: deviceLocation.reason,
      canAskAgain: deviceLocation.canAskAgain,
    };
  }

  const coordinates =
    deviceLocation.coordinates;

  let geoapifyLocation: GeoapifyLocationResult;

  try {
    geoapifyLocation =
      await dependencies.reverseGeocodeSaudiCoordinates(
        coordinates,
      );
  } catch {
    /**
     * WHAT:
     * Convert reverse-geocoding failure into manual location selection.
     *
     * WHY:
     * Geoapify may be unavailable, the network may be offline, or the detected
     * coordinates may not produce a usable Saudi result. None of those should
     * prevent the user from continuing manually.
     *
     * HOW:
     * The detailed Geoapify error remains inside that service boundary and
     * the onboarding layer receives one stable fallback reason.
     */
    return {
      status: "manual-selection-required",
      reason: "reverse-geocoding-failed",
      canAskAgain: null,
    };
  }

  const locationHazards =
    await dependencies.resolveGeoapifyLocationHazards(
      geoapifyLocation,
    );

  /**
   * WHAT:
   * Handle a geographically valid Geoapify result that cannot be safely
   * matched to Ihtiyat's curated catalogue.
   *
   * WHY:
   * Automatic detection must never invent or guess an unsupported location.
   *
   * HOW:
   * The user is directed to the manual selection path and no hazard/location
   * assumption is made.
   */
  if (
    locationHazards.status ===
    "manual-selection-required"
  ) {
    return {
      status: "manual-selection-required",
      reason: "unsupported-location",
      canAskAgain: null,
    };
  }

  return {
    status: "matched",
    coordinates,
    geoapifyLocation,
    match: locationHazards.match,
    hazards: locationHazards.hazards,
  };
}