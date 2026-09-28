import Storage from 'expo-sqlite/kv-store';

import type {
	LocationRecord,
} from '@/profile/profile-types';


/**
 * Identifies which local user context owns a persisted active location.
 *
 * A physical device can be used as a guest and can also switch between
 * authenticated accounts. One shared storage key could therefore expose a
 * previous user's location to the wrong application session.
 *
 * Guest state receives one dedicated key while authenticated state is scoped
 * by the Supabase user ID.
 */
export type ActiveLocationStorageScope =
	| {
			type: 'guest';
	  }
	| {
			type: 'authenticated';
			userId: string;
	  };


/**
 * Produces the SQLite key used for one location-owner scope.
 *
 * Separating keys prevents guest state and different authenticated accounts
 * from overwriting or restoring each other's selected locations.
 *
 * Guests use a stable guest key. Authenticated users receive a key containing
 * their immutable Supabase Auth user ID.
 */
function getActiveLocationStorageKey(
	scope: ActiveLocationStorageScope,
): string {
	if (scope.type === 'guest') {
		return 'ihtiyat.active-location.guest';
	}

	return `ihtiyat.active-location.user.${scope.userId}`;
}

/**
 * Checks whether an unknown value has the complete shape of an Ihtiyat
 * LocationRecord.
 *
 * Values restored from device storage are outside TypeScript's runtime type
 * system. The stored JSON may be old, malformed, manually corrupted or from
 * an earlier development build.
 *
 * Every field required by LocationRecord is checked before the value is
 * allowed back into application state.
 */
function isLocationRecord(
	value: unknown,
): value is LocationRecord {
	if (
		typeof value !== 'object'
		|| value === null
	) {
		return false;
	}

	const candidate =
		value as Record<string, unknown>;

	const hasValidParentId =
		candidate.parent_id === null
		|| (
			typeof candidate.parent_id
				=== 'number'
			&& Number.isInteger(
				candidate.parent_id,
			)
			&& candidate.parent_id > 0
		);

	return (
		typeof candidate.id === 'number'
		&& Number.isInteger(
			candidate.id,
		)
		&& candidate.id > 0

		&& hasValidParentId

		&& typeof candidate.official_code
			=== 'string'
		&& candidate.official_code.trim()
			.length > 0

		&& typeof candidate.location_type
			=== 'string'
		&& candidate.location_type.trim()
			.length > 0

		&& typeof candidate.name_en
			=== 'string'
		&& candidate.name_en.trim()
			.length > 0

		&& typeof candidate.name_ar
			=== 'string'
		&& candidate.name_ar.trim()
			.length > 0

		&& typeof candidate.is_active
			=== 'boolean'
	);
}


/**
 * Saves the user's confirmed active Ihtiyat location on the current device.
 *
 * Guest users do not have a private Supabase profile, so their chosen
 * location must survive application restarts locally. Authenticated users
 * will also retain this device-side copy for resilience and fast restoration.
 *
 * The existing LocationRecord is serialised directly to JSON and stored using
 * the same Expo SQLite key-value mechanism already used elsewhere in Ihtiyat.
 *
 * No separate location shape is introduced here because LocationRecord
 * already represents the curated public.locations fields required by the app.
 */
export async function saveLocalActiveLocation(
	location: LocationRecord,
    scope: ActiveLocationStorageScope,
): Promise<void> {
	await Storage.setItem(
		getActiveLocationStorageKey(scope,),
		JSON.stringify(location),
	);
}


/**
 * Restores the active location previously saved on this device.
 *
 * The application needs to recover a guest location after restart and needs a
 * safe local copy that can be used while authenticated profile state is still
 * loading.
 *
 * The stored JSON is parsed and validated before being returned. Invalid or
 * obsolete data is discarded rather than being trusted as a real location.
 */
export async function loadLocalActiveLocation(
    scope: ActiveLocationStorageScope
):
	Promise<LocationRecord | null> {
        const storageKey = 
            getActiveLocationStorageKey(scope,)

	const storedValue =
		await Storage.getItem(
			storageKey,
		);

	if (!storedValue) {
		return null;
	}

	try {
		const parsedValue: unknown =
			JSON.parse(
				storedValue,
			);

		if (
			!isLocationRecord(
				parsedValue,
			)
		) {
			await Storage.removeItem(
				storageKey,
			);

			return null;
		}

		return parsedValue;
	} catch {
		/**

		 * Remove malformed persisted JSON.
		 * A corrupted cache must never block application startup or be treated
         * as a trusted curated location.
		 * Only the invalid entry belonging to the current identity scope is
         * removed.
		 */
		await Storage.removeItem(
			storageKey,
		);

		return null;
	}
}


/**
 * Removes the device's currently saved active location.
 *
 * A local location must be removable when the user explicitly clears their
 * selection or when future account/location reset flows require it.
 *
 * Only Ihtiyat's dedicated active-location key is deleted; unrelated local
 * preferences remain untouched.
 */
export async function clearLocalActiveLocation(
    scope: ActiveLocationStorageScope,
): Promise<void> {
	await Storage.removeItem(
		getActiveLocationStorageKey(scope,),
	);
}