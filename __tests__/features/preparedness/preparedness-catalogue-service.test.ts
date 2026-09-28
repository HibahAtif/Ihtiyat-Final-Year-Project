/// <reference types="jest" />

jest.mock('@/lib/supabase-config', () => ({
    supabaseClient: {
        from: jest.fn(),
    },
}));

import {
    supabaseClient,
} from '@/lib/supabase-config';

import {
    loadActivePreparednessMissions,
    loadActivePreparednessTasks,
    loadPreparednessCatalogue,
} from '@/features/preparedness/preparedness-catalogue-service';

import type {
    PreparednessMission,
    PreparednessMissionTask,
} from '@/features/preparedness/preparedness-types';


type MockQueryResult<T> = {
    data: T[] | null;
    error: {
        message: string;
    } | null;
};


type MockQueryBuilder<T> = {
    select: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
    then: (
        onFulfilled?: (
            value: MockQueryResult<T>,
        ) => unknown,
        onRejected?: (
            reason: unknown,
        ) => unknown,
    ) => Promise<unknown>;
};


/**
 * WHAT:
 * Creates a fluent, awaitable stand-in for the small Supabase query surface
 * used by the preparedness catalogue service.
 *
 * WHY:
 * These tests should verify our client-side query contract without requiring
 * a network connection or duplicating the database tests already covered by
 * pgTAP.
 *
 * HOW:
 * select(), eq() and order() return the same builder, while then() makes the
 * builder behave like the real awaitable Supabase PostgREST query.
 */
function createQueryBuilder<T>(
    result: MockQueryResult<T>,
): MockQueryBuilder<T> {
    const builder = {
        select: jest.fn(),
        eq: jest.fn(),
        order: jest.fn(),
        then: (
            onFulfilled?: (
                value: MockQueryResult<T>,
            ) => unknown,
            onRejected?: (
                reason: unknown,
            ) => unknown,
        ) =>
            Promise.resolve(
                result,
            ).then(
                onFulfilled,
                onRejected,
            ),
    } as MockQueryBuilder<T>;

    builder.select.mockReturnValue(
        builder,
    );

    builder.eq.mockReturnValue(
        builder,
    );

    builder.order.mockReturnValue(
        builder,
    );

    return builder;
}


const missionRows: PreparednessMission[] = [
    {
        id: 1,
        code: 'prepare_first_aid_kit',
        title_en: 'Prepare a First Aid Kit',
        title_ar: 'جهّز حقيبة إسعافات أولية',
        description_en: 'Prepare essential first aid supplies.',
        description_ar: 'جهّز مستلزمات الإسعافات الأولية الأساسية.',
        mission_scope: 'national',
        sort_order: 10,
        is_active: true,
    },
    {
        id: 4,
        code: 'know_your_local_hazards',
        title_en: 'Know Your Local Hazards',
        title_ar: 'تعرّف على المخاطر المحلية في منطقتك',
        description_en: 'Learn about hazards prioritised for your location.',
        description_ar: 'تعرّف على المخاطر ذات الأولوية في موقعك.',
        mission_scope: 'adaptive',
        sort_order: 40,
        is_active: true,
    },
];


const taskRows: PreparednessMissionTask[] = [
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
];


const fromMock =
    supabaseClient.from as unknown as jest.Mock;


beforeEach(() => {
    jest.clearAllMocks();
});


