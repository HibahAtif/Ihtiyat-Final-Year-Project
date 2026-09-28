/// <reference types="jest" />

import {
	persistConfirmedActiveLocation,
} from '../../src/location/active-location-persistence';

import type {
	ActiveLocationPersistenceDependencies,
} from '../../src/location/active-location-persistence';

import type {
	LocationRecord,
	ProfilePreferences,
} from '../../src/profile/profile-types';


const jeddahLocation: LocationRecord = {
	id: 14,
	parent_id: 2,
	official_code: '0124',
	location_type: 'governorate',
	name_en: 'Jeddah',
	name_ar: 'جدة',
	is_active: true,
};


const authenticatedUserId =
	'11111111-1111-1111-1111-111111111111';


const savedProfile: ProfilePreferences = {
	id: authenticatedUserId,
	active_location_id: 14,
	preferred_language_code: 'en',
	text_size_preference: 'system',
	children_count: null,
	adults_count: null,
	older_adults_count: null,
	pets_count: null,
};


/**
 * WHAT:
 * Creates an isolated local persistence substitute.
 *
 * WHY:
 * These tests target coordination rules rather than Expo SQLite itself. The
 * SQLite boundary already has its own dedicated unit-test suite.
 *
 * HOW:
 * Jest records calls to the injected function while returning a successful
 * Promise by default.
 */
function createDependencies() {
	const saveLocalActiveLocation =
		jest.fn().mockResolvedValue(
			undefined,
		);

	const dependencies:
		ActiveLocationPersistenceDependencies = {
			saveLocalActiveLocation,
		};

	return {
		dependencies,
		saveLocalActiveLocation,
	};
}


describe(
	'persistConfirmedActiveLocation',
	() => {
		test(
			'persists a guest location only in guest-scoped local storage',
			async () => {
				const {
					dependencies,
					saveLocalActiveLocation,
				} = createDependencies();

				const result =
					await persistConfirmedActiveLocation(
						jeddahLocation,
						{
							type: 'guest',
						},
						dependencies,
					);

				expect(
					saveLocalActiveLocation,
				).toHaveBeenCalledWith(
					jeddahLocation,
					{
						type: 'guest',
					},
				);

				expect(result).toEqual({
					location: jeddahLocation,
					cloudPersisted: false,
					localPersisted: true,
					profile: null,
				});
			},
		);


		test(
			'saves an authenticated location to Supabase before caching it locally',
			async () => {
				const {
					dependencies,
					saveLocalActiveLocation,
				} = createDependencies();

				const operationOrder:
					string[] = [];

				const savePreferences =
					jest.fn()
						.mockImplementation(
							async () => {
								operationOrder.push(
									'cloud',
								);

								return savedProfile;
							},
						);

				saveLocalActiveLocation
					.mockImplementation(
						async () => {
							operationOrder.push(
								'local',
							);
						},
					);

				const result =
					await persistConfirmedActiveLocation(
						jeddahLocation,
						{
							type:
								'authenticated',
							userId:
								authenticatedUserId,
							savePreferences,
						},
						dependencies,
					);

				expect(
					savePreferences,
				).toHaveBeenCalledWith({
					active_location_id: 14,
				});

				expect(
					saveLocalActiveLocation,
				).toHaveBeenCalledWith(
					jeddahLocation,
					{
						type:
							'authenticated',
						userId:
							authenticatedUserId,
					},
				);

				expect(
					operationOrder,
				).toEqual([
					'cloud',
					'local',
				]);

				expect(result).toEqual({
					location: jeddahLocation,
					cloudPersisted: true,
					localPersisted: true,
					profile: savedProfile,
				});
			},
		);


		test(
			'does not create an authenticated local cache when the cloud save fails',
			async () => {
				const {
					dependencies,
					saveLocalActiveLocation,
				} = createDependencies();

				const savePreferences =
					jest.fn()
						.mockRejectedValue(
							new Error(
								'Supabase unavailable',
							),
						);

				await expect(
					persistConfirmedActiveLocation(
						jeddahLocation,
						{
							type:
								'authenticated',
							userId:
								authenticatedUserId,
							savePreferences,
						},
						dependencies,
					),
				).rejects.toThrow(
					'Supabase unavailable',
				);

				expect(
					saveLocalActiveLocation,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'preserves a successful authenticated cloud save when the local cache fails',
			async () => {
				const {
					dependencies,
					saveLocalActiveLocation,
				} = createDependencies();

				const savePreferences =
					jest.fn()
						.mockResolvedValue(
							savedProfile,
						);

				saveLocalActiveLocation
					.mockRejectedValue(
						new Error(
							'Local storage unavailable',
						),
					);

				const result =
					await persistConfirmedActiveLocation(
						jeddahLocation,
						{
							type:
								'authenticated',
							userId:
								authenticatedUserId,
							savePreferences,
						},
						dependencies,
					);

				expect(result).toEqual({
					location: jeddahLocation,
					cloudPersisted: true,
					localPersisted: false,
					profile: savedProfile,
				});
			},
		);


		test(
			'rejects an inactive catalogue location before writing anything',
			async () => {
				const {
					dependencies,
					saveLocalActiveLocation,
				} = createDependencies();

				const inactiveLocation:
					LocationRecord = {
						...jeddahLocation,
						is_active: false,
					};

				await expect(
					persistConfirmedActiveLocation(
						inactiveLocation,
						{
							type: 'guest',
						},
						dependencies,
					),
				).rejects.toThrow(
					'An inactive location cannot become the active Ihtiyat location.',
				);

				expect(
					saveLocalActiveLocation,
				).not.toHaveBeenCalled();
			},
		);
	},
);