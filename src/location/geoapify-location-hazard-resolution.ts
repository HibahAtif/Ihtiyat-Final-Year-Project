import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import { supabaseClient } from "@/lib/supabase-config";
import type { Database } from "@/types/database.types";

import {
  resolveLocationHazards,
} from "./location-hazard-service";

export type {
  ResolvedLocationHazard,
} from "./location-hazard-service";

import type {
  ResolvedLocationHazard,
} from "./location-hazard-service";

import {
  matchGeoapifyLocationToCatalogue,
} from "./geoapify-location-match";

import type {
  GeoapifyLocationMatch,
  LocationCatalogueRow,
} from "./geoapify-location-match";

import type {
  GeoapifyLocationResult,
} from "./geoapify-reverse-geocode";

/**
 * Describes the two valid outcomes of automatic location resolution.
 *
 * Failing to find a curated location is an expected application state rather
 * than a technical error. The UI uses this state to offer manual location
 * selection instead of guessing a location.
 *
 * A successful catalogue match contains the matched location and its resolved
 * hazards. An unmatched result explicitly requests the manual-selection path.
 */
export type LocationHazardResolution =
  | {
      status: "matched";
      match: GeoapifyLocationMatch;
      hazards: ResolvedLocationHazard[];
    }
  | {
      status: "manual-selection-required";
      match: null;
      hazards: [];
    };

/**
 * WHAT:
 * Defines only the location columns required by automatic matching.
 *
 * WHY:
 * Fetching a small, explicit projection documents the data dependency of this
 * service and avoids coupling it to unrelated future columns in locations.
 *
 * HOW:
 * Supabase returns active curated Saudi locations using these seven fields.
 */
const LOCATION_CATALOGUE_COLUMNS =
  "id,parent_id,official_code,location_type,name_en,name_ar,is_active";

/**
 * WHAT:
 * Loads the active Ihtiyat location catalogue from Supabase.
 *
 * WHY:
 * Geoapify must never become Ihtiyat's source of truth for supported
 * locations. It interprets coordinates, while public.locations defines which
 * Saudi locations the application actually supports.
 *
 * HOW:
 * The query reads only active rows and returns them in the shape expected by
 * the pure Geoapify catalogue matcher.
 */
async function loadActiveLocationCatalogue(
  client: SupabaseClient<Database>,
): Promise<LocationCatalogueRow[]> {
  const {
    data,
    error,
  } = await client
    .from("locations")
    .select(LOCATION_CATALOGUE_COLUMNS)
    .eq("is_active", true);

  if (error) {
    throw new Error(
      `Unable to load the Ihtiyat location catalogue: ${error.message}`,
    );
  }

  return data ?? [];
}

/**
 * WHAT:
 * Connects a normalised Geoapify result to Ihtiyat's curated location
 * catalogue and then resolves the hazards relevant to that location.
 *
 * WHY:
 * This keeps three responsibilities separate:
 *
 * 1. Geoapify interprets latitude/longitude.
 * 2. Ihtiyat's catalogue decides whether that place is supported.
 * 3. PostgreSQL decides which hazards apply through the existing hierarchy.
 *
 * The shared resolveLocationHazards() boundary is also used by other
 * location-aware features after a curated location is already known.
 *
 * HOW:
 * The service:
 * - loads active public.locations rows;
 * - passes them to the already-tested pure catalogue matcher;
 * - returns a manual-selection state when no safe match exists;
 * - otherwise passes the matched curated location ID to the shared hazard
 *   service;
 * - returns the ordered hazard rows produced by PostgreSQL.
 *
 * The optional client parameter allows Jest to inject a fake Supabase client
 * without making network requests.
 */
export async function resolveGeoapifyLocationHazards(
  geoapifyLocation: GeoapifyLocationResult,
  client: SupabaseClient<Database> = supabaseClient,
): Promise<LocationHazardResolution> {
  const locations =
    await loadActiveLocationCatalogue(client);

  const match =
    matchGeoapifyLocationToCatalogue(
      geoapifyLocation,
      locations,
    );

  /**
   * WHAT:
   * Treat an unsupported or ambiguous automatic location as a normal
   * manual-selection case.
   *
   * WHY:
   * Guessing a nearby location could associate the user with inappropriate
   * preparedness content.
   *
   * HOW:
   * We stop before calling the hazard resolver because there is no trusted
   * curated location ID to resolve.
   */
  if (!match) {
    return {
      status: "manual-selection-required",
      match: null,
      hazards: [],
    };
  }

  const hazards =
    await resolveLocationHazards(
      match.location.id,
      client,
    );

  return {
    status: "matched",
    match,
    hazards,
  };
}
