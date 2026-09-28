/// <reference types="jest" />

import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react-native';

import {
    Pressable,
    Text,
} from 'react-native';

import type {
    Session,
    User,
} from '@supabase/supabase-js';


jest.mock(
    '@/auth/AuthenticationProvider',
    () => ({
        useAuth:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/mission-progress-loader',
    () => ({
        loadResilientMissionTaskProgress:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/mission-progress-sync-service',
    () => ({
        setResilientMissionTaskCompletion:
            jest.fn(),
    }),
);


import {
    useAuth,
} from '@/auth/AuthenticationProvider';

import {
    MissionProgressProvider,
    useMissionProgress,
} from '@/features/preparedness/MissionProgressProvider';

import {
    loadResilientMissionTaskProgress,
} from '@/features/preparedness/mission-progress-loader';

import {
    setResilientMissionTaskCompletion,
} from '@/features/preparedness/mission-progress-sync-service';

import type {
    ResilientMissionTaskProgress,
} from '@/features/preparedness/mission-progress-loader';


const USER_A =
    '11111111-1111-1111-1111-111111111111';

const USER_B =
    '22222222-2222-2222-2222-222222222222';


const userAInitialProgress:
    ResilientMissionTaskProgress = {
        progress: [
            {
                user_id:
                    USER_A,
                task_id:
                    1,
                is_completed:
                    true,
                completed_at:
                    '2026-09-24T10:00:00.000Z',
                updated_at:
                    '2026-09-24T10:00:00.000Z',
            },
            {
                user_id:
                    USER_A,
                task_id:
                    2,
                is_completed:
                    false,
                completed_at:
                    null,
                updated_at:
                    '2026-09-24T10:05:00.000Z',
            },
        ],
        pendingTaskIds: [
            2,
        ],
    };


const userAUpdatedProgress:
    ResilientMissionTaskProgress = {
        progress: [
            {
                user_id:
                    USER_A,
                task_id:
                    1,
                is_completed:
                    true,
                completed_at:
                    '2026-09-24T10:00:00.000Z',
                updated_at:
                    '2026-09-24T10:00:00.000Z',
            },
            {
                user_id:
                    USER_A,
                task_id:
                    2,
                is_completed:
                    true,
                completed_at:
                    '2026-09-24T12:00:00.000Z',
                updated_at:
                    '2026-09-24T12:00:00.000Z',
            },
        ],
        pendingTaskIds: [
            2,
        ],
    };


const userBProgress:
    ResilientMissionTaskProgress = {
        progress: [
            {
                user_id:
                    USER_B,
                task_id:
                    3,
                is_completed:
                    true,
                completed_at:
                    '2026-09-24T13:00:00.000Z',
                updated_at:
                    '2026-09-24T13:00:00.000Z',
            },
        ],
        pendingTaskIds:
            [],
    };


const useAuthMock =
    useAuth as jest.MockedFunction<
        typeof useAuth
    >;

const loadResilientMissionTaskProgressMock =
    loadResilientMissionTaskProgress as jest.MockedFunction<
        typeof loadResilientMissionTaskProgress
    >;

const setResilientMissionTaskCompletionMock =
    setResilientMissionTaskCompletion as jest.MockedFunction<
        typeof setResilientMissionTaskCompletion
    >;


/**
 * WHAT:
 * Creates the authentication state required by each provider test.
 *
 * WHY:
 * MissionProgressProvider must distinguish authentication restoration, guest
 * access and authenticated account state without initialising the real
 * Supabase authentication provider.
 *
 * HOW:
 * Only the user identity and authentication/loading flags relevant to mission
 * progress are populated.
 */
function createAuthState(
    userId: string | null,
    isLoading: boolean = false,
): ReturnType<typeof useAuth> {
    const user =
        userId
            ? ({
                id:
                    userId,
            } as User)
            : null;

    const session =
        user
            ? ({
                user,
            } as Session)
            : null;


    return {
        session,
        user,
        isAuthenticated:
            user !== null,
        isLoading,
    };
}


type DeferredProgress = {
    promise:
        Promise<ResilientMissionTaskProgress>;

    resolve: (
        value:
            ResilientMissionTaskProgress,
    ) => void;

    reject: (
        reason: unknown,
    ) => void;
};


/**
 * WHAT:
 * Creates a controllable mission-progress loader request.
 *
 * WHY:
 * Account-switch protection can only be verified when an older account request
 * remains pending while a newer account request completes.
 *
 * HOW:
 * The promise and its external resolve/reject functions are returned together
 * so tests control completion order explicitly.
 */
function createDeferredProgress():
    DeferredProgress {
    let resolvePromise:
        | ((
            value:
                ResilientMissionTaskProgress,
        ) => void)
        | undefined;

    let rejectPromise:
        | ((
            reason:
                unknown,
        ) => void)
        | undefined;


    const promise =
        new Promise<ResilientMissionTaskProgress>(
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

        resolve: (
            value:
                ResilientMissionTaskProgress,
        ): void => {
            if (!resolvePromise) {
                throw new Error(
                    'Deferred mission-progress resolver is unavailable.',
                );
            }

            resolvePromise(
                value,
            );
        },

        reject: (
            reason:
                unknown,
        ): void => {
            if (!rejectPromise) {
                throw new Error(
                    'Deferred mission-progress rejecter is unavailable.',
                );
            }

            rejectPromise(
                reason,
            );
        },
    };
}


/**
 * WHAT:
 * Displays the public MissionProgressProvider context as deterministic test
 * values.
 *
 * WHY:
 * Tests should exercise the same hook that production mission screens will
 * consume instead of inspecting private provider implementation details.
 */
function MissionProgressProbe() {
    const {
        progress,
        pendingTaskIds,
        status,
        isLoading,
        refresh,
        setTaskCompletion,
    } = useMissionProgress();


    const taskStates =
        progress
            .map(
                (
                    item,
                ) =>
                    `${item.task_id}:${String(item.is_completed)}`,
            )
            .join(
                ',',
            );


    const pendingIds =
        pendingTaskIds
            .join(
                ',',
            );


    const handleCompleteTask =
        async (): Promise<void> => {
            try {
                const synced =
                    await setTaskCompletion(
                        2,
                        true,
                    );

                // screen
                //     .getByTestId(
                //         'mission-progress-mutation-result',
                //     )
                //     .props
                //     .mutationResult =
                //         String(
                //             synced,
                //         );
            } catch {
                // screen
                //     .getByTestId(
                //         'mission-progress-mutation-result',
                //     )
                //     .props
                //     .mutationResult =
                //         'error';
                /*
                 * Guest rejection is expected in the dedicated guest test.
                 * The provider behaviour is asserted through its mocked
                 * dependencies rather than exposing the error in this probe.
                */
            }
        };


    return (
        <>
            <Text
                testID="mission-progress-status"
            >
                {status}
            </Text>

            <Text
                testID="mission-progress-loading"
            >
                {String(
                    isLoading,
                )}
            </Text>

            <Text
                testID="mission-progress-count"
            >
                {String(
                    progress.length,
                )}
            </Text>

            <Text
                testID="mission-progress-task-states"
            >
                {
                    taskStates
                    || 'none'
                }
            </Text>

            <Text
                testID="mission-progress-pending"
            >
                {
                    pendingIds
                    || 'none'
                }
            </Text>

            {/* <Text
                testID="mission-progress-mutation-result"
                mutationResult="none"
            >
                mutation
            </Text> */}

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh mission progress"
                onPress={refresh}
            >
                <Text>
                    Refresh mission progress
                </Text>
            </Pressable>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Complete mission task"
                onPress={() => {
                    void handleCompleteTask();
                }}
            >
                <Text>
                    Complete mission task
                </Text>
            </Pressable>
        </>
    );
}


async function renderProvider() {
    return await render(
        <MissionProgressProvider>
            <MissionProgressProbe />
        </MissionProgressProvider>,
    );
}


describe(
    'MissionProgressProvider',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();

            useAuthMock
                .mockReturnValue(
                    createAuthState(
                        null,
                    ),
                );
        });


        test(
            'waits for authentication restoration before loading mission progress',
            async () => {
                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            null,
                            true,
                        ),
                    );


                await renderProvider();


                expect(
                    screen.getByTestId(
                        'mission-progress-status',
                    ).props.children,
                ).toBe(
                    'loading',
                );

                expect(
                    screen.getByTestId(
                        'mission-progress-loading',
                    ).props.children,
                ).toBe(
                    'true',
                );

                expect(
                    loadResilientMissionTaskProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'exposes empty idle progress for a guest without loading private progress',
            async () => {
                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-status',
                        ).props.children,
                    ).toBe(
                        'idle',
                    );
                });


                expect(
                    screen.getByTestId(
                        'mission-progress-count',
                    ).props.children,
                ).toBe(
                    '0',
                );

                expect(
                    screen.getByTestId(
                        'mission-progress-pending',
                    ).props.children,
                ).toBe(
                    'none',
                );

                expect(
                    loadResilientMissionTaskProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'loads and exposes progress for the authenticated account',
            async () => {
                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            USER_A,
                        ),
                    );

                loadResilientMissionTaskProgressMock
                    .mockResolvedValue(
                        userAInitialProgress,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-status',
                        ).props.children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    loadResilientMissionTaskProgressMock,
                ).toHaveBeenCalledWith(
                    USER_A,
                );

                expect(
                    screen.getByTestId(
                        'mission-progress-task-states',
                    ).props.children,
                ).toBe(
                    '1:true,2:false',
                );

                expect(
                    screen.getByTestId(
                        'mission-progress-pending',
                    ).props.children,
                ).toBe(
                    '2',
                );
            },
        );


        test(
            'refreshes progress for the current authenticated account',
            async () => {
                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            USER_A,
                        ),
                    );

                loadResilientMissionTaskProgressMock
                    .mockResolvedValueOnce(
                        userAInitialProgress,
                    )
                    .mockResolvedValueOnce(
                        userAUpdatedProgress,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-status',
                        ).props.children,
                    ).toBe(
                        'ready',
                    );
                });


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Refresh mission progress',
                        },
                    ),
                );


                await waitFor(() => {
                    expect(
                        loadResilientMissionTaskProgressMock,
                    ).toHaveBeenCalledTimes(
                        2,
                    );
                });


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-task-states',
                        ).props.children,
                    ).toBe(
                        '1:true,2:true',
                    );
                });
            },
        );


        test(
            'persists a task change through the resilient sync service and reloads provider state',
            async () => {
                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            USER_A,
                        ),
                    );

                loadResilientMissionTaskProgressMock
                    .mockResolvedValueOnce(
                        userAInitialProgress,
                    )
                    .mockResolvedValueOnce(
                        userAUpdatedProgress,
                    );

                setResilientMissionTaskCompletionMock
                    .mockResolvedValue(
                        false,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-status',
                        ).props.children,
                    ).toBe(
                        'ready',
                    );
                });


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Complete mission task',
                        },
                    ),
                );


                await waitFor(() => {
                    expect(
                        setResilientMissionTaskCompletionMock,
                    ).toHaveBeenCalledWith(
                        USER_A,
                        2,
                        true,
                        expect.any(
                            String,
                        ),
                    );
                });


                await waitFor(() => {
                    expect(
                        loadResilientMissionTaskProgressMock,
                    ).toHaveBeenCalledTimes(
                        2,
                    );
                });


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-task-states',
                        ).props.children,
                    ).toBe(
                        '1:true,2:true',
                    );
                });


                expect(
                    screen.getByTestId(
                        'mission-progress-pending',
                    ).props.children,
                ).toBe(
                    '2',
                );
            },
        );


        test(
            'rejects persistent task progress for a guest',
            async () => {
                await renderProvider();


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Complete mission task',
                        },
                    ),
                );


                await waitFor(() => {
                    expect(
                        setResilientMissionTaskCompletionMock,
                    ).not.toHaveBeenCalled();
                });

                expect(
                    loadResilientMissionTaskProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'enters error state and clears progress when the current account load fails',
            async () => {
                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            USER_A,
                        ),
                    );

                loadResilientMissionTaskProgressMock
                    .mockRejectedValue(
                        new Error(
                            'mission progress unavailable',
                        ),
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-status',
                        ).props.children,
                    ).toBe(
                        'error',
                    );
                });


                expect(
                    screen.getByTestId(
                        'mission-progress-count',
                    ).props.children,
                ).toBe(
                    '0',
                );

                expect(
                    screen.getByTestId(
                        'mission-progress-pending',
                    ).props.children,
                ).toBe(
                    'none',
                );
            },
        );


        test(
            'ignores progress from an older account request after the authenticated account changes',
            async () => {
                const userARequest =
                    createDeferredProgress();

                const userBRequest =
                    createDeferredProgress();


                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            USER_A,
                        ),
                    );

                loadResilientMissionTaskProgressMock
                    .mockReturnValueOnce(
                        userARequest.promise,
                    )
                    .mockReturnValueOnce(
                        userBRequest.promise,
                    );


                const {
                    rerender,
                } =
                    await renderProvider();


                await waitFor(() => {
                    expect(
                        loadResilientMissionTaskProgressMock,
                    ).toHaveBeenCalledWith(
                        USER_A,
                    );
                });


                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            USER_B,
                        ),
                    );


                await rerender(
                    <MissionProgressProvider>
                        <MissionProgressProbe />
                    </MissionProgressProvider>,
                );


                await waitFor(() => {
                    expect(
                        loadResilientMissionTaskProgressMock,
                    ).toHaveBeenCalledWith(
                        USER_B,
                    );
                });


                await act(async () => {
                    userBRequest.resolve(
                        userBProgress,
                    );

                    await userBRequest.promise;
                });


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-task-states',
                        ).props.children,
                    ).toBe(
                        '3:true',
                    );
                });


                await act(async () => {
                    userARequest.resolve(
                        userAInitialProgress,
                    );

                    await userARequest.promise;
                });


                expect(
                    screen.getByTestId(
                        'mission-progress-task-states',
                    ).props.children,
                ).toBe(
                    '3:true',
                );
            },
        );


        test(
            'clears private mission progress immediately when the user signs out',
            async () => {
                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            USER_A,
                        ),
                    );

                loadResilientMissionTaskProgressMock
                    .mockResolvedValue(
                        userAInitialProgress,
                    );


                const {
                    rerender,
                } =
                    await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-task-states',
                        ).props.children,
                    ).toBe(
                        '1:true,2:false',
                    );
                });


                useAuthMock
                    .mockReturnValue(
                        createAuthState(
                            null,
                        ),
                    );


                await rerender(
                    <MissionProgressProvider>
                        <MissionProgressProbe />
                    </MissionProgressProvider>,
                );


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'mission-progress-status',
                        ).props.children,
                    ).toBe(
                        'idle',
                    );
                });


                expect(
                    screen.getByTestId(
                        'mission-progress-count',
                    ).props.children,
                ).toBe(
                    '0',
                );

                expect(
                    screen.getByTestId(
                        'mission-progress-pending',
                    ).props.children,
                ).toBe(
                    'none',
                );
            },
        );
    },
);