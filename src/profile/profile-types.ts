import type { Database } from '../types/database.types';


type ProfileRow =
	Database['public']['Tables']['profiles']['Row'];

type ProfileUpdate =
	Database['public']['Tables']['profiles']['Update'];

type LocationRow =
	Database['public']['Tables']['locations']['Row'];

type SupportedLanguageRow =
	Database['public']['Tables']['supported_languages']['Row'];


/**
 * Saved profile information required by Ihtiyat's preparedness
 * personalisation logic.
 *
 * Household values use the database's deliberate semantics:
 *
 * - null = household information has not yet been supplied;
 * - 0 = the user explicitly reported none for that category.
 */
export type ProfilePreferences = Pick<
	ProfileRow,
	| 'id'
	| 'active_location_id'
	| 'preferred_language_code'
	| 'text_size_preference'
	| 'children_count'
	| 'adults_count'
	| 'older_adults_count'
	| 'pets_count'
>;


/**
 * Fields that the authenticated application is permitted to update on the
 * owner's profile.
 *
 * id is intentionally absent because profile ownership is not client-editable.
 */
export type ProfilePreferencesUpdate = Pick<
	ProfileUpdate,
	| 'active_location_id'
	| 'preferred_language_code'
	| 'text_size_preference'
	| 'children_count'
	| 'adults_count'
	| 'older_adults_count'
	| 'pets_count'
>;


/**
 * Curated Saudi administrative location exposed to the mobile application.
 */
export type LocationRecord = Pick<
	LocationRow,
	| 'id'
	| 'parent_id'
	| 'official_code'
	| 'location_type'
	| 'name_en'
	| 'name_ar'
	| 'is_active'
>;


/**
 * Language catalogue record published to the mobile application.
 *
 * The generated database type intentionally remains the source of truth for
 * the physical schema. Application-level checks later ensure that a backend
 * language also has translation resources in this build of Ihtiyat.
 */
export type SupportedLanguageRecord = Pick<
	SupportedLanguageRow,
	| 'code'
	| 'name_en'
	| 'native_name'
	| 'layout_direction'
	| 'is_active'
>;

/**
 * App-level accessibility text-size options currently implemented by Ihtiyat.
 *
 * PostgreSQL check constraints are not narrowed to literal TypeScript unions
 * by generated Supabase types, so the application defines these supported
 * values explicitly here
 */
export type TextSizePreference =
	| 'system'
	| 'large';