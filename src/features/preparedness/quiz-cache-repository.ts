import {
    getIhtiyatDatabase,
} from '@/storage/ihtiyat-database';

import type {
    QuizCatalogue,
    QuizOption,
    QuizQuestion,
    QuizQuestionType,
} from './quiz-types';


const QUIZ_CATALOGUE_CACHE_KEY =
    'preparedness.quiz-catalogue';


type QuizQuestionCacheRow = {
    id: number;
    mission_id: number;
    hazard_id: number | null;
    code: string;
    question_type: string;
    prompt_en: string;
    prompt_ar: string;
    sort_order: number;
    is_active: number;
};


type QuizOptionCacheRow = {
    id: number;
    question_id: number;
    option_code: string;
    text_en: string;
    text_ar: string;
    sort_order: number;
};


type CacheMetadataRow = {
    cached_at: string;
};


/**
 * WHAT:
 * Converts an application boolean into SQLite's integer representation.
 *
 * WHY:
 * SQLite does not provide a dedicated Boolean storage class. Ihtiyat's
 * structured database consistently stores Boolean values as 0 or 1.
 *
 * HOW:
 * true becomes 1 and false becomes 0.
 */
function toSQLiteBoolean(
    value: boolean,
): number {
    return value
        ? 1
        : 0;
}


/**
 * WHAT:
 * Restores a Boolean value read from SQLite.
 *
 * WHY:
 * Repository consumers should work with normal TypeScript booleans rather
 * than SQLite implementation details.
 *
 * HOW:
 * The V3 schema constrains is_active to 0 or 1, so a stored value of 1 maps
 * to true and every valid alternative maps to false.
 */
function fromSQLiteBoolean(
    value: number,
): boolean {
    return value === 1;
}


/**
 * WHAT:
 * Restores the supported quiz-question mode from its SQLite text value.
 *
 * WHY:
 * SQLite returns a generic string while the application exposes the narrower
 * QuizQuestionType contract. Checking the value at the repository boundary
 * prevents corrupted or unsupported cached data from silently entering the
 * quiz feature.
 *
 * HOW:
 * Only the two question types permitted by both PostgreSQL and the V3 SQLite
 * CHECK constraint are accepted.
 */
function fromSQLiteQuestionType(
    value: string,
): QuizQuestionType {
    if (
        value === 'single_select'
        || value === 'multi_select'
    ) {
        return value;
    }


    throw new Error(
        `Quiz cache contains unsupported question type: ${value}.`,
    );
}


/**
 * WHAT:
 * Replaces the complete locally cached public quiz catalogue.
 *
 * WHY:
 * Quiz questions and their answer choices form one coherent public snapshot.
 * Replacing them atomically prevents an interrupted refresh from leaving old
 * options paired with newly downloaded questions or vice versa.
 *
 * Supabase remains canonical. SQLite stores only the public pre-submission
 * catalogue required for offline resilience.
 *
 * HOW:
 * Existing options are deleted before questions because the V3 schema gives
 * options a foreign key to their parent cached question. The new questions
 * are inserted first, followed by their options. Cache metadata is written in
 * the same exclusive transaction, including for an explicitly empty
 * catalogue.
 *
 * The protected answer key and post-submission explanations are absent from
 * both the application catalogue type and these SQL statements.
 */
