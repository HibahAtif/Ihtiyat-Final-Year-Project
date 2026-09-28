/// <reference types="jest" />


jest.mock(
    '@/storage/ihtiyat-database',
    () => ({
        getIhtiyatDatabase:
            jest.fn(),
    }),
);


import {
    getIhtiyatDatabase,
} from '@/storage/ihtiyat-database';

import {
    loadPreparednessCatalogueCache,
    loadPreparednessLocationHazardCache,
    savePreparednessCatalogueCache,
    savePreparednessLocationHazardCache,
} from '@/features/preparedness/preparedness-cache-repository';

import type {
    PreparednessCatalogue,
} from '@/features/preparedness/preparedness-catalogue-service';

import type {
    PreparednessResolvedHazard,
} from '@/features/preparedness/preparedness-types';


const getIhtiyatDatabaseMock =
    getIhtiyatDatabase as jest.MockedFunction<
        typeof getIhtiyatDatabase
    >;


type MockTransaction = {
    runAsync: jest.Mock;
};


function createDatabaseMock() {
    const transaction:
        MockTransaction = {
            runAsync:
                jest.fn()
                    .mockResolvedValue({
                        changes: 1,
                        lastInsertRowId: 0,
                    }),
        };


    const database = {
        withExclusiveTransactionAsync:
            jest.fn(
                async (
                    callback: (
                        transaction:
                            MockTransaction,
                    ) => Promise<void>,
                ): Promise<void> => {
                    await callback(
                        transaction,
                    );
                },
            ),

        getFirstAsync:
            jest.fn(),

        getAllAsync:
            jest.fn(),
    };


    return {
        database,
        transaction,
    };
}


const catalogue:
    PreparednessCatalogue = {
        missions: [
            {
                id: 1,
                code:
                    'prepare_first_aid_kit',
                title_en:
                    'Prepare a First Aid Kit',
                title_ar:
                    'جهّز حقيبة إسعافات أولية',
                description_en:
                    'Prepare essential first aid supplies.',
                description_ar:
                    'جهّز مستلزمات الإسعافات الأولية الأساسية.',
                mission_scope:
                    'national',
                sort_order: 10,
                is_active: true,
            },
        ],

        tasks: [
            {
                id: 1,
                mission_id: 1,
                hazard_id: null,
                code:
                    'first_aid_kit_ready',
                title_en:
                    'Prepare the kit',
                title_ar:
                    'جهّز الحقيبة',
                detail_en: null,
                detail_ar: null,
                points: 20,
                sort_order: 10,
                is_active: true,
            },
        ],
    };


const resolvedHazard:
    PreparednessResolvedHazard = {
        hazard_id: 1,
        hazard_code: 'flood',
        hazard_name_en: 'Flood',
        hazard_name_ar: 'السيول',
        classification:
            'hydrometeorological',
        hazard_sort_order: 10,
        is_prioritised: true,
        relevance_rank: 1,
        matched_location_id: 201,
        matched_location_code: '0124',
        matched_location_type:
            'governorate',
        matched_location_name_en:
            'Jeddah',
        matched_location_name_ar:
            'جدة',
        hierarchy_distance: 0,
    };


