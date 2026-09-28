/// <reference types="jest" />

jest.mock(
    '@/features/preparedness/quiz-service',
    () => ({
        loadQuizCatalogue:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/quiz-cache-repository',
    () => ({
        loadQuizCatalogueCache:
            jest.fn(),

        saveQuizCatalogueCache:
            jest.fn(),
    }),
);

import {
    loadQuizFeatureCatalogue,
} from '@/features/preparedness/quiz-feature-loader';

import type {
    QuizFeatureDependencies,
} from '@/features/preparedness/quiz-feature-loader';

import type {
    QuizCatalogue,
} from '@/features/preparedness/quiz-types';


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
                    'Remote question',

                prompt_ar:
                    'سؤال عن بعد',

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
                    'remote_option',

                text_en:
                    'Remote option',

                text_ar:
                    'خيار عن بعد',

                sort_order:
                    10,
            },
        ],
    };


const cachedCatalogue:
    QuizCatalogue = {
        questions: [
            {
                id:
                    2,

                mission_id:
                    2,

                hazard_id:
                    1,

                code:
                    'cached_quiz_question',

                question_type:
                    'multi_select',

                prompt_en:
                    'Cached question',

                prompt_ar:
                    'سؤال مخزن مؤقتًا',

                sort_order:
                    20,

                is_active:
                    true,
            },
        ],

        options: [
            {
                id:
                    21,

                question_id:
                    2,

                option_code:
                    'cached_option',

                text_en:
                    'Cached option',

                text_ar:
                    'خيار مخزن مؤقتًا',

                sort_order:
                    10,
            },
        ],
    };


function createDependencies():
    {
        dependencies:
            QuizFeatureDependencies;

        loadQuizCatalogue:
            jest.Mock;

        saveQuizCatalogueCache:
            jest.Mock;

        loadQuizCatalogueCache:
            jest.Mock;
    } {
    const loadQuizCatalogue =
        jest.fn();

    const saveQuizCatalogueCache =
        jest.fn();

    const loadQuizCatalogueCache =
        jest.fn();


    const dependencies:
        QuizFeatureDependencies = {
            loadQuizCatalogue:
                loadQuizCatalogue as QuizFeatureDependencies[
                    'loadQuizCatalogue'
                ],

            saveQuizCatalogueCache:
                saveQuizCatalogueCache as QuizFeatureDependencies[
                    'saveQuizCatalogueCache'
                ],

            loadQuizCatalogueCache:
                loadQuizCatalogueCache as QuizFeatureDependencies[
                    'loadQuizCatalogueCache'
                ],
        };


    return {
        dependencies,
        loadQuizCatalogue,
        saveQuizCatalogueCache,
        loadQuizCatalogueCache,
    };
}


describe(
    'quiz feature loader',
    () => {
        test(
            'returns the canonical remote catalogue and refreshes the local cache',
            async () => {
                const {
                    dependencies,
                    loadQuizCatalogue,
                    saveQuizCatalogueCache,
                    loadQuizCatalogueCache,
                } =
                    createDependencies();


                loadQuizCatalogue
                    .mockResolvedValue(
                        remoteCatalogue,
                    );

                saveQuizCatalogueCache
                    .mockResolvedValue(
                        undefined,
                    );


                await expect(
                    loadQuizFeatureCatalogue(
                        dependencies,
                    ),
                ).resolves.toEqual(
                    remoteCatalogue,
                );


                expect(
                    loadQuizCatalogue,
                ).toHaveBeenCalledTimes(
                    1,
                );


                expect(
                    saveQuizCatalogueCache,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expect(
                    saveQuizCatalogueCache,
                ).toHaveBeenCalledWith(
                    remoteCatalogue,
                );


                /*
                 * A successful canonical read means there is no reason to read
                 * the older SQLite snapshot.
                 */
                expect(
                    loadQuizCatalogueCache,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'still returns fresh remote data when the best-effort cache refresh fails',
            async () => {
                const {
                    dependencies,
                    loadQuizCatalogue,
                    saveQuizCatalogueCache,
                    loadQuizCatalogueCache,
                } =
                    createDependencies();


                loadQuizCatalogue
                    .mockResolvedValue(
                        remoteCatalogue,
                    );

                saveQuizCatalogueCache
                    .mockRejectedValue(
                        new Error(
                            'SQLite write failed',
                        ),
                    );


                await expect(
                    loadQuizFeatureCatalogue(
                        dependencies,
                    ),
                ).resolves.toEqual(
                    remoteCatalogue,
                );


                expect(
                    saveQuizCatalogueCache,
                ).toHaveBeenCalledWith(
                    remoteCatalogue,
                );


                expect(
                    loadQuizCatalogueCache,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'falls back to the previous SQLite catalogue when the remote load fails',
            async () => {
                const {
                    dependencies,
                    loadQuizCatalogue,
                    saveQuizCatalogueCache,
                    loadQuizCatalogueCache,
                } =
                    createDependencies();


                loadQuizCatalogue
                    .mockRejectedValue(
                        new Error(
                            'Network unavailable',
                        ),
                    );

                loadQuizCatalogueCache
                    .mockResolvedValue(
                        cachedCatalogue,
                    );


                await expect(
                    loadQuizFeatureCatalogue(
                        dependencies,
                    ),
                ).resolves.toEqual(
                    cachedCatalogue,
                );


                expect(
                    loadQuizCatalogueCache,
                ).toHaveBeenCalledTimes(
                    1,
                );


                /*
                 * Cached fallback data must never be written back as though it
                 * were a new canonical Supabase response.
                 */
                expect(
                    saveQuizCatalogueCache,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'preserves a successfully cached empty catalogue during offline fallback',
            async () => {
                const {
                    dependencies,
                    loadQuizCatalogue,
                    loadQuizCatalogueCache,
                } =
                    createDependencies();


                loadQuizCatalogue
                    .mockRejectedValue(
                        new Error(
                            'Network unavailable',
                        ),
                    );

                loadQuizCatalogueCache
                    .mockResolvedValue({
                        questions:
                            [],

                        options:
                            [],
                    });


                await expect(
                    loadQuizFeatureCatalogue(
                        dependencies,
                    ),
                ).resolves.toEqual({
                    questions:
                        [],

                    options:
                        [],
                });
            },
        );


        test(
            'rethrows the original remote failure when no cached catalogue exists',
            async () => {
                const {
                    dependencies,
                    loadQuizCatalogue,
                    loadQuizCatalogueCache,
                } =
                    createDependencies();


                const remoteError =
                    new Error(
                        'Remote quiz load failed',
                    );


                loadQuizCatalogue
                    .mockRejectedValue(
                        remoteError,
                    );

                loadQuizCatalogueCache
                    .mockResolvedValue(
                        null,
                    );


                await expect(
                    loadQuizFeatureCatalogue(
                        dependencies,
                    ),
                ).rejects.toBe(
                    remoteError,
                );
            },
        );


        test(
            'preserves the original remote failure when the fallback cache cannot be read',
            async () => {
                const {
                    dependencies,
                    loadQuizCatalogue,
                    loadQuizCatalogueCache,
                } =
                    createDependencies();


                const remoteError =
                    new Error(
                        'Remote quiz load failed',
                    );


                loadQuizCatalogue
                    .mockRejectedValue(
                        remoteError,
                    );

                loadQuizCatalogueCache
                    .mockRejectedValue(
                        new Error(
                            'SQLite read failed',
                        ),
                    );


                await expect(
                    loadQuizFeatureCatalogue(
                        dependencies,
                    ),
                ).rejects.toBe(
                    remoteError,
                );
            },
        );
    },
);