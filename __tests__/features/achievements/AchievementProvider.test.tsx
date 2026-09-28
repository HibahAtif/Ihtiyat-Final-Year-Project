/// <reference types="jest" />


import {
    Pressable,
    Text,
} from 'react-native';

import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react-native';


jest.mock(
    '@/auth/AuthenticationProvider',
    () => ({
        useAuth:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/achievements/achievement-service',
    () => ({
        loadActiveAchievements:
            jest.fn(),

        loadUserAchievements:
            jest.fn(),
    }),
);


import {
    useAuth,
} from '@/auth/AuthenticationProvider';

import {
    loadActiveAchievements,
    loadUserAchievements,
} from '@/features/achievements/achievement-service';

import {
    AchievementProvider,
    useAchievements,
} from '@/features/achievements/AchievementProvider';

import type {
    AchievementDefinition,
    UserAchievement,
} from '@/features/achievements/achievement-types';


const useAuthMock =
    useAuth as jest.MockedFunction<
        typeof useAuth
    >;


const loadActiveAchievementsMock =
    loadActiveAchievements as jest.MockedFunction<
        typeof loadActiveAchievements
    >;


const loadUserAchievementsMock =
    loadUserAchievements as jest.MockedFunction<
        typeof loadUserAchievements
    >;


const USER_A =
    '11111111-1111-1111-1111-111111111111';

const USER_B =
    '22222222-2222-2222-2222-222222222222';


const FIRST_EARNED_AT =
    '2035-03-12T07:41:19.000Z';

const SECOND_EARNED_AT =
    '2035-08-24T18:13:52.000Z';


const achievementDefinitions:
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
                3,

            code:
                'scenario_learner',

            title_en:
                'Preparedness Learner',

            title_ar:
                'متعلم الاستعداد',

            description_en:
                'Answer one preparedness scenario correctly.',

            description_ar:
                'أجب عن سيناريو استعداد واحد بشكل صحيح.',

            criterion_type:
                'quiz_questions_correct',

            threshold:
                1,

            target_mission_id:
                null,

            sort_order:
                30,

            is_active:
                true,
        },
    ];


const userAAwards:
    UserAchievement[] = [
        {
            user_id:
                USER_A,

            achievement_id:
                1,

            earned_at:
                FIRST_EARNED_AT,
        },
    ];


const userBAwards:
    UserAchievement[] = [
        {
            user_id:
                USER_B,

            achievement_id:
                3,

            earned_at:
                SECOND_EARNED_AT,
        },
    ];


/**
 * Creates a promise whose completion can be controlled by the test.
 *
 * This lets the account-switch test prove that a slower request belonging to
 * an old account cannot overwrite newer private achievement state.
 */
function createDeferred<T>() {
    let resolvePromise:
        (value: T) => void =
        () => undefined;

    let rejectPromise:
        (reason?: unknown) => void =
        () => undefined;


    const promise =
        new Promise<T>(
            (
                resolve,
                reject,
            ) => {
                resolvePromise =
                    resolve;

                rejectPromise =
                    reject;
            },
        );


    return {
        promise,

        resolve:
            resolvePromise,

        reject:
            rejectPromise,
    };
}


function mockAuthentication(
    userId:
        string | null,
    isLoading:
        boolean = false,
): void {
    useAuthMock
        .mockReturnValue({
            session:
                userId
                    ? {
                        user: {
                            id:
                                userId,
                        },
                    }
                    : null,

            user:
                userId
                    ? {
                        id:
                            userId,
                    }
                    : null,

            isAuthenticated:
                userId
                !== null,

            isLoading,
        } as ReturnType<
            typeof useAuth
        >);
}


/**
 * Test-only consumer that exposes provider state without coupling provider
 * tests to the future production Progress & Achievements screen.
 */
function AchievementProbe() {
    const {
        definitions,
        earnedAchievements,
        catalogueStatus,
        earnedStatus,
        isCatalogueLoading,
        isEarnedLoading,
        refresh,
    } = useAchievements();


    return (
        <>
            <Text
                testID="achievement-catalogue-status"
            >
                {catalogueStatus}
            </Text>

            <Text
                testID="achievement-earned-status"
            >
                {earnedStatus}
            </Text>

            <Text
                testID="achievement-catalogue-loading"
            >
                {
                    String(
                        isCatalogueLoading,
                    )
                }
            </Text>

            <Text
                testID="achievement-earned-loading"
            >
                {
                    String(
                        isEarnedLoading,
                    )
                }
            </Text>

            <Text
                testID="achievement-definition-count"
            >
                {
                    String(
                        definitions.length,
                    )
                }
            </Text>

            <Text
                testID="achievement-earned-count"
            >
                {
                    String(
                        earnedAchievements.length,
                    )
                }
            </Text>

            <Text
                testID="achievement-first-earned-code"
            >
                {
                    earnedAchievements[0]
                        ?.achievement
                        .code
                    ?? 'none'
                }
            </Text>

            <Text
                testID="achievement-first-earned-at"
            >
                {
                    earnedAchievements[0]
                        ?.earned_at
                    ?? 'none'
                }
            </Text>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh achievements"
                onPress={() => {
                    void refresh();
                }}
            >
                <Text>
                    Refresh achievements
                </Text>
            </Pressable>
        </>
    );
}


async function renderProvider() {
    return await render(
        <AchievementProvider>
            <AchievementProbe />
        </AchievementProvider>,
    );
}