describe(
    'preparedness cache repository',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });


        test(
            'atomically replaces the preparedness catalogue and records cache metadata',
            async () => {
                const {
                    database,
                    transaction,
                } =
                    createDatabaseMock();


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await savePreparednessCatalogueCache(
                    catalogue,
                    '2026-09-24T01:00:00.000Z',
                );


                expect(
                    database
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                expect(
                    transaction
                        .runAsync,
                ).toHaveBeenCalledTimes(
                    5,
                );


                expect(
                    transaction
                        .runAsync
                        .mock.calls[0][0],
                ).toContain(
                    'DELETE FROM preparedness_task_cache',
                );


                expect(
                    transaction
                        .runAsync
                        .mock.calls[1][0],
                ).toContain(
                    'DELETE FROM preparedness_mission_cache',
                );


                expect(
                    transaction
                        .runAsync
                        .mock.calls[2],
                ).toEqual([
                    expect.stringContaining(
                        'INSERT INTO preparedness_mission_cache',
                    ),
                    1,
                    'prepare_first_aid_kit',
                    'Prepare a First Aid Kit',
                    'جهّز حقيبة إسعافات أولية',
                    'Prepare essential first aid supplies.',
                    'جهّز مستلزمات الإسعافات الأولية الأساسية.',
                    'national',
                    10,
                    1,
                ]);


                expect(
                    transaction
                        .runAsync
                        .mock.calls[3],
                ).toEqual([
                    expect.stringContaining(
                        'INSERT INTO preparedness_task_cache',
                    ),
                    1,
                    1,
                    null,
                    'first_aid_kit_ready',
                    'Prepare the kit',
                    'جهّز الحقيبة',
                    null,
                    null,
                    20,
                    10,
                    1,
                ]);


                expect(
                    transaction
                        .runAsync
                        .mock.calls[4],
                ).toEqual([
                    expect.stringContaining(
                        'INSERT INTO preparedness_cache_metadata',
                    ),
                    'preparedness.catalogue',
                    '2026-09-24T01:00:00.000Z',
                ]);
            },
        );


        test(
            'returns null when no preparedness catalogue has been cached',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue(
                        null,
                    );


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await expect(
                    loadPreparednessCatalogueCache(),
                ).resolves.toBeNull();


                expect(
                    database
                        .getAllAsync,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'restores a cached catalogue and converts SQLite integer booleans',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue({
                        cached_at:
                            '2026-09-24T01:00:00.000Z',
                    });


                database
                    .getAllAsync
                    .mockResolvedValueOnce([
                        {
                            ...catalogue.missions[0],
                            is_active: 1,
                        },
                    ])
                    .mockResolvedValueOnce([
                        {
                            ...catalogue.tasks[0],
                            is_active: 1,
                        },
                    ]);


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await expect(
                    loadPreparednessCatalogueCache(),
                ).resolves.toEqual(
                    catalogue,
                );
            },
        );


        test(
            'records an empty hazard result as a successful location cache',
            async () => {
                const {
                    database,
                    transaction,
                } =
                    createDatabaseMock();


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await savePreparednessLocationHazardCache(
                    201,
                    [],
                    '2026-09-24T01:05:00.000Z',
                );


                expect(
                    transaction
                        .runAsync,
                ).toHaveBeenCalledTimes(
                    2,
                );


                expect(
                    transaction
                        .runAsync
                        .mock.calls[0],
                ).toEqual([
                    expect.stringContaining(
                        'DELETE FROM preparedness_location_hazard_cache',
                    ),
                    201,
                ]);


                expect(
                    transaction
                        .runAsync
                        .mock.calls[1],
                ).toEqual([
                    expect.stringContaining(
                        'INSERT INTO preparedness_cache_metadata',
                    ),
                    'preparedness.location-hazards.201',
                    '2026-09-24T01:05:00.000Z',
                ]);
            },
        );


        test(
            'distinguishes an uncached location from a cached empty hazard result',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                database
                    .getFirstAsync
                    .mockResolvedValueOnce(
                        null,
                    );


                await expect(
                    loadPreparednessLocationHazardCache(
                        201,
                    ),
                ).resolves.toBeNull();


                database
                    .getFirstAsync
                    .mockResolvedValueOnce({
                        cached_at:
                            '2026-09-24T01:05:00.000Z',
                    });

                database
                    .getAllAsync
                    .mockResolvedValueOnce(
                        [],
                    );


                await expect(
                    loadPreparednessLocationHazardCache(
                        201,
                    ),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'restores cached hazards with boolean and nullable resolver fields intact',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue({
                        cached_at:
                            '2026-09-24T01:10:00.000Z',
                    });


                database
                    .getAllAsync
                    .mockResolvedValue([
                        {
                            ...resolvedHazard,
                            is_prioritised: 1,
                        },
                        {
                            hazard_id: 5,
                            hazard_code:
                                'dust',
                            hazard_name_en:
                                'Dust and Sandstorm',
                            hazard_name_ar:
                                'الغبار والعواصف الرملية',
                            classification:
                                'meteorological',
                            hazard_sort_order: 50,
                            is_prioritised: 0,
                            relevance_rank: null,
                            matched_location_id: null,
                            matched_location_code: null,
                            matched_location_type: null,
                            matched_location_name_en: null,
                            matched_location_name_ar: null,
                            hierarchy_distance: null,
                        },
                    ]);


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await expect(
                    loadPreparednessLocationHazardCache(
                        201,
                    ),
                ).resolves.toEqual([
                    resolvedHazard,
                    {
                        hazard_id: 5,
                        hazard_code:
                            'dust',
                        hazard_name_en:
                            'Dust and Sandstorm',
                        hazard_name_ar:
                            'الغبار والعواصف الرملية',
                        classification:
                            'meteorological',
                        hazard_sort_order: 50,
                        is_prioritised: false,
                        relevance_rank: null,
                        matched_location_id: null,
                        matched_location_code: null,
                        matched_location_type: null,
                        matched_location_name_en: null,
                        matched_location_name_ar: null,
                        hierarchy_distance: null,
                    },
                ]);
            },
        );


        test(
            'rejects invalid location IDs before opening the database',
            async () => {
                await expect(
                    loadPreparednessLocationHazardCache(
                        0,
                    ),
                ).rejects.toThrow(
                    'Preparedness cache requires a positive integer location ID.',
                );


                expect(
                    getIhtiyatDatabaseMock,
                ).not.toHaveBeenCalled();
            },
        );
    },
);