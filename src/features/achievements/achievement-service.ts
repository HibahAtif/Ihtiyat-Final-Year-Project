import {
    supabaseClient,
} from '@/lib/supabase-config';

import type {
    AchievementDefinition,
    UserAchievement,
} from './achievement-types';


/**
 * WHAT:
 * Defines the public achievement-definition columns required by the mobile
 * application.
 *
 * WHY:
 * Achievement definitions are public catalogue metadata, but the application
 * should still request only the fields it consumes. Explicit selection keeps
 * the client contract narrow and avoids accidental dependence on unrelated
 * database metadata such as created_at.
 *
 * HOW:
 * The query requests bilingual display content, criterion metadata, optional
 * mission linkage, ordering information and active status.
 *
 * The mobile client reads criterion metadata for presentation only. It does
 * not evaluate these criteria or award achievements.
 */
const ACHIEVEMENT_COLUMNS = `
    id,
    code,
    title_en,
    title_ar,
    description_en,
    description_ar,
    criterion_type,
    threshold,
    target_mission_id,
    sort_order,
    is_active
` as const;


/**
 * WHAT:
 * Defines the private earned-achievement columns required by the application.
 *
 * WHY:
 * The UI only needs the owning account, achievement identifier and trusted
 * database award timestamp. No mutation fields or unrelated metadata are
 * required.
 *
 * HOW:
 * The authenticated user ID is also applied explicitly as a query filter,
 * while PostgreSQL Row Level Security remains the authoritative ownership
 * boundary.
 */
const USER_ACHIEVEMENT_COLUMNS = `
    user_id,
    achievement_id,
    earned_at
` as const;


/**
 * WHAT:
 * Loads the active public Ihtiyat achievement catalogue.
 *
 * WHY:
 * Achievement definitions are bilingual public metadata that may be shown to
 * both guests and authenticated users.
 *
 * HOW:
 * Only active definitions are requested and returned in deterministic
 * sort-order/id order.
 *
 * Achievement awarding is deliberately absent from this service. Eligibility
 * is evaluated only by trusted PostgreSQL trigger functions.
 */
export async function loadActiveAchievements():
    Promise<AchievementDefinition[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'achievements',
        )
        .select(
            ACHIEVEMENT_COLUMNS,
        )
        .eq(
            'is_active',
            true,
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
            `Unable to load achievements: ${error.message}`,
        );
    }


    /*
     * PostgreSQL constrains criterion_type to the four values represented by
     * AchievementCriterionType. Supabase's generated schema exposes that
     * column as the broader string type, so the application boundary narrows
     * successfully returned rows here.
     */
    return (
        data
        ?? []
    ) as AchievementDefinition[];
}


/**
 * WHAT:
 * Loads achievement awards belonging to one authenticated Ihtiyat account.
 *
 * WHY:
 * Earned achievements are private historical progress state. Guests do not use
 * this function, and one account must never receive another account's award
 * rows.
 *
 * HOW:
 * The requested user ID is applied as an explicit filter and rows are returned
 * in deterministic earned-time/achievement order. PostgreSQL RLS provides the
 * authoritative ownership boundary.
 *
 * This function is intentionally read-only. Awards are created only by the
 * database-controlled achievement evaluator.
 */
export async function loadUserAchievements(
    userId:
        string,
): Promise<UserAchievement[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'user_achievements',
        )
        .select(
            USER_ACHIEVEMENT_COLUMNS,
        )
        .eq(
            'user_id',
            userId,
        )
        .order(
            'earned_at',
            {
                ascending:
                    true,
            },
        )
        .order(
            'achievement_id',
            {
                ascending:
                    true,
            },
        );


    if (
        error
    ) {
        throw new Error(
            `Unable to load user achievements: ${error.message}`,
        );
    }


    return (
        data
        ?? []
    ) as UserAchievement[];
}