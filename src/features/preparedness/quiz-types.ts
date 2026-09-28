import type {
    Database,
    Tables,
} from '@/types/database.types';


/**
 * WHAT:
 * Represents the two quiz interaction modes supported by the preparedness
 * database.
 *
 * WHY:
 * The generated Supabase type exposes question_type as a generic string.
 * The application knows that the database constraint permits only these two
 * values, so narrowing the type prevents unsupported quiz modes from leaking
 * into the UI and application layer.
 *
 * HOW:
 * The values exactly mirror the quiz_questions_type_valid database
 * constraint.
 */
export type QuizQuestionType =
    | 'single_select'
    | 'multi_select';


type QuizQuestionRow =
    Tables<'quiz_questions'>;


/**
 * WHAT:
 * Represents one public quiz question that may be shown before the user has
 * submitted an answer.
 *
 * WHY:
 * Correctness explanations are deliberately protected by the database and
 * must not be available through ordinary catalogue reads. Keeping them out of
 * this type makes that security boundary visible in the application code too.
 *
 * HOW:
 * Only the public, app-facing question fields are selected from the generated
 * database row type. question_type is narrowed to the two supported modes.
 */
export type QuizQuestion =
    Pick<
        QuizQuestionRow,
        | 'id'
        | 'mission_id'
        | 'hazard_id'
        | 'code'
        | 'prompt_en'
        | 'prompt_ar'
        | 'sort_order'
        | 'is_active'
    >
    & {
        question_type:
            QuizQuestionType;
    };


/**
 * WHAT:
 * Represents one public selectable answer option.
 *
 * WHY:
 * quiz_options.is_correct is intentionally withheld from ordinary mobile
 * clients. The answer key must remain behind submit_quiz_answer() so the
 * client cannot determine correctness before submission.
 *
 * HOW:
 * The type contains only identifiers, bilingual answer text and ordering
 * metadata exposed to the quiz interface.
 */
export type QuizOption =
    Pick<
        Tables<'quiz_options'>,
        | 'id'
        | 'question_id'
        | 'option_code'
        | 'text_en'
        | 'text_ar'
        | 'sort_order'
    >;


/**
 * WHAT:
 * Groups the public question and option catalogue returned by the quiz
 * application service.
 *
 * WHY:
 * Questions and answer options are stored separately in PostgreSQL but are
 * normally required together by quiz consumers.
 */
export type QuizCatalogue = {
    questions:
        QuizQuestion[];

    options:
        QuizOption[];
};


/**
 * WHAT:
 * Represents the authenticated user's persisted progress for one quiz
 * question.
 *
 * WHY:
 * Quiz progress is private account-owned state. The mobile client may read
 * its own rows but must never create or update them directly; mutations are
 * owned by submit_quiz_answer().
 */
export type UserQuizProgress =
    Pick<
        Tables<'user_quiz_progress'>,
        | 'user_id'
        | 'question_id'
        | 'has_correct_answer'
        | 'attempt_count'
        | 'first_attempted_at'
        | 'last_attempted_at'
    >;


type GeneratedQuizSubmissionResult =
    Database[
        'public'
    ][
        'Functions'
    ][
        'submit_quiz_answer'
    ][
        'Returns'
    ][number];


/**
 * WHAT:
 * Represents the authoritative result returned after a quiz answer has been
 * validated by PostgreSQL.
 *
 * WHY:
 * Supabase's generated function type currently represents the progress fields
 * as non-null. The production SQL intentionally returns NULL for those fields
 * when an anonymous user submits an answer because no private progress row is
 * created.
 *
 * HOW:
 * The generated result remains the source for the shared RPC fields while the
 * four account-progress values are widened to their real runtime nullability.
 */
export type QuizSubmissionResult =
    Omit<
        GeneratedQuizSubmissionResult,
        | 'has_correct_answer'
        | 'attempt_count'
        | 'first_attempted_at'
        | 'last_attempted_at'
    >
    & {
        has_correct_answer:
            boolean | null;

        attempt_count:
            number | null;

        first_attempted_at:
            string | null;

        last_attempted_at:
            string | null;
    };