/**
 * WHAT:
 * Enumerates the achievement criteria currently supported by Ihtiyat's
 * database-controlled preparedness reward engine.
 *
 * WHY:
 * PostgreSQL stores criterion_type as text, but the application benefits from
 * a narrow domain type representing only the criteria supported by the
 * achievement schema.
 *
 * HOW:
 * These values mirror the database constraint and V1 achievement seed.
 * They describe achievement metadata only. The mobile client never evaluates
 * these criteria to award achievements.
 */
export type AchievementCriterionType =
    | 'tasks_completed'
    | 'quiz_questions_correct'
    | 'preparedness_points'
    | 'mission_completed';


/**
 * Public bilingual definition of one Ihtiyat preparedness achievement.
 *
 * Achievement definitions are catalogue data and may be shown to guests.
 * `target_mission_id` is populated only for mission-completion milestones.
 */
export type AchievementDefinition = {
    id:
        number;

    code:
        string;

    title_en:
        string;

    title_ar:
        string;

    description_en:
        string;

    description_ar:
        string;

    criterion_type:
        AchievementCriterionType;

    threshold:
        number;

    target_mission_id:
        number
        | null;

    sort_order:
        number;

    is_active:
        boolean;
};


/**
 * Private persisted record showing that one authenticated account has earned
 * one achievement.
 *
 * The row is created only by trusted PostgreSQL achievement logic. The mobile
 * application reads it but never inserts, updates or deletes it.
 */
export type UserAchievement = {
    user_id:
        string;

    achievement_id:
        number;

    earned_at:
        string;
};


/**
 * UI-facing combination of a public definition and the authenticated user's
 * earned timestamp.
 *
 * This is derived client-side from two read-only datasets. It does not award
 * or modify achievements.
 */
export type EarnedAchievement = {
    achievement:
        AchievementDefinition;

    earned_at:
        string;
};