export async function saveQuizCatalogueCache(
    catalogue: QuizCatalogue,
    cachedAt:
        string = new Date().toISOString(),
): Promise<void> {
    const database =
        await getIhtiyatDatabase();


    await database
        .withExclusiveTransactionAsync(
            async (
                transaction,
            ): Promise<void> => {
                /*
                 * Options reference questions, so child rows must be removed
                 * before their parents while foreign-key enforcement is on.
                 */
                await transaction.runAsync(
                    `
                        DELETE FROM quiz_option_cache;
                    `,
                );


                await transaction.runAsync(
                    `
                        DELETE FROM quiz_question_cache;
                    `,
                );


                for (
                    const question
                    of catalogue.questions
                ) {
                    await transaction.runAsync(
                        `
                            INSERT INTO quiz_question_cache (
                                id,
                                mission_id,
                                hazard_id,
                                code,
                                question_type,
                                prompt_en,
                                prompt_ar,
                                sort_order,
                                is_active
                            )
                            VALUES (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?
                            );
                        `,
                        question.id,
                        question.mission_id,
                        question.hazard_id,
                        question.code,
                        question.question_type,
                        question.prompt_en,
                        question.prompt_ar,
                        question.sort_order,
                        toSQLiteBoolean(
                            question.is_active,
                        ),
                    );
                }


                for (
                    const option
                    of catalogue.options
                ) {
                    await transaction.runAsync(
                        `
                            INSERT INTO quiz_option_cache (
                                id,
                                question_id,
                                option_code,
                                text_en,
                                text_ar,
                                sort_order
                            )
                            VALUES (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?
                            );
                        `,
                        option.id,
                        option.question_id,
                        option.option_code,
                        option.text_en,
                        option.text_ar,
                        option.sort_order,
                    );
                }


                /*
                 * Metadata is deliberately written even when both arrays are
                 * empty. Its existence distinguishes a successfully cached
                 * empty catalogue from a device that has never cached quiz
                 * content at all.
                 */
                await transaction.runAsync(
                    `
                        INSERT INTO preparedness_cache_metadata (
                            cache_key,
                            cached_at
                        )
                        VALUES (
                            ?,
                            ?
                        )
                        ON CONFLICT(cache_key)
                        DO UPDATE SET
                            cached_at =
                                excluded.cached_at;
                    `,
                    QUIZ_CATALOGUE_CACHE_KEY,
                    cachedAt,
                );
            },
        );
}


/**
 * WHAT:
 * Loads the most recently cached public quiz catalogue from SQLite.
 *
 * WHY:
 * Quiz questions and answer choices should remain readable after a successful
 * earlier download even when Supabase or the network is temporarily
 * unavailable.
 *
 * The caller must be able to distinguish two different states:
 *
 * - null: no successful quiz catalogue has ever been cached.
 * - empty arrays: a successful catalogue load was cached but contained no
 *   rows.
 *
 * HOW:
 * Cache metadata is checked first. If it does not exist, no catalogue
 * snapshot is considered valid and null is returned. Otherwise questions and
 * options are loaded in the same deterministic ordering used by the remote
 * service, and SQLite integer booleans are restored before leaving the
 * repository boundary.
 */
export async function loadQuizCatalogueCache():
    Promise<QuizCatalogue | null> {
    const database =
        await getIhtiyatDatabase();


    const metadata =
        await database
            .getFirstAsync<CacheMetadataRow>(
                `
                    SELECT
                        cached_at
                    FROM preparedness_cache_metadata
                    WHERE
                        cache_key = ?
                    LIMIT 1;
                `,
                QUIZ_CATALOGUE_CACHE_KEY,
            );


    if (
        !metadata
    ) {
        return null;
    }


    const questionRows =
        await database
            .getAllAsync<QuizQuestionCacheRow>(
                `
                    SELECT
                        id,
                        mission_id,
                        hazard_id,
                        code,
                        question_type,
                        prompt_en,
                        prompt_ar,
                        sort_order,
                        is_active
                    FROM quiz_question_cache
                    ORDER BY
                        mission_id ASC,
                        sort_order ASC,
                        id ASC;
                `,
            );


    const optionRows =
        await database
            .getAllAsync<QuizOptionCacheRow>(
                `
                    SELECT
                        id,
                        question_id,
                        option_code,
                        text_en,
                        text_ar,
                        sort_order
                    FROM quiz_option_cache
                    ORDER BY
                        question_id ASC,
                        sort_order ASC,
                        id ASC;
                `,
            );


    const questions:
        QuizQuestion[] =
            questionRows.map(
                (
                    row,
                ): QuizQuestion => ({
                    id:
                        row.id,

                    mission_id:
                        row.mission_id,

                    hazard_id:
                        row.hazard_id,

                    code:
                        row.code,

                    question_type:
                        fromSQLiteQuestionType(
                            row.question_type,
                        ),

                    prompt_en:
                        row.prompt_en,

                    prompt_ar:
                        row.prompt_ar,

                    sort_order:
                        row.sort_order,

                    is_active:
                        fromSQLiteBoolean(
                            row.is_active,
                        ),
                }),
            );


    const options:
        QuizOption[] =
            optionRows.map(
                (
                    row,
                ): QuizOption => ({
                    id:
                        row.id,

                    question_id:
                        row.question_id,

                    option_code:
                        row.option_code,

                    text_en:
                        row.text_en,

                    text_ar:
                        row.text_ar,

                    sort_order:
                        row.sort_order,
                }),
            );


    return {
        questions,
        options,
    };
}