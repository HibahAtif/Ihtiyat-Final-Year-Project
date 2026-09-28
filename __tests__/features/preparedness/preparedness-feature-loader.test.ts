/// <reference types="jest" />

/**
 * WHAT:
 * Prevents the preparedness feature-loader tests from initialising the
 * production Supabase client.
 *
 * WHY:
 * Jest runs in a Node environment rather than the Expo application runtime.
 * These tests exercise orchestration through injected deterministic
 * dependencies, so no real backend connection is required.
 *
 * HOW:
 * The production Supabase configuration module is replaced before the feature
 * loader and its imported services are evaluated.
*/
jest.mock('@/lib/supabase-config', () => ({
    supabaseClient: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));

/**
 * WHAT:
 * Prevents the feature-loader tests from initialising the production
 * SQLite-backed preparedness cache repository.
 *
 * WHY:
 * The purpose of this suite is to test online/offline orchestration rather
 * than SQLite behaviour. The repository and structured database are tested
 * independently in their own focused suites.
 *
 * HOW:
 * All cache reads and writes are replaced with Jest functions. The functions
 * are then supplied through PreparednessFeatureDependencies so each test can
 * control whether cached catalogue and hazard data exist or fail.
*/
jest.mock(
    '@/features/preparedness/preparedness-cache-repository',
    () => ({
        savePreparednessCatalogueCache:
            jest.fn(),

        loadPreparednessCatalogueCache:
            jest.fn(),

        savePreparednessLocationHazardCache:
            jest.fn(),

        loadPreparednessLocationHazardCache:
            jest.fn(),
    }),
);

import {
    loadPreparednessFeatureSnapshot,
} from '@/features/preparedness/preparedness-feature-loader';

import type {
    PreparednessFeatureDependencies,
} from '@/features/preparedness/preparedness-feature-loader';

import type {
    PreparednessCatalogue,
} from '@/features/preparedness/preparedness-catalogue-service';

import type {
    PreparednessMission,
    PreparednessMissionTask,
    PreparednessResolvedHazard,
} from '@/features/preparedness/preparedness-types';

import type {
    LocationRecord,
} from '@/profile/profile-types';


const jeddahLocation: LocationRecord = {
    id: 201,
    parent_id: 200,
    official_code: '0124',
    location_type: 'governorate',
    name_en: 'Jeddah',
    name_ar: 'جدة',
    is_active: true,
};


const nationalMission: PreparednessMission = {
    id: 1,
    code: 'prepare_first_aid_kit',
    title_en: 'Prepare a First Aid Kit',
    title_ar: 'جهّز حقيبة إسعافات أولية',
    description_en: 'National mission.',
    description_ar: 'مهمة وطنية.',
    mission_scope: 'national',
    sort_order: 10,
    is_active: true,
};


const adaptiveMission: PreparednessMission = {
    id: 4,
    code: 'know_your_local_hazards',
    title_en: 'Know Your Local Hazards',
    title_ar: 'تعرّف على المخاطر المحلية في منطقتك',
    description_en: 'Adaptive mission.',
    description_ar: 'مهمة تكيفية.',
    mission_scope: 'adaptive',
    sort_order: 40,
    is_active: true,
};


const tasks: PreparednessMissionTask[] = [
    {
        id: 1,
        mission_id: 1,
        hazard_id: null,
        code: 'first_aid_kit_ready',
        title_en: 'Prepare the kit',
        title_ar: 'جهّز الحقيبة',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 10,
        is_active: true,
    },
    {
        id: 16,
        mission_id: 4,
        hazard_id: 1,
        code: 'local_hazard_flood',
        title_en: 'Learn flood safety',
        title_ar: 'تعلّم السلامة من السيول',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 10,
        is_active: true,
    },
    {
        id: 17,
        mission_id: 4,
        hazard_id: 3,
        code: 'local_hazard_dust',
        title_en: 'Learn dust storm safety',
        title_ar: 'تعلّم السلامة من العواصف الغبارية',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 30,
        is_active: true,
    },
];


const catalogue: PreparednessCatalogue = {
    missions: [
        nationalMission,
        adaptiveMission,
    ],
    tasks,
};


const jeddahHazards: PreparednessResolvedHazard[] = [
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
    {
        hazard_id: 3,
        hazard_code: 'dust_sandstorm',
        hazard_name_en: 'Dust / Sandstorm',
        hazard_name_ar: 'العواصف الغبارية والرملية',
        classification: 'core',
        hazard_sort_order: 30,
        is_prioritised: false,
        relevance_rank: null as never,
        matched_location_id: null as never,
        matched_location_code: null as never,
        matched_location_type: null as never,
        matched_location_name_en: null as never,
        matched_location_name_ar: null as never,
        hierarchy_distance: null as never,
    },
];

/**
 * WHAT:
 * Creates the deterministic online and cache dependencies used by each
 * feature-loader test.
 *
 * WHY:
 * The production loader coordinates Supabase-backed reads and SQLite-backed
 * fallback behaviour. Providing fresh mocks for every test keeps cases
 * isolated and allows individual online or cache operations to be changed
 * without affecting the rest of the suite.
 *
 * HOW:
 * The default state represents a successful online request with no existing
 * cache. Individual tests override specific Jest functions to simulate
 * network failures, cached fallback data, empty hazard results or local
 * persistence failures.
*/
function createDependencies(
    hazards: PreparednessResolvedHazard[] =
        jeddahHazards,
) {
    const loadPreparednessCatalogue =
        jest.fn().mockResolvedValue(
            catalogue,
        );

    const resolveLocationHazards =
        jest.fn().mockResolvedValue(
            hazards,
        );

    const savePreparednessCatalogueCache =
        jest.fn().mockResolvedValue(
            undefined,
        );

    const loadPreparednessCatalogueCache =
        jest.fn().mockResolvedValue(
            null,
        );

    const savePreparednessLocationHazardCache =
        jest.fn().mockResolvedValue(
            undefined,
        );

    const loadPreparednessLocationHazardCache =
        jest.fn().mockResolvedValue(
            null,
        );

    const dependencies:
        PreparednessFeatureDependencies = {
            loadPreparednessCatalogue,
            resolveLocationHazards,
            savePreparednessCatalogueCache,
            loadPreparednessCatalogueCache,
            savePreparednessLocationHazardCache,
            loadPreparednessLocationHazardCache,
        };

    return {
        dependencies,
        loadPreparednessCatalogue,
        resolveLocationHazards,
        savePreparednessCatalogueCache,
        loadPreparednessCatalogueCache,
        savePreparednessLocationHazardCache,
        loadPreparednessLocationHazardCache,
    };
}

/**
 * The cases below verify the feature-loader boundary rather than the internal
 * SQLite or Supabase implementations.
 *
 * The suite protects three key contracts:
 *
 * 1. successful online data remains the preferred source and refreshes cache;
 * 2. an online failure may fall back only to a coherent cached payload;
 * 3. null and [] retain different meanings for location-hazard resolution.
 */
describe(
    'loadPreparednessFeatureSnapshot',
    () => {
        /*
         * Online success and core location semantics.
        */
        test(
            'uses the shared active location and resolves adaptive tasks from prioritised hazards',
            async () => {
                const {
                    dependencies,
                    loadPreparednessCatalogue,
                    resolveLocationHazards,
                    savePreparednessCatalogueCache,
                    savePreparednessLocationHazardCache,
                } = createDependencies();

                const result =
                    await loadPreparednessFeatureSnapshot(
                        jeddahLocation,
                        dependencies,
                    );

                expect(
                    loadPreparednessCatalogue,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expect(
                    resolveLocationHazards,
                ).toHaveBeenCalledWith(
                    201,
                );

                expect(
                    result.activeLocation,
                ).toEqual(
                    jeddahLocation,
                );

                expect(
                    result.resolvedHazards,
                ).toEqual(
                    jeddahHazards,
                );

                expect(
                    result.missions[0].tasks.map(
                        (task) => task.code,
                    ),
                ).toEqual([
                    'first_aid_kit_ready',
                ]);

                expect(
                    result.missions[1].tasks.map(
                        (task) => task.code,
                    ),
                ).toEqual([
                    'local_hazard_flood',
                ]);

                expect(
                    result.missions[1].requiresLocation,
                ).toBe(
                    false,
                );

                expect(
                    savePreparednessCatalogueCache,
                ).toHaveBeenCalledWith(
                    catalogue,
                );

                expect(
                    savePreparednessLocationHazardCache,
                ).toHaveBeenCalledWith(
                    201,
                    jeddahHazards,
                );
            },
        );


        test(
            'does not call the hazard resolver when no active location exists',
            async () => {
                const {
                    dependencies,
                    resolveLocationHazards,
                    savePreparednessCatalogueCache,
                    savePreparednessLocationHazardCache,
                } = createDependencies();

                const result =
                    await loadPreparednessFeatureSnapshot(
                        null,
                        dependencies,
                    );

                expect(
                    resolveLocationHazards,
                ).not.toHaveBeenCalled();

                expect(
                    result.resolvedHazards,
                ).toBeNull();

                expect(
                    result.missions[0].requiresLocation,
                ).toBe(
                    false,
                );

                expect(
                    result.missions[1].tasks,
                ).toEqual(
                    [],
                );

                expect(
                    result.missions[1].requiresLocation,
                ).toBe(
                    true,
                );

                expect(
                    savePreparednessCatalogueCache,
                ).toHaveBeenCalledWith(
                    catalogue,
                );

                expect(
                    savePreparednessLocationHazardCache,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'distinguishes a resolved location with no prioritised hazards from a missing location',
            async () => {
                const {
                    dependencies,
                    savePreparednessLocationHazardCache,
                } = createDependencies(
                    [],
                );

                const result =
                    await loadPreparednessFeatureSnapshot(
                        jeddahLocation,
                        dependencies,
                    );

                expect(
                    result.resolvedHazards,
                ).toEqual(
                    [],
                );

                expect(
                    result.missions[1].tasks,
                ).toEqual(
                    [],
                );

                expect(
                    result.missions[1].requiresLocation,
                ).toBe(
                    false,
                );

                expect(
                    savePreparednessLocationHazardCache,
                ).toHaveBeenCalledWith(
                    201,
                    [],
                );
            },
        );


        test(
            'rejects an inactive location instead of resolving preparedness content for it',
            async () => {
                const {
                    dependencies,
                    loadPreparednessCatalogue,
                    resolveLocationHazards,
                } = createDependencies();

                await expect(
                    loadPreparednessFeatureSnapshot(
                        {
                            ...jeddahLocation,
                            is_active: false,
                        },
                        dependencies,
                    ),
                ).rejects.toThrow(
                    'Preparedness content cannot be resolved for an inactive Ihtiyat location.',
                );

                expect(
                    loadPreparednessCatalogue,
                ).not.toHaveBeenCalled();

                expect(
                    resolveLocationHazards,
                ).not.toHaveBeenCalled();
            },
        );

        /*
         * Offline fallback behaviour.
        */
        test(
            'falls back to the cached catalogue when online catalogue loading fails without an active location',
            async () => {
                const {
                    dependencies,
                    loadPreparednessCatalogue,
                    loadPreparednessCatalogueCache,
                    loadPreparednessLocationHazardCache,
                    savePreparednessCatalogueCache,
                } = createDependencies();

                loadPreparednessCatalogue
                    .mockRejectedValue(
                        new Error(
                            'catalogue unavailable',
                        ),
                    );

                loadPreparednessCatalogueCache
                    .mockResolvedValue(
                        catalogue,
                    );

                const result =
                    await loadPreparednessFeatureSnapshot(
                        null,
                        dependencies,
                    );

                expect(
                    loadPreparednessCatalogueCache,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expect(
                    loadPreparednessLocationHazardCache,
                ).not.toHaveBeenCalled();

                expect(
                    savePreparednessCatalogueCache,
                ).not.toHaveBeenCalled();

                expect(
                    result.activeLocation,
                ).toBeNull();

                expect(
                    result.resolvedHazards,
                ).toBeNull();

                expect(
                    result.missions[0].tasks.map(
                        (task) => task.code,
                    ),
                ).toEqual([
                    'first_aid_kit_ready',
                ]);

                expect(
                    result.missions[1].requiresLocation,
                ).toBe(
                    true,
                );
            },
        );

        test(
            'falls back coherently to cached catalogue and hazards when online hazard resolution fails',
            async () => {
                const {
                    dependencies,
                    resolveLocationHazards,
                    loadPreparednessCatalogueCache,
                    loadPreparednessLocationHazardCache,
                    savePreparednessCatalogueCache,
                    savePreparednessLocationHazardCache,
                } = createDependencies();

                resolveLocationHazards
                    .mockRejectedValue(
                        new Error(
                            'hazard resolver unavailable',
                        ),
                    );

                loadPreparednessCatalogueCache
                    .mockResolvedValue(
                        catalogue,
                    );

                loadPreparednessLocationHazardCache
                    .mockResolvedValue(
                        jeddahHazards,
                    );

                const result =
                    await loadPreparednessFeatureSnapshot(
                        jeddahLocation,
                        dependencies,
                    );

                expect(
                    loadPreparednessCatalogueCache,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expect(
                    loadPreparednessLocationHazardCache,
                ).toHaveBeenCalledWith(
                    201,
                );

                expect(
                    savePreparednessCatalogueCache,
                ).not.toHaveBeenCalled();

                expect(
                    savePreparednessLocationHazardCache,
                ).not.toHaveBeenCalled();

                expect(
                    result.resolvedHazards,
                ).toEqual(
                    jeddahHazards,
                );

                expect(
                    result.missions[1].tasks.map(
                        (task) => task.code,
                    ),
                ).toEqual([
                    'local_hazard_flood',
                ]);

                expect(
                    result.missions[1].requiresLocation,
                ).toBe(
                    false,
                );
            },
        );

        test(
            'preserves a cached empty hazard result as a valid resolved location',
            async () => {
                const {
                    dependencies,
                    resolveLocationHazards,
                    loadPreparednessCatalogueCache,
                    loadPreparednessLocationHazardCache,
                } = createDependencies();

                resolveLocationHazards
                    .mockRejectedValue(
                        new Error(
                            'offline',
                        ),
                    );

                loadPreparednessCatalogueCache
                    .mockResolvedValue(
                        catalogue,
                    );

                loadPreparednessLocationHazardCache
                    .mockResolvedValue(
                        [],
                    );

                const result =
                    await loadPreparednessFeatureSnapshot(
                        jeddahLocation,
                        dependencies,
                    );

                /*
                 * [] is a successful resolution containing no prioritised hazards.
                 * It must not be treated like null, which means no cached result exists.
                */
                expect(
                    result.resolvedHazards,
                ).toEqual(
                    [],
                );

                expect(
                    result.resolvedHazards,
                ).not.toBeNull();

                expect(
                    result.missions[1].tasks,
                ).toEqual(
                    [],
                );

                expect(
                    result.missions[1].requiresLocation,
                ).toBe(
                    false,
                );
            },
        );

        test(
            'rethrows the original online failure when no cached catalogue exists',
            async () => {
                const onlineError =
                    new Error(
                        'catalogue unavailable',
                    );

                const {
                    dependencies,
                    loadPreparednessCatalogue,
                    loadPreparednessCatalogueCache,
                } = createDependencies();

                loadPreparednessCatalogue
                    .mockRejectedValue(
                        onlineError,
                    );

                loadPreparednessCatalogueCache
                    .mockResolvedValue(
                        null,
                    );

                await expect(
                    loadPreparednessFeatureSnapshot(
                        null,
                        dependencies,
                    ),
                ).rejects.toBe(
                    onlineError,
                );
            },
        );

        /*
         * Cache sufficiency and failure boundaries.
        */
        test(
            'rethrows the original online failure when the active location has never been cached',
            async () => {
                const onlineError =
                    new Error(
                        'hazard resolver unavailable',
                    );

                const {
                    dependencies,
                    resolveLocationHazards,
                    loadPreparednessCatalogueCache,
                    loadPreparednessLocationHazardCache,
                } = createDependencies();

                resolveLocationHazards
                    .mockRejectedValue(
                        onlineError,
                    );

                loadPreparednessCatalogueCache
                    .mockResolvedValue(
                        catalogue,
                    );

                loadPreparednessLocationHazardCache
                    .mockResolvedValue(
                        null,
                    );

                await expect(
                    loadPreparednessFeatureSnapshot(
                        jeddahLocation,
                        dependencies,
                    ),
                ).rejects.toBe(
                    onlineError,
                );
            },
        );

        /*
         * Cache persistence is best-effort after a successful online read.
        */
        test(
            'keeps fresh online data usable when local cache persistence fails',
            async () => {
                const {
                    dependencies,
                    savePreparednessCatalogueCache,
                    savePreparednessLocationHazardCache,
                } = createDependencies();

                savePreparednessCatalogueCache
                    .mockRejectedValue(
                        new Error(
                            'catalogue cache write failed',
                        ),
                    );

                savePreparednessLocationHazardCache
                    .mockRejectedValue(
                        new Error(
                            'hazard cache write failed',
                        ),
                    );

                /*
                 * Both local writes fail deliberately. The successfully loaded online payload
                 * must still reach the caller because cache persistence is not part of the
                 * validity of the fresh Supabase result.
                */

                const result =
                    await loadPreparednessFeatureSnapshot(
                        jeddahLocation,
                        dependencies,
                    );

                expect(
                    result.resolvedHazards,
                ).toEqual(
                    jeddahHazards,
                );

                expect(
                    result.missions[1].tasks.map(
                        (task) => task.code,
                    ),
                ).toEqual([
                    'local_hazard_flood',
                ]);
            },
        );
    },
);
