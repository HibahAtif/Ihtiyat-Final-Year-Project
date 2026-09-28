import { supabaseClient } from "@/lib/supabase-config"

import type {
	LocationRecord,
	ProfilePreferences,
	ProfilePreferencesUpdate,
	SupportedLanguageRecord,
} from './profile-types';


const PROFILE_PREFERENCE_COLUMNS = `
	id,
	active_location_id,
	preferred_language_code,
	text_size_preference,
	children_count,
	adults_count,
	older_adults_count,
	pets_count
`;


const LOCATION_COLUMNS = `
	id,
	parent_id,
	official_code,
	location_type,
	name_en,
	name_ar,
	is_active
`;


const SUPPORTED_LANGUAGE_COLUMNS = `
	code,
	name_en,
	native_name,
	layout_direction,
	is_active
`;


/**
 * Loads the saved preparedness preferences belonging to one authenticated
 * Ihtiyat account.
 *
 * Row Level Security remains the actual security boundary. Supplying the user
 * ID here lets the application request the expected owner row explicitly
 * without duplicating authentication state inside this data-access module.
 */
export async function loadProfilePreferences(
	userId: string,
): Promise<ProfilePreferences> {
	const {
		data,
		error,
	} = await supabaseClient
		.from('profiles')
		.select(PROFILE_PREFERENCE_COLUMNS)
		.eq('id', userId)
		.single();

	if (error) {
		throw error;
	}

	return data;
}


/**
 * Persists editable preparedness preferences on the authenticated owner's
 * profile and returns the canonical values stored by Supabase.
 */
export async function updateProfilePreferences(
	userId: string,
	updates: ProfilePreferencesUpdate,
): Promise<ProfilePreferences> {
	const {
		data,
		error,
	} = await supabaseClient
		.from('profiles')
		.update(updates)
		.eq('id', userId)
		.select(PROFILE_PREFERENCE_COLUMNS)
		.single();

	if (error) {
		throw error;
	}

	return data;
}


/**
 * Returns the active curated Saudi locations available to this application
 * build.
 *
 * Unsupported device/reverse-geocoded locations must not be inserted into
 * this catalogue by the client.
 */
export async function loadActiveLocations(): Promise<LocationRecord[]> {
	const {
		data,
		error,
	} = await supabaseClient
		.from('locations')
		.select(LOCATION_COLUMNS)
		.eq('is_active', true)
		.order('official_code', {
			ascending: true,
		});

	if (error) {
		throw error;
	}

	return data;
}


/**
 * Returns backend-published application languages.
 *
 * A catalogue row does not by itself mean that the installed mobile build
 * contains the corresponding translations. That application-level check is
 * deliberately handled separately.
 */
export async function loadSupportedLanguages(): Promise<
	SupportedLanguageRecord[]
> {
	const {
		data,
		error,
	} = await supabaseClient
		.from('supported_languages')
		.select(SUPPORTED_LANGUAGE_COLUMNS)
		.eq('is_active', true)
		.order('code', {
			ascending: true,
		});

	if (error) {
		throw error;
	}

	return data;
}