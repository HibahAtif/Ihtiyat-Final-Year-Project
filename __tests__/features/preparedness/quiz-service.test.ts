/// <reference types="jest" />


jest.mock(
    '@/lib/supabase-config',
    () => ({
        supabaseClient: {
            from:
                jest.fn(),

            rpc:
                jest.fn(),
        },
    }),
);


import {
    supabaseClient,
} from '@/lib/supabase-config';

import {
    loadActiveQuizQuestions,
    loadQuizCatalogue,
    loadQuizOptions,
    loadUserQuizProgress,
    submitQuizAnswer,
} from '@/features/preparedness/quiz-service';

import type {
    QuizOption,
    QuizQuestion,
    QuizSubmissionResult,
    UserQuizProgress,
} from '@/features/preparedness/quiz-types';


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
 * the quiz application service.
 *
 * WHY:
 * These unit tests should verify the client's query contract without requiring
 * network access. PostgreSQL behaviour itself is already covered separately by
 * the database pgTAP tests.
 *
 * HOW:
 * select(), eq() and order() remain fluent while then() makes the mock behave
 * like an awaited Supabase query builder.
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


const questionRows:
    QuizQuestion[] = [
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
        {
            id:
                5,

            mission_id:
                4,

            hazard_id:
                1,

            code:
                'quiz_flood_avoid_water',

            question_type:
                'multi_select',

            prompt_en:
                'Which two actions match the reviewed flood-safety guidance?',

            prompt_ar:
                'أي إجراءين يتوافقان مع إرشادات السلامة من السيول المراجعة؟',

            sort_order:
                10,

            is_active:
                true,
        },
    ];


const optionRows:
    QuizOption[] = [
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
        {
            id:
                12,

            question_id:
                1,

            option_code:
                'check_documents',

            text_en:
                'Check whether important household documents are ready.',

            text_ar:
                'تحقق مما إذا كانت الوثائق المنزلية المهمة جاهزة.',

            sort_order:
                20,
        },
    ];


const USER_ID =
    '11111111-1111-1111-1111-111111111111';


const progressRows:
    UserQuizProgress[] = [
        {
            user_id:
                USER_ID,

            question_id:
                1,

            has_correct_answer:
                true,

            attempt_count:
                2,

            first_attempted_at:
                '2026-09-25T01:00:00.000Z',

            last_attempted_at:
                '2026-09-25T01:05:00.000Z',
        },
    ];


const authenticatedSubmission:
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
            '2026-09-25T01:00:00.000Z',

        last_attempted_at:
            '2026-09-25T01:05:00.000Z',

        explanation_en:
            'Check scene safety first.',

        explanation_ar:
            'تحقق أولًا من سلامة المكان.',

        correct_option_ids:
            [
                11,
            ],
    };


const guestSubmission:
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
            'Check scene safety first.',

        explanation_ar:
            'تحقق أولًا من سلامة المكان.',

        correct_option_ids:
            [
                11,
            ],
    };


const fromMock =
    supabaseClient.from as unknown as jest.Mock;

const rpcMock =
    supabaseClient.rpc as unknown as jest.Mock;


beforeEach(() => {
    jest.clearAllMocks();
});


