/// <reference types="jest" />

/**
 * WHAT:
 * Prevents the location-hazard service test from initialising the production
 * Expo SQLite-backed Supabase client.
 *
 * WHY:
 * Jest runs in a Node environment without Expo's native SQLite database
 * implementation. This test injects its own fake Supabase client anyway, so
 * initialising the production client would add an unrelated native dependency.
 *
 * HOW:
 * The shared Supabase configuration module is replaced before the production
 * service is imported. Individual tests continue to inject their own mocked
 * client into resolveLocationHazards().
*/
jest.mock('@/lib/supabase-config', () => ({
    supabaseClient: {
        rpc: jest.fn(),
    }
}));

import { supabaseClient } from '@/lib/supabase-config';
import {
    resolveLocationHazards,
} from '@/location/location-hazard-service';

import type {
    Database,
} from '@/types/database.types';

import type {
    SupabaseClient,
} from '@supabase/supabase-js';


const hazardRows:
    Database['public']['Functions']['resolve_location_hazards']['Returns'] = [
        {
            hazard_id: 1,
            hazard_code: 'heavy_rain_flash_flooding',
            hazard_name_en: 'Heavy Rain / Flash Flooding',
            hazard_name_ar: 'الأمطار الغزيرة والسيول',
            classification: 'core',
            hazard_sort_order: 10,
            is_prioritised: true,
            relevance_rank: 1,
            matched_location_id: 201,
            matched_location_code: '0124',
            matched_location_type: 'governorate',
            matched_location_name_en: 'Jeddah',
            matched_location_name_ar: 'جدة',
            hierarchy_distance: 0,
        },
    ];


/**
 * WHAT:
 * Creates the smallest Supabase client substitute required by the shared
 * location-hazard service.
 *
 * WHY:
 * The service test should verify the client/RPC contract without using a real
 * network connection.
 *
 * HOW:
 * Only rpc() is implemented because that is the complete external surface of
 * resolveLocationHazards().
 */
function createClient(
    result: {
        data:
            Database['public']['Functions']['resolve_location_hazards']['Returns']
            | null;
        error: {
            message: string;
        } | null;
    },
) {
    const rpc =
        jest.fn().mockResolvedValue(
            result,
        );

    return {
        client: {
            rpc,
        } as unknown as SupabaseClient<Database>,
        rpc,
    };
}


describe(
    'resolveLocationHazards',
    () => {
        test(
            'calls the canonical location-hazard RPC with the curated location ID',
            async () => {
                const {
                    client,
                    rpc,
                } = createClient({
                    data: hazardRows,
                    error: null,
                });

                await expect(
                    resolveLocationHazards(
                        201,
                        client,
                    ),
                ).resolves.toEqual(
                    hazardRows,
                );

                expect(
                    rpc,
                ).toHaveBeenCalledWith(
                    'resolve_location_hazards',
                    {
                        p_location_id: 201,
                    },
                );
            },
        );


        test(
            'normalises a successful null RPC result to an empty hazard array',
            async () => {
                const {
                    client,
                } = createClient({
                    data: null,
                    error: null,
                });

                await expect(
                    resolveLocationHazards(
                        201,
                        client,
                    ),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'surfaces resolver failures with location-specific context',
            async () => {
                const {
                    client,
                } = createClient({
                    data: null,
                    error: {
                        message:
                            'resolver unavailable',
                    },
                });

                await expect(
                    resolveLocationHazards(
                        201,
                        client,
                    ),
                ).rejects.toThrow(
                    'Unable to resolve hazards for the selected location: resolver unavailable',
                );
            },
        );


        test.each([
            0,
            -1,
            1.5,
            Number.NaN,
        ])(
            'rejects invalid curated location ID %p before calling Supabase',
            async (
                invalidLocationId,
            ) => {
                const {
                    client,
                    rpc,
                } = createClient({
                    data: hazardRows,
                    error: null,
                });

                await expect(
                    resolveLocationHazards(
                        invalidLocationId,
                        client,
                    ),
                ).rejects.toThrow(
                    'A valid curated Ihtiyat location ID is required to resolve hazards.',
                );

                expect(
                    rpc,
                ).not.toHaveBeenCalled();
            },
        );
    },
);
