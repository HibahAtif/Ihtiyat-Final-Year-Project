/// <reference types="jest" />


import {
    useState,
} from 'react';

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
    '@/features/preparedness/quiz-feature-loader',
    () => ({
        loadQuizFeatureCatalogue:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/quiz-service',
    () => ({
        loadUserQuizProgress:
            jest.fn(),

        submitQuizAnswer:
            jest.fn(),
    }),
);


import {
    useAuth,
} from '@/auth/AuthenticationProvider';

import {
    loadQuizFeatureCatalogue,
} from '@/features/preparedness/quiz-feature-loader';

import {
    loadUserQuizProgress,
    submitQuizAnswer,
} from '@/features/preparedness/quiz-service';

import {
    QuizDataProvider,
    useQuizData,
} from '@/features/preparedness/QuizDataProvider';

import type {
    QuizCatalogue,
    QuizSubmissionResult,
    UserQuizProgress,
} from '@/features/preparedness/quiz-types';


const useAuthMock =
    useAuth as jest.MockedFunction<
        typeof useAuth
    >;


const loadQuizFeatureCatalogueMock =
    loadQuizFeatureCatalogue as jest.MockedFunction<
        typeof loadQuizFeatureCatalogue
    >;


const loadUserQuizProgressMock =
    loadUserQuizProgress as jest.MockedFunction<
        typeof loadUserQuizProgress
    >;


const submitQuizAnswerMock =
    submitQuizAnswer as jest.MockedFunction<
        typeof submitQuizAnswer
    >;


const USER_A =
    '11111111-1111-1111-1111-111111111111';

const FIRST_ATTEMPTED_AT =
    '2038-04-17T03:26:41.000Z';

const SECOND_ATTEMPTED_AT =
    '2038-04-17T11:58:09.000Z';

const remoteCatalogue:
    QuizCatalogue = {
        questions: [
            {
                id:
                    1,

                mission_id:
                    1,

                hazard_id:
                    null,

                code:
                    'quiz_first_aid_initial_response',

                question_type:
                    'single_select',

                prompt_en:
                    'Before giving first aid, what should you check first?',

                prompt_ar:
                    'قبل تقديم الإسعافات الأولية، ما الذي ينبغي التحقق منه أولًا؟',

                sort_order:
                    10,

                is_active:
                    true,
            },
        ],

        options: [
            {
                id:
                    11,

                question_id:
                    1,

                option_code:
                    'check_scene_safety',

                text_en:
                    'Check that the scene is safe.',

                text_ar:
                    'تحقق من أن المكان آمن.',

                sort_order:
                    10,
            },
        ],
    };


const initialProgress:
    UserQuizProgress[] = [
        {
            user_id:
                USER_A,

            question_id:
                1,

            has_correct_answer:
                false,

            attempt_count:
                1,

            first_attempted_at:
                FIRST_ATTEMPTED_AT,

            last_attempted_at:
                FIRST_ATTEMPTED_AT,
        },
    ];


const updatedProgress:
    UserQuizProgress[] = [
        {
            user_id:
                USER_A,

            question_id:
                1,

            has_correct_answer:
                true,

            attempt_count:
                2,

            first_attempted_at:
                FIRST_ATTEMPTED_AT,

            last_attempted_at:
                SECOND_ATTEMPTED_AT,
        },
    ];


const guestSubmissionResult:
    QuizSubmissionResult = {
        question_id:
            1,

        is_correct:
            true,

        progress_recorded:
            false,

        has_correct_answer:
            null,

        attempt_count:
            null,

        first_attempted_at:
            null,

        last_attempted_at:
            null,

        explanation_en:
            'Check that the scene is safe before giving first aid.',

        explanation_ar:
            'تحقق من أن المكان آمن قبل تقديم الإسعافات الأولية.',

        correct_option_ids: [
            11,
        ],
    };


const authenticatedSubmissionResult:
    QuizSubmissionResult = {
        question_id:
            1,

        is_correct:
            true,

        progress_recorded:
            true,

        has_correct_answer:
            true,

        attempt_count:
            2,

        first_attempted_at:
            FIRST_ATTEMPTED_AT,

        last_attempted_at:
            SECOND_ATTEMPTED_AT,

        explanation_en:
            'Check that the scene is safe before giving first aid.',

        explanation_ar:
            'تحقق من أن المكان آمن قبل تقديم الإسعافات الأولية.',

        correct_option_ids: [
            11,
        ],
    };


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
 * Test-only consumer that makes provider state observable without coupling the
 * tests to the future production Quiz screen.
 */
function QuizDataProbe() {
    const {
        questions,
        options,
        progress,
        catalogueStatus,
        progressStatus,
        isCatalogueLoading,
        isProgressLoading,
        refresh,
        submitAnswer,
    } = useQuizData();


    const [
        latestSubmission,
        setLatestSubmission,
    ] = useState<
        QuizSubmissionResult
        | null
    >(
        null,
    );


    const [
        submissionError,
        setSubmissionError,
    ] = useState(
        'none',
    );


    const handleSubmit =
        async (): Promise<void> => {
            try {
                const result =
                    await submitAnswer(
                        1,
                        [
                            11,
                        ],
                    );


                setLatestSubmission(
                    result,
                );

                setSubmissionError(
                    'none',
                );
            } catch (
                error: unknown
            ) {
                setSubmissionError(
                    error instanceof Error
                        ? error.message
                        : 'unknown error',
                );
            }
        };


    return (
        <>
            <Text
                testID="quiz-catalogue-status"
            >
                {catalogueStatus}
            </Text>

            <Text
                testID="quiz-progress-status"
            >
                {progressStatus}
            </Text>

            <Text
                testID="quiz-catalogue-loading"
            >
                {
                    String(
                        isCatalogueLoading,
                    )
                }
            </Text>

            <Text
                testID="quiz-progress-loading"
            >
                {
                    String(
                        isProgressLoading,
                    )
                }
            </Text>

            <Text
                testID="quiz-question-count"
            >
                {
                    String(
                        questions.length,
                    )
                }
            </Text>

            <Text
                testID="quiz-option-count"
            >
                {
                    String(
                        options.length,
                    )
                }
            </Text>

            <Text
                testID="quiz-progress-count"
            >
                {
                    String(
                        progress.length,
                    )
                }
            </Text>

            <Text
                testID="quiz-progress-attempts"
            >
                {
                    progress[0]
                        ?.attempt_count
                    ?? 'none'
                }
            </Text>

            <Text
                testID="quiz-submission-result"
            >
                {
                    latestSubmission
                        ? String(
                            latestSubmission
                                .is_correct,
                        )
                        : 'none'
                }
            </Text>

            <Text
                testID="quiz-submission-error"
            >
                {submissionError}
            </Text>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh quiz data"
                onPress={() => {
                    void refresh();
                }}
            >
                <Text>
                    Refresh quiz data
                </Text>
            </Pressable>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Submit quiz answer"
                onPress={() => {
                    void handleSubmit();
                }}
            >
                <Text>
                    Submit quiz answer
                </Text>
            </Pressable>
        </>
    );
}


async function renderProvider() {
    return await render(
        <QuizDataProvider>
            <QuizDataProbe />
        </QuizDataProvider>,
    );
}


describe(
    'QuizDataProvider',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();


            mockAuthentication(
                null,
                false,
            );


            loadQuizFeatureCatalogueMock
                .mockResolvedValue(
                    remoteCatalogue,
                );


            loadUserQuizProgressMock
                .mockResolvedValue(
                    [],
                );
        });


        test(
            'loads public quiz content without waiting for authentication restoration',
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
                                'quiz-catalogue-status',
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
                            'quiz-question-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '1',
                );


                expect(
                    screen
                        .getByTestId(
                            'quiz-option-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '1',
                );


                /*
                 * Private progress must wait until AuthenticationProvider knows
                 * whether an account exists.
                 */
                expect(
                    screen
                        .getByTestId(
                            'quiz-progress-status',
                        )
                        .props
                        .children,
                ).toBe(
                    'loading',
                );


                expect(
                    loadUserQuizProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'exposes empty idle private progress for a guest',
            async () => {
                mockAuthentication(
                    null,
                    false,
                );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-catalogue-status',
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
                            'quiz-progress-status',
                        )
                        .props
                        .children,
                ).toBe(
                    'idle',
                );


                expect(
                    screen
                        .getByTestId(
                            'quiz-progress-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '0',
                );


                expect(
                    loadUserQuizProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'loads private quiz progress for the authenticated account',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserQuizProgressMock
                    .mockResolvedValue(
                        initialProgress,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-progress-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    loadUserQuizProgressMock,
                ).toHaveBeenCalledWith(
                    USER_A,
                );


                expect(
                    screen
                        .getByTestId(
                            'quiz-progress-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '1',
                );


                expect(
                    screen
                        .getByTestId(
                            'quiz-progress-attempts',
                        )
                        .props
                        .children,
                ).toBe(
                    1,
                );
            },
        );


        test(
            'clears private quiz progress when the authenticated user signs out',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserQuizProgressMock
                    .mockResolvedValue(
                        initialProgress,
                    );


                const rendered =
                    await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-progress-count',
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
                    <QuizDataProvider>
                        <QuizDataProbe />
                    </QuizDataProvider>,
                );


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-progress-status',
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
                            'quiz-progress-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '0',
                );
            },
        );


        test(
            'refreshes both public catalogue and current authenticated progress',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserQuizProgressMock
                    .mockResolvedValue(
                        initialProgress,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-catalogue-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );

                    expect(
                        screen
                            .getByTestId(
                                'quiz-progress-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                await fireEvent.press(
                    screen.getByText(
                        'Refresh quiz data',
                    ),
                );


                await waitFor(() => {
                    expect(
                        loadQuizFeatureCatalogueMock,
                    ).toHaveBeenCalledTimes(
                        2,
                    );

                    expect(
                        loadUserQuizProgressMock,
                    ).toHaveBeenCalledTimes(
                        2,
                    );
                });
            },
        );


        test(
            'allows a guest to submit an answer for feedback without loading private progress',
            async () => {
                mockAuthentication(
                    null,
                    false,
                );


                submitQuizAnswerMock
                    .mockResolvedValue(
                        guestSubmissionResult,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-catalogue-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                await fireEvent.press(
                    screen.getByText(
                        'Submit quiz answer',
                    ),
                );


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-submission-result',
                            )
                            .props
                            .children,
                    ).toBe(
                        'true',
                    );
                });


                expect(
                    submitQuizAnswerMock,
                ).toHaveBeenCalledWith(
                    1,
                    [
                        11,
                    ],
                );


                expect(
                    loadUserQuizProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'refreshes authenticated quiz progress after a persisted answer submission',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserQuizProgressMock
                    .mockResolvedValueOnce(
                        initialProgress,
                    )
                    .mockResolvedValueOnce(
                        updatedProgress,
                    );


                submitQuizAnswerMock
                    .mockResolvedValue(
                        authenticatedSubmissionResult,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-progress-attempts',
                            )
                            .props
                            .children,
                    ).toBe(
                        1,
                    );
                });


                await fireEvent.press(
                    screen.getByText(
                        'Submit quiz answer',
                    ),
                );


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-submission-result',
                            )
                            .props
                            .children,
                    ).toBe(
                        'true',
                    );

                    expect(
                        screen
                            .getByTestId(
                                'quiz-progress-attempts',
                            )
                            .props
                            .children,
                    ).toBe(
                        2,
                    );
                });


                expect(
                    loadUserQuizProgressMock,
                ).toHaveBeenCalledTimes(
                    2,
                );
            },
        );


        test(
            'keeps public catalogue ready when authenticated progress loading fails',
            async () => {
                mockAuthentication(
                    USER_A,
                );


                loadUserQuizProgressMock
                    .mockRejectedValue(
                        new Error(
                            'private progress unavailable',
                        ),
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-progress-status',
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
                            'quiz-catalogue-status',
                        )
                        .props
                        .children,
                ).toBe(
                    'ready',
                );


                expect(
                    screen
                        .getByTestId(
                            'quiz-question-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '1',
                );


                expect(
                    screen
                        .getByTestId(
                            'quiz-progress-count',
                        )
                        .props
                        .children,
                ).toBe(
                    '0',
                );
            },
        );


        test(
            'propagates quiz submission failures so the UI can show connection-required feedback',
            async () => {
                mockAuthentication(
                    null,
                    false,
                );


                submitQuizAnswerMock
                    .mockRejectedValue(
                        new Error(
                            'Unable to submit quiz answer: network unavailable',
                        ),
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-catalogue-status',
                            )
                            .props
                            .children,
                    ).toBe(
                        'ready',
                    );
                });


                await fireEvent.press(
                    screen.getByText(
                        'Submit quiz answer',
                    ),
                );


                await waitFor(() => {
                    expect(
                        screen
                            .getByTestId(
                                'quiz-submission-error',
                            )
                            .props
                            .children,
                    ).toBe(
                        'Unable to submit quiz answer: network unavailable',
                    );
                });


                /*
                 * A failed submission must not invent local correctness or
                 * attempt to persist a fake Quiz attempt.
                 */
                expect(
                    loadUserQuizProgressMock,
                ).not.toHaveBeenCalled();
            },
        );
    },
);