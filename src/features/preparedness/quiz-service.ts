import {
    supabaseClient,
} from '@/lib/supabase-config';

import type {
    QuizCatalogue,
    QuizOption,
    QuizQuestion,
    QuizSubmissionResult,
    UserQuizProgress,
} from './quiz-types';


/**
 * WHAT:
 * Defines the public quiz-question columns that the mobile client is allowed
 * to read before an answer has been submitted.
 *
 * WHY:
 * The database deliberately protects explanation_en and explanation_ar from
 * ordinary catalogue reads. Keeping an explicit select list here preserves
 * that boundary in the application layer and prevents a future wildcard
 * query from exposing post-answer feedback prematurely.
 *
 * HOW:
 * Only the identifiers, bilingual prompt content, question mode, catalogue
 * relationships and ordering metadata required by the app are requested.
 */
const QUIZ_QUESTION_COLUMNS = `
    id,
    mission_id,
    hazard_id,
    code,
    question_type,
    prompt_en,
    prompt_ar,
    sort_order,
    is_active
` as const;


/**
 * WHAT:
 * Defines the public quiz-option columns available before submission.
 *
 * WHY:
 * quiz_options.is_correct is the protected answer key. The mobile client
 * must not read it directly because correctness is owned by the
 * submit_quiz_answer PostgreSQL function.
 *
 * HOW:
 * The query receives only identifiers, bilingual option text and catalogue
 * ordering information.
 */
const QUIZ_OPTION_COLUMNS = `
    id,
    question_id,
    option_code,
    text_en,
    text_ar,
    sort_order
` as const;


/**
 * WHAT:
 * Defines the private quiz-progress fields that an authenticated user may
 * read for their own account.
 *
 * WHY:
 * The UI needs completion/attempt information but does not need unrelated
 * database metadata. Mutations remain exclusively owned by
 * submit_quiz_answer().
 *
 * HOW:
 * The caller's user ID is applied as a filter in addition to the database
 * RLS policy.
 */
const USER_QUIZ_PROGRESS_COLUMNS = `
    user_id,
    question_id,
    has_correct_answer,
    attempt_count,
    first_attempted_at,
    last_attempted_at
` as const;


/**
 * WHAT:
 * Loads the currently active public preparedness quiz questions.
 *
 * WHY:
 * Quiz questions are safety-learning content that must be accessible to both
 * guests and authenticated users. Supabase remains the canonical source of
 * the catalogue.
 *
 * HOW:
 * Only active questions are selected and returned in deterministic
 * mission/sort/id order. Protected explanations are intentionally absent.
 */
export async function loadActiveQuizQuestions():
    Promise<QuizQuestion[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'quiz_questions',
        )
        .select(
            QUIZ_QUESTION_COLUMNS,
        )
        .eq(
            'is_active',
            true,
        )
        .order(
            'mission_id',
            {
                ascending:
                    true,
            },
        )
        .order(
            'sort_order',
            {
                ascending:
                    true,
            },
        )
        .order(
            'id',
            {
                ascending:
                    true,
            },
        );


    if (
        error
    ) {
        throw new Error(
            `Unable to load quiz questions: ${error.message}`,
        );
    }


    /*
     * The database constraint limits question_type to the two values expressed
     * by QuizQuestionType. Supabase's generated table type represents the
     * column more broadly as string, so the application boundary narrows the
     * successfully returned rows here.
     */
    return (
        data
        ?? []
    ) as QuizQuestion[];
}


/**
 * WHAT:
 * Loads the public selectable options belonging to quiz questions.
 *
 * WHY:
 * Guests and signed-in users need identical access to answer choices, while
 * the protected is_correct field must never be exposed through an ordinary
 * catalogue query.
 *
 * HOW:
 * Options are returned in deterministic question/sort/id order so consumers
 * receive a stable catalogue without having to impose their own ordering.
 */
export async function loadQuizOptions():
    Promise<QuizOption[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'quiz_options',
        )
        .select(
            QUIZ_OPTION_COLUMNS,
        )
        .order(
            'question_id',
            {
                ascending:
                    true,
            },
        )
        .order(
            'sort_order',
            {
                ascending:
                    true,
            },
        )
        .order(
            'id',
            {
                ascending:
                    true,
            },
        );


    if (
        error
    ) {
        throw new Error(
            `Unable to load quiz options: ${error.message}`,
        );
    }


    return (
        data
        ?? []
    ) as QuizOption[];
}


/**
 * WHAT:
 * Loads the public question and option catalogues as one coherent application
 * payload.
 *
 * WHY:
 * Quiz consumers normally require both datasets together. Keeping the
 * orchestration here avoids duplicating fetch logic in future providers or
 * screens.
 *
 * HOW:
 * The two reads are independent public operations, so they are executed in
 * parallel. If either one fails, Promise.all rejects rather than presenting a
 * partially fresh catalogue.
 */
export async function loadQuizCatalogue():
    Promise<QuizCatalogue> {
    const [
        questions,
        options,
    ] = await Promise.all([
        loadActiveQuizQuestions(),
        loadQuizOptions(),
    ]);


    return {
        questions,
        options,
    };
}


/**
 * WHAT:
 * Loads the persisted quiz-learning progress belonging to one authenticated
 * user.
 *
 * WHY:
 * Progress is private account-owned state and must remain separate from the
 * public quiz catalogue. Guests therefore do not use this function.
 *
 * HOW:
 * The requested account is explicitly filtered and PostgreSQL RLS provides
 * the authoritative ownership boundary. Rows are ordered by question ID for
 * deterministic client state.
 */
export async function loadUserQuizProgress(
    userId: string,
): Promise<UserQuizProgress[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'user_quiz_progress',
        )
        .select(
            USER_QUIZ_PROGRESS_COLUMNS,
        )
        .eq(
            'user_id',
            userId,
        )
        .order(
            'question_id',
            {
                ascending:
                    true,
            },
        );


    if (
        error
    ) {
        throw new Error(
            `Unable to load quiz progress: ${error.message}`,
        );
    }


    return (
        data
        ?? []
    ) as UserQuizProgress[];
}


/**
 * WHAT:
 * Sends the user's selected quiz answer to the authoritative PostgreSQL quiz
 * checker and returns its learning feedback.
 *
 * WHY:
 * Correctness, answer-key disclosure, attempt counting and authenticated
 * progress persistence all belong to the database transaction. Reimplementing
 * those rules in React Native would duplicate logic and could expose the
 * protected answer key before submission.
 *
 * HOW:
 * The client sends only the question ID and selected option IDs to
 * submit_quiz_answer(). Supabase automatically applies the current session:
 * guests receive feedback with progress_recorded=false, while authenticated
 * users also receive their updated private progress values.
 */
export async function submitQuizAnswer(
    questionId: number,
    optionIds: number[],
): Promise<QuizSubmissionResult> {
    const {
        data:
            generatedData,
        error,
    } = await supabaseClient
        .rpc(
            'submit_quiz_answer',
            {
                p_question_id:
                    questionId,

                p_option_ids:
                    optionIds,
            },
        );


    if (
        error
    ) {
        throw new Error(
            `Unable to submit quiz answer: ${error.message}`,
        );
    }


    /*
     * The generated Supabase RPC type currently declares the private progress
     * values as always present. The SQL contract intentionally returns NULL
     * for them when the caller is anonymous, so quiz-types.ts widens those
     * fields to their actual runtime nullability.
     */
    const data:
        QuizSubmissionResult[] | null = generatedData;


    const result =
        data?.[0];


    if (
        !result
    ) {
        throw new Error(
            'Quiz submission returned no result.',
        );
    }


    return result;
}