describe(
    'AchievementProvider',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();


            mockAuthentication(
                null,
                false,
            );


            loadActiveAchievementsMock
                .mockResolvedValue(
                    achievementDefinitions,
                );


            loadUserAchievementsMock
                .mockResolvedValue(
                    [],
                );
        });


        test(
            'loads the public achievement catalogue without waiting for authentication restoration',
            async () => {
                mockAuthentication(
                    null,
                    true,
                );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-catalogue-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    screen
                        .getByTestId(
                            'achievement-definition-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '2',
                );


                expect(
                    screen
                        .getByTestId(
                            'achievement-earned-status',
                        )
                        .props
                        .children,
                ).toBe(
                    'loading',
                );


                expect(
                    loadUserAchievementsMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'exposes empty idle private achievement state for a guest',
            async () => {
                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-catalogue-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    screen
                        .getByTestId(
                            'achievement-earned-status',
                        )
                        .props
                        .children,
                ).toBe(
                    'idle',
                );


                expect(
                    screen
                        .getByTestId(
                            'achievement-earned-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '0',
                );


                expect(
                    loadUserAchievementsMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'loads and combines earned achievements for the authenticated account',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserAchievementsMock
                    .mockResolvedValue(
                        userAAwards,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-earned-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    loadUserAchievementsMock,
                ).toHaveBeenCalledWith(
                    USER_A,
                );


                expect(
                    screen
                        .getByTestId(
                            'achievement-earned-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '1',
                );


                expect(
                    screen
                        .getByTestId(
                            'achievement-first-earned-code',
                        )
                        .props
                        .children,
                ).toBe(
                    'first_preparedness_step',
                );


                expect(
                    screen
                        .getByTestId(
                            'achievement-first-earned-at',
                        )
                        .props
                        .children,
                ).toBe(
                    FIRST_EARNED_AT,
                );
            },
        );


        test(
            'clears private achievements when the authenticated account signs out',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserAchievementsMock
                    .mockResolvedValue(
                        userAAwards,
                    );


                const rendered =
                    await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-earned-count',
                            )
                            .props
                            .children,
                    ).toBe(
                        '1',
                    );
                });


                mockAuthentication(
                    null,
                    false,
                );


                await rendered.rerender(
                    <AchievementProvider>
                        <AchievementProbe />
                    </AchievementProvider>,
                );


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-earned-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'idle',
                    );
                });


                expect(
                    screen
                        .getByTestId(
                            'achievement-earned-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '0',
                );
            },
        );


        test(
            'does not expose stale private achievements when accounts switch during a request',
            async () => {
                const userARequest =
                    createDeferred<
                        UserAchievement[]
                    >();


                mockAuthentication(
                    USER_A,
                );


                loadUserAchievementsMock
                    .mockImplementationOnce(
                        () =>
                            userARequest
                                .promise,
                    )
                    .mockResolvedValueOnce(
                        userBAwards,
                    );


                const rendered =
                    await renderProvider();


                await waitFor(() => {
                    expect(
                        loadUserAchievementsMock,
                    ).toHaveBeenCalledWith(
                        USER_A,
                    );
                });


                mockAuthentication(
                    USER_B,
                );


                await rendered.rerender(
                    <AchievementProvider>
                        <AchievementProbe />
                    </AchievementProvider>,
                );


                await waitFor(() => {
                    expect(
                        loadUserAchievementsMock,
                    ).toHaveBeenCalledWith(
                        USER_B,
                    );


                    expect(
                        screen
                            .getByTestId(
                                'achievement-first-earned-code',
                            )
                            .props
                            .children,
                    ).toBe(
                        'scenario_learner',
                    );
                });


                userARequest.resolve(
                    userAAwards,
                );


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-first-earned-code',
                            )
                            .props
                            .children,
                    ).toBe(
                        'scenario_learner',
                    );
                });
            },
        );


        test(
            'keeps the public catalogue ready when private achievement loading fails',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserAchievementsMock
                    .mockRejectedValue(
                        new Error(
                            'private achievements unavailable',
                        ),
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-earned-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'error',
                    );
                });


                expect(
                    screen
                        .getByTestId(
                            'achievement-catalogue-status',
                        )
                        .props
                        .children,
                ).toBe(
                    'ready',
                );


                expect(
                    screen
                        .getByTestId(
                            'achievement-definition-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '2',
                );


                expect(
                    screen
                        .getByTestId(
                            'achievement-earned-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '0',
                );
            },
        );


        test(
            'refreshes both the public catalogue and current authenticated achievement state',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserAchievementsMock
                    .mockResolvedValue(
                        userAAwards,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-catalogue-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );


                    expect(
                        screen
                            .getByTestId(
                                'achievement-earned-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                await fireEvent.press(
                    screen.getByText(
                        'Refresh achievements',
                    ),
                );


                await waitFor(() => {
                    expect(
                        loadActiveAchievementsMock,
                    ).toHaveBeenCalledTimes(
                        2,
                    );


                    expect(
                        loadUserAchievementsMock,
                    ).toHaveBeenCalledTimes(
                        2,
                    );
                });
            },
        );


        test(
            'keeps private awards hidden when an earned row has no active public definition',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserAchievementsMock
                    .mockResolvedValue([
                        {
                            user_id:
                                USER_A,

                            achievement_id:
                                999,

                            earned_at:
                                FIRST_EARNED_AT,
                        },
                    ]);


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'achievement-earned-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    screen
                        .getByTestId(
                            'achievement-earned-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '0',
                );
            },
        );
    },
);