describe(
    'preparedness catalogue service',
    () => {
        test(
            'loads active missions using an explicit app-facing column selection and deterministic ordering',
            async () => {
                const query =
                    createQueryBuilder<PreparednessMission>({
                        data: missionRows,
                        error: null,
                    });

                fromMock.mockReturnValueOnce(
                    query,
                );

                await expect(
                    loadActivePreparednessMissions(),
                ).resolves.toEqual(
                    missionRows,
                );

                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'preparedness_missions',
                );

                expect(
                    query.select,
                ).toHaveBeenCalledTimes(
                    1,
                );

                const selectedColumns =
                    query.select.mock.calls[0][0] as string;

                expect(
                    selectedColumns,
                ).not.toContain(
                    '*',
                );

                for (
                    const requiredColumn of [
                        'id',
                        'code',
                        'title_en',
                        'title_ar',
                        'description_en',
                        'description_ar',
                        'mission_scope',
                        'sort_order',
                        'is_active',
                    ]
                ) {
                    expect(
                        selectedColumns,
                    ).toContain(
                        requiredColumn,
                    );
                }

                expect(
                    query.eq,
                ).toHaveBeenCalledWith(
                    'is_active',
                    true,
                );

                expect(
                    query.order.mock.calls,
                ).toEqual([
                    [
                        'sort_order',
                        {
                            ascending: true,
                        },
                    ],
                    [
                        'id',
                        {
                            ascending: true,
                        },
                    ],
                ]);
            },
        );


        test(
            'loads active mission tasks without broad select-star access',
            async () => {
                const query =
                    createQueryBuilder<PreparednessMissionTask>({
                        data: taskRows,
                        error: null,
                    });

                fromMock.mockReturnValueOnce(
                    query,
                );

                await expect(
                    loadActivePreparednessTasks(),
                ).resolves.toEqual(
                    taskRows,
                );

                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'mission_tasks',
                );

                const selectedColumns =
                    query.select.mock.calls[0][0] as string;

                expect(
                    selectedColumns,
                ).not.toContain(
                    '*',
                );

                for (
                    const requiredColumn of [
                        'id',
                        'mission_id',
                        'hazard_id',
                        'code',
                        'title_en',
                        'title_ar',
                        'detail_en',
                        'detail_ar',
                        'points',
                        'sort_order',
                        'is_active',
                    ]
                ) {
                    expect(
                        selectedColumns,
                    ).toContain(
                        requiredColumn,
                    );
                }

                expect(
                    query.eq,
                ).toHaveBeenCalledWith(
                    'is_active',
                    true,
                );

                expect(
                    query.order.mock.calls,
                ).toEqual([
                    [
                        'mission_id',
                        {
                            ascending: true,
                        },
                    ],
                    [
                        'sort_order',
                        {
                            ascending: true,
                        },
                    ],
                    [
                        'id',
                        {
                            ascending: true,
                        },
                    ],
                ]);
            },
        );


        test(
            'normalises null mission data to an empty array',
            async () => {
                fromMock.mockReturnValueOnce(
                    createQueryBuilder<PreparednessMission>({
                        data: null,
                        error: null,
                    }),
                );

                await expect(
                    loadActivePreparednessMissions(),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'normalises null task data to an empty array',
            async () => {
                fromMock.mockReturnValueOnce(
                    createQueryBuilder<PreparednessMissionTask>({
                        data: null,
                        error: null,
                    }),
                );

                await expect(
                    loadActivePreparednessTasks(),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'surfaces mission query failures with feature-specific context',
            async () => {
                fromMock.mockReturnValueOnce(
                    createQueryBuilder<PreparednessMission>({
                        data: null,
                        error: {
                            message: 'mission read failed',
                        },
                    }),
                );

                await expect(
                    loadActivePreparednessMissions(),
                ).rejects.toThrow(
                    'Unable to load preparedness missions: mission read failed',
                );
            },
        );


        test(
            'surfaces task query failures with feature-specific context',
            async () => {
                fromMock.mockReturnValueOnce(
                    createQueryBuilder<PreparednessMissionTask>({
                        data: null,
                        error: {
                            message: 'task read failed',
                        },
                    }),
                );

                await expect(
                    loadActivePreparednessTasks(),
                ).rejects.toThrow(
                    'Unable to load preparedness mission tasks: task read failed',
                );
            },
        );


        test(
            'loads missions and tasks together as one coherent catalogue payload',
            async () => {
                const missionQuery =
                    createQueryBuilder<PreparednessMission>({
                        data: missionRows,
                        error: null,
                    });

                const taskQuery =
                    createQueryBuilder<PreparednessMissionTask>({
                        data: taskRows,
                        error: null,
                    });

                fromMock.mockImplementation(
                    (
                        tableName: string,
                    ) => {
                        if (
                            tableName
                            === 'preparedness_missions'
                        ) {
                            return missionQuery;
                        }

                        if (
                            tableName
                            === 'mission_tasks'
                        ) {
                            return taskQuery;
                        }

                        throw new Error(
                            `Unexpected table: ${tableName}`,
                        );
                    },
                );

                await expect(
                    loadPreparednessCatalogue(),
                ).resolves.toEqual({
                    missions: missionRows,
                    tasks: taskRows,
                });

                expect(
                    fromMock,
                ).toHaveBeenCalledTimes(
                    2,
                );
            },
        );
    },
);
