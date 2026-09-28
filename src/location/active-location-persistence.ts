import type {
	LocationRecord,
	ProfilePreferences,
	ProfilePreferencesUpdate,
} from '@/profile/profile-types';

import {
	saveLocalActiveLocation,
} from './active-location-storage';

import type {
	ActiveLocationStorageScope,
} from './active-location-storage';


/**
 * WHAT:
 * Represents the application identity that owns a confirmed active location.
 *
 * WHY:
 * Guest users have no private Supabase profile, while authenticated users
 * require both account-backed persistence and an account-scoped local cache.
 *
 * HOW:
 * Authenticated persistence receives the existing savePreferences function
 * from ProfilePreferencesProvider rather than creating another profile-update
 * implementation.
 */
export type ActiveLocationPersistenceOwner =
	| {
			type: 'guest';
	  }
	| {
			type: 'authenticated';
			userId: string;
			savePreferences: (
				updates: ProfilePreferencesUpdate,
			) => Promise<ProfilePreferences>;
	  };


export type ActiveLocationPersistenceResult = {
	location: LocationRecord;
	cloudPersisted: boolean;
	localPersisted: boolean;
	profile: ProfilePreferences | null;
};


/**
 * WHAT:
 * External persistence operation used by this coordinator.
 *
 * WHY:
 * Dependency injection keeps the coordination rules independently testable
 * from Expo SQLite while production still uses the real storage service.
 *
 * HOW:
 * Production uses saveLocalActiveLocation by default. Tests can provide a
 * deterministic replacement.
 */
export type ActiveLocationPersistenceDependencies = {
	saveLocalActiveLocation:
		typeof saveLocalActiveLocation;
};


const defaultDependencies:
	ActiveLocationPersistenceDependencies = {
		saveLocalActiveLocation,
	};


/**
 * Persists one user-confirmed curated Ihtiyat location.
 *
 * Automatic detection and manual selection must eventually use exactly the
 * same persistence rules. Keeping those rules here avoids duplicating guest,
 * authenticated and local-cache behaviour across multiple screens.
 *
 * Guest:
 * - store the curated location under the guest SQLite scope;
 * - the local copy is the guest's persistent location.
 *
 * Authenticated:
 * - save active_location_id through the existing profile provider first;
 * - Supabase therefore remains canonical for account-backed preferences;
 * - after that succeeds, cache the complete LocationRecord under that
 *   account's local SQLite scope.
 *
 * A local-cache failure after an authenticated cloud save does not pretend
 * that the cloud save failed. The result reports the two outcomes separately
 * so the caller can respond appropriately.
 */
export async function persistConfirmedActiveLocation(
	location: LocationRecord,
	owner: ActiveLocationPersistenceOwner,
	dependencies:
		ActiveLocationPersistenceDependencies =
			defaultDependencies,
): Promise<ActiveLocationPersistenceResult> {
	if (!location.is_active) {
		throw new Error(
			'An inactive location cannot become the active Ihtiyat location.',
		);
	}

	if (owner.type === 'guest') {
		const scope:
			ActiveLocationStorageScope = {
				type: 'guest',
			};

		await dependencies
			.saveLocalActiveLocation(
				location,
				scope,
			);

		return {
			location,
			cloudPersisted: false,
			localPersisted: true,
			profile: null,
		};
	}

	const savedProfile =
		await owner.savePreferences({
			active_location_id:
				location.id,
		});

	const scope:
		ActiveLocationStorageScope = {
			type: 'authenticated',
			userId: owner.userId,
		};

	try {
		await dependencies
			.saveLocalActiveLocation(
				location,
				scope,
			);

		return {
			location,
			cloudPersisted: true,
			localPersisted: true,
			profile: savedProfile,
		};
	} catch {
		/*
		 * Preserve the successful cloud result even if the (secondary) local
		 * cache cannot be written.
		 *
		 * Supabase is canonical for authenticated profile preferences.
		 * Reporting the entire operation as failed after Supabase accepted
		 * the location would incorrectly tell the user that their account
		 * preference was not saved.
		 *
		 * The result exposes localPersisted=false so the caller can log or
		 * surface the degraded offline-resilience state separately.
		 */
		return {
			location,
			cloudPersisted: true,
			localPersisted: false,
			profile: savedProfile,
		};
	}
}