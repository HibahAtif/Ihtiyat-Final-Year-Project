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
    loadQuizCatalogueCache,
    saveQuizCatalogueCache,
} from '@/features/preparedness/quiz-cache-repository';

import type {
    QuizCatalogue,
} from '@/features/preparedness/quiz-types';


const getIhtiyatDatabaseMock =
    getIhtiyatDatabase as jest.MockedFunction<
        typeof getIhtiyatDatabase
    >;


type MockRunResult = {
    changes: number;
    lastInsertRowId: number;
};


type MockTransaction = {
    runAsync: jest.Mock<
        Promise<MockRunResult>
    >;
};


function createDatabaseMock() {
    const transaction:
        MockTransaction = {
            runAsync:
                jest.fn()
                    .mockResolvedValue({
                        changes:
                            1,

                        lastInsertRowId:
                            0,
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


const quizCatalogue:
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
                    'Which actions match the reviewed flood-safety guidance?',

                prompt_ar:
                    'ما الإجراءات التي تتوافق مع إرشادات السلامة من السيول؟',

                sort_order:
                    20,

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
            {
                id:
                    12,

                question_id:
                    1,

                option_code:
                    'check_documents',

                text_en:
                    'Check important household documents.',

                text_ar:
                    'تحقق من الوثائق المنزلية المهمة.',

                sort_order:
                    20,
            },
            {
                id:
                    51,

                question_id:
                    5,

                option_code:
                    'avoid_flood_water',

                text_en:
                    'Avoid entering flood water.',

                text_ar:
                    'تجنب دخول مياه السيول.',

                sort_order:
                    10,
            },
        ],
    };


describe(
    'quiz cache repository',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });


        test(
            'atomically replaces the complete quiz catalogue and records cache metadata',
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


                await saveQuizCatalogueCache(
                    quizCatalogue,
                    '2026-09-25T05:00:00.000Z',
                );


                expect(
                    database
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                /*
                 * 2 DELETEs
                 * 2 question INSERTs
                 * 3 option INSERTs
                 * 1 metadata write
                 */
                expect(
                    transaction.runAsync,
                ).toHaveBeenCalledTimes(
                    8,
                );


                /*
                 * Options must be deleted first because they reference cached
                 * questions through a foreign key.
                 */
                expect(
                    transaction
                        .runAsync
                        .mock.calls[0][0],
                ).toContain(
                    'DELETE FROM quiz_option_cache',
                );


                expect(
                    transaction
                        .runAsync
                        .mock.calls[1][0],
                ).toContain(
                    'DELETE FROM quiz_question_cache',
                );


                expect(
                    transaction
                        .runAsync
                        .mock.calls[2],
                ).toEqual([
                    expect.stringContaining(
                        'INSERT INTO quiz_question_cache',
                    ),
                    1,
                    1,
                    null,
                    'quiz_first_aid_initial_response',
                    'single_select',
                    'Before giving first aid, what should you check first?',
                    'قبل تقديم الإسعافات الأولية، ما الذي ينبغي التحقق منه أولًا؟',
                    10,
                    1,
                ]);


                expect(
                    transaction
                        .runAsync
                        .mock.calls[3],
                ).toEqual([
                    expect.stringContaining(
                        'INSERT INTO quiz_question_cache',
                    ),
                    5,
                    4,
                    1,
                    'quiz_flood_avoid_water',
                    'multi_select',
                    'Which actions match the reviewed flood-safety guidance?',
                    'ما الإجراءات التي تتوافق مع إرشادات السلامة من السيول؟',
                    20,
                    1,
                ]);


                expect(
                    transaction
                        .runAsync
                        .mock.calls[4],
                ).toEqual([
                    expect.stringContaining(
                        'INSERT INTO quiz_option_cache',
                    ),
                    11,
                    1,
                    'check_scene_safety',
                    'Check that the scene is safe.',
                    'تحقق من أن المكان آمن.',
                    10,
                ]);


                expect(
                    transaction
                        .runAsync
                        .mock.calls[7],
                ).toEqual([
                    expect.stringContaining(
                        'preparedness_cache_metadata',
                    ),
                    'preparedness.quiz-catalogue',
                    '2026-09-25T05:00:00.000Z',
                ]);
            },
        );


        test(
            'never writes protected quiz answers or explanations into the local cache',
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


                await saveQuizCatalogueCache(
                    quizCatalogue,
                );


                const executedSql =
                    transaction
                        .runAsync
                        .mock.calls
                        .map(
                            (
                                [sql],
                            ) =>
                                sql as string,
                        )
                        .join(
                            '\n',
                        );


                expect(
                    executedSql,
                ).not.toContain(
                    'is_correct',
                );

                expect(
                    executedSql,
                ).not.toContain(
                    'explanation_en',
                );

                expect(
                    executedSql,
                ).not.toContain(
                    'explanation_ar',
                );
            },
        );


        test(
            'returns null when no successful quiz catalogue has ever been cached',
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
                    loadQuizCatalogueCache(),
                ).resolves.toBeNull();


                expect(
                    database.getFirstAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                expect(
                    database
                        .getFirstAsync
                        .mock.calls[0],
                ).toEqual([
                    expect.stringContaining(
                        'preparedness_cache_metadata',
                    ),
                    'preparedness.quiz-catalogue',
                ]);


                expect(
                    database.getAllAsync,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'preserves a successfully cached empty quiz catalogue',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue({
                        cached_at:
                            '2026-09-25T05:00:00.000Z',
                    });


                database
                    .getAllAsync
                    .mockResolvedValueOnce(
                        [],
                    )
                    .mockResolvedValueOnce(
                        [],
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
                    loadQuizCatalogueCache(),
                ).resolves.toEqual({
                    questions:
                        [],

                    options:
                        [],
                });
            },
        );


        test(
            'loads cached questions and options in deterministic catalogue order',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue({
                        cached_at:
                            '2026-09-25T05:00:00.000Z',
                    });


                database
                    .getAllAsync
                    .mockResolvedValueOnce([
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
                                1,
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
                                'Which actions match the reviewed flood-safety guidance?',

                            prompt_ar:
                                'ما الإجراءات التي تتوافق مع إرشادات السلامة من السيول؟',

                            sort_order:
                                20,

                            is_active:
                                0,
                        },
                    ])
                    .mockResolvedValueOnce([
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
                                'Check important household documents.',

                            text_ar:
                                'تحقق من الوثائق المنزلية المهمة.',

                            sort_order:
                                20,
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
                    loadQuizCatalogueCache(),
                ).resolves.toEqual({
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
                                'Which actions match the reviewed flood-safety guidance?',

                            prompt_ar:
                                'ما الإجراءات التي تتوافق مع إرشادات السلامة من السيول؟',

                            sort_order:
                                20,

                            is_active:
                                false,
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
                        {
                            id:
                                12,

                            question_id:
                                1,

                            option_code:
                                'check_documents',

                            text_en:
                                'Check important household documents.',

                            text_ar:
                                'تحقق من الوثائق المنزلية المهمة.',

                            sort_order:
                                20,
                        },
                    ],
                });


                const questionSql =
                    database
                        .getAllAsync
                        .mock.calls[0][0] as string;

                const optionSql =
                    database
                        .getAllAsync
                        .mock.calls[1][0] as string;


                expect(
                    questionSql,
                ).toContain(
                    'FROM quiz_question_cache',
                );

                expect(
                    questionSql,
                ).toContain(
                    'mission_id ASC',
                );

                expect(
                    questionSql,
                ).toContain(
                    'sort_order ASC',
                );

                expect(
                    questionSql,
                ).toContain(
                    'id ASC',
                );


                expect(
                    optionSql,
                ).toContain(
                    'FROM quiz_option_cache',
                );

                expect(
                    optionSql,
                ).toContain(
                    'question_id ASC',
                );

                expect(
                    optionSql,
                ).toContain(
                    'sort_order ASC',
                );

                expect(
                    optionSql,
                ).toContain(
                    'id ASC',
                );
            },
        );


        test(
            'records metadata even when saving an empty catalogue',
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


                await saveQuizCatalogueCache(
                    {
                        questions:
                            [],

                        options:
                            [],
                    },
                    '2026-09-25T06:00:00.000Z',
                );


                /*
                 * Two DELETEs plus the metadata write. The metadata row is
                 * essential because it distinguishes a known-empty cache from
                 * one that has never been populated.
                 */
                expect(
                    transaction.runAsync,
                ).toHaveBeenCalledTimes(
                    3,
                );


                expect(
                    transaction
                        .runAsync
                        .mock.calls[2],
                ).toEqual([
                    expect.stringContaining(
                        'preparedness_cache_metadata',
                    ),
                    'preparedness.quiz-catalogue',
                    '2026-09-25T06:00:00.000Z',
                ]);
            },
        );
    },
);