import type {
    SupabaseClient,
} from '@supabase/supabase-js';

import {
    supabaseClient,
} from '@/lib/supabase-config';

import type {
    Database,
} from '@/types/database.types';


/**
 * Represents one row returned by PostgreSQL's resolve_location_hazards()
 * function.
 *
 * The row type is extracted directly from the generated Supabase function
 * return type.
*/
export type ResolvedLocationHazard =
    Database['public']['Functions']['resolve_location_hazards']['Returns'][number];


/**
 * Resolves the hazards configured for one already-curated Ihtiyat location.
 *
 * ActiveLocationProvider already gives downstream features a confirmed
 * public.locations record. Those features must not repeat GPS or Geoapify
 * matching simply to obtain hazards for that known location.
 *
 * Keeping this RPC boundary in one location service also prevents the
 * location hierarchy/inheritance rules from being duplicated across feature
 * modules.
 *
 * A valid curated location ID is passed to the existing
 * resolve_location_hazards() RPC. PostgreSQL remains responsible for the
 * hierarchy walk, inherited mappings, prioritisation and ordering.
 *
 * The optional client parameter preserves the existing dependency-injection
 * pattern used by the location tests.
*/
export async function resolveLocationHazards(
    locationId: number,
    client: SupabaseClient<Database> = supabaseClient,
): Promise<ResolvedLocationHazard[]> {
    if (
        !Number.isInteger(
            locationId,
        )
        || locationId <= 0
    ) {
        throw new Error(
            'A valid curated Ihtiyat location ID is required to resolve hazards.',
        );
    }

    const {
        data,
        error,
    } = await client.rpc(
        'resolve_location_hazards',
        {
            p_location_id:
                locationId,
        },
    );

    if (error) {
        throw new Error(
            `Unable to resolve hazards for the selected location: ${error.message}`,
        );
    }

    return data ?? [];
}