describe(
    'quiz service',
    () => {
        test(
            'loads active quiz questions without exposing protected explanations',
            async () => {
                const query =
                    createQueryBuilder<QuizQuestion>({
                        data:
                            questionRows,

                        error:
                            null,
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadActiveQuizQuestions(),
                ).resolves.toEqual(
                    questionRows,
                );


                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'quiz_questions',
                );


                expect(
                    query.select,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const selectedColumns =
                    query
                        .select
                        .mock
                        .calls[0][0] as string;


                expect(
                    selectedColumns,
                ).not.toContain(
                    '*',
                );

                expect(
                    selectedColumns,
                ).not.toContain(
                    'explanation_en',
                );

                expect(
                    selectedColumns,
                ).not.toContain(
                    'explanation_ar',
                );


                for (
                    const requiredColumn
                    of [
                        'id',
                        'mission_id',
                        'hazard_id',
                        'code',
                        'question_type',
                        'prompt_en',
                        'prompt_ar',
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
                            ascending:
                                true,
                        },
                    ],
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
            'loads public quiz options without exposing the answer key',
            async () => {
                const query =
                    createQueryBuilder<QuizOption>({
                        data:
                            optionRows,

                        error:
                            null,
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadQuizOptions(),
                ).resolves.toEqual(
                    optionRows,
                );


                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'quiz_options',
                );


                const selectedColumns =
                    query
                        .select
                        .mock
                        .calls[0][0] as string;


                expect(
                    selectedColumns,
                ).not.toContain(
                    '*',
                );

                expect(
                    selectedColumns,
                ).not.toContain(
                    'is_correct',
                );


                for (
                    const requiredColumn
                    of [
                        'id',
                        'question_id',
                        'option_code',
                        'text_en',
                        'text_ar',
                        'sort_order',
                    ]
                ) {
                    expect(
                        selectedColumns,
                    ).toContain(
                        requiredColumn,
                    );
                }


                expect(
                    query.order.mock.calls,
                ).toEqual([
                    [
                        'question_id',
                        {
                            ascending:
                                true,
                        },
                    ],
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
            'normalises null public quiz query results to empty arrays',
            async () => {
                fromMock
                    .mockReturnValueOnce(
                        createQueryBuilder<QuizQuestion>({
                            data:
                                null,

                            error:
                                null,
                        }),
                    )
                    .mockReturnValueOnce(
                        createQueryBuilder<QuizOption>({
                            data:
                                null,

                            error:
                                null,
                        }),
                    );


                await expect(
                    loadActiveQuizQuestions(),
                ).resolves.toEqual(
                    [],
                );


                await expect(
                    loadQuizOptions(),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'surfaces question catalogue failures with quiz-specific context',
            async () => {
                fromMock.mockReturnValueOnce(
                    createQueryBuilder<QuizQuestion>({
                        data:
                            null,

                        error: {
                            message:
                                'question read failed',
                        },
                    }),
                );


                await expect(
                    loadActiveQuizQuestions(),
                ).rejects.toThrow(
                    'Unable to load quiz questions: question read failed',
                );
            },
        );


        test(
            'surfaces option catalogue failures with quiz-specific context',
            async () => {
                fromMock.mockReturnValueOnce(
                    createQueryBuilder<QuizOption>({
                        data:
                            null,

                        error: {
                            message:
                                'option read failed',
                        },
                    }),
                );


                await expect(
                    loadQuizOptions(),
                ).rejects.toThrow(
                    'Unable to load quiz options: option read failed',
                );
            },
        );


        test(
            'loads questions and options together as one coherent catalogue',
            async () => {
                const questionQuery =
                    createQueryBuilder<QuizQuestion>({
                        data:
                            questionRows,

                        error:
                            null,
                    });

                const optionQuery =
                    createQueryBuilder<QuizOption>({
                        data:
                            optionRows,

                        error:
                            null,
                    });


                fromMock.mockImplementation(
                    (
                        tableName:
                            string,
                    ) => {
                        if (
                            tableName
                            === 'quiz_questions'
                        ) {
                            return questionQuery;
                        }


                        if (
                            tableName
                            === 'quiz_options'
                        ) {
                            return optionQuery;
                        }


                        throw new Error(
                            `Unexpected table: ${tableName}`,
                        );
                    },
                );


                await expect(
                    loadQuizCatalogue(),
                ).resolves.toEqual({
                    questions:
                        questionRows,

                    options:
                        optionRows,
                });


                expect(
                    fromMock,
                ).toHaveBeenCalledTimes(
                    2,
                );
            },
        );


        test(
            'loads only the requested authenticated users quiz progress',
            async () => {
                const query =
                    createQueryBuilder<UserQuizProgress>({
                        data:
                            progressRows,

                        error:
                            null,
                    });


                fromMock.mockReturnValueOnce(
                    query,
                );


                await expect(
                    loadUserQuizProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual(
                    progressRows,
                );


                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'user_quiz_progress',
                );


                const selectedColumns =
                    query
                        .select
                        .mock
                        .calls[0][0] as string;


                expect(
                    selectedColumns,
                ).not.toContain(
                    '*',
                );


                for (
                    const requiredColumn
                    of [
                        'user_id',
                        'question_id',
                        'has_correct_answer',
                        'attempt_count',
                        'first_attempted_at',
                        'last_attempted_at',
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
                    query.order,
                ).toHaveBeenCalledWith(
                    'question_id',
                    {
                        ascending:
                            true,
                    },
                );
            },
        );


        test(
            'surfaces private quiz progress failures with feature-specific context',
            async () => {
                fromMock.mockReturnValueOnce(
                    createQueryBuilder<UserQuizProgress>({
                        data:
                            null,

                        error: {
                            message:
                                'progress read failed',
                        },
                    }),
                );


                await expect(
                    loadUserQuizProgress(
                        USER_ID,
                    ),
                ).rejects.toThrow(
                    'Unable to load quiz progress: progress read failed',
                );
            },
        );


        test(
            'submits selected option identifiers through the authoritative quiz RPC',
            async () => {
                rpcMock.mockResolvedValue({
                    data: [
                        authenticatedSubmission,
                    ],

                    error:
                        null,
                });


                await expect(
                    submitQuizAnswer(
                        1,
                        [
                            11,
                        ],
                    ),
                ).resolves.toEqual(
                    authenticatedSubmission,
                );


                expect(
                    rpcMock,
                ).toHaveBeenCalledWith(
                    'submit_quiz_answer',
                    {
                        p_question_id:
                            1,

                        p_option_ids: [
                            11,
                        ],
                    },
                );
            },
        );


        test(
            'preserves null private progress fields returned for guest submissions',
            async () => {
                rpcMock.mockResolvedValue({
                    data: [
                        guestSubmission,
                    ],

                    error:
                        null,
                });


                await expect(
                    submitQuizAnswer(
                        1,
                        [
                            11,
                        ],
                    ),
                ).resolves.toEqual(
                    guestSubmission,
                );
            },
        );


        test(
            'surfaces quiz submission RPC failures with feature-specific context',
            async () => {
                rpcMock.mockResolvedValue({
                    data:
                        null,

                    error: {
                        message:
                            'submission failed',
                    },
                });


                await expect(
                    submitQuizAnswer(
                        1,
                        [
                            11,
                        ],
                    ),
                ).rejects.toThrow(
                    'Unable to submit quiz answer: submission failed',
                );
            },
        );


        test(
            'rejects an unexpectedly empty successful quiz RPC response',
            async () => {
                rpcMock.mockResolvedValue({
                    data:
                        [],

                    error:
                        null,
                });


                await expect(
                    submitQuizAnswer(
                        1,
                        [
                            11,
                        ],
                    ),
                ).rejects.toThrow(
                    'Quiz submission returned no result.',
                );
            },
        );
    },
);