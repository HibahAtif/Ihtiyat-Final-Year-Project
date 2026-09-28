/// <reference types="jest" />


jest.mock(
    '@/lib/supabase-config',
    () => ({
        supabaseClient: {
            from:
                jest.fn(),
        },
    }),
);


import {
    supabaseClient,
} from '@/lib/supabase-config';

import {
    loadActiveAchievements,
    loadUserAchievements,
} from '@/features/achievements/achievement-service';

import type {
    AchievementDefinition,
    UserAchievement,
} from '@/features/achievements/achievement-types';


type MockQueryResult<T> = {
    data:
        T[] | null;

    error: {
        message:
            string;
    } | null;
};


type MockQueryBuilder<T> = {
    select:
        jest.Mock;

    eq:
        jest.Mock;

    order:
        jest.Mock;

    then: (
        onFulfilled?: (
            value:
                MockQueryResult<T>,
        ) => unknown,
        onRejected?: (
            reason:
                unknown,
        ) => unknown,
    ) => Promise<unknown>;
};


/**
 * WHAT:
 * Creates an awaitable stand-in for the small PostgREST query surface used by
 * the achievement service.
 *
 * WHY:
 * The TypeScript service tests should verify Ihtiyat's client-side read
 * contract without requiring network access. PostgreSQL achievement awarding,
 * trigger behaviour, RLS and idempotency are tested separately by SQL tests.
 *
 * HOW:
 * select(), eq() and order() remain fluent while then() makes the mock behave
 * like an awaited Supabase query builder.
 *
 * Deliberately no insert(), update(), delete() or rpc() methods are provided:
 * the achievement application service is read-only.
 */
function createQueryBuilder<T>(
    result:
        MockQueryResult<T>,
): MockQueryBuilder<T> {
    const builder = {
        select:
            jest.fn(),

        eq:
            jest.fn(),

        order:
            jest.fn(),

        then: (
            onFulfilled?: (
                value:
                    MockQueryResult<T>,
            ) => unknown,
            onRejected?: (
                reason:
                    unknown,
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


const achievementRows:
    AchievementDefinition[] = [
        {
            id:
                1,

            code:
                'first_preparedness_step',

            title_en:
                'First Preparedness Step',

            title_ar:
                'الخطوة الأولى للاستعداد',

            description_en:
                'Complete your first preparedness task.',

            description_ar:
                'أكمل أول مهمة من مهام الاستعداد.',

            criterion_type:
                'tasks_completed',

            threshold:
                1,

            target_mission_id:
                null,

            sort_order:
                10,

            is_active:
                true,
        },
        {
            id:
                5,

            code:
                'first_aid_mission_complete',

            title_en:
                'First Aid Mission Complete',

            title_ar:
                'إكمال مهمة الإسعافات الأولية',

            description_en:
                'Complete all tasks in the Prepare a First Aid Kit mission.',

            description_ar:
                'أكمل جميع مهام «جهّز حقيبة إسعافات أولية».',

            criterion_type:
                'mission_completed',

            threshold:
                1,

            target_mission_id:
                1,

            sort_order:
                50,

            is_active:
                true,
        },
    ];


/*
 * Fixed arbitrary identifiers/timestamps keep this suite deterministic.
 * Their actual values have no significance to achievement behaviour.
 */
const USER_ID =
    '44444444-4444-4444-4444-444444444444';

const FIRST_EARNED_AT =
    '2036-02-14T08:17:31.000Z';

const SECOND_EARNED_AT =
    '2036-06-09T19:42:06.000Z';


const userAchievementRows:
    UserAchievement[] = [
        {
            user_id:
                USER_ID,

            achievement_id:
                1,

            earned_at:
                FIRST_EARNED_AT,
        },
        {
            user_id:
                USER_ID,

            achievement_id:
                5,

            earned_at:
                SECOND_EARNED_AT,
        },
    ];


const fromMock =
    supabaseClient.from as unknown as jest.Mock;


beforeEach(
    () => {
        jest.clearAllMocks();
    },
);


describe(
    'achievement service',
    () => {
        test(
            'loads only active achievement definitions using an explicit app-facing column selection and deterministic ordering',
            async () => {
                const query =
                    createQueryBuilder<AchievementDefinition>({
                        data:
                            achievementRows,

                        error:
                            null,
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadActiveAchievements(),
                ).resolves.toEqual(
                    achievementRows,
                );


                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'achievements',
                );


                expect(
                    query.select,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const selectedColumns:
                    string = query.select.mock.calls[0][0];

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
                        'criterion_type',
                        'threshold',
                        'target_mission_id',
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


                /*
                 * created_at is database metadata that this feature does not
                 * need to expose through its public application contract.
                 */
                expect(
                    selectedColumns,
                ).not.toContain(
                    'created_at',
                );


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
                            ascending:
                                true,
                        },
                    ],
                    [
                        'id',
                        {
                            ascending:
                                true,
                        },
                    ],
                ]);
            },
        );


        test(
            'returns an empty public achievement catalogue when Supabase returns no active rows',
            async () => {
                const query =
                    createQueryBuilder<AchievementDefinition>({
                        data:
                            null,

                        error:
                            null,
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadActiveAchievements(),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'propagates public achievement catalogue read failures',
            async () => {
                const query =
                    createQueryBuilder<AchievementDefinition>({
                        data:
                            null,

                        error: {
                            message:
                                'achievement catalogue unavailable',
                        },
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadActiveAchievements(),
                ).rejects.toThrow(
                    'Unable to load achievements: achievement catalogue unavailable',
                );
            },
        );


        test(
            'loads only the requested authenticated account achievement rows using a read-only explicit selection',
            async () => {
                const query =
                    createQueryBuilder<UserAchievement>({
                        data:
                            userAchievementRows,

                        error:
                            null,
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadUserAchievements(
                        USER_ID,
                    ),
                ).resolves.toEqual(
                    userAchievementRows,
                );


                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'user_achievements',
                );


                expect(
                    query.select,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const selectedColumns:
                    string = query.select.mock.calls[0][0];

                expect(
                    selectedColumns,
                ).not.toContain(
                    '*',
                );


                for (
                    const requiredColumn of [
                        'user_id',
                        'achievement_id',
                        'earned_at',
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
                    'user_id',
                    USER_ID,
                );


                expect(
                    query.order.mock.calls,
                ).toEqual([
                    [
                        'earned_at',
                        {
                            ascending:
                                true,
                        },
                    ],
                    [
                        'achievement_id',
                        {
                            ascending:
                                true,
                        },
                    ],
                ]);
            },
        );


        test(
            'returns an empty private achievement list when the authenticated account has earned none',
            async () => {
                const query =
                    createQueryBuilder<UserAchievement>({
                        data:
                            null,

                        error:
                            null,
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadUserAchievements(
                        USER_ID,
                    ),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'propagates private achievement read failures',
            async () => {
                const query =
                    createQueryBuilder<UserAchievement>({
                        data:
                            null,

                        error: {
                            message:
                                'private achievements unavailable',
                        },
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadUserAchievements(
                        USER_ID,
                    ),
                ).rejects.toThrow(
                    'Unable to load user achievements: private achievements unavailable',
                );
            },
        );
    